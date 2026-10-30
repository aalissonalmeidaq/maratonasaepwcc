-- Spec 002, revisão de 2026-10-30 — contas sem senha e convite de primeiro acesso (FR-011).
-- O token puro só existe no e-mail; aqui fica apenas o hash SHA-256. Somente as Edge Functions
-- (service_role) leem e gravam convites. A coordenação vê a situação por uma função própria.

create table public.convites_acesso (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  token_hash text not null unique,
  criado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,
  expira_em timestamptz not null default now() + interval '7 days',
  usado_em timestamptz,
  revogado_em timestamptz,
  constraint convites_usado_ou_revogado check (not (usado_em is not null and revogado_em is not null))
);
comment on table public.convites_acesso is
  'Convites de primeiro acesso (7 dias, uso único). Acesso somente pelo servidor.';
create unique index convites_um_valido_por_pessoa on public.convites_acesso (usuario_id)
  where usado_em is null and revogado_em is null;
create index convites_usuario_criado_idx on public.convites_acesso (usuario_id, criado_em desc);

alter table public.convites_acesso enable row level security;
-- Sem políticas: anon e authenticated não têm acesso algum.
revoke all on public.convites_acesso from anon, authenticated;
grant all on public.convites_acesso to service_role;

-- Auditoria sem o hash do token.
create function app.auditar_convite()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) - 'token_hash' end;
  v_depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) - 'token_hash' end;
begin
  insert into public.auditoria (acao, tabela, registro_id, antes, depois)
  values (tg_op, tg_table_name, coalesce(v_depois ->> 'id', v_antes ->> 'id'), v_antes, v_depois);
  return coalesce(new, old);
end;
$$;
create trigger auditoria_convites_acesso after insert or update or delete on public.convites_acesso
  for each row execute function app.auditar_convite();

-- ---------------------------------------------------------------------------
-- Funções exclusivas do servidor (Edge Functions com service_role)
-- ---------------------------------------------------------------------------

-- Revoga o convite pendente da pessoa e registra o novo (reenvio invalida o anterior).
create function public.registrar_convite(
  p_usuario uuid, p_edicao uuid, p_token_hash text, p_criado_por uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  update public.convites_acesso set revogado_em = now()
  where usuario_id = p_usuario and usado_em is null and revogado_em is null;
  insert into public.convites_acesso (usuario_id, edicao_id, token_hash, criado_por)
  values (p_usuario, p_edicao, p_token_hash, p_criado_por)
  returning id into v_id;
  return v_id;
end;
$$;

-- Consome o convite de forma atômica: só um uso, dentro do prazo e não revogado.
create function public.consumir_convite(p_token_hash text)
returns table (convite_id uuid, usuario_id uuid)
language sql security definer set search_path = '' as $$
  update public.convites_acesso c set usado_em = now()
  where c.token_hash = p_token_hash
    and c.usado_em is null and c.revogado_em is null and c.expira_em > now()
  returning c.id, c.usuario_id;
$$;

-- Usado quando o Auth recusa a senha: o convite volta a valer.
create function public.desfazer_consumo(p_convite uuid)
returns void language sql security definer set search_path = '' as $$
  update public.convites_acesso set usado_em = null where id = p_convite;
$$;

create function public.usuario_por_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1;
$$;

revoke execute on function public.registrar_convite(uuid, uuid, text, uuid),
  public.consumir_convite(text), public.desfazer_consumo(uuid), public.usuario_por_email(text)
  from public, anon, authenticated;
grant execute on function public.registrar_convite(uuid, uuid, text, uuid),
  public.consumir_convite(text), public.desfazer_consumo(uuid), public.usuario_por_email(text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Situação de acesso — somente a coordenação da edição (US6 cenário 6)
-- "Aguardando": o convite mais recente não foi usado e não houve login depois dele.
-- ---------------------------------------------------------------------------
create function public.situacao_de_acesso(p_edicao uuid)
returns table (usuario_id uuid, email text, acesso_ativo boolean, convite_expira_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.e_coordenacao(p_edicao) then
    raise exception 'Somente a coordenação da edição pode consultar a situação de acesso.'
      using errcode = '42501';
  end if;
  return query
  select u.id, u.email::text, s.ativo,
         case when s.ativo then null else c.expira_em end
  from (select distinct a.usuario_id from public.atribuicoes a where a.edicao_id = p_edicao) p
  join auth.users u on u.id = p.usuario_id
  left join lateral (
    select ci.usado_em, ci.criado_em, ci.expira_em from public.convites_acesso ci
    where ci.usuario_id = u.id order by ci.criado_em desc limit 1
  ) c on true
  cross join lateral (
    select (c.criado_em is null or c.usado_em is not null
            or (u.last_sign_in_at is not null and u.last_sign_in_at > c.criado_em)) as ativo
  ) s;
end;
$$;
revoke execute on function public.situacao_de_acesso(uuid) from public, anon;
grant execute on function public.situacao_de_acesso(uuid) to authenticated;
