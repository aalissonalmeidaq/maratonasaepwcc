-- =============================================================================
-- Spec 016 — unidades (multiunidade), usuário master e gestão da unidade (ADR 0013).
-- Uma instalação, várias unidades no mesmo banco. Edições, cadastro permanente e contas pertencem
-- a uma unidade; o master é da rede e não tem unidade. Nada é atribuído automaticamente como
-- gestão ou master.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Parte 1 — modelo, salvaguarda e migração dos dados (T004, research R1 e R3)
-- -----------------------------------------------------------------------------
create type public.funcao_unidade as enum ('gestao', 'coordenacao', 'docente', 'mentor', 'analista');

create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  ativa boolean not null default true,
  desativada_em timestamptz,
  justificativa_desativacao text,
  criado_em timestamptz not null default now()
);
create unique index unidades_nome_unico on public.unidades (lower(btrim(nome)));
comment on table public.unidades is 'Unidades (tenants) da instalação (spec 016). Escrita só por RPC do master.';

insert into public.unidades (nome) values ('SENAI Juazeiro do Norte');

create table public.masters (
  usuario_id uuid primary key references public.perfis (id) on delete cascade,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
comment on table public.masters is 'Contas master da rede (spec 016): sem unidade, sem dados de edição.';

create table public.funcoes_unidade (
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  funcao public.funcao_unidade not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (usuario_id, funcao)
);
comment on table public.funcoes_unidade is 'Funções da conta na sua unidade (spec 016). A unidade é perfis.unidade_id.';

-- Salvaguarda (S1): o padrão só existe enquanto a instalação tiver uma única unidade; com duas ou
-- mais, gravar sem informar a unidade é recusado — nunca vai para a unidade errada em silêncio.
create function app.unidade_inicial()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if (select count(*) from public.unidades) <> 1 then
    raise exception 'Informe a unidade.' using errcode = '23514';
  end if;
  select id into v from public.unidades;
  return v;
end;
$$;
revoke all on function app.unidade_inicial() from public, anon, authenticated;

alter table public.perfis add column unidade_id uuid references public.unidades (id);
update public.perfis set unidade_id = app.unidade_inicial();
create index perfis_unidade_idx on public.perfis (unidade_id);

alter table public.edicoes add column unidade_id uuid not null default app.unidade_inicial()
  references public.unidades (id);
create index edicoes_unidade_idx on public.edicoes (unidade_id);

alter table public.cadastro_cursos add column unidade_id uuid not null default app.unidade_inicial()
  references public.unidades (id);
drop index public.cadastro_cursos_nome_unico;
create unique index cadastro_cursos_nome_unico on public.cadastro_cursos (unidade_id, lower(btrim(nome)));

-- Funções da unidade a partir das atribuições ativas (nenhuma gestão, nenhum master).
insert into public.funcoes_unidade (usuario_id, funcao)
select distinct a.usuario_id, a.papel::text::public.funcao_unidade
from public.atribuicoes a
where a.ativo and a.papel in ('coordenacao', 'docente', 'mentor', 'analista')
on conflict do nothing;

update public.premissas set resolvida_por = 'spec 016' where codigo = 'P25';

alter table public.unidades enable row level security;
alter table public.masters enable row level security;
alter table public.funcoes_unidade enable row level security;
revoke all on public.unidades, public.masters, public.funcoes_unidade from anon, authenticated;

create trigger auditoria_unidades after insert or update or delete on public.unidades
  for each row execute function app.registrar_auditoria();
create trigger auditoria_masters after insert or update or delete on public.masters
  for each row execute function app.registrar_auditoria();
create trigger auditoria_funcoes_unidade after insert or update or delete on public.funcoes_unidade
  for each row execute function app.registrar_auditoria();

-- -----------------------------------------------------------------------------
-- Parte 2 — integridade entre unidades (T006, research R2; salvaguardas S1 e S3)
-- -----------------------------------------------------------------------------

-- A conta nasce na unidade informada pela Edge Function; master (meta `master`) sem unidade;
-- sem informação, a unidade inicial — só enquanto houver uma única unidade (S1).
create or replace function app.criar_perfil_do_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_unidade uuid;
begin
  if coalesce((new.raw_user_meta_data ->> 'master')::boolean, false) then
    v_unidade := null;
  elsif nullif(new.raw_user_meta_data ->> 'unidade_id', '') is not null then
    v_unidade := (new.raw_user_meta_data ->> 'unidade_id')::uuid;
  else
    v_unidade := app.unidade_inicial();
  end if;
  insert into public.perfis (id, nome, unidade_id)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
          v_unidade);
  return new;
end;
$$;

-- A unidade da conta não muda depois de definida; master nunca tem unidade.
create function app.proteger_unidade_do_perfil()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.unidade_id is distinct from old.unidade_id then
    raise exception 'A unidade da conta não muda.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger perfis_unidade_fixa before update of unidade_id on public.perfis
  for each row execute function app.proteger_unidade_do_perfil();

create function app.validar_master()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select unidade_id from public.perfis where id = new.usuario_id) is not null then
    raise exception 'Conta de unidade não vira master.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger masters_sem_unidade before insert or update on public.masters
  for each row execute function app.validar_master();

-- Atribuição: mesma unidade da edição; master nunca; papel de equipe exige a função na unidade.
-- Sem pessoa autenticada (administração do banco, seed, fixtures), a função é concedida junto.
create function app.validar_atribuicao_na_unidade()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_unidade_conta uuid;
  v_unidade_edicao uuid;
begin
  if not new.ativo then return new; end if;
  if exists (select 1 from public.masters where usuario_id = new.usuario_id) then
    raise exception 'Conta master não participa de edições.' using errcode = '23514';
  end if;
  select unidade_id into v_unidade_conta from public.perfis where id = new.usuario_id;
  select unidade_id into v_unidade_edicao from public.edicoes where id = new.edicao_id;
  if v_unidade_conta is distinct from v_unidade_edicao then
    raise exception 'A pessoa não pertence à unidade desta edição.' using errcode = '23514';
  end if;
  if new.papel in ('coordenacao', 'docente', 'mentor') and not exists (
    select 1 from public.funcoes_unidade f
    where f.usuario_id = new.usuario_id and f.funcao::text = new.papel::text and f.ativa
  ) then
    if (select auth.uid()) is null then
      insert into public.funcoes_unidade (usuario_id, funcao) values (new.usuario_id, new.papel::text::public.funcao_unidade)
      on conflict (usuario_id, funcao) do update set ativa = true;
    else
      raise exception 'A pessoa não tem a função % na unidade. Peça à gestão da unidade.',
        case new.papel when 'coordenacao' then 'coordenação' when 'docente' then 'docente' else 'mentor' end
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger atribuicoes_na_unidade after insert or update of ativo, papel, usuario_id, edicao_id on public.atribuicoes
  for each row execute function app.validar_atribuicao_na_unidade();

-- Turma do cadastro vinculada à edição: mesma unidade.
create function app.validar_curso_do_cadastro_na_unidade()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cadastro_curso_id is not null and (select unidade_id from public.cadastro_cursos where id = new.cadastro_curso_id)
     is distinct from (select unidade_id from public.edicoes where id = new.edicao_id) then
    raise exception 'O curso do cadastro é de outra unidade.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger cursos_cadastro_na_unidade before insert or update of cadastro_curso_id, edicao_id on public.cursos
  for each row execute function app.validar_curso_do_cadastro_na_unidade();

-- -----------------------------------------------------------------------------
-- Parte 3 — auxiliares de permissão com unidade ativa e sessão (T008, R2 e R8)
-- -----------------------------------------------------------------------------
create function app.e_master()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.masters where usuario_id = (select auth.uid()) and ativo);
$$;

create function app.unidade_do_usuario()
returns uuid language sql stable security definer set search_path = '' as $$
  select unidade_id from public.perfis where id = (select auth.uid());
$$;

-- Função ativa na própria unidade, com a unidade ativa (FR-006b, FR-009).
create function app.tem_funcao(p_funcao public.funcao_unidade)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.funcoes_unidade f
    join public.perfis p on p.id = f.usuario_id
    join public.unidades u on u.id = p.unidade_id and u.ativa
    where f.usuario_id = (select auth.uid()) and f.funcao = p_funcao and f.ativa and p.ativo
  );
$$;

-- Os auxiliares centrais passam a exigir a unidade da edição ativa: unidade desativada perde o
-- acesso em toda política e RPC por edição (FR-009). Atribuições nunca cruzam unidades (parte 2).
create or replace function app.tem_papel(p_edicao uuid, p_papeis public.papel[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    join public.edicoes e on e.id = a.edicao_id
    join public.unidades u on u.id = e.unidade_id and u.ativa
    where a.usuario_id = (select auth.uid())
      and a.edicao_id = p_edicao
      and a.papel = any (p_papeis)
      and a.ativo
  );
$$;

create or replace function app.participa_da_edicao(p_edicao uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    join public.edicoes e on e.id = a.edicao_id
    join public.unidades u on u.id = e.unidade_id and u.ativa
    where a.usuario_id = (select auth.uid()) and a.edicao_id = p_edicao and a.ativo
  );
$$;

create or replace function app.e_coordenacao_em_alguma()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    join public.edicoes e on e.id = a.edicao_id
    join public.unidades u on u.id = e.unidade_id and u.ativa
    where a.usuario_id = (select auth.uid()) and a.papel = 'coordenacao' and a.ativo
  );
$$;

create or replace function app.coordena_alguma_edicao()
returns boolean language sql stable security definer set search_path = '' as $$
  select app.e_coordenacao_em_alguma();
$$;

-- Sessão (R8): nome, master, unidade (com a situação), funções e papéis ativos.
create function public.minha_conta()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'nome', p.nome,
    'master', exists (select 1 from public.masters m where m.usuario_id = p.id and m.ativo),
    'unidade', (select jsonb_build_object('id', u.id, 'nome', u.nome, 'ativa', u.ativa)
                from public.unidades u where u.id = p.unidade_id),
    'funcoes', coalesce((select jsonb_agg(f.funcao order by f.funcao::text) from public.funcoes_unidade f
                         where f.usuario_id = p.id and f.ativa), '[]'::jsonb),
    'papeis', coalesce((select jsonb_agg(distinct a.papel) from public.atribuicoes a
                        where a.usuario_id = p.id and a.ativo), '[]'::jsonb))
  from public.perfis p where p.id = (select auth.uid());
$$;

revoke all on function app.e_master(), app.unidade_do_usuario(), app.tem_funcao(public.funcao_unidade)
  from public, anon;
grant execute on function app.e_master(), app.unidade_do_usuario(), app.tem_funcao(public.funcao_unidade)
  to authenticated;
revoke all on function public.minha_conta() from public, anon;
grant execute on function public.minha_conta() to authenticated;

-- -----------------------------------------------------------------------------
-- Parte 4 — RPCs do master (T015, FR-001 a FR-004, FR-014; research R4 e R6)
-- O master é da rede: cadastra unidades, contas de gestão e masters; não lê dados de edição.
-- -----------------------------------------------------------------------------
alter table public.unidades add column chave_envio uuid unique;

create function app.exigir_master()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.e_master() then
    raise exception 'Somente o master faz isso.' using errcode = '42501';
  end if;
end;
$$;

-- "ativo" ou "aguardando" (convite ainda não usado), como `situacao_de_acesso` (ADR 0009).
create function app.situacao_do_acesso(p_usuario uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case when (c.criado_em is null or c.usado_em is not null
                    or (u.last_sign_in_at is not null and u.last_sign_in_at > c.criado_em))
              then 'ativo' else 'aguardando' end
  from auth.users u
  left join lateral (
    select ci.usado_em, ci.criado_em from public.convites_acesso ci
    where ci.usuario_id = u.id order by ci.criado_em desc limit 1
  ) c on true
  where u.id = p_usuario;
$$;

create function public.unidades_da_rede()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_master();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', u.id, 'nome', u.nome, 'ativa', u.ativa, 'desativadaEm', u.desativada_em,
      'justificativaDesativacao', u.justificativa_desativacao,
      'gestao', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'usuarioId', p.id, 'nome', p.nome, 'email', au.email,
                 'situacaoAcesso', app.situacao_do_acesso(p.id), 'ativa', f.ativa) order by p.nome, p.id)
        from public.funcoes_unidade f
        join public.perfis p on p.id = f.usuario_id and p.unidade_id = u.id
        join auth.users au on au.id = p.id
        where f.funcao = 'gestao'), '[]'::jsonb))
      order by lower(u.nome), u.id)
    from public.unidades u), '[]'::jsonb);
end;
$$;

create function public.cadastrar_unidade(p_chave uuid, p_nome text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_nome text := btrim(coalesce(p_nome, ''));
  v_id uuid;
begin
  perform app.exigir_master();
  select id into v_id from public.unidades where chave_envio = p_chave;
  if found then return v_id; end if;
  if char_length(v_nome) not between 2 and 120 then
    raise exception 'O nome da unidade deve ter de 2 a 120 caracteres.' using errcode = '23514';
  end if;
  if exists (select 1 from public.unidades where lower(btrim(nome)) = lower(v_nome)) then
    raise exception 'Já existe uma unidade com esse nome.' using errcode = '23514';
  end if;
  insert into public.unidades (nome, chave_envio) values (v_nome, p_chave) returning id into v_id;
  return v_id;
end;
$$;

create function public.renomear_unidade(p_id uuid, p_nome text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_nome text := btrim(coalesce(p_nome, ''));
begin
  perform app.exigir_master();
  if not exists (select 1 from public.unidades where id = p_id) then
    raise exception 'Unidade não encontrada.' using errcode = '23514';
  end if;
  if char_length(v_nome) not between 2 and 120 then
    raise exception 'O nome da unidade deve ter de 2 a 120 caracteres.' using errcode = '23514';
  end if;
  if exists (select 1 from public.unidades where id <> p_id and lower(btrim(nome)) = lower(v_nome)) then
    raise exception 'Já existe uma unidade com esse nome.' using errcode = '23514';
  end if;
  update public.unidades set nome = v_nome where id = p_id and nome is distinct from v_nome;
end;
$$;

create function public.definir_situacao_unidade(p_id uuid, p_ativa boolean, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.unidades;
  v_justificativa text;
begin
  perform app.exigir_master();
  select * into v from public.unidades where id = p_id for update;
  if not found then
    raise exception 'Unidade não encontrada.' using errcode = '23514';
  end if;
  if p_ativa is null then
    raise exception 'Informe se a unidade fica ativa ou desativada.' using errcode = '23514';
  end if;
  if p_ativa = v.ativa then return; end if;
  if p_ativa then
    update public.unidades set ativa = true, desativada_em = null, justificativa_desativacao = null where id = p_id;
  else
    v_justificativa := app.exigir_justificativa(p_justificativa);
    perform set_config('app.justificativa', v_justificativa, true);
    update public.unidades set ativa = false, desativada_em = now(), justificativa_desativacao = v_justificativa
    where id = p_id;
    perform set_config('app.justificativa', '', true);
  end if;
end;
$$;

-- Concede ou retira a função de gestão de uma conta já criada na unidade (a Edge Function cria a
-- conta com a unidade; o master concede aqui). A unidade nunca fica sem gestão depois de ter uma.
create function public.definir_gestao(p_usuario uuid, p_ativa boolean, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_unidade uuid;
  v_justificativa text;
begin
  perform app.exigir_master();
  select unidade_id into v_unidade from public.perfis where id = p_usuario;
  if v_unidade is null then
    raise exception 'Conta de unidade não encontrada.' using errcode = '23514';
  end if;
  if p_ativa is null then
    raise exception 'Informe se a conta tem ou não a função de gestão.' using errcode = '23514';
  end if;
  if p_ativa then
    v_justificativa := nullif(btrim(coalesce(p_justificativa, '')), '');
    perform set_config('app.justificativa', coalesce(v_justificativa, ''), true);
    insert into public.funcoes_unidade (usuario_id, funcao) values (p_usuario, 'gestao')
    on conflict (usuario_id, funcao) do update set ativa = true where not public.funcoes_unidade.ativa;
  else
    v_justificativa := app.exigir_justificativa(p_justificativa);
    if not exists (
      select 1 from public.funcoes_unidade f join public.perfis p on p.id = f.usuario_id
      where f.funcao = 'gestao' and f.ativa and p.ativo and p.unidade_id = v_unidade and f.usuario_id <> p_usuario
    ) then
      raise exception 'A unidade precisa manter ao menos uma conta de gestão ativa.' using errcode = '23514';
    end if;
    perform set_config('app.justificativa', v_justificativa, true);
    update public.funcoes_unidade set ativa = false where usuario_id = p_usuario and funcao = 'gestao' and ativa;
  end if;
  perform set_config('app.justificativa', '', true);
end;
$$;

create function public.masters_da_rede()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_master();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'usuarioId', p.id, 'nome', p.nome, 'email', au.email,
      'situacaoAcesso', app.situacao_do_acesso(p.id), 'ativo', m.ativo) order by p.nome, p.id)
    from public.masters m
    join public.perfis p on p.id = m.usuario_id
    join auth.users au on au.id = p.id), '[]'::jsonb);
end;
$$;

create function public.definir_master(p_usuario uuid, p_ativo boolean, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_justificativa text;
begin
  perform app.exigir_master();
  if p_ativo is null then
    raise exception 'Informe se a conta é ou não master.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.perfis where id = p_usuario) then
    raise exception 'Conta não encontrada.' using errcode = '23514';
  end if;
  if p_ativo then
    -- O gatilho `masters_sem_unidade` recusa conta de unidade.
    perform set_config('app.justificativa', coalesce(nullif(btrim(coalesce(p_justificativa, '')), ''), ''), true);
    insert into public.masters (usuario_id) values (p_usuario)
    on conflict (usuario_id) do update set ativo = true where not public.masters.ativo;
  else
    if p_usuario = (select auth.uid()) then
      raise exception 'Ninguém desativa o próprio acesso de master.' using errcode = '23514';
    end if;
    v_justificativa := app.exigir_justificativa(p_justificativa);
    if not exists (select 1 from public.masters where ativo and usuario_id <> p_usuario) then
      raise exception 'A rede precisa manter ao menos um master ativo.' using errcode = '23514';
    end if;
    perform set_config('app.justificativa', v_justificativa, true);
    update public.masters set ativo = false where usuario_id = p_usuario and ativo;
  end if;
  perform set_config('app.justificativa', '', true);
end;
$$;

-- Primeiro master: só a administração do banco (sem `grant` a anon/authenticated).
create function app.promover_master(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select u.id into v_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'Conta não encontrada.' using errcode = '23514';
  end if;
  insert into public.masters (usuario_id) values (v_id)
  on conflict (usuario_id) do update set ativo = true where not public.masters.ativo;
end;
$$;

revoke all on function app.exigir_master(), app.situacao_do_acesso(uuid), app.promover_master(text)
  from public, anon, authenticated;
revoke all on function public.unidades_da_rede(), public.cadastrar_unidade(uuid, text),
  public.renomear_unidade(uuid, text), public.definir_situacao_unidade(uuid, boolean, text),
  public.definir_gestao(uuid, boolean, text), public.masters_da_rede(),
  public.definir_master(uuid, boolean, text) from public, anon;
grant execute on function public.unidades_da_rede(), public.cadastrar_unidade(uuid, text),
  public.renomear_unidade(uuid, text), public.definir_situacao_unidade(uuid, boolean, text),
  public.definir_gestao(uuid, boolean, text), public.masters_da_rede(),
  public.definir_master(uuid, boolean, text) to authenticated;

-- Convites de contas de rede e de unidade não têm edição (spec 016): a coluna passa a ser opcional.
alter table public.convites_acesso alter column edicao_id drop not null;

-- -----------------------------------------------------------------------------
-- Parte 5 — gestão da unidade, edições e analista (T022, FR-005 a FR-008; research R5 a R7)
-- Função na unidade NÃO dá acesso a dado: o acesso a uma edição continua vindo da atribuição
-- (coordenação, docência) e, para o analista, da função `analista` na unidade da edição.
-- -----------------------------------------------------------------------------

-- 5.1 Cadastro permanente por unidade (spec 010): cada unidade tem o seu; nada cruza.
create or replace function app.ligar_ao_cadastro()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_curso_cadastro uuid;
  v_unidade uuid;
begin
  if tg_table_name = 'cursos' then
    if new.cadastro_curso_id is null then
      select unidade_id into v_unidade from public.edicoes where id = new.edicao_id;
      select id into new.cadastro_curso_id from public.cadastro_cursos
      where unidade_id = v_unidade and lower(btrim(nome)) = lower(btrim(new.nome));
      if new.cadastro_curso_id is null then
        insert into public.cadastro_cursos (nome, categoria, unidade_id)
        values (btrim(new.nome), btrim(new.categoria), v_unidade)
        returning id into new.cadastro_curso_id;
      end if;
    end if;
  else
    if new.cadastro_turma_id is null then
      select cadastro_curso_id into v_curso_cadastro from public.cursos where id = new.curso_id;
      select id into new.cadastro_turma_id from public.cadastro_turmas
      where cadastro_curso_id = v_curso_cadastro and lower(btrim(nome)) = lower(btrim(new.nome));
      if new.cadastro_turma_id is null then
        insert into public.cadastro_turmas (cadastro_curso_id, nome, ano_letivo)
        values (v_curso_cadastro, btrim(new.nome), new.ano_letivo)
        returning id into new.cadastro_turma_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.salvar_curso_do_cadastro(p_id uuid, p_nome text, p_categoria text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_id;
  v_unidade uuid := app.unidade_do_usuario();
begin
  perform app.exigir_quem_coordena();
  if exists (select 1 from public.cadastro_cursos
             where unidade_id = v_unidade and lower(btrim(nome)) = lower(btrim(p_nome)) and id is distinct from p_id) then
    raise exception 'Já existe um curso com esse nome no cadastro.' using errcode = '23514';
  end if;
  if v_id is null then
    insert into public.cadastro_cursos (nome, categoria, unidade_id) values (btrim(p_nome), btrim(p_categoria), v_unidade)
    returning id into v_id;
  else
    update public.cadastro_cursos set nome = btrim(p_nome), categoria = btrim(p_categoria)
    where id = v_id and unidade_id = v_unidade and (nome <> btrim(p_nome) or categoria <> btrim(p_categoria));
    if not exists (select 1 from public.cadastro_cursos where id = v_id and unidade_id = v_unidade) then
      raise exception 'Curso não encontrado no cadastro.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.salvar_turma_do_cadastro(p_id uuid, p_curso uuid, p_nome text, p_ano_letivo integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id;
begin
  perform app.exigir_quem_coordena();
  if not exists (select 1 from public.cadastro_cursos where id = p_curso and unidade_id = app.unidade_do_usuario()) then
    raise exception 'Curso não encontrado no cadastro.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.cadastro_turmas
             where cadastro_curso_id = p_curso and lower(btrim(nome)) = lower(btrim(p_nome))
               and id is distinct from p_id) then
    raise exception 'Já existe uma turma com esse nome neste curso.' using errcode = '23514';
  end if;
  if v_id is null then
    insert into public.cadastro_turmas (cadastro_curso_id, nome, ano_letivo)
    values (p_curso, btrim(p_nome), p_ano_letivo)
    returning id into v_id;
  else
    update public.cadastro_turmas set nome = btrim(p_nome), ano_letivo = p_ano_letivo
    where id = v_id and cadastro_curso_id = p_curso
      and (nome <> btrim(p_nome) or ano_letivo is distinct from p_ano_letivo);
    if not exists (select 1 from public.cadastro_turmas where id = v_id and cadastro_curso_id = p_curso) then
      raise exception 'Turma não encontrada no cadastro.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.apagar_do_cadastro(p_tipo text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_unidade uuid := app.unidade_do_usuario();
begin
  perform app.exigir_quem_coordena();
  if p_tipo = 'curso' then
    if not exists (select 1 from public.cadastro_cursos where id = p_id and unidade_id = v_unidade) then
      raise exception 'Curso não encontrado no cadastro.' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.cadastro_turmas where cadastro_curso_id = p_id) then
      raise exception 'Apague antes as turmas deste curso.' using errcode = '23514';
    end if;
    if exists (select 1 from public.cursos where cadastro_curso_id = p_id) then
      raise exception 'Este curso participa ou participou de uma edição e não pode ser apagado.' using errcode = '23514';
    end if;
    delete from public.cadastro_cursos where id = p_id;
  elsif p_tipo = 'turma' then
    if not exists (select 1 from public.cadastro_turmas kt join public.cadastro_cursos k on k.id = kt.cadastro_curso_id
                   where kt.id = p_id and k.unidade_id = v_unidade) then
      raise exception 'Turma não encontrada no cadastro.' using errcode = 'P0002';
    end if;
    if exists (select 1 from public.turmas where cadastro_turma_id = p_id) then
      raise exception 'Esta turma participa ou participou de uma edição e não pode ser apagada.' using errcode = '23514';
    end if;
    delete from public.cadastro_turmas where id = p_id;
  else
    raise exception 'Tipo inválido: use curso ou turma.' using errcode = '23514';
  end if;
end;
$$;

create or replace function public.cadastro()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_quem_coordena();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', k.id, 'nome', k.nome, 'categoria', k.categoria,
             'turmas', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', kt.id, 'nome', kt.nome, 'anoLetivo', kt.ano_letivo,
                        'edicoes', coalesce((
                          select jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'estado', e.estado)
                                           order by e.inicio desc nulls last, e.criado_em desc)
                          from public.turmas t join public.cursos c on c.id = t.curso_id
                          join public.edicoes e on e.id = c.edicao_id
                          where t.cadastro_turma_id = kt.id), '[]'::jsonb))
                      order by kt.nome)
               from public.cadastro_turmas kt where kt.cadastro_curso_id = k.id), '[]'::jsonb))
           order by k.nome)
    from public.cadastro_cursos k where k.unidade_id = app.unidade_do_usuario()), '[]'::jsonb);
end;
$$;

drop policy cadastro_cursos_ler on public.cadastro_cursos;
create policy cadastro_cursos_ler on public.cadastro_cursos for select to authenticated
  using (app.coordena_alguma_edicao() and unidade_id = app.unidade_do_usuario());
drop policy cadastro_turmas_ler on public.cadastro_turmas;
create policy cadastro_turmas_ler on public.cadastro_turmas for select to authenticated
  using (app.coordena_alguma_edicao() and exists (
    select 1 from public.cadastro_cursos k
    where k.id = cadastro_curso_id and k.unidade_id = app.unidade_do_usuario()));

-- 5.2 Auxiliares
create function app.exigir_gestao()
returns uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.tem_funcao('gestao') then
    raise exception 'Somente a gestão da unidade faz isso.' using errcode = '42501';
  end if;
  return app.unidade_do_usuario();
end;
$$;

-- Analista: função ativa na unidade da edição (a unidade precisa estar ativa).
create function app.e_analista_da_edicao(p_edicao uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.funcoes_unidade f
    join public.perfis p on p.id = f.usuario_id and p.ativo
    join public.unidades u on u.id = p.unidade_id and u.ativa
    join public.edicoes e on e.id = p_edicao and e.unidade_id = p.unidade_id
    where f.usuario_id = (select auth.uid()) and f.funcao = 'analista' and f.ativa
  );
$$;

-- Última coordenação ativa de alguma edição não encerrada (retirar a pessoa deixaria a edição sem dono).
create function app.e_ultima_coordenacao(p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    join public.edicoes e on e.id = a.edicao_id and e.estado <> 'encerrada'
    where a.usuario_id = p_usuario and a.papel = 'coordenacao' and a.ativo
      and not exists (select 1 from public.atribuicoes o
                      where o.edicao_id = a.edicao_id and o.papel = 'coordenacao' and o.ativo and o.usuario_id <> p_usuario)
  );
$$;

-- 5.3 Equipe da unidade (sem estudantes: só quem tem função)
create function public.equipe_da_unidade()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_unidade uuid := app.exigir_gestao();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'usuarioId', p.id, 'nome', p.nome, 'email', au.email,
      'funcoes', coalesce((select jsonb_agg(f.funcao order by f.funcao::text) from public.funcoes_unidade f
                           where f.usuario_id = p.id and f.ativa), '[]'::jsonb),
      'situacaoAcesso', app.situacao_do_acesso(p.id), 'ativo', p.ativo) order by p.nome, p.id)
    from public.perfis p join auth.users au on au.id = p.id
    where p.unidade_id = v_unidade and exists (select 1 from public.funcoes_unidade f where f.usuario_id = p.id)), '[]'::jsonb);
end;
$$;

create function public.definir_funcoes(p_usuario uuid, p_funcoes public.funcao_unidade[], p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_unidade uuid := app.exigir_gestao();
  v_justificativa text;
  v_funcao public.funcao_unidade;
begin
  if (select unidade_id from public.perfis where id = p_usuario) is distinct from v_unidade then
    raise exception 'Esta conta não é da sua unidade.' using errcode = '42501';
  end if;
  if p_funcoes is null or cardinality(p_funcoes) = 0 then
    raise exception 'Escolha ao menos uma função. Para tirar a pessoa da equipe, desative a conta.' using errcode = '23514';
  end if;
  if 'gestao' = any (p_funcoes) then
    raise exception 'A função de gestão só o master concede.' using errcode = '23514';
  end if;
  v_justificativa := app.exigir_justificativa(p_justificativa);
  -- Tirar uma função só é possível sem vínculos ativos de mesmo nome em edições em andamento.
  for v_funcao in
    select f.funcao from public.funcoes_unidade f
    where f.usuario_id = p_usuario and f.ativa and f.funcao in ('coordenacao', 'docente', 'mentor')
      and f.funcao <> all (p_funcoes)
  loop
    if v_funcao = 'coordenacao' and app.e_ultima_coordenacao(p_usuario) then
      raise exception 'Indique outra coordenação antes.' using errcode = '23514';
    end if;
    if exists (select 1 from public.atribuicoes a join public.edicoes e on e.id = a.edicao_id and e.estado <> 'encerrada'
               where a.usuario_id = p_usuario and a.ativo and a.papel::text = v_funcao::text) then
      raise exception 'A pessoa ainda tem vínculos de % em edições em andamento. Desfaça-os antes.',
        case v_funcao when 'coordenacao' then 'coordenação' when 'docente' then 'docência' else 'mentoria' end
        using errcode = '23514';
    end if;
  end loop;
  perform set_config('app.justificativa', v_justificativa, true);
  insert into public.funcoes_unidade (usuario_id, funcao)
  select p_usuario, f from unnest(p_funcoes) f
  on conflict (usuario_id, funcao) do update set ativa = true where not public.funcoes_unidade.ativa;
  update public.funcoes_unidade set ativa = false
  where usuario_id = p_usuario and ativa and funcao <> 'gestao' and funcao <> all (p_funcoes);
  perform set_config('app.justificativa', '', true);
end;
$$;

create function public.desativar_membro(p_usuario uuid, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_unidade uuid := app.exigir_gestao();
  v_justificativa text;
begin
  if (select unidade_id from public.perfis where id = p_usuario) is distinct from v_unidade then
    raise exception 'Esta conta não é da sua unidade.' using errcode = '42501';
  end if;
  if p_usuario = (select auth.uid()) then
    raise exception 'Ninguém desativa a própria conta.' using errcode = '23514';
  end if;
  if exists (select 1 from public.funcoes_unidade where usuario_id = p_usuario and funcao = 'gestao') then
    raise exception 'Contas de gestão só o master altera.' using errcode = '42501';
  end if;
  v_justificativa := app.exigir_justificativa(p_justificativa);
  if app.e_ultima_coordenacao(p_usuario) then
    raise exception 'Indique outra coordenação antes.' using errcode = '23514';
  end if;
  perform set_config('app.justificativa', v_justificativa, true);
  -- Vínculos em edições em andamento (as derivadas de mentor seguem pelo gatilho de sincronia).
  update public.atribuicoes a set ativo = false
  where a.usuario_id = p_usuario and a.ativo and a.origem_id is null
    and exists (select 1 from public.edicoes e where e.id = a.edicao_id and e.unidade_id = v_unidade and e.estado <> 'encerrada');
  update public.funcoes_unidade set ativa = false where usuario_id = p_usuario and ativa;
  update public.perfis set ativo = false where id = p_usuario and ativo;
  perform set_config('app.justificativa', '', true);
end;
$$;

create function public.reativar_membro(p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_unidade uuid := app.exigir_gestao();
begin
  if (select unidade_id from public.perfis where id = p_usuario) is distinct from v_unidade then
    raise exception 'Esta conta não é da sua unidade.' using errcode = '42501';
  end if;
  if exists (select 1 from public.funcoes_unidade where usuario_id = p_usuario and funcao = 'gestao') then
    raise exception 'Contas de gestão só o master altera.' using errcode = '42501';
  end if;
  update public.perfis set ativo = true where id = p_usuario and not ativo;
  update public.funcoes_unidade set ativa = true where usuario_id = p_usuario and not ativa;
end;
$$;

-- 5.4 Edições: a gestão (indicando a coordenação) ou a coordenação (ela mesma) cria na unidade.
drop function public.criar_edicao(uuid, text, date, date, uuid);
create function public.criar_edicao(
  p_chave uuid, p_nome text, p_inicio date, p_fim date, p_base_edicao uuid, p_coordenacao uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_regras jsonb;
  v_versao text;
  v_unidade uuid := app.unidade_do_usuario();
  v_gestao boolean := app.tem_funcao('gestao');
  v_responsavel uuid;
begin
  if not (v_gestao or app.coordena_alguma_edicao()) then
    raise exception 'Somente a gestão ou a coordenação da unidade cria edições.' using errcode = '42501';
  end if;
  select id into v_id from public.edicoes where chave_envio = p_chave and unidade_id = v_unidade;
  if found then
    return v_id;
  end if;
  perform app.validar_dados_da_edicao(p_nome, p_inicio, p_fim);
  if p_coordenacao is not null then
    v_responsavel := p_coordenacao;
  elsif app.coordena_alguma_edicao() then
    v_responsavel := (select auth.uid());
  else
    raise exception 'Indique a coordenação da edição.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.perfis p join public.funcoes_unidade f
      on f.usuario_id = p.id and f.funcao = 'coordenacao' and f.ativa
    where p.id = v_responsavel and p.unidade_id = v_unidade and p.ativo
  ) then
    raise exception 'A pessoa indicada não tem a função de coordenação na unidade.' using errcode = '23514';
  end if;
  if p_base_edicao is null then
    v_regras := app.regras_piloto();
    v_versao := v_regras ->> 'versao';
  else
    if not (app.e_coordenacao(p_base_edicao)
            or (v_gestao and exists (select 1 from public.edicoes where id = p_base_edicao and unidade_id = v_unidade))) then
      raise exception 'Só é possível copiar as regras de uma edição que você coordena.' using errcode = '42501';
    end if;
    select regras, regras_versao into v_regras, v_versao from public.edicoes where id = p_base_edicao;
  end if;
  -- Reenvio simultâneo com a mesma chave: o segundo espera o primeiro e devolve a mesma edição.
  insert into public.edicoes (nome, inicio, fim, estado, regras, regras_versao, chave_envio, unidade_id)
  values (btrim(p_nome), p_inicio, p_fim, 'rascunho', v_regras, v_versao, p_chave, v_unidade)
  on conflict (chave_envio) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.edicoes where chave_envio = p_chave and unidade_id = v_unidade;
    if v_id is null then
      raise exception 'Chave de envio já usada.' using errcode = '23514';
    end if;
    return v_id;
  end if;
  insert into public.atribuicoes (usuario_id, edicao_id, papel, concedido_por)
  values (v_responsavel, v_id, 'coordenacao', (select auth.uid()));
  return v_id;
end;
$$;

create function public.definir_coordenacao_da_edicao(p_edicao uuid, p_usuario uuid, p_ativa boolean, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_unidade uuid;
  v_gestao boolean;
  v_atribuicao public.atribuicoes;
  v_justificativa text;
begin
  select unidade_id into v_unidade from public.edicoes where id = p_edicao;
  v_gestao := app.tem_funcao('gestao') and v_unidade is not distinct from app.unidade_do_usuario();
  if v_unidade is null or not (v_gestao or app.e_coordenacao(p_edicao)) then
    raise exception 'Somente a gestão da unidade ou a coordenação da edição indica a coordenação.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_nao_encerrada(p_edicao);
  if p_ativa is null then
    raise exception 'Informe se a pessoa entra ou sai da coordenação.' using errcode = '23514';
  end if;
  if (select unidade_id from public.perfis where id = p_usuario) is distinct from v_unidade then
    raise exception 'A pessoa não é da unidade desta edição.' using errcode = '42501';
  end if;
  if p_ativa then
    if not exists (select 1 from public.perfis p join public.funcoes_unidade f
                     on f.usuario_id = p.id and f.funcao = 'coordenacao' and f.ativa
                   where p.id = p_usuario and p.ativo) then
      raise exception 'A pessoa indicada não tem a função de coordenação na unidade.' using errcode = '23514';
    end if;
    select * into v_atribuicao from public.atribuicoes
    where edicao_id = p_edicao and usuario_id = p_usuario and papel = 'coordenacao' for update;
    if not found then
      insert into public.atribuicoes (usuario_id, edicao_id, papel, concedido_por)
      values (p_usuario, p_edicao, 'coordenacao', (select auth.uid()));
    elsif not v_atribuicao.ativo then
      update public.atribuicoes set ativo = true where id = v_atribuicao.id;
    end if;
  else
    v_justificativa := app.exigir_justificativa(p_justificativa);
    if p_usuario = (select auth.uid()) and not v_gestao then
      raise exception 'Ninguém altera a própria atribuição.' using errcode = '42501';
    end if;
    if not exists (select 1 from public.atribuicoes where edicao_id = p_edicao and papel = 'coordenacao' and ativo
                   and usuario_id <> p_usuario) then
      raise exception 'Indique outra coordenação antes.' using errcode = '23514';
    end if;
    perform set_config('app.justificativa', v_justificativa, true);
    update public.atribuicoes set ativo = false
    where edicao_id = p_edicao and usuario_id = p_usuario and papel = 'coordenacao' and ativo;
    perform set_config('app.justificativa', '', true);
  end if;
end;
$$;

-- Edições da unidade (gestão e analista): estado e coordenações, sem dados de estudantes.
create function public.edicoes_da_unidade()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_unidade uuid;
begin
  if not (app.tem_funcao('gestao') or app.tem_funcao('analista')) then
    raise exception 'Somente a gestão e o analista da unidade veem as edições da unidade.' using errcode = '42501';
  end if;
  v_unidade := app.unidade_do_usuario();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'inicio', e.inicio, 'fim', e.fim, 'estado', e.estado,
      'coordenacao', coalesce((
        select jsonb_agg(jsonb_build_object('usuarioId', p.id, 'nome', p.nome, 'ativa', a.ativo) order by p.nome, p.id)
        from public.atribuicoes a join public.perfis p on p.id = a.usuario_id
        where a.edicao_id = e.id and a.papel = 'coordenacao'), '[]'::jsonb))
      order by case e.estado when 'ativa' then 0 when 'rascunho' then 1 else 2 end,
               e.inicio desc nulls last, e.criado_em desc, e.id)
    from public.edicoes e where e.unidade_id = v_unidade), '[]'::jsonb);
end;
$$;

-- 5.5 Busca de pessoas para vincular: da unidade da edição; equipe com função ativa ou participantes
-- das edições que a pessoa coordena (estudantes com conta).
create or replace function public.pessoas_para_vincular(p_edicao uuid, p_busca text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_unidade uuid;
begin
  perform app.exigir_coordenacao_de(p_edicao);
  select unidade_id into v_unidade from public.edicoes where id = p_edicao;
  return coalesce((
    select jsonb_agg(jsonb_build_object('usuarioId', x.id, 'nome', x.nome) order by x.nome)
    from (
      select p.id, p.nome
      from public.perfis p
      where p.ativo and p.unidade_id = v_unidade and p.id <> (select auth.uid())
        and (exists (select 1 from public.funcoes_unidade f
                     where f.usuario_id = p.id and f.ativa and f.funcao in ('coordenacao', 'docente', 'mentor', 'analista'))
             -- estudantes e demais participantes das edições que a pessoa coordena (spec 010, FR-007)
             or exists (select 1 from public.atribuicoes a
                        where a.usuario_id = p.id and a.ativo and app.e_coordenacao(a.edicao_id)))
        and p.nome ilike '%' || coalesce(btrim(p_busca), '') || '%'
      order by p.nome
      limit 20
    ) x), '[]'::jsonb);
end;
$$;

revoke all on function app.exigir_gestao(), app.e_analista_da_edicao(uuid), app.e_ultima_coordenacao(uuid)
  from public, anon;
grant execute on function app.exigir_gestao(), app.e_analista_da_edicao(uuid), app.e_ultima_coordenacao(uuid)
  to authenticated;
revoke all on function public.equipe_da_unidade(), public.definir_funcoes(uuid, public.funcao_unidade[], text),
  public.desativar_membro(uuid, text), public.reativar_membro(uuid),
  public.criar_edicao(uuid, text, date, date, uuid, uuid),
  public.definir_coordenacao_da_edicao(uuid, uuid, boolean, text), public.edicoes_da_unidade()
  from public, anon;
grant execute on function public.equipe_da_unidade(), public.definir_funcoes(uuid, public.funcao_unidade[], text),
  public.desativar_membro(uuid, text), public.reativar_membro(uuid),
  public.criar_edicao(uuid, text, date, date, uuid, uuid),
  public.definir_coordenacao_da_edicao(uuid, uuid, boolean, text), public.edicoes_da_unidade()
  to authenticated;

-- 5.6 Analista (spec 016, FR-006a): lê o painel e os relatórios da própria unidade; revisões só a
-- coordenação (a checagem de `relatorio` para 'revisoes' continua `e_coordenacao`).
CREATE OR REPLACE FUNCTION public.painel_da_coordenacao(p_edicao uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  -- Spec 016: o analista da unidade da edição também lê o painel (só leitura).
  if not app.e_analista_da_edicao(p_edicao) then
    perform app.exigir_coordenacao_da_edicao(p_edicao, 'O painel da edição é só para a coordenação.');
  end if;
  return jsonb_build_object(
    'indicadores', jsonb_build_object(
      'cursos', (select count(*) from public.cursos where edicao_id = p_edicao),
      'turmas', (select count(*) from public.turmas t join public.cursos c on c.id = t.curso_id
                 where c.edicao_id = p_edicao),
      'equipes', (select count(*) from public.duplas where edicao_id = p_edicao and ativa),
      'estudantes', (select count(*) from public.atribuicoes
                     where edicao_id = p_edicao and papel = 'aluno' and ativo),
      'encontrosRealizados', (select count(*) from public.encontros e
                              where e.edicao_id = p_edicao and app.encontro_realizado(e.id)),
      'encontrosTotal', (select count(*) from public.encontros e
                         where e.edicao_id = p_edicao and e.estado <> 'cancelado')),
    -- Spec 012: pendências dos encontros realizados e última publicação por turma (FR-015).
    'turmas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'turmaId', x.id, 'turma', x.nome, 'categoria', x.categoria,
               'componentesPendentes', jsonb_array_length(x.pend -> 'componentes'),
               'provasPendentes', app.provas_pendentes_da_turma(x.id),
               'ocorrenciasSemDecisao', jsonb_array_length(x.pend -> 'ocorrencias'),
               'revisoesAbertas', jsonb_array_length(x.pend -> 'revisoes'),
               'publicacao', (select jsonb_build_object('estado', p.estado, 'versao', p.versao,
                                                        'publicadoEm', p.publicado_em)
                              from public.publicacoes_ranking p
                              where p.turma_id = x.id order by p.versao desc limit 1))
             order by x.categoria, x.nome)
      from (select t.id, t.nome, c.categoria, app.pendencias_realizadas_da_turma(t.id) as pend
            from public.turmas t join public.cursos c on c.id = t.curso_id
            where c.edicao_id = p_edicao) x), '[]'::jsonb));
end;
$function$;

CREATE OR REPLACE FUNCTION app.turmas_do_relatorio(p_edicao uuid, p_turma uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_turmas uuid[];
begin
  if p_turma is not null and app.edicao_da_turma(p_turma) is distinct from p_edicao then
    raise exception 'A turma não pertence à edição.' using errcode = '23514';
  end if;
  if app.e_coordenacao(p_edicao) or app.e_analista_da_edicao(p_edicao) then
    return array(select t.id from public.turmas t join public.cursos c on c.id = t.curso_id
                 where c.edicao_id = p_edicao and (p_turma is null or t.id = p_turma));
  end if;
  select coalesce(array_agg(distinct a.turma_id), '{}') into v_turmas from public.atribuicoes a
  where a.usuario_id = auth.uid() and a.edicao_id = p_edicao and a.ativo and a.papel in ('docente', 'mentor');
  if cardinality(v_turmas) = 0 then
    raise exception 'Só a coordenação e a equipe docente exportam relatórios.' using errcode = '42501';
  end if;
  if p_turma is not null then
    if not p_turma = any (v_turmas) then
      raise exception 'Você não atua nesta turma.' using errcode = '42501';
    end if;
    return array[p_turma];
  end if;
  return v_turmas;
end;
$function$;

-- -----------------------------------------------------------------------------
-- Parte 6 — conta e unidade desativadas em TODA operação (T028, FR-009; defesa em camadas)
-- 1) política restritiva em todas as tabelas e no armazenamento; 2) guarda no início de todas as
-- RPCs públicas; 3) o pgTAP varre o catálogo e falha se uma tabela ou RPC nova ficar sem a guarda.
-- -----------------------------------------------------------------------------
-- Sem pessoa autenticada (serviço, administração do banco) não há conta a bloquear: as demais
-- checagens decidem. Pessoa autenticada sem perfil é recusada.
create function app.conta_ativa()
returns boolean language sql stable security definer set search_path = '' as $$
  select case when (select auth.uid()) is null then true
              else coalesce((select p.ativo and (p.unidade_id is null or u.ativa)
                             from public.perfis p left join public.unidades u on u.id = p.unidade_id
                             where p.id = (select auth.uid())), false) end;
$$;

create function app.exigir_conta_ativa()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.conta_ativa() then
    raise exception 'Sua conta ou a sua unidade está desativada. Procure a gestão.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function app.conta_ativa(), app.exigir_conta_ativa() from public, anon;
grant execute on function app.conta_ativa(), app.exigir_conta_ativa() to authenticated;

-- 1) Camada de tabelas: política restritiva (E com as demais) em toda tabela com RLS.
do $$
declare t record;
begin
  for t in select c.relname from pg_class c
           where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('create policy conta_ativa on public.%I as restrictive for all to authenticated '
                   'using ((select app.conta_ativa())) with check ((select app.conta_ativa()))', t.relname);
  end loop;
end $$;
create policy conta_ativa on storage.objects as restrictive for all to authenticated
  using ((select app.conta_ativa())) with check ((select app.conta_ativa()));

-- 2) Camada de RPCs (plpgsql): a guarda entra logo depois do primeiro BEGIN do corpo. Aplica-se às
-- definições vigentes neste ponto das migrations; o pgTAP garante que nenhuma fique sem ela depois.
do $$
declare
  r record;
  v_def text;
  v_novo text;
begin
  for r in
    select p.oid, p.proname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef and l.lanname = 'plpgsql'
      and has_function_privilege('authenticated', p.oid, 'execute')
      and p.prosrc not like '%exigir_conta_ativa%'
  loop
    v_def := pg_get_functiondef(r.oid);
    v_novo := regexp_replace(v_def, E'\nbegin\n', E'\nbegin\n  perform app.exigir_conta_ativa();\n', 'i');
    if v_novo = v_def then
      raise exception 'Não achei o BEGIN da função %.', r.proname;
    end if;
    execute v_novo;
  end loop;
end $$;

-- RPCs em SQL: viram plpgsql com a mesma assinatura, resultado e volatilidade, mais a guarda.
-- Ficam de fora `minha_conta` (a conta desativada precisa saber que está desativada) e
-- `regulamento_publico` (conteúdo público, sem conta).
do $$
declare
  r record;
  v_corpo text;
begin
  for r in
    select p.proname, pg_get_function_arguments(p.oid) as args, pg_get_function_result(p.oid) as res, p.prosrc
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef and l.lanname = 'sql'
      and has_function_privilege('authenticated', p.oid, 'execute')
      and p.proname not in ('minha_conta', 'regulamento_publico')
  loop
    v_corpo := regexp_replace(btrim(r.prosrc), ';\s*$', '');
    execute format(
      $f$create or replace function public.%I(%s) returns %s language plpgsql stable security definer
         set search_path = '' as $b$
#variable_conflict use_column
begin
  perform app.exigir_conta_ativa();
  %s
end;
$b$
      $f$,
      r.proname, r.args, r.res,
      case when r.res like 'TABLE%' or r.res like 'SETOF%' then 'return query ' || v_corpo || ';'
           else 'return (' || v_corpo || ');' end);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Parte 7 — o regulamento público mostra a unidade de cada edição (FR-011)
-- -----------------------------------------------------------------------------
do $$
declare
  v_def text := pg_get_functiondef('public.regulamento_publico()'::regprocedure);
  v_novo text;
begin
  v_novo := replace(v_def, E'jsonb_build_object(''id'', e.id, ''nome'', e.nome,',
    E'jsonb_build_object(''id'', e.id, ''unidade'', (select u.nome from public.unidades u where u.id = e.unidade_id), ''nome'', e.nome,');
  if v_novo = v_def then raise exception 'Não achei o trecho do regulamento público.'; end if;
  execute v_novo;
end $$;

-- -----------------------------------------------------------------------------
-- Parte 8 — premissas respondidas só pelo master (US4, FR-013): a coordenação passa a só ler.
-- Leem: master, gestão, coordenação, docentes e mentores. Analista e estudante são recusados.
-- -----------------------------------------------------------------------------
do $$
declare
  v_def text;
  v_novo text;
begin
  v_def := pg_get_functiondef('public.premissas_em_validacao()'::regprocedure);
  v_novo := v_def;
  v_novo := replace(v_novo, 'v_coordena boolean := app.e_coordenacao_em_alguma();', 'v_master boolean := app.e_master();');
  v_novo := replace(v_novo, 'if not v_coordena and not app.atua_como_docente_em_alguma() then',
    'if not v_master and not app.tem_funcao(''gestao'') and not app.e_coordenacao_em_alguma() and not app.atua_como_docente_em_alguma() then');
  v_novo := replace(v_novo, 'Somente coordenação, docentes e mentores consultam as premissas.',
    'Somente o master, a gestão, a coordenação, docentes e mentores consultam as premissas.');
  v_novo := replace(v_novo, '''podeResponder'', v_coordena,', '''podeResponder'', v_master,');
  if v_novo = v_def or v_novo like '%v_coordena%' then raise exception 'premissas_em_validacao: trecho não encontrado.'; end if;
  execute v_novo;

  v_def := pg_get_functiondef('public.responder_premissa(text, public.decisao_premissa, text, uuid)'::regprocedure);
  v_novo := replace(v_def, 'if not app.e_coordenacao_em_alguma() then', 'if not app.e_master() then');
  v_novo := replace(v_novo, 'Somente a coordenação registra respostas às premissas.', 'Somente o master registra respostas às premissas.');
  if v_novo = v_def or v_novo like '%e_coordenacao_em_alguma%' then raise exception 'responder_premissa: trecho não encontrado.'; end if;
  execute v_novo;
end $$;
