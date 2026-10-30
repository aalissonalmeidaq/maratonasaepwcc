-- =============================================================================
-- Spec 003 — equipes por convite (ADR 0010).
-- Convites entre alunos, formação por docente/mentor, nome escolhido pela equipe e edição
-- encerrada somente leitura. Escrita só por RPC; toda RPC bloqueia a turma primeiro.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Equipe (tabela `duplas`): nome opcional até a equipe escolher (FR-008)
-- ---------------------------------------------------------------------------
alter table public.duplas alter column nome drop not null;
alter table public.duplas add column nome_definido_em timestamptz;
-- Nomes já existentes contam como escolhidos (sem fingir nova escolha dos alunos).
update public.duplas set nome_definido_em = criado_em where nome is not null;
alter table public.duplas
  add constraint duplas_nome_com_data check ((nome is null) = (nome_definido_em is null));

-- Quem grava um nome marca a escolha; um nome escolhido não volta a ficar vazio.
create function app.marcar_nome_definido()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.nome is not null and new.nome is null then
    raise exception 'O nome da equipe não pode ser apagado.' using errcode = '23514';
  end if;
  if new.nome is not null and new.nome_definido_em is null then
    new.nome_definido_em := now();
  end if;
  return new;
end;
$$;

create trigger duplas_marcar_nome_definido
  before insert or update of nome on public.duplas
  for each row execute function app.marcar_nome_definido();

-- ---------------------------------------------------------------------------
-- Convites
-- ---------------------------------------------------------------------------
create type public.tipo_convite_equipe as enum ('dupla', 'trio');
create type public.situacao_convite_eq as enum ('pendente', 'formado', 'recusado', 'cancelado');
create type public.resposta_convite_eq as enum ('pendente', 'aceito', 'recusado');

create table public.convites_equipe (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  remetente_id uuid not null references public.perfis (id) on delete cascade,
  tipo public.tipo_convite_equipe not null,
  situacao public.situacao_convite_eq not null default 'pendente',
  motivo text,
  dupla_id uuid references public.duplas (id) on delete set null,
  criado_em timestamptz not null default now(),
  encerrado_em timestamptz,
  constraint convites_motivo_ao_encerrar
    check (situacao not in ('cancelado', 'recusado') or motivo is not null),
  constraint convites_encerramento check ((situacao = 'pendente') = (encerrado_em is null))
);
create index convites_turma_situacao_idx on public.convites_equipe (turma_id, situacao);
create index convites_remetente_pendente_idx on public.convites_equipe (remetente_id)
  where situacao = 'pendente';

create table public.convite_equipe_convidados (
  convite_id uuid not null references public.convites_equipe (id) on delete cascade,
  convidado_id uuid not null references public.perfis (id) on delete cascade,
  resposta public.resposta_convite_eq not null default 'pendente',
  respondido_em timestamptz,
  primary key (convite_id, convidado_id)
);
create index convidados_convidado_idx on public.convite_equipe_convidados (convidado_id);

-- ---------------------------------------------------------------------------
-- Leitura (RLS)
-- ---------------------------------------------------------------------------
create function app.pode_ver_convite(p_convite uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.convites_equipe c
    where c.id = p_convite
      and (
        c.remetente_id = (select auth.uid())
        or exists (select 1 from public.convite_equipe_convidados x
                   where x.convite_id = c.id and x.convidado_id = (select auth.uid()))
        or app.e_coordenacao(c.edicao_id)
        or app.atua_na_turma(c.turma_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Auditoria, privilégios e RLS
-- ---------------------------------------------------------------------------
create trigger auditoria_convites_equipe after insert or update or delete on public.convites_equipe
  for each row execute function app.registrar_auditoria();
create trigger auditoria_convite_equipe_convidados
  after insert or update or delete on public.convite_equipe_convidados
  for each row execute function app.registrar_auditoria();

revoke all on public.convites_equipe, public.convite_equipe_convidados from anon;
revoke insert, update, delete, truncate
  on public.convites_equipe, public.convite_equipe_convidados from authenticated;

alter table public.convites_equipe enable row level security;
alter table public.convite_equipe_convidados enable row level security;

create policy convites_equipe_ler on public.convites_equipe for select to authenticated
  using (app.pode_ver_convite(id));
create policy convite_equipe_convidados_ler on public.convite_equipe_convidados
  for select to authenticated using (app.pode_ver_convite(convite_id));

-- ---------------------------------------------------------------------------
-- Funções auxiliares (internas)
-- ---------------------------------------------------------------------------

-- Bloqueia a turma (serializa formações e alterações de equipe dela) e devolve a edição.
create function app.travar_turma(p_turma uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid;
begin
  perform 1 from public.turmas where id = p_turma for update;
  if not found then
    raise exception 'Turma não encontrada.' using errcode = '23514';
  end if;
  v_edicao := app.edicao_da_turma(p_turma);
  return v_edicao;
end;
$$;

-- FR-017: edição encerrada é somente leitura.
create function app.exigir_edicao_aberta(p_edicao uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.edicoes where id = p_edicao and estado = 'encerrada') then
    raise exception 'A edição está encerrada; as equipes não podem mais ser alteradas.'
      using errcode = '23514';
  end if;
end;
$$;

create function app.e_aluno_ativo(p_turma uuid, p_pessoa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = p_pessoa and a.turma_id = p_turma and a.papel = 'aluno' and a.ativo
  );
$$;

create function app.tem_equipe_ativa(p_edicao uuid, p_pessoa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dupla_integrantes i
    where i.edicao_id = p_edicao and i.estudante_id = p_pessoa and i.saida_em is null
  );
$$;

-- Aluno ativo da turma e sem equipe ativa na edição.
create function app.validar_aluno_livre(p_edicao uuid, p_turma uuid, p_aluno uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.e_aluno_ativo(p_turma, p_aluno) then
    raise exception 'Esta pessoa não é aluna ativa desta turma.' using errcode = '23514';
  end if;
  if app.tem_equipe_ativa(p_edicao, p_aluno) then
    raise exception 'Esta pessoa já está em uma equipe.' using errcode = '23514';
  end if;
end;
$$;

-- Trio: só em turma com número ímpar de alunos ativos e sem trio ativo (US2).
create function app.turma_tem_trio(p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.duplas d
    where d.turma_id = p_turma and d.ativa
      and (select count(*) from public.dupla_integrantes i
           where i.dupla_id = d.id and i.saida_em is null) = 3
  );
$$;

create function app.alunos_ativos(p_turma uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.atribuicoes a
  where a.turma_id = p_turma and a.papel = 'aluno' and a.ativo;
$$;

create function app.permite_trio(p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.alunos_ativos(p_turma) % 2 = 1 and not app.turma_tem_trio(p_turma);
$$;

-- Encerra os convites pendentes em que as pessoas aparecem (como remetente ou convidadas).
create function app.cancelar_convites_de(p_edicao uuid, p_pessoas uuid[], p_motivo text)
returns void language sql security definer set search_path = '' as $$
  update public.convites_equipe c
     set situacao = 'cancelado', motivo = p_motivo, encerrado_em = now()
   where c.edicao_id = p_edicao and c.situacao = 'pendente'
     and (c.remetente_id = any (p_pessoas)
          or exists (select 1 from public.convite_equipe_convidados x
                     where x.convite_id = c.id and x.convidado_id = any (p_pessoas)));
$$;

-- Formado um trio, os demais convites de trio pendentes da turma perdem o sentido.
create function app.cancelar_convites_de_trio(p_turma uuid)
returns void language sql security definer set search_path = '' as $$
  update public.convites_equipe
     set situacao = 'cancelado', motivo = 'trio_formado', encerrado_em = now()
   where turma_id = p_turma and tipo = 'trio' and situacao = 'pendente';
$$;

-- Cria a equipe (sem nome) com os integrantes informados.
create function app.criar_equipe(p_edicao uuid, p_turma uuid, p_alunos uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_dupla uuid;
begin
  insert into public.duplas (edicao_id, turma_id, nome) values (p_edicao, p_turma, null)
  returning id into v_dupla;
  insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
  select v_dupla, p_edicao, unnest(p_alunos);
  return v_dupla;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs de convite (aluno) — US1
-- ---------------------------------------------------------------------------

create function public.enviar_convite_equipe(p_turma uuid, p_convidados uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_eu uuid := auth.uid();
  v_edicao uuid := app.travar_turma(p_turma);
  v_qtd integer := coalesce(array_length(p_convidados, 1), 0);
  v_convidado uuid;
  v_convite uuid;
begin
  if not app.e_aluno_ativo(p_turma, v_eu) then
    raise exception 'Somente alunos ativos da turma podem enviar convites.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_aberta(v_edicao);
  if app.tem_equipe_ativa(v_edicao, v_eu) then
    raise exception 'Você já está em uma equipe.' using errcode = '23514';
  end if;
  if v_qtd = 0 then
    raise exception 'Escolha um colega para convidar.' using errcode = '23514';
  end if;
  if v_qtd > 2 then
    raise exception 'Escolha no máximo dois colegas.' using errcode = '23514';
  end if;
  if v_qtd = 2 and p_convidados[1] = p_convidados[2] then
    raise exception 'Escolha colegas diferentes.' using errcode = '23514';
  end if;
  if v_eu = any (p_convidados) then
    raise exception 'Você não pode convidar a si mesmo.' using errcode = '23514';
  end if;
  if v_qtd = 2 and not app.permite_trio(p_turma) then
    raise exception 'Nesta turma não é possível formar trio.' using errcode = '23514';
  end if;
  foreach v_convidado in array p_convidados loop
    perform app.validar_aluno_livre(v_edicao, p_turma, v_convidado);
    if exists (
      select 1 from public.convites_equipe c
      join public.convite_equipe_convidados x on x.convite_id = c.id
      where c.remetente_id = v_eu and c.situacao = 'pendente' and x.convidado_id = v_convidado
    ) then
      raise exception 'Você já tem um convite pendente para esta pessoa.' using errcode = '23514';
    end if;
  end loop;

  insert into public.convites_equipe (edicao_id, turma_id, remetente_id, tipo)
  values (v_edicao, p_turma, v_eu, case when v_qtd = 2 then 'trio' else 'dupla' end::public.tipo_convite_equipe)
  returning id into v_convite;
  insert into public.convite_equipe_convidados (convite_id, convidado_id)
  select v_convite, unnest(p_convidados);
  return v_convite;
end;
$$;

create function public.responder_convite_equipe(p_convite uuid, p_aceitar boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_eu uuid := auth.uid();
  v_turma uuid;
  v_convite public.convites_equipe%rowtype;
  v_resposta public.resposta_convite_eq;
  v_pessoas uuid[];
  v_pessoa uuid;
  v_dupla uuid;
begin
  select turma_id into v_turma from public.convites_equipe where id = p_convite;
  if not found then
    raise exception 'Convite não encontrado.' using errcode = '42501';
  end if;
  perform app.travar_turma(v_turma);
  select * into v_convite from public.convites_equipe where id = p_convite for update;
  select resposta into v_resposta from public.convite_equipe_convidados
   where convite_id = p_convite and convidado_id = v_eu for update;
  if not found then
    raise exception 'Este convite não é para você.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_aberta(v_convite.edicao_id);

  -- Repetição de um aceite já confirmado devolve o mesmo resultado, sem nova equipe.
  if p_aceitar and v_resposta = 'aceito' and v_convite.situacao in ('formado', 'pendente') then
    return v_convite.dupla_id;
  end if;
  if v_convite.situacao <> 'pendente' then
    raise exception 'Este convite não está mais pendente.' using errcode = '23514';
  end if;
  if v_resposta <> 'pendente' then
    raise exception 'Você já respondeu a este convite.' using errcode = '23514';
  end if;
  if not app.e_aluno_ativo(v_turma, v_eu) then
    raise exception 'Somente alunos ativos da turma podem responder convites.' using errcode = '42501';
  end if;

  if not p_aceitar then
    update public.convite_equipe_convidados set resposta = 'recusado', respondido_em = now()
     where convite_id = p_convite and convidado_id = v_eu;
    update public.convites_equipe set situacao = 'recusado', motivo = 'recusado', encerrado_em = now()
     where id = p_convite;
    return null;
  end if;

  if app.tem_equipe_ativa(v_convite.edicao_id, v_eu) then
    raise exception 'Você já está em uma equipe.' using errcode = '23514';
  end if;
  update public.convite_equipe_convidados set resposta = 'aceito', respondido_em = now()
   where convite_id = p_convite and convidado_id = v_eu;
  if exists (select 1 from public.convite_equipe_convidados
             where convite_id = p_convite and resposta = 'pendente') then
    return null;
  end if;

  -- Todos aceitaram: revalida e forma a equipe de uma vez.
  select array_agg(convidado_id order by convidado_id) into v_pessoas
    from public.convite_equipe_convidados where convite_id = p_convite;
  v_pessoas := v_convite.remetente_id || v_pessoas;
  foreach v_pessoa in array v_pessoas loop
    perform app.validar_aluno_livre(v_convite.edicao_id, v_turma, v_pessoa);
  end loop;
  if v_convite.tipo = 'trio' and not app.permite_trio(v_turma) then
    raise exception 'Nesta turma não é possível formar trio.' using errcode = '23514';
  end if;

  v_dupla := app.criar_equipe(v_convite.edicao_id, v_turma, v_pessoas);
  update public.convites_equipe set situacao = 'formado', dupla_id = v_dupla, encerrado_em = now()
   where id = p_convite;
  perform app.cancelar_convites_de(v_convite.edicao_id, v_pessoas, 'equipe_formada');
  if v_convite.tipo = 'trio' then
    perform app.cancelar_convites_de_trio(v_turma);
  end if;
  return v_dupla;
end;
$$;

create function public.cancelar_convite_equipe(p_convite uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid;
  v_convite public.convites_equipe%rowtype;
begin
  select turma_id into v_turma from public.convites_equipe where id = p_convite;
  if not found then
    raise exception 'Convite não encontrado.' using errcode = '42501';
  end if;
  perform app.travar_turma(v_turma);
  select * into v_convite from public.convites_equipe where id = p_convite for update;
  if v_convite.remetente_id <> auth.uid() then
    raise exception 'Somente quem enviou pode cancelar o convite.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_aberta(v_convite.edicao_id);
  if v_convite.situacao <> 'pendente' then
    raise exception 'Este convite não está mais pendente.' using errcode = '23514';
  end if;
  update public.convites_equipe
     set situacao = 'cancelado', motivo = 'cancelado_pelo_remetente', encerrado_em = now()
   where id = p_convite;
end;
$$;

-- FR-014: quem aceitou um trio ainda pendente pode desistir; o convite inteiro é cancelado.
create function public.retirar_aceite_convite_equipe(p_convite uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid;
  v_convite public.convites_equipe%rowtype;
begin
  select turma_id into v_turma from public.convites_equipe where id = p_convite;
  if not found then
    raise exception 'Convite não encontrado.' using errcode = '42501';
  end if;
  perform app.travar_turma(v_turma);
  select * into v_convite from public.convites_equipe where id = p_convite for update;
  if not exists (select 1 from public.convite_equipe_convidados
                 where convite_id = p_convite and convidado_id = auth.uid() and resposta = 'aceito') then
    raise exception 'Somente quem aceitou o convite pode retirar o aceite.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_aberta(v_convite.edicao_id);
  if v_convite.situacao <> 'pendente' then
    raise exception 'Este convite não está mais pendente.' using errcode = '23514';
  end if;
  update public.convites_equipe
     set situacao = 'cancelado', motivo = 'aceite_retirado', encerrado_em = now()
   where id = p_convite;
end;
$$;

-- Se a turma do aluno ainda aceita um trio (aluno ativo da turma ou gestão dela).
create function public.turma_permite_trio(p_turma uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.e_aluno_ativo(p_turma, auth.uid()) or app.e_coordenacao(app.edicao_da_turma(p_turma))
          or app.atua_na_turma(p_turma)) then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  return app.permite_trio(p_turma);
end;
$$;

-- Colegas da turma: nome e se já têm equipe (FR-005). Aluno ativo da turma ou gestão dela.
create function public.colegas_da_turma(p_turma uuid)
returns table (id uuid, nome text, tem_equipe boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_edicao uuid := app.edicao_da_turma(p_turma);
begin
  if not (app.e_aluno_ativo(p_turma, auth.uid()) or app.e_coordenacao(v_edicao)
          or app.atua_na_turma(p_turma)) then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  return query
    select p.id, p.nome, app.tem_equipe_ativa(v_edicao, p.id)
    from public.atribuicoes a join public.perfis p on p.id = a.usuario_id
    where a.turma_id = p_turma and a.papel = 'aluno' and a.ativo and p.id <> auth.uid()
    order by p.nome;
end;
$$;

-- Convites em que a pessoa atual é remetente ou convidada, com os nomes dos envolvidos.
create function public.meus_convites_equipe(p_edicao uuid)
returns table (
  id uuid, tipo text, situacao text, motivo text, remetente_id uuid, remetente_nome text,
  convidados jsonb, criado_em timestamptz, encerrado_em timestamptz, sou_remetente boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id, c.tipo::text, c.situacao::text, c.motivo, c.remetente_id, r.nome,
         (select jsonb_agg(jsonb_build_object('id', x.convidado_id, 'nome', p.nome,
                                              'resposta', x.resposta::text) order by p.nome)
            from public.convite_equipe_convidados x join public.perfis p on p.id = x.convidado_id
           where x.convite_id = c.id),
         c.criado_em, c.encerrado_em, c.remetente_id = (select auth.uid())
  from public.convites_equipe c join public.perfis r on r.id = c.remetente_id
  where c.edicao_id = p_edicao
    and (c.remetente_id = (select auth.uid())
         or exists (select 1 from public.convite_equipe_convidados x
                    where x.convite_id = c.id and x.convidado_id = (select auth.uid())))
  order by c.criado_em desc;
$$;

-- FR-007: a coordenação não forma equipes.
drop function public.formar_dupla(uuid, text, uuid[]);

revoke all on function public.enviar_convite_equipe(uuid, uuid[]) from public, anon;
revoke all on function public.responder_convite_equipe(uuid, boolean) from public, anon;
revoke all on function public.cancelar_convite_equipe(uuid) from public, anon;
revoke all on function public.colegas_da_turma(uuid) from public, anon;
revoke all on function public.retirar_aceite_convite_equipe(uuid) from public, anon;
revoke all on function public.turma_permite_trio(uuid) from public, anon;
grant execute on function public.retirar_aceite_convite_equipe(uuid) to authenticated;
grant execute on function public.turma_permite_trio(uuid) to authenticated;
revoke all on function public.meus_convites_equipe(uuid) from public, anon;
grant execute on function public.enviar_convite_equipe(uuid, uuid[]) to authenticated;
grant execute on function public.responder_convite_equipe(uuid, boolean) to authenticated;
grant execute on function public.cancelar_convite_equipe(uuid) to authenticated;
grant execute on function public.colegas_da_turma(uuid) to authenticated;
grant execute on function public.meus_convites_equipe(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Gestão de equipes — US4 (coordenação da edição, docente/mentor da turma)
-- ---------------------------------------------------------------------------

create function app.exigir_gestao_da_turma(p_turma uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.e_coordenacao(app.edicao_da_turma(p_turma)) or app.atua_na_turma(p_turma)) then
    raise exception 'Somente a coordenação ou a equipe docente da turma podem alterar equipes.'
      using errcode = '42501';
  end if;
end;
$$;

create function app.exigir_docente_da_turma(p_turma uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.atua_na_turma(p_turma) then
    raise exception 'Somente docente ou mentor da turma podem realizar esta operação.'
      using errcode = '42501';
  end if;
end;
$$;

-- Bloqueia turma e equipe (nesta ordem) e devolve a equipe.
create function app.travar_equipe(p_dupla uuid)
returns public.duplas language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid;
  v_dupla public.duplas%rowtype;
begin
  select turma_id into v_turma from public.duplas where id = p_dupla;
  if not found then
    raise exception 'Equipe não encontrada.' using errcode = '23514';
  end if;
  perform app.travar_turma(v_turma);
  select * into v_dupla from public.duplas where id = p_dupla for update;
  return v_dupla;
end;
$$;

create function app.integrantes_ativos(p_dupla uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.dupla_integrantes where dupla_id = p_dupla and saida_em is null;
$$;

-- FR-010: docente/mentor da turma forma equipe com alunos que sobraram.
create function public.formar_equipe_docente(p_turma uuid, p_estudantes uuid[], p_justificativa text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid := app.travar_turma(p_turma);
  v_qtd integer := coalesce(array_length(p_estudantes, 1), 0);
  v_motivo text;
  v_estudante uuid;
  v_dupla uuid;
begin
  perform app.exigir_docente_da_turma(p_turma);
  perform app.exigir_edicao_aberta(v_edicao);
  v_motivo := app.exigir_justificativa(p_justificativa);
  if v_qtd not in (2, 3) then
    raise exception 'Escolha dois alunos (dupla) ou três (trio).' using errcode = '23514';
  end if;
  if (select count(distinct x) from unnest(p_estudantes) as x) <> v_qtd then
    raise exception 'Escolha alunos diferentes.' using errcode = '23514';
  end if;
  foreach v_estudante in array p_estudantes loop
    perform app.validar_aluno_livre(v_edicao, p_turma, v_estudante);
  end loop;
  if v_qtd = 3 and not app.permite_trio(p_turma) then
    raise exception 'Nesta turma não é possível formar trio.' using errcode = '23514';
  end if;

  perform set_config('app.justificativa', v_motivo, true);
  v_dupla := app.criar_equipe(v_edicao, p_turma, p_estudantes);
  perform app.cancelar_convites_de(v_edicao, p_estudantes, 'aluno_em_equipe');
  if v_qtd = 3 then
    perform app.cancelar_convites_de_trio(p_turma);
  end if;
  perform set_config('app.justificativa', '', true);
  return v_dupla;
end;
$$;

create function public.incluir_integrante(p_dupla uuid, p_estudante uuid, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas := app.travar_equipe(p_dupla);
  v_motivo text;
  v_qtd integer;
begin
  perform app.exigir_gestao_da_turma(v_dupla.turma_id);
  perform app.exigir_edicao_aberta(v_dupla.edicao_id);
  v_motivo := app.exigir_justificativa(p_justificativa);
  if not v_dupla.ativa then
    raise exception 'A equipe não está ativa.' using errcode = '23514';
  end if;
  v_qtd := app.integrantes_ativos(p_dupla);
  if v_qtd >= 3 then
    raise exception 'A equipe já tem três integrantes.' using errcode = '23514';
  end if;
  if v_qtd = 2 and not app.permite_trio(v_dupla.turma_id) then
    raise exception 'Nesta turma não é possível formar trio.' using errcode = '23514';
  end if;
  perform app.validar_aluno_livre(v_dupla.edicao_id, v_dupla.turma_id, p_estudante);

  perform set_config('app.justificativa', v_motivo, true);
  insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
  values (p_dupla, v_dupla.edicao_id, p_estudante);
  perform app.cancelar_convites_de(v_dupla.edicao_id, array[p_estudante], 'aluno_em_equipe');
  if v_qtd = 2 then
    perform app.cancelar_convites_de_trio(v_dupla.turma_id);
  end if;
  perform set_config('app.justificativa', '', true);
end;
$$;

-- FR-012: só trio perde integrante sem substituição (vira dupla).
create function public.remover_integrante(p_dupla uuid, p_estudante uuid, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas := app.travar_equipe(p_dupla);
  v_motivo text;
begin
  perform app.exigir_gestao_da_turma(v_dupla.turma_id);
  perform app.exigir_edicao_aberta(v_dupla.edicao_id);
  v_motivo := app.exigir_justificativa(p_justificativa);
  if not exists (select 1 from public.dupla_integrantes
                 where dupla_id = p_dupla and estudante_id = p_estudante and saida_em is null) then
    raise exception 'O estudante informado não é integrante ativo desta equipe.' using errcode = '23514';
  end if;
  if app.integrantes_ativos(p_dupla) <> 3 then
    raise exception 'Só é possível remover integrante de trio. Para dupla, substitua o integrante ou desfaça a equipe.'
      using errcode = '23514';
  end if;
  perform set_config('app.justificativa', v_motivo, true);
  update public.dupla_integrantes
     set saida_em = now(), saida_por = auth.uid(), motivo_saida = v_motivo
   where dupla_id = p_dupla and estudante_id = p_estudante and saida_em is null;
  perform set_config('app.justificativa', '', true);
end;
$$;

-- Substituir e desfazer: agora também docente/mentor da turma; turma bloqueada primeiro.
create or replace function public.substituir_integrante(
  p_dupla uuid, p_sai uuid, p_entra uuid, p_justificativa text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas := app.travar_equipe(p_dupla);
  v_motivo text;
begin
  perform app.exigir_gestao_da_turma(v_dupla.turma_id);
  perform app.exigir_edicao_aberta(v_dupla.edicao_id);
  v_motivo := app.exigir_justificativa(p_justificativa);
  if not v_dupla.ativa then
    raise exception 'A equipe não está ativa.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.dupla_integrantes
    where dupla_id = p_dupla and estudante_id = p_sai and saida_em is null
  ) then
    raise exception 'O estudante informado não é integrante ativo desta equipe.' using errcode = '23514';
  end if;
  perform app.validar_aluno_livre(v_dupla.edicao_id, v_dupla.turma_id, p_entra);

  perform set_config('app.justificativa', v_motivo, true);
  update public.dupla_integrantes
     set saida_em = now(), saida_por = auth.uid(), motivo_saida = v_motivo
   where dupla_id = p_dupla and estudante_id = p_sai and saida_em is null;
  insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
  values (p_dupla, v_dupla.edicao_id, p_entra);
  perform app.cancelar_convites_de(v_dupla.edicao_id, array[p_entra], 'aluno_em_equipe');
  perform set_config('app.justificativa', '', true);
end;
$$;

create or replace function public.desfazer_dupla(p_dupla uuid, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas := app.travar_equipe(p_dupla);
  v_motivo text;
begin
  perform app.exigir_gestao_da_turma(v_dupla.turma_id);
  perform app.exigir_edicao_aberta(v_dupla.edicao_id);
  v_motivo := app.exigir_justificativa(p_justificativa);

  perform set_config('app.justificativa', v_motivo, true);
  update public.dupla_integrantes
     set saida_em = now(), saida_por = auth.uid(), motivo_saida = v_motivo
   where dupla_id = p_dupla and saida_em is null;
  update public.duplas set ativa = false where id = p_dupla;
  perform set_config('app.justificativa', '', true);
end;
$$;

-- FR-011: aluno desativado mantém a equipe, mas seus convites pendentes são encerrados.
create function app.cancelar_convites_de_inativo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.papel = 'aluno' and old.ativo and not new.ativo then
    perform app.cancelar_convites_de(new.edicao_id, array[new.usuario_id], 'aluno_inativo');
  end if;
  return new;
end;
$$;

create trigger atribuicoes_cancelar_convites_de_inativo
  after update of ativo on public.atribuicoes
  for each row execute function app.cancelar_convites_de_inativo();

-- Leitura de gestão: equipes ativas da turma com avisos calculados (FR-005/011/013).
create function public.equipes_da_turma_gestao(p_turma uuid)
returns table (
  id uuid, turma_id uuid, nome text, ativa boolean, integrantes jsonb, trio_em_turma_par boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_edicao uuid := app.edicao_da_turma(p_turma);
begin
  if v_edicao is null or not (app.e_coordenacao(v_edicao) or app.atua_na_turma(p_turma)) then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  return query
    select d.id, d.turma_id, d.nome, d.ativa,
           coalesce((
             select jsonb_agg(jsonb_build_object(
                      'estudanteId', i.estudante_id, 'nome', p.nome,
                      'integranteInativo', not app.e_aluno_ativo(d.turma_id, i.estudante_id))
                    order by i.estudante_id)
             from public.dupla_integrantes i join public.perfis p on p.id = i.estudante_id
             where i.dupla_id = d.id and i.saida_em is null), '[]'::jsonb),
           app.integrantes_ativos(d.id) = 3 and app.alunos_ativos(p_turma) % 2 = 0
    from public.duplas d
    where d.turma_id = p_turma and d.ativa
    order by d.id;
end;
$$;

revoke all on function public.formar_equipe_docente(uuid, uuid[], text) from public, anon;
revoke all on function public.incluir_integrante(uuid, uuid, text) from public, anon;
revoke all on function public.remover_integrante(uuid, uuid, text) from public, anon;
revoke all on function public.equipes_da_turma_gestao(uuid) from public, anon;
grant execute on function public.formar_equipe_docente(uuid, uuid[], text) to authenticated;
grant execute on function public.incluir_integrante(uuid, uuid, text) to authenticated;
grant execute on function public.remover_integrante(uuid, uuid, text) to authenticated;
grant execute on function public.equipes_da_turma_gestao(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Nome da equipe — US3 (FR-008)
-- ---------------------------------------------------------------------------

-- Nome de 2 a 80 caracteres, único entre as equipes ativas da turma (sem diferenciar caixa).
create function app.validar_nome_equipe(p_turma uuid, p_dupla uuid, p_nome text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_nome text := btrim(coalesce(p_nome, ''));
begin
  if char_length(v_nome) not between 2 and 80 then
    raise exception 'Informe um nome de 2 a 80 caracteres.' using errcode = '23514';
  end if;
  if exists (select 1 from public.duplas d
             where d.turma_id = p_turma and d.ativa and d.id <> p_dupla
               and lower(d.nome) = lower(v_nome)) then
    raise exception 'Já existe uma equipe com este nome na turma.' using errcode = '23514';
  end if;
  return v_nome;
end;
$$;

-- Primeiro nome: só integrante atual com vínculo de aluno ativo, uma única vez.
create function public.definir_nome_equipe(p_dupla uuid, p_nome text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas := app.travar_equipe(p_dupla);
begin
  if not (app.e_aluno_ativo(v_dupla.turma_id, auth.uid()) and exists (
    select 1 from public.dupla_integrantes
    where dupla_id = p_dupla and estudante_id = auth.uid() and saida_em is null
  )) then
    raise exception 'Somente integrantes da equipe podem escolher o nome.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_aberta(v_dupla.edicao_id);
  if not v_dupla.ativa then
    raise exception 'A equipe não está ativa.' using errcode = '23514';
  end if;
  if v_dupla.nome is not null then
    raise exception 'A equipe já escolheu o nome; só docente ou mentor da turma podem alterá-lo.'
      using errcode = '23514';
  end if;
  update public.duplas
     set nome = app.validar_nome_equipe(v_dupla.turma_id, p_dupla, p_nome), nome_definido_em = now()
   where id = p_dupla;
end;
$$;

-- Depois da escolha, só docente/mentor da turma renomeiam, com justificativa.
create function public.renomear_equipe(p_dupla uuid, p_nome text, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas := app.travar_equipe(p_dupla);
  v_motivo text;
begin
  perform app.exigir_docente_da_turma(v_dupla.turma_id);
  perform app.exigir_edicao_aberta(v_dupla.edicao_id);
  v_motivo := app.exigir_justificativa(p_justificativa);
  if not v_dupla.ativa then
    raise exception 'A equipe não está ativa.' using errcode = '23514';
  end if;
  if v_dupla.nome is null then
    raise exception 'A equipe ainda não escolheu o nome.' using errcode = '23514';
  end if;
  perform set_config('app.justificativa', v_motivo, true);
  update public.duplas set nome = app.validar_nome_equipe(v_dupla.turma_id, p_dupla, p_nome)
   where id = p_dupla;
  perform set_config('app.justificativa', '', true);
end;
$$;

revoke all on function public.definir_nome_equipe(uuid, text) from public, anon;
revoke all on function public.renomear_equipe(uuid, text, text) from public, anon;
grant execute on function public.definir_nome_equipe(uuid, text) to authenticated;
grant execute on function public.renomear_equipe(uuid, text, text) to authenticated;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;
