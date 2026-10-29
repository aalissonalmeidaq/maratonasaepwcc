-- =============================================================================
-- Spec 002 — Organização: ambientes, encontros, duplas e integrantes (com histórico)
-- Escrita em duplas/integrantes apenas por funções RPC que verificam a coordenação.
-- =============================================================================

create type public.avaliacao_objetiva as enum ('questoes', 'prova_oficial');
create type public.estado_encontro as enum ('agendado', 'realizado', 'cancelado');

-- ---------------------------------------------------------------------------
-- Ambientes e encontros
-- ---------------------------------------------------------------------------

create table public.ambientes (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 2 and 120),
  observacoes text check (char_length(observacoes) <= 500),
  criado_em timestamptz not null default now(),
  unique (edicao_id, nome)
);

create table public.encontros (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  numero integer not null check (numero >= 1),
  titulo text not null check (char_length(btrim(titulo)) between 3 and 160),
  data date not null,
  inicio time,
  fim time,
  ambiente_id uuid references public.ambientes (id) on delete set null,
  avaliacao_objetiva public.avaliacao_objetiva not null default 'questoes',
  orientacoes text check (char_length(orientacoes) <= 4000),
  estado public.estado_encontro not null default 'agendado',
  criado_em timestamptz not null default now(),
  constraint encontros_numero_unico unique (edicao_id, numero),
  constraint encontros_horario_valido check (inicio is null or fim is null or fim > inicio)
);
create index encontros_edicao_data_idx on public.encontros (edicao_id, data);

-- Número do encontro limitado à quantidade configurada nas regras da edição.
create function app.validar_encontro()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_limite integer;
begin
  select (e.regras ->> 'quantidadeEncontros')::integer into v_limite
  from public.edicoes e where e.id = new.edicao_id;
  if v_limite is not null and new.numero > v_limite then
    raise exception 'A edição está configurada com % encontros. Ajuste a configuração para criar o encontro %.',
      v_limite, new.numero using errcode = '23514';
  end if;
  if new.ambiente_id is not null and not exists (
    select 1 from public.ambientes a where a.id = new.ambiente_id and a.edicao_id = new.edicao_id
  ) then
    raise exception 'O ambiente não pertence a esta edição.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger encontros_validar
  before insert or update on public.encontros
  for each row execute function app.validar_encontro();

-- ---------------------------------------------------------------------------
-- Duplas e integrantes
-- ---------------------------------------------------------------------------

create table public.duplas (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  turma_id uuid not null references public.turmas (id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  ativa boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now()
);
create unique index duplas_nome_ativo_por_turma on public.duplas (turma_id, lower(nome)) where ativa;
create index duplas_edicao_idx on public.duplas (edicao_id);

create table public.dupla_integrantes (
  id uuid primary key default gen_random_uuid(),
  dupla_id uuid not null references public.duplas (id) on delete cascade,
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  estudante_id uuid not null references public.perfis (id) on delete restrict,
  entrada_em timestamptz not null default now(),
  entrada_por uuid references public.perfis (id) default auth.uid(),
  saida_em timestamptz,
  saida_por uuid references public.perfis (id),
  motivo_saida text,
  constraint integrantes_saida_com_motivo check (saida_em is null or motivo_saida is not null)
);
-- Um estudante só pode estar em uma dupla ativa por edição (HU01).
create unique index integrantes_um_por_edicao
  on public.dupla_integrantes (edicao_id, estudante_id) where saida_em is null;
create index integrantes_dupla_idx on public.dupla_integrantes (dupla_id);

-- ---------------------------------------------------------------------------
-- Funções auxiliares de leitura
-- ---------------------------------------------------------------------------

-- Docente ou mentor com vínculo ativo na turma.
create function app.atua_na_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = (select auth.uid()) and a.turma_id = p_turma
      and a.papel in ('docente', 'mentor') and a.ativo
  );
$$;

-- A pessoa atual é (ou foi) integrante da dupla.
create function app.e_integrante(p_dupla uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dupla_integrantes i
    where i.dupla_id = p_dupla and i.estudante_id = (select auth.uid())
  );
$$;

create function app.pode_ver_dupla(p_dupla uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.duplas d
    where d.id = p_dupla
      and (app.e_coordenacao(d.edicao_id) or app.atua_na_turma(d.turma_id) or app.e_integrante(d.id))
  );
$$;

-- Amplia a visibilidade de perfis: colegas da dupla ativa.
create or replace function app.pode_ver_perfil(p_perfil uuid)
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
    )
    or exists (
      select 1
      from public.dupla_integrantes eu
      join public.dupla_integrantes colega on colega.dupla_id = eu.dupla_id
      where eu.estudante_id = (select auth.uid()) and eu.saida_em is null
        and colega.estudante_id = p_perfil and colega.saida_em is null
    );
$$;

-- ---------------------------------------------------------------------------
-- RPCs de duplas (transacionais, auditadas)
-- ---------------------------------------------------------------------------

create function app.exigir_coordenacao(p_edicao uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.e_coordenacao(p_edicao) then
    raise exception 'Somente a coordenação da edição pode realizar esta operação.'
      using errcode = '42501';
  end if;
end;
$$;

create function app.exigir_justificativa(p_justificativa text)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p_justificativa is null or char_length(btrim(p_justificativa)) < 10 then
    raise exception 'Informe uma justificativa com pelo menos 10 caracteres.' using errcode = '23514';
  end if;
  return btrim(p_justificativa);
end;
$$;

-- Estudante ativo na turma e sem dupla ativa na edição.
create function app.validar_estudante_para_dupla(p_edicao uuid, p_turma uuid, p_estudante uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = p_estudante and a.turma_id = p_turma and a.papel = 'aluno' and a.ativo
  ) then
    raise exception 'Todos os integrantes devem ser alunos ativos da turma da dupla.'
      using errcode = '23514';
  end if;
  if exists (
    select 1 from public.dupla_integrantes i
    where i.edicao_id = p_edicao and i.estudante_id = p_estudante and i.saida_em is null
  ) then
    raise exception 'Um dos estudantes já participa de outra dupla ativa nesta edição.'
      using errcode = '23514';
  end if;
end;
$$;

create function public.formar_dupla(p_turma uuid, p_nome text, p_estudantes uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid := app.edicao_da_turma(p_turma);
  v_dupla uuid;
  v_estudante uuid;
begin
  if v_edicao is null then
    raise exception 'Turma não encontrada.' using errcode = '23514';
  end if;
  perform app.exigir_coordenacao(v_edicao);
  if coalesce(array_length(p_estudantes, 1), 0) <> 2 then
    raise exception 'A dupla deve ter exatamente dois integrantes.' using errcode = '23514';
  end if;
  if p_estudantes[1] = p_estudantes[2] then
    raise exception 'Escolha dois estudantes diferentes.' using errcode = '23514';
  end if;
  foreach v_estudante in array p_estudantes loop
    perform app.validar_estudante_para_dupla(v_edicao, p_turma, v_estudante);
  end loop;

  insert into public.duplas (edicao_id, turma_id, nome)
  values (v_edicao, p_turma, btrim(p_nome))
  returning id into v_dupla;

  insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
  select v_dupla, v_edicao, unnest(p_estudantes);

  return v_dupla;
end;
$$;

create function public.substituir_integrante(
  p_dupla uuid, p_sai uuid, p_entra uuid, p_justificativa text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas%rowtype;
  v_motivo text;
begin
  select * into v_dupla from public.duplas where id = p_dupla for update;
  if not found then
    raise exception 'Dupla não encontrada.' using errcode = '23514';
  end if;
  perform app.exigir_coordenacao(v_dupla.edicao_id);
  v_motivo := app.exigir_justificativa(p_justificativa);
  if not v_dupla.ativa then
    raise exception 'A dupla não está ativa.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.dupla_integrantes
    where dupla_id = p_dupla and estudante_id = p_sai and saida_em is null
  ) then
    raise exception 'O estudante informado não é integrante ativo desta dupla.' using errcode = '23514';
  end if;
  perform app.validar_estudante_para_dupla(v_dupla.edicao_id, v_dupla.turma_id, p_entra);

  perform set_config('app.justificativa', v_motivo, true);
  update public.dupla_integrantes
     set saida_em = now(), saida_por = auth.uid(), motivo_saida = v_motivo
   where dupla_id = p_dupla and estudante_id = p_sai and saida_em is null;
  insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
  values (p_dupla, v_dupla.edicao_id, p_entra);
  perform set_config('app.justificativa', '', true);
end;
$$;

create function public.desfazer_dupla(p_dupla uuid, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_dupla public.duplas%rowtype;
  v_motivo text;
begin
  select * into v_dupla from public.duplas where id = p_dupla for update;
  if not found then
    raise exception 'Dupla não encontrada.' using errcode = '23514';
  end if;
  perform app.exigir_coordenacao(v_dupla.edicao_id);
  v_motivo := app.exigir_justificativa(p_justificativa);

  perform set_config('app.justificativa', v_motivo, true);
  update public.dupla_integrantes
     set saida_em = now(), saida_por = auth.uid(), motivo_saida = v_motivo
   where dupla_id = p_dupla and saida_em is null;
  update public.duplas set ativa = false where id = p_dupla;
  perform set_config('app.justificativa', '', true);
end;
$$;

revoke all on function public.formar_dupla(uuid, text, uuid[]) from public, anon;
revoke all on function public.substituir_integrante(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.desfazer_dupla(uuid, text) from public, anon;
grant execute on function public.formar_dupla(uuid, text, uuid[]) to authenticated;
grant execute on function public.substituir_integrante(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.desfazer_dupla(uuid, text) to authenticated;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- ---------------------------------------------------------------------------
-- Auditoria
-- ---------------------------------------------------------------------------

create trigger auditoria_ambientes after insert or update or delete on public.ambientes
  for each row execute function app.registrar_auditoria();
create trigger auditoria_encontros after insert or update or delete on public.encontros
  for each row execute function app.registrar_auditoria();
create trigger auditoria_duplas after insert or update or delete on public.duplas
  for each row execute function app.registrar_auditoria();
create trigger auditoria_dupla_integrantes after insert or update or delete on public.dupla_integrantes
  for each row execute function app.registrar_auditoria();

-- ---------------------------------------------------------------------------
-- Privilégios e RLS
-- ---------------------------------------------------------------------------

revoke all on public.ambientes, public.encontros, public.duplas, public.dupla_integrantes from anon;
-- Duplas e integrantes: somente leitura pela API; escrita só pelas RPCs acima.
revoke insert, update, delete, truncate on public.duplas, public.dupla_integrantes from authenticated;

alter table public.ambientes enable row level security;
alter table public.encontros enable row level security;
alter table public.duplas enable row level security;
alter table public.dupla_integrantes enable row level security;

create policy ambientes_ler on public.ambientes for select to authenticated
  using (app.participa_da_edicao(edicao_id));
create policy ambientes_gerenciar on public.ambientes for all to authenticated
  using (app.e_coordenacao(edicao_id)) with check (app.e_coordenacao(edicao_id));

create policy encontros_ler on public.encontros for select to authenticated
  using (app.participa_da_edicao(edicao_id));
create policy encontros_gerenciar on public.encontros for all to authenticated
  using (app.e_coordenacao(edicao_id)) with check (app.e_coordenacao(edicao_id));

create policy duplas_ler on public.duplas for select to authenticated
  using (app.pode_ver_dupla(id));

create policy integrantes_ler on public.dupla_integrantes for select to authenticated
  using (app.pode_ver_dupla(dupla_id));
