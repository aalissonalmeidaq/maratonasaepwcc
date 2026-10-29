-- =============================================================================
-- Spec 001 — Identidade, acesso, organização e auditoria (esquema inicial)
-- Princípios: RLS em todas as tabelas expostas, menor privilégio, auditoria no servidor.
-- Funções auxiliares ficam no schema `app` (não exposto pela API REST).
-- =============================================================================

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated;

create type public.papel as enum ('coordenacao', 'docente', 'mentor', 'aluno', 'apoio', 'analista');
create type public.estado_edicao as enum ('rascunho', 'ativa', 'encerrada');

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 160),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table public.perfis is 'Dados mínimos da pessoa usuária (1:1 com auth.users).';

create table public.edicoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 3 and 160),
  inicio date,
  fim date,
  estado public.estado_edicao not null default 'rascunho',
  regras jsonb not null,
  regras_versao text not null,
  premiacao jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  constraint edicoes_periodo_valido check (inicio is null or fim is null or fim >= inicio),
  constraint edicoes_regras_objeto check (jsonb_typeof(regras) = 'object'),
  constraint edicoes_premiacao_lista check (jsonb_typeof(premiacao) = 'array')
);
comment on column public.edicoes.regras is 'Regras de pontuação versionadas (ver contracts/regras-pontuacao.md).';

create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 160),
  categoria text not null check (char_length(btrim(categoria)) between 1 and 120),
  criado_em timestamptz not null default now(),
  unique (edicao_id, nome)
);
create index cursos_edicao_idx on public.cursos (edicao_id);

create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  ano_letivo integer check (ano_letivo between 2000 and 2100),
  criado_em timestamptz not null default now(),
  unique (curso_id, nome)
);
create index turmas_curso_idx on public.turmas (curso_id);

create table public.atribuicoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  papel public.papel not null,
  turma_id uuid references public.turmas (id) on delete cascade,
  ativo boolean not null default true,
  concedido_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  constraint atribuicoes_aluno_tem_turma check (papel <> 'aluno' or turma_id is not null),
  constraint atribuicoes_coordenacao_sem_turma check (papel <> 'coordenacao' or turma_id is null),
  constraint atribuicoes_unica unique nulls not distinct (usuario_id, edicao_id, papel, turma_id)
);
create index atribuicoes_usuario_idx on public.atribuicoes (usuario_id) where ativo;
create index atribuicoes_turma_idx on public.atribuicoes (turma_id) where ativo;
create index atribuicoes_edicao_idx on public.atribuicoes (edicao_id);

-- Um estudante só pode estar ativo em uma turma por edição.
create unique index atribuicoes_aluno_uma_turma
  on public.atribuicoes (usuario_id, edicao_id)
  where papel = 'aluno' and ativo;

create table public.auditoria (
  id bigint generated always as identity primary key,
  ocorrido_em timestamptz not null default now(),
  autor_id uuid default auth.uid(),
  acao text not null,
  tabela text not null,
  registro_id text,
  antes jsonb,
  depois jsonb,
  justificativa text
);
create index auditoria_tabela_idx on public.auditoria (tabela, ocorrido_em desc);
comment on table public.auditoria is 'Trilha somente de inserção, alimentada por gatilhos.';

-- ---------------------------------------------------------------------------
-- Funções auxiliares (security definer, search_path vazio)
-- ---------------------------------------------------------------------------

create function app.tem_papel(p_edicao uuid, p_papeis public.papel[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = (select auth.uid())
      and a.edicao_id = p_edicao
      and a.papel = any (p_papeis)
      and a.ativo
  );
$$;

create function app.e_coordenacao(p_edicao uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.tem_papel(p_edicao, array['coordenacao']::public.papel[]);
$$;

create function app.e_coordenacao_em_alguma()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = (select auth.uid()) and a.papel = 'coordenacao' and a.ativo
  );
$$;

create function app.participa_da_edicao(p_edicao uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = (select auth.uid()) and a.edicao_id = p_edicao and a.ativo
  );
$$;

create function app.edicao_da_turma(p_turma uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.edicao_id from public.turmas t join public.cursos c on c.id = t.curso_id
  where t.id = p_turma;
$$;

create function app.vinculado_a_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = (select auth.uid()) and a.turma_id = p_turma and a.ativo
  );
$$;

-- Docente/mentor vê perfis dos alunos das turmas em que atua; coordenação vê quem participa
-- das edições que coordena; cada pessoa vê o próprio perfil.
create function app.pode_ver_perfil(p_perfil uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_perfil = (select auth.uid())
    or exists (
      select 1
      from public.atribuicoes alvo
      join public.atribuicoes eu
        on eu.usuario_id = (select auth.uid()) and eu.ativo
      where alvo.usuario_id = p_perfil
        and alvo.ativo
        and (
          (eu.papel = 'coordenacao' and eu.edicao_id = alvo.edicao_id)
          or (eu.papel in ('docente', 'mentor') and eu.turma_id = alvo.turma_id)
        )
    );
$$;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

-- Cria o perfil quando a conta é criada no Supabase Auth (pela coordenação/admin).
create function app.criar_perfil_do_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function app.criar_perfil_do_usuario();

create function app.tocar_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function app.tocar_atualizado_em();

-- A turma da atribuição precisa pertencer à mesma edição.
create function app.validar_atribuicao()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.turma_id is not null and app.edicao_da_turma(new.turma_id) is distinct from new.edicao_id then
    raise exception 'A turma informada não pertence à edição da atribuição.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger atribuicoes_validar
  before insert or update on public.atribuicoes
  for each row execute function app.validar_atribuicao();

-- Auditoria: justificativa opcional via `set local app.justificativa = '...'`.
create function app.registrar_auditoria()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.auditoria (acao, tabela, registro_id, antes, depois, justificativa)
  values (
    tg_op,
    tg_table_name,
    coalesce(v_depois ->> 'id', v_antes ->> 'id'),
    v_antes,
    v_depois,
    nullif(current_setting('app.justificativa', true), '')
  );
  return coalesce(new, old);
end;
$$;

create trigger auditoria_edicoes after insert or update or delete on public.edicoes
  for each row execute function app.registrar_auditoria();
create trigger auditoria_cursos after insert or update or delete on public.cursos
  for each row execute function app.registrar_auditoria();
create trigger auditoria_turmas after insert or update or delete on public.turmas
  for each row execute function app.registrar_auditoria();
create trigger auditoria_atribuicoes after insert or update or delete on public.atribuicoes
  for each row execute function app.registrar_auditoria();

-- ---------------------------------------------------------------------------
-- Privilégios e RLS
-- ---------------------------------------------------------------------------

-- Visitantes anônimos não acessam nenhuma tabela desta migration.
revoke all on public.perfis, public.edicoes, public.cursos, public.turmas,
  public.atribuicoes, public.auditoria from anon;

-- Auditoria é somente leitura para a API; a escrita ocorre apenas pelos gatilhos.
revoke insert, update, delete, truncate on public.auditoria from authenticated;

alter table public.perfis enable row level security;
alter table public.edicoes enable row level security;
alter table public.cursos enable row level security;
alter table public.turmas enable row level security;
alter table public.atribuicoes enable row level security;
alter table public.auditoria enable row level security;

-- perfis
create policy perfis_ler on public.perfis for select to authenticated
  using (app.pode_ver_perfil(id));
create policy perfis_atualizar_proprio on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- edicoes (criação: somente administração do banco até a spec de organização)
create policy edicoes_ler on public.edicoes for select to authenticated
  using (app.participa_da_edicao(id));
create policy edicoes_atualizar on public.edicoes for update to authenticated
  using (app.e_coordenacao(id)) with check (app.e_coordenacao(id));

-- cursos
create policy cursos_ler on public.cursos for select to authenticated
  using (app.participa_da_edicao(edicao_id));
create policy cursos_gerenciar on public.cursos for all to authenticated
  using (app.e_coordenacao(edicao_id)) with check (app.e_coordenacao(edicao_id));

-- turmas
create policy turmas_ler on public.turmas for select to authenticated
  using (app.e_coordenacao(app.edicao_da_turma(id)) or app.vinculado_a_turma(id));
create policy turmas_gerenciar on public.turmas for all to authenticated
  using (app.e_coordenacao(app.edicao_da_turma(id)))
  with check (
    app.e_coordenacao((select c.edicao_id from public.cursos c where c.id = curso_id))
  );

-- atribuicoes: coordenação gerencia as de outras pessoas, nunca as próprias.
create policy atribuicoes_ler on public.atribuicoes for select to authenticated
  using (usuario_id = (select auth.uid()) or app.e_coordenacao(edicao_id));
create policy atribuicoes_inserir on public.atribuicoes for insert to authenticated
  with check (app.e_coordenacao(edicao_id) and usuario_id <> (select auth.uid()));
create policy atribuicoes_atualizar on public.atribuicoes for update to authenticated
  using (app.e_coordenacao(edicao_id) and usuario_id <> (select auth.uid()))
  with check (app.e_coordenacao(edicao_id) and usuario_id <> (select auth.uid()));
create policy atribuicoes_remover on public.atribuicoes for delete to authenticated
  using (app.e_coordenacao(edicao_id) and usuario_id <> (select auth.uid()));

-- auditoria
create policy auditoria_ler on public.auditoria for select to authenticated
  using (app.e_coordenacao_em_alguma());
