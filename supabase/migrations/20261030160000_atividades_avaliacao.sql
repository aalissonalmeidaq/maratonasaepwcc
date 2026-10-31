-- =============================================================================
-- Spec 006 — atividades dos encontros: desafios e entregas (Storage privado), prorrogação,
-- presença e participação, avaliação por rubrica, listas de questões com submissão única e
-- leitura da pontuação parcial. Escrita só por RPC transacional, idempotente e auditada;
-- limites e critérios vêm de `edicoes.regras` (FR-025).
-- =============================================================================

create type public.estado_atividade as enum ('rascunho', 'publicado', 'encerrado');

-- ---------------------------------------------------------------------------
-- Desafios e entregas
-- ---------------------------------------------------------------------------
create table public.desafios (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  encontro_id uuid not null references public.encontros (id) on delete restrict,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 160),
  enunciado text not null check (char_length(btrim(enunciado)) between 1 and 8000),
  recursos_permitidos text not null check (char_length(recursos_permitidos) <= 2000),
  politica_ia text not null check (char_length(politica_ia) <= 2000),
  prazo timestamptz not null,
  aceita_arquivo boolean not null default true,
  aceita_link boolean not null default true,
  estado public.estado_atividade not null default 'rascunho',
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint desafios_forma_de_entrega check (aceita_arquivo or aceita_link)
);
create index desafios_encontro_idx on public.desafios (encontro_id);

create table public.desafio_turmas (
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  primary key (desafio_id, turma_id)
);
create index desafio_turmas_turma_idx on public.desafio_turmas (turma_id);

create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  versao integer not null check (versao >= 1),
  autor_id uuid not null references public.perfis (id),
  protocolo text not null unique,
  recebida_em timestamptz not null default now(),
  arquivo_path text unique,
  arquivo_nome text check (char_length(arquivo_nome) <= 255),
  link text check (link ~ '^https?://[^[:space:]]+$' and char_length(link) <= 2000),
  atraso_minutos integer not null default 0 check (atraso_minutos >= 0),
  desconto_previsto numeric not null default 0 check (desconto_previsto >= 0),
  chave_envio uuid not null,
  constraint entregas_versao_unica unique (desafio_id, dupla_id, versao),
  constraint entregas_chave_unica unique (desafio_id, dupla_id, chave_envio),
  constraint entregas_arquivo_ou_link check ((arquivo_path is null) <> (link is null))
);
create index entregas_dupla_idx on public.entregas (dupla_id);

create table public.prorrogacoes (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  novo_prazo timestamptz not null,
  justificativa text not null check (char_length(btrim(justificativa)) between 10 and 1000),
  autor_id uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now()
);
create index prorrogacoes_desafio_dupla_idx on public.prorrogacoes (desafio_id, dupla_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- Presença, participação e avaliação (estado atual; histórico na auditoria)
-- ---------------------------------------------------------------------------
create table public.presencas (
  encontro_id uuid not null references public.encontros (id) on delete cascade,
  estudante_id uuid not null references public.perfis (id) on delete restrict,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  presente boolean not null,
  observacao text check (char_length(observacao) <= 300),
  autor_id uuid references public.perfis (id) default auth.uid(),
  registrado_em timestamptz not null default now(),
  primary key (encontro_id, estudante_id)
);
create index presencas_turma_idx on public.presencas (turma_id, encontro_id);

create table public.participacoes (
  encontro_id uuid not null references public.encontros (id) on delete cascade,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  notas jsonb not null check (jsonb_typeof(notas) = 'object'),
  autor_id uuid references public.perfis (id) default auth.uid(),
  registrado_em timestamptz not null default now(),
  primary key (encontro_id, dupla_id)
);

create table public.avaliacoes (
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  entrega_id uuid references public.entregas (id) on delete set null,
  notas_entrega jsonb check (notas_entrega is null or jsonb_typeof(notas_entrega) = 'object'),
  notas_apresentacao jsonb check (notas_apresentacao is null or jsonb_typeof(notas_apresentacao) = 'object'),
  apresentacao_nao_avaliavel boolean not null default false,
  feedback text check (char_length(feedback) <= 4000),
  autor_id uuid references public.perfis (id) default auth.uid(),
  registrado_em timestamptz not null default now(),
  primary key (desafio_id, dupla_id)
);

-- ---------------------------------------------------------------------------
-- Questões preparatórias
-- ---------------------------------------------------------------------------
create table public.listas_questoes (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  encontro_id uuid not null references public.encontros (id) on delete restrict,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 160),
  prazo timestamptz not null,
  estado public.estado_atividade not null default 'rascunho',
  versao integer not null default 1 check (versao >= 1),
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.lista_turmas (
  lista_id uuid not null references public.listas_questoes (id) on delete cascade,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  primary key (lista_id, turma_id)
);
create index lista_turmas_turma_idx on public.lista_turmas (turma_id);

create table public.questoes (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.listas_questoes (id) on delete cascade,
  ordem integer not null check (ordem >= 1),
  enunciado text not null check (char_length(btrim(enunciado)) between 1 and 4000),
  justificativa text not null default '' check (char_length(justificativa) <= 4000),
  capacidade text not null default '' check (char_length(capacidade) <= 300),
  unique (lista_id, ordem)
);

create table public.alternativas (
  id uuid primary key default gen_random_uuid(),
  questao_id uuid not null references public.questoes (id) on delete cascade,
  ordem integer not null check (ordem >= 1),
  texto text not null check (char_length(btrim(texto)) between 1 and 1000),
  correta boolean not null default false,
  unique (questao_id, ordem)
);

create table public.submissoes_questoes (
  id uuid primary key default gen_random_uuid(),
  lista_id uuid not null references public.listas_questoes (id) on delete cascade,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  versao_lista integer not null,
  autor_id uuid not null references public.perfis (id),
  enviada_em timestamptz not null default now(),
  chave_envio uuid not null unique,
  respostas jsonb not null check (jsonb_typeof(respostas) = 'object'),
  acertos integer not null check (acertos >= 0),
  total integer not null check (total >= 1),
  constraint submissoes_uma_por_equipe unique (lista_id, dupla_id)
);

-- ---------------------------------------------------------------------------
-- Auditoria, privilégios e RLS
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['desafios', 'desafio_turmas', 'entregas', 'prorrogacoes', 'presencas',
    'participacoes', 'avaliacoes', 'listas_questoes', 'lista_turmas', 'questoes', 'alternativas',
    'submissoes_questoes']
  loop
    execute format('create trigger auditoria_%1$s after insert or update or delete on public.%1$I
                    for each row execute function app.registrar_auditoria()', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Funções auxiliares (internas)
-- ---------------------------------------------------------------------------
create function app.e_gestao_da_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.e_coordenacao(app.edicao_da_turma(p_turma)) or app.atua_na_turma(p_turma);
$$;

create function app.turma_da_dupla(p_dupla uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select turma_id from public.duplas where id = p_dupla;
$$;

create function app.regras_da_edicao(p_edicao uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select regras from public.edicoes where id = p_edicao;
$$;

-- Equipe ativa do aluno ativo na edição (ou nulo).
create function app.equipe_ativa_do_aluno(p_edicao uuid, p_pessoa uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select d.id from public.dupla_integrantes i
  join public.duplas d on d.id = i.dupla_id and d.ativa
  where i.edicao_id = p_edicao and i.estudante_id = p_pessoa and i.saida_em is null
    and app.e_aluno_ativo(d.turma_id, p_pessoa)
  limit 1;
$$;

create function app.e_colega_de_equipe(p_pessoa uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dupla_integrantes eu
    join public.dupla_integrantes outro on outro.dupla_id = eu.dupla_id and outro.saida_em is null
    where eu.estudante_id = (select auth.uid()) and eu.saida_em is null
      and outro.estudante_id = p_pessoa
  );
$$;

create function app.pode_ver_desafio(p_desafio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.desafios d
    where d.id = p_desafio
      and (app.e_coordenacao(d.edicao_id)
           or exists (select 1 from public.desafio_turmas dt where dt.desafio_id = d.id
                      and (app.atua_na_turma(dt.turma_id)
                           or (d.estado <> 'rascunho'
                               and app.e_aluno_ativo(dt.turma_id, (select auth.uid()))))))
  );
$$;

create function app.pode_gerir_lista(p_lista uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listas_questoes l
    where l.id = p_lista
      and (app.e_coordenacao(l.edicao_id)
           or exists (select 1 from public.lista_turmas lt
                      where lt.lista_id = l.id and app.atua_na_turma(lt.turma_id)))
  );
$$;

-- Justificativa de correção (regra da spec 002, `app.exigir_justificativa`) gravada na auditoria.
create function app.registrar_justificativa(p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.justificativa', app.exigir_justificativa(p_justificativa), true);
end;
$$;

-- Valida notas contra os critérios das regras e devolve a soma (FR-025).
create function app.validar_notas(p_notas jsonb, p_criterios jsonb)
returns numeric language plpgsql immutable set search_path = '' as $$
declare
  v_criterio jsonb;
  v_chave text;
  v_nota numeric;
  v_soma numeric := 0;
begin
  if p_notas is null or jsonb_typeof(p_notas) <> 'object' then
    raise exception 'Informe as notas dos critérios.' using errcode = '23514';
  end if;
  for v_chave in select jsonb_object_keys(p_notas) loop
    if not exists (select 1 from jsonb_array_elements(p_criterios) c where c ->> 'id' = v_chave) then
      raise exception 'Critério desconhecido: %.', v_chave using errcode = '23514';
    end if;
  end loop;
  for v_criterio in select * from jsonb_array_elements(p_criterios) loop
    if jsonb_typeof(p_notas -> (v_criterio ->> 'id')) is distinct from 'number' then
      raise exception 'Informe a nota de "%".', v_criterio ->> 'rotulo' using errcode = '23514';
    end if;
    v_nota := (p_notas ->> (v_criterio ->> 'id'))::numeric;
    if v_nota < 0 or v_nota > (v_criterio ->> 'maximo')::numeric then
      raise exception 'A nota de "%" deve estar entre 0 e %.', v_criterio ->> 'rotulo',
        v_criterio ->> 'maximo' using errcode = '23514';
    end if;
    v_soma := v_soma + v_nota;
  end loop;
  return v_soma;
end;
$$;

-- Prazo efetivo da equipe: prorrogação mais recente ou o prazo do desafio.
create function app.prazo_efetivo(p_desafio uuid, p_dupla uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.novo_prazo from public.prorrogacoes p
     where p.desafio_id = p_desafio and p.dupla_id = p_dupla
     order by p.criado_em desc limit 1),
    (select d.prazo from public.desafios d where d.id = p_desafio));
$$;

-- FR-027: encerrado manualmente ou depois do prazo + tolerância máxima de atraso.
create function app.desafio_encerrado(p_desafio uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select d.estado = 'encerrado'
      or now() > d.prazo + make_interval(
           mins => coalesce((app.regras_da_edicao(d.edicao_id) -> 'entrega' ->> 'limiteAtrasoMinutos')::int, 0))
  from public.desafios d where d.id = p_desafio;
$$;

-- FR-027: a lista encerra no prazo (ou manualmente).
create function app.lista_encerrada(p_lista uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select l.estado = 'encerrado' or now() > l.prazo from public.listas_questoes l where l.id = p_lista;
$$;

create function app.desafio_publicado_na_turma(p_desafio uuid, p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id
    where d.id = p_desafio and dt.turma_id = p_turma and d.estado <> 'rascunho'
  );
$$;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- ---------------------------------------------------------------------------
-- Leitura (RLS) — o aluno nunca lê questões, alternativas nem submissões diretamente
-- ---------------------------------------------------------------------------
create policy desafios_ler on public.desafios for select to authenticated
  using (app.pode_ver_desafio(id));
create policy desafio_turmas_ler on public.desafio_turmas for select to authenticated
  using (app.pode_ver_desafio(desafio_id));
create policy entregas_ler on public.entregas for select to authenticated
  using (app.pode_ver_dupla(dupla_id));
create policy prorrogacoes_ler on public.prorrogacoes for select to authenticated
  using (app.pode_ver_dupla(dupla_id));
create policy presencas_ler on public.presencas for select to authenticated
  using (estudante_id = (select auth.uid()) or app.e_gestao_da_turma(turma_id)
         or app.e_colega_de_equipe(estudante_id));
create policy participacoes_ler on public.participacoes for select to authenticated
  using (app.pode_ver_dupla(dupla_id));
create policy avaliacoes_ler on public.avaliacoes for select to authenticated
  using (app.pode_ver_dupla(dupla_id));
create policy listas_ler on public.listas_questoes for select to authenticated
  using (app.pode_gerir_lista(id));
create policy lista_turmas_ler on public.lista_turmas for select to authenticated
  using (app.pode_gerir_lista(lista_id));
create policy questoes_ler on public.questoes for select to authenticated
  using (app.pode_gerir_lista(lista_id));
create policy alternativas_ler on public.alternativas for select to authenticated
  using (app.pode_gerir_lista((select q.lista_id from public.questoes q where q.id = questao_id)));
create policy submissoes_ler on public.submissoes_questoes for select to authenticated
  using (app.pode_gerir_lista(lista_id));

-- ---------------------------------------------------------------------------
-- Storage: bucket privado `entregas` (research R1)
-- Caminho: {desafio_id}/{dupla_id}/{arquivo}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entregas', 'entregas', false, 52428800,
        array['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function app.partes_do_caminho(p_nome text)
returns table (desafio_id uuid, dupla_id uuid) language sql immutable set search_path = '' as $$
  select split_part(p_nome, '/', 1)::uuid, split_part(p_nome, '/', 2)::uuid
  where p_nome ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$';
$$;

-- Integrante ativo da equipe do caminho, com o desafio aberto à turma da equipe.
create function app.pode_enviar_arquivo(p_nome text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from app.partes_do_caminho(p_nome) c
    join public.duplas d on d.id = c.dupla_id and d.ativa
    where app.desafio_publicado_na_turma(c.desafio_id, d.turma_id)
      and exists (select 1 from public.dupla_integrantes i
                  where i.dupla_id = d.id and i.estudante_id = (select auth.uid()) and i.saida_em is null)
      and app.e_aluno_ativo(d.turma_id, (select auth.uid()))
  );
$$;

create function app.pode_ver_arquivo(p_nome text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from app.partes_do_caminho(p_nome) c where app.pode_ver_dupla(c.dupla_id));
$$;

grant execute on function app.partes_do_caminho(text), app.pode_enviar_arquivo(text),
  app.pode_ver_arquivo(text) to authenticated;

create policy entregas_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'entregas' and app.pode_enviar_arquivo(name));
create policy entregas_baixar on storage.objects for select to authenticated
  using (bucket_id = 'entregas' and app.pode_ver_arquivo(name));

-- =============================================================================
-- US1 — desafios, prorrogação e entregas (FR-001–008, FR-026, FR-027)
-- =============================================================================

-- Docente ou mentor de todas as turmas informadas, da mesma edição (R8).
create function app.exigir_turmas_da_atividade(p_edicao uuid, p_turmas uuid[])
returns void language plpgsql stable security definer set search_path = '' as $$
declare v_turma uuid;
begin
  if p_turmas is null or cardinality(p_turmas) = 0 then
    raise exception 'Escolha pelo menos uma turma.' using errcode = '23514';
  end if;
  foreach v_turma in array p_turmas loop
    if app.edicao_da_turma(v_turma) is distinct from p_edicao or not app.atua_na_turma(v_turma) then
      raise exception 'Somente docente ou mentor da turma podem criar atividades para ela.'
        using errcode = '42501';
    end if;
  end loop;
end;
$$;

-- Docente ou mentor de alguma turma do desafio (editar, publicar, encerrar).
create function app.exigir_gestor_do_desafio(p_desafio uuid)
returns public.desafios language plpgsql security definer set search_path = '' as $$
declare v public.desafios%rowtype;
begin
  select * into v from public.desafios where id = p_desafio for update;
  if not found then
    raise exception 'Desafio não encontrado.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.desafio_turmas dt
                 where dt.desafio_id = p_desafio and app.atua_na_turma(dt.turma_id)) then
    raise exception 'Somente docente ou mentor da turma podem alterar este desafio.' using errcode = '42501';
  end if;
  return v;
end;
$$;

create function public.salvar_desafio(
  p_id uuid, p_encontro uuid, p_turmas uuid[], p_titulo text, p_enunciado text, p_recursos text,
  p_politica_ia text, p_prazo timestamptz, p_aceita_arquivo boolean, p_aceita_link boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid := (select edicao_id from public.encontros where id = p_encontro);
  v_id uuid := p_id;
begin
  if v_edicao is null then
    raise exception 'Encontro não encontrado.' using errcode = 'P0002';
  end if;
  perform app.exigir_turmas_da_atividade(v_edicao, p_turmas);
  if v_id is null then
    insert into public.desafios (edicao_id, encontro_id, titulo, enunciado, recursos_permitidos,
                                 politica_ia, prazo, aceita_arquivo, aceita_link)
    values (v_edicao, p_encontro, btrim(p_titulo), btrim(p_enunciado), coalesce(btrim(p_recursos), ''),
            coalesce(btrim(p_politica_ia), ''), p_prazo, p_aceita_arquivo, p_aceita_link)
    returning id into v_id;
  else
    perform app.exigir_gestor_do_desafio(v_id);
    if exists (select 1 from public.entregas where desafio_id = v_id) then
      raise exception 'O desafio já tem entregas e não pode ser editado.' using errcode = '23514';
    end if;
    update public.desafios set encontro_id = p_encontro, edicao_id = v_edicao, titulo = btrim(p_titulo),
      enunciado = btrim(p_enunciado), recursos_permitidos = coalesce(btrim(p_recursos), ''),
      politica_ia = coalesce(btrim(p_politica_ia), ''), prazo = p_prazo,
      aceita_arquivo = p_aceita_arquivo, aceita_link = p_aceita_link, atualizado_em = now()
    where id = v_id;
    delete from public.desafio_turmas where desafio_id = v_id and turma_id <> all (p_turmas);
  end if;
  insert into public.desafio_turmas (desafio_id, turma_id)
  select v_id, t from unnest(p_turmas) t on conflict do nothing;
  return v_id;
end;
$$;

create function public.publicar_desafio(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.desafios%rowtype := app.exigir_gestor_do_desafio(p_id);
begin
  if v.estado = 'rascunho' then
    update public.desafios set estado = 'publicado', atualizado_em = now() where id = p_id;
  elsif v.estado = 'encerrado' then
    raise exception 'O desafio já está encerrado.' using errcode = '23514';
  end if;
end;
$$;

create function public.encerrar_desafio(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.desafios%rowtype := app.exigir_gestor_do_desafio(p_id);
begin
  if v.estado = 'rascunho' then
    raise exception 'Publique o desafio antes de encerrá-lo.' using errcode = '23514';
  elsif v.estado = 'publicado' then
    update public.desafios set estado = 'encerrado', atualizado_em = now() where id = p_id;
  end if;
end;
$$;

-- FR-007: docente/mentor da turma da equipe ou coordenação; repetição idêntica sem efeito.
create function public.registrar_prorrogacao(
  p_desafio uuid, p_dupla uuid, p_novo_prazo timestamptz, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid := app.turma_da_dupla(p_dupla);
  v_ultima public.prorrogacoes%rowtype;
begin
  if v_turma is null or not app.desafio_publicado_na_turma(p_desafio, v_turma) then
    raise exception 'Equipe ou desafio não encontrado.' using errcode = 'P0002';
  end if;
  if not (app.atua_na_turma(v_turma) or app.e_coordenacao(app.edicao_da_turma(v_turma))) then
    raise exception 'Somente docente, mentor ou coordenação registram prorrogação.' using errcode = '42501';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  select * into v_ultima from public.prorrogacoes
  where desafio_id = p_desafio and dupla_id = p_dupla order by criado_em desc limit 1;
  if found and v_ultima.novo_prazo = p_novo_prazo and v_ultima.justificativa = btrim(p_justificativa) then
    return;
  end if;
  insert into public.prorrogacoes (desafio_id, dupla_id, novo_prazo, justificativa)
  values (p_desafio, p_dupla, p_novo_prazo, btrim(p_justificativa));
end;
$$;

create function app.comprovante(e public.entregas)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('protocolo', e.protocolo, 'recebidaEm', e.recebida_em, 'versao', e.versao,
                            'atrasoMinutos', e.atraso_minutos, 'descontoPrevisto', e.desconto_previsto);
$$;

-- FR-003–006/027: valida turma, equipe, forma, arquivo no bucket, prazo e atraso; idempotente
-- pela chave de envio (Constituição V).
create function public.registrar_entrega(
  p_desafio uuid, p_chave uuid, p_arquivo text, p_arquivo_nome text, p_link text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_desafio public.desafios%rowtype;
  v_dupla uuid;
  v_existente public.entregas%rowtype;
  v_metadados jsonb;
  v_prazo timestamptz;
  v_prorrogada boolean;
  v_regras jsonb;
  v_atraso integer;
  v_desconto numeric;
  v_versao integer;
  v_nova public.entregas%rowtype;
begin
  select * into v_desafio from public.desafios where id = p_desafio;
  if not found or v_desafio.estado = 'rascunho' or not exists (
       select 1 from public.desafio_turmas dt
       where dt.desafio_id = p_desafio and app.e_aluno_ativo(dt.turma_id, v_uid)) then
    raise exception 'Este desafio não é da sua turma.' using errcode = '42501';
  end if;
  v_dupla := app.equipe_ativa_do_aluno(v_desafio.edicao_id, v_uid);
  if v_dupla is null then
    raise exception 'Você precisa fazer parte de uma equipe para enviar.' using errcode = '23514';
  end if;

  -- Serializa os envios da equipe; a repetição da mesma tentativa devolve o comprovante original.
  perform 1 from public.duplas where id = v_dupla for update;
  select * into v_existente from public.entregas
  where desafio_id = p_desafio and dupla_id = v_dupla and chave_envio = p_chave;
  if found then
    return app.comprovante(v_existente);
  end if;

  if p_arquivo is null and nullif(btrim(p_link), '') is null then
    raise exception 'Envie um arquivo ou um link.' using errcode = '23514';
  elsif p_arquivo is not null and nullif(btrim(p_link), '') is not null then
    raise exception 'Envie um arquivo ou um link, não os dois.' using errcode = '23514';
  elsif p_arquivo is not null and not v_desafio.aceita_arquivo then
    raise exception 'Este desafio não aceita arquivo.' using errcode = '23514';
  elsif p_arquivo is null and not v_desafio.aceita_link then
    raise exception 'Este desafio não aceita link.' using errcode = '23514';
  end if;

  if p_arquivo is null then
    if btrim(p_link) !~ '^https?://[^[:space:]]+$' then
      raise exception 'Informe um link válido (http ou https).' using errcode = '23514';
    end if;
  else
    select o.metadata into v_metadados from storage.objects o
    where o.bucket_id = 'entregas' and o.name = p_arquivo and o.owner_id = v_uid::text
      and o.name like p_desafio::text || '/' || v_dupla::text || '/%';
    if not found then
      raise exception 'Arquivo não encontrado. Envie o arquivo novamente.' using errcode = '23514';
    end if;
    if coalesce((v_metadados ->> 'size')::bigint, 0) > 52428800 then
      raise exception 'O arquivo passa do limite de 50 MB.' using errcode = '23514';
    end if;
    if coalesce(v_metadados ->> 'mimetype', '') <> all (array['application/pdf', 'application/zip',
         'application/x-zip-compressed', 'image/png', 'image/jpeg']) then
      raise exception 'Tipo de arquivo não aceito: envie PDF, ZIP, PNG ou JPG.' using errcode = '23514';
    end if;
  end if;

  v_prorrogada := exists (select 1 from public.prorrogacoes where desafio_id = p_desafio and dupla_id = v_dupla);
  v_prazo := app.prazo_efetivo(p_desafio, v_dupla);
  v_regras := app.regras_da_edicao(v_desafio.edicao_id) -> 'entrega';
  v_atraso := greatest(0, ceil(extract(epoch from now() - v_prazo) / 60))::integer;
  if (v_desafio.estado = 'encerrado' and not v_prorrogada)
     or v_atraso > coalesce((v_regras ->> 'limiteAtrasoMinutos')::integer, 0) then
    raise exception 'O prazo de entrega terminou e a entrega não é mais aceita.' using errcode = '23514';
  end if;
  if v_atraso > 0 and exists (select 1 from public.entregas where desafio_id = p_desafio
                              and dupla_id = v_dupla and atraso_minutos = 0) then
    raise exception 'A equipe já tem entrega no prazo; um novo envio agora seria registrado com atraso.'
      using errcode = '23514';
  end if;
  if v_atraso > 0 then
    select (f ->> 'desconto')::numeric into v_desconto
    from jsonb_array_elements(v_regras -> 'faixasDeAtraso') f
    where v_atraso <= (f ->> 'ateMinutos')::integer
    order by (f ->> 'ateMinutos')::integer limit 1;
  end if;

  select coalesce(max(versao), 0) + 1 into v_versao from public.entregas
  where desafio_id = p_desafio and dupla_id = v_dupla;
  insert into public.entregas (desafio_id, dupla_id, versao, autor_id, protocolo, arquivo_path,
                               arquivo_nome, link, atraso_minutos, desconto_previsto, chave_envio)
  values (p_desafio, v_dupla, v_versao, v_uid,
          'ENT-' || to_char(now() at time zone 'America/Fortaleza', 'YYYYMMDD') || '-'
            || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
          p_arquivo, nullif(btrim(p_arquivo_nome), ''), nullif(btrim(p_link), ''),
          v_atraso, coalesce(v_desconto, 0), p_chave)
  returning * into v_nova;
  return app.comprovante(v_nova);
end;
$$;

create function app.entregas_json(p_desafio uuid, p_dupla uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(app.comprovante(e) || jsonb_build_object(
           'id', e.id, 'autorNome', p.nome, 'arquivoPath', e.arquivo_path,
           'arquivoNome', e.arquivo_nome, 'link', e.link) order by e.versao desc), '[]'::jsonb)
  from public.entregas e join public.perfis p on p.id = e.autor_id
  where e.desafio_id = p_desafio and e.dupla_id = p_dupla;
$$;

create function app.avaliacao_json(p_desafio uuid, p_dupla uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('notasEntrega', a.notas_entrega, 'notasApresentacao', a.notas_apresentacao,
           'apresentacaoNaoAvaliavel', a.apresentacao_nao_avaliavel, 'feedback', a.feedback,
           'registradoEm', a.registrado_em)
  from public.avaliacoes a where a.desafio_id = p_desafio and a.dupla_id = p_dupla;
$$;

create function app.desafio_json(d public.desafios)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', d.id, 'edicaoId', d.edicao_id, 'encontroId', d.encontro_id,
    'titulo', d.titulo, 'enunciado', d.enunciado, 'recursosPermitidos', d.recursos_permitidos,
    'politicaIa', d.politica_ia, 'prazo', d.prazo, 'aceitaArquivo', d.aceita_arquivo,
    'aceitaLink', d.aceita_link, 'estado', d.estado,
    'turmas', (select coalesce(jsonb_agg(dt.turma_id), '[]'::jsonb) from public.desafio_turmas dt
               where dt.desafio_id = d.id));
$$;

-- Leitura da turma: desafios (com entregas e avaliação da equipe do aluno) e listas.
create function public.atividades_da_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_aluno boolean := app.e_aluno_ativo(p_turma, auth.uid());
  v_dupla uuid;
begin
  if not (v_aluno or app.e_gestao_da_turma(p_turma)) then
    raise exception 'Você não tem acesso a esta turma.' using errcode = '42501';
  end if;
  if v_aluno then
    v_dupla := app.equipe_ativa_do_aluno(app.edicao_da_turma(p_turma), v_uid);
  end if;
  return jsonb_build_object(
    'regras', app.regras_da_edicao(app.edicao_da_turma(p_turma)),
    'desafios', coalesce((
      select jsonb_agg(app.desafio_json(d) || jsonb_build_object(
               'duplaId', v_dupla,
               'prazoEfetivo', case when v_dupla is null then d.prazo else app.prazo_efetivo(d.id, v_dupla) end,
               'encerrado', app.desafio_encerrado(d.id)
                 and not (v_dupla is not null and exists (
                   select 1 from public.prorrogacoes p where p.desafio_id = d.id and p.dupla_id = v_dupla
                     and p.novo_prazo > now())),
               'entregas', case when v_dupla is null then '[]'::jsonb else app.entregas_json(d.id, v_dupla) end,
               'avaliacao', case when v_dupla is null then null else app.avaliacao_json(d.id, v_dupla) end)
             order by d.prazo, d.criado_em)
      from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = p_turma
      where d.estado <> 'rascunho' or not v_aluno), '[]'::jsonb),
    'listas', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'encontroId', l.encontro_id, 'titulo', l.titulo,
               'prazo', l.prazo, 'encerrada', app.lista_encerrada(l.id)) order by l.prazo, l.criado_em)
      from public.listas_questoes l join public.lista_turmas lt on lt.lista_id = l.id and lt.turma_id = p_turma
      where l.estado <> 'rascunho' or not v_aluno), '[]'::jsonb));
end;
$$;

revoke all on function public.salvar_desafio(uuid, uuid, uuid[], text, text, text, text, timestamptz, boolean, boolean),
  public.publicar_desafio(uuid), public.encerrar_desafio(uuid),
  public.registrar_prorrogacao(uuid, uuid, timestamptz, text),
  public.registrar_entrega(uuid, uuid, text, text, text), public.atividades_da_turma(uuid)
  from public, anon;
grant execute on function public.salvar_desafio(uuid, uuid, uuid[], text, text, text, text, timestamptz, boolean, boolean),
  public.publicar_desafio(uuid), public.encerrar_desafio(uuid),
  public.registrar_prorrogacao(uuid, uuid, timestamptz, text),
  public.registrar_entrega(uuid, uuid, text, text, text), public.atividades_da_turma(uuid)
  to authenticated;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- =============================================================================
-- US2 — presença e participação (FR-009–011). Primeiro registro: docente ou mentor da turma;
-- a coordenação só corrige. Repetir os mesmos valores não grava nada (Constituição V).
-- =============================================================================

-- Devolve true quando quem chama é só coordenação (sem atuar na turma); recusa os demais.
create function app.exigir_registro_na_turma(p_turma uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if app.atua_na_turma(p_turma) then
    return false;
  end if;
  if app.e_coordenacao(app.edicao_da_turma(p_turma)) then
    return true;
  end if;
  raise exception 'Somente docente, mentor ou coordenação da turma registram este dado.' using errcode = '42501';
end;
$$;

create function app.exigir_encontro_da_turma(p_encontro uuid, p_turma uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.encontros e
                 where e.id = p_encontro and e.edicao_id = app.edicao_da_turma(p_turma)) then
    raise exception 'Encontro não encontrado nesta edição.' using errcode = 'P0002';
  end if;
end;
$$;

create function public.registrar_presencas(
  p_encontro uuid, p_turma uuid, p_registros jsonb, p_justificativa text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_so_coordenacao boolean := app.exigir_registro_na_turma(p_turma);
  v_registro record;
  v_novos integer := 0;
  v_alterados integer := 0;
begin
  perform app.exigir_encontro_da_turma(p_encontro, p_turma);
  if jsonb_typeof(p_registros) is distinct from 'array' then
    raise exception 'Informe a lista de presenças.' using errcode = '23514';
  end if;

  create temporary table if not exists pg_temp.presencas_lote (
    estudante_id uuid primary key, presente boolean not null, observacao text, situacao text
  ) on commit drop;
  truncate pg_temp.presencas_lote;
  insert into pg_temp.presencas_lote (estudante_id, presente, observacao)
  select (r ->> 'estudanteId')::uuid, (r ->> 'presente')::boolean, nullif(btrim(r ->> 'observacao'), '')
  from jsonb_array_elements(p_registros) r;

  if exists (select 1 from pg_temp.presencas_lote l where not app.e_aluno_ativo(p_turma, l.estudante_id)) then
    raise exception 'Há alunos que não pertencem a esta turma.' using errcode = '23514';
  end if;
  if exists (select 1 from pg_temp.presencas_lote where char_length(observacao) > 300) then
    raise exception 'A observação tem no máximo 300 caracteres.' using errcode = '23514';
  end if;

  update pg_temp.presencas_lote l set situacao = case
    when x.estudante_id is null then 'novo'
    when x.presente = l.presente and x.observacao is not distinct from l.observacao then 'igual'
    else 'alterado' end
  from pg_temp.presencas_lote l2
  left join public.presencas x on x.encontro_id = p_encontro and x.estudante_id = l2.estudante_id
  where l2.estudante_id = l.estudante_id;

  select count(*) filter (where situacao = 'novo'), count(*) filter (where situacao = 'alterado')
  into v_novos, v_alterados from pg_temp.presencas_lote;
  if v_so_coordenacao and v_novos > 0 then
    raise exception 'A coordenação só corrige registros existentes.' using errcode = '42501';
  end if;
  if v_alterados > 0 then
    perform app.registrar_justificativa(p_justificativa);
  end if;

  for v_registro in select * from pg_temp.presencas_lote where situacao in ('novo', 'alterado') loop
    insert into public.presencas (encontro_id, estudante_id, turma_id, presente, observacao)
    values (p_encontro, v_registro.estudante_id, p_turma, v_registro.presente, v_registro.observacao)
    on conflict (encontro_id, estudante_id) do update
      set presente = excluded.presente, observacao = excluded.observacao,
          autor_id = auth.uid(), registrado_em = now();
  end loop;
  return v_novos + v_alterados;
end;
$$;

create function public.registrar_participacao(
  p_encontro uuid, p_dupla uuid, p_notas jsonb, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid := app.turma_da_dupla(p_dupla);
  v_so_coordenacao boolean;
  v_atual jsonb;
begin
  if v_turma is null then
    raise exception 'Equipe não encontrada.' using errcode = 'P0002';
  end if;
  v_so_coordenacao := app.exigir_registro_na_turma(v_turma);
  perform app.exigir_encontro_da_turma(p_encontro, v_turma);
  perform app.validar_notas(p_notas,
    app.regras_da_edicao(app.edicao_da_turma(v_turma)) -> 'participacao' -> 'criterios');

  select notas into v_atual from public.participacoes where encontro_id = p_encontro and dupla_id = p_dupla
  for update;
  if found then
    if v_atual = p_notas then
      return;
    end if;
    perform app.registrar_justificativa(p_justificativa);
    update public.participacoes set notas = p_notas, autor_id = auth.uid(), registrado_em = now()
    where encontro_id = p_encontro and dupla_id = p_dupla;
  else
    if v_so_coordenacao then
      raise exception 'A coordenação só corrige registros existentes.' using errcode = '42501';
    end if;
    insert into public.participacoes (encontro_id, dupla_id, notas) values (p_encontro, p_dupla, p_notas);
  end if;
end;
$$;

create function app.equipes_json(p_turma uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'nome', d.nome,
           'integrantes', (select coalesce(jsonb_agg(jsonb_build_object('estudanteId', i.estudante_id,
                                    'nome', p.nome) order by p.nome), '[]'::jsonb)
                           from public.dupla_integrantes i join public.perfis p on p.id = i.estudante_id
                           where i.dupla_id = d.id and i.saida_em is null))
         order by d.nome nulls last, d.id), '[]'::jsonb)
  from public.duplas d where d.turma_id = p_turma and d.ativa;
$$;

create function public.presencas_da_turma(p_encontro uuid, p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.e_gestao_da_turma(p_turma) then
    raise exception 'Você não tem acesso a esta turma.' using errcode = '42501';
  end if;
  perform app.exigir_encontro_da_turma(p_encontro, p_turma);
  return jsonb_build_object(
    'regras', app.regras_da_edicao(app.edicao_da_turma(p_turma)),
    'equipes', app.equipes_json(p_turma),
    'alunos', coalesce((
      select jsonb_agg(jsonb_build_object('estudanteId', a.usuario_id, 'nome', p.nome,
               'duplaId', (select i.dupla_id from public.dupla_integrantes i
                           join public.duplas d on d.id = i.dupla_id and d.ativa and d.turma_id = p_turma
                           where i.estudante_id = a.usuario_id and i.saida_em is null limit 1),
               'presente', x.presente, 'observacao', x.observacao) order by p.nome)
      from public.atribuicoes a join public.perfis p on p.id = a.usuario_id
      left join public.presencas x on x.encontro_id = p_encontro and x.estudante_id = a.usuario_id
      where a.turma_id = p_turma and a.papel = 'aluno' and a.ativo), '[]'::jsonb),
    'participacoes', coalesce((
      select jsonb_agg(jsonb_build_object('duplaId', pa.dupla_id, 'notas', pa.notas))
      from public.participacoes pa join public.duplas d on d.id = pa.dupla_id and d.turma_id = p_turma
      where pa.encontro_id = p_encontro), '[]'::jsonb));
end;
$$;

revoke all on function public.registrar_presencas(uuid, uuid, jsonb, text),
  public.registrar_participacao(uuid, uuid, jsonb, text), public.presencas_da_turma(uuid, uuid)
  from public, anon;
grant execute on function public.registrar_presencas(uuid, uuid, jsonb, text),
  public.registrar_participacao(uuid, uuid, jsonb, text), public.presencas_da_turma(uuid, uuid)
  to authenticated;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- =============================================================================
-- US3 — avaliação por rubrica e feedback (FR-012–015). Primeiro registro: docente ou mentor;
-- a coordenação só corrige; repetir os mesmos valores não grava nada.
-- =============================================================================
create function public.registrar_avaliacao(
  p_desafio uuid, p_dupla uuid, p_notas_entrega jsonb, p_notas_apresentacao jsonb,
  p_apresentacao_nao_avaliavel boolean, p_feedback text, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid := app.turma_da_dupla(p_dupla);
  v_so_coordenacao boolean;
  v_regras jsonb;
  v_entrega uuid;
  v_feedback text := nullif(btrim(p_feedback), '');
  v_atual public.avaliacoes%rowtype;
begin
  if v_turma is null or not app.desafio_publicado_na_turma(p_desafio, v_turma) then
    raise exception 'Equipe ou desafio não encontrado.' using errcode = 'P0002';
  end if;
  v_so_coordenacao := app.exigir_registro_na_turma(v_turma);
  v_regras := app.regras_da_edicao(app.edicao_da_turma(v_turma));
  select id into v_entrega from public.entregas
  where desafio_id = p_desafio and dupla_id = p_dupla order by versao desc limit 1;

  if v_entrega is null then
    if p_notas_entrega is not null then
      raise exception 'A equipe não tem entrega: a prática fica zerada.' using errcode = '23514';
    end if;
  else
    perform app.validar_notas(p_notas_entrega, v_regras -> 'entrega' -> 'criterios');
    if v_feedback is null then
      raise exception 'Escreva o feedback da entrega.' using errcode = '23514';
    end if;
  end if;
  if char_length(v_feedback) > 4000 then
    raise exception 'O feedback tem no máximo 4000 caracteres.' using errcode = '23514';
  end if;
  if coalesce(p_apresentacao_nao_avaliavel, false) then
    if p_notas_apresentacao is not null then
      raise exception 'Apresentação não avaliável não recebe notas.' using errcode = '23514';
    end if;
  else
    perform app.validar_notas(p_notas_apresentacao, v_regras -> 'apresentacao' -> 'criterios');
  end if;

  select * into v_atual from public.avaliacoes where desafio_id = p_desafio and dupla_id = p_dupla for update;
  if found then
    if v_atual.entrega_id is not distinct from v_entrega
       and v_atual.notas_entrega is not distinct from p_notas_entrega
       and v_atual.notas_apresentacao is not distinct from p_notas_apresentacao
       and v_atual.apresentacao_nao_avaliavel = coalesce(p_apresentacao_nao_avaliavel, false)
       and v_atual.feedback is not distinct from v_feedback then
      return;
    end if;
    perform app.registrar_justificativa(p_justificativa);
    update public.avaliacoes set entrega_id = v_entrega, notas_entrega = p_notas_entrega,
      notas_apresentacao = p_notas_apresentacao,
      apresentacao_nao_avaliavel = coalesce(p_apresentacao_nao_avaliavel, false),
      feedback = v_feedback, autor_id = auth.uid(), registrado_em = now()
    where desafio_id = p_desafio and dupla_id = p_dupla;
  else
    if v_so_coordenacao then
      raise exception 'A coordenação só corrige registros existentes.' using errcode = '42501';
    end if;
    insert into public.avaliacoes (desafio_id, dupla_id, entrega_id, notas_entrega, notas_apresentacao,
                                   apresentacao_nao_avaliavel, feedback)
    values (p_desafio, p_dupla, v_entrega, p_notas_entrega, p_notas_apresentacao,
            coalesce(p_apresentacao_nao_avaliavel, false), v_feedback);
  end if;
end;
$$;

-- Painel da gestão: equipes das turmas do desafio que a pessoa acompanha.
create function public.painel_avaliacao(p_desafio uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_desafio public.desafios%rowtype;
  v_coordenacao boolean;
begin
  select * into v_desafio from public.desafios where id = p_desafio;
  if not found then
    raise exception 'Desafio não encontrado.' using errcode = 'P0002';
  end if;
  v_coordenacao := app.e_coordenacao(v_desafio.edicao_id);
  if not (v_coordenacao or exists (select 1 from public.desafio_turmas dt
                                   where dt.desafio_id = p_desafio and app.atua_na_turma(dt.turma_id))) then
    raise exception 'Você não tem acesso a este desafio.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'regras', app.regras_da_edicao(v_desafio.edicao_id),
    'desafio', app.desafio_json(v_desafio),
    'equipes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'nome', d.nome,
               'integrantes', (select coalesce(jsonb_agg(jsonb_build_object('estudanteId', i.estudante_id,
                                        'nome', p.nome) order by p.nome), '[]'::jsonb)
                               from public.dupla_integrantes i join public.perfis p on p.id = i.estudante_id
                               where i.dupla_id = d.id and i.saida_em is null),
               'versoes', app.entregas_json(p_desafio, d.id),
               'ultimaEntrega', app.entregas_json(p_desafio, d.id) -> 0,
               'avaliacao', app.avaliacao_json(p_desafio, d.id),
               'prorrogacao', (select jsonb_build_object('novoPrazo', pr.novo_prazo, 'justificativa', pr.justificativa)
                               from public.prorrogacoes pr where pr.desafio_id = p_desafio and pr.dupla_id = d.id
                               order by pr.criado_em desc limit 1))
             order by d.nome nulls last, d.id)
      from public.duplas d
      join public.desafio_turmas dt on dt.desafio_id = p_desafio and dt.turma_id = d.turma_id
      where d.ativa and (v_coordenacao or app.atua_na_turma(d.turma_id))), '[]'::jsonb));
end;
$$;

revoke all on function public.registrar_avaliacao(uuid, uuid, jsonb, jsonb, boolean, text, text),
  public.painel_avaliacao(uuid) from public, anon;
grant execute on function public.registrar_avaliacao(uuid, uuid, jsonb, jsonb, boolean, text, text),
  public.painel_avaliacao(uuid) to authenticated;

-- =============================================================================
-- US4 — questões preparatórias (FR-016–020, FR-026, FR-027). Gabarito e justificativas só saem
-- para o aluno depois do prazo; uma submissão por equipe, serializada pela lista.
-- =============================================================================
create function app.exigir_gestor_da_lista(p_lista uuid)
returns public.listas_questoes language plpgsql security definer set search_path = '' as $$
declare v public.listas_questoes%rowtype;
begin
  select * into v from public.listas_questoes where id = p_lista for update;
  if not found then
    raise exception 'Lista não encontrada.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.lista_turmas lt where lt.lista_id = p_lista and app.atua_na_turma(lt.turma_id)) then
    raise exception 'Somente docente ou mentor da turma podem alterar esta lista.' using errcode = '42501';
  end if;
  return v;
end;
$$;

create function app.validar_questoes(p_questoes jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare v_q jsonb;
begin
  if jsonb_typeof(p_questoes) is distinct from 'array' or jsonb_array_length(p_questoes) = 0 then
    raise exception 'Inclua pelo menos uma questão.' using errcode = '23514';
  end if;
  for v_q in select * from jsonb_array_elements(p_questoes) loop
    if nullif(btrim(v_q ->> 'enunciado'), '') is null then
      raise exception 'Toda questão precisa de enunciado.' using errcode = '23514';
    end if;
    if jsonb_typeof(v_q -> 'alternativas') is distinct from 'array' or jsonb_array_length(v_q -> 'alternativas') < 2 then
      raise exception 'Cada questão precisa de pelo menos duas alternativas.' using errcode = '23514';
    end if;
    if exists (select 1 from jsonb_array_elements(v_q -> 'alternativas') a where nullif(btrim(a ->> 'texto'), '') is null) then
      raise exception 'Toda alternativa precisa de texto.' using errcode = '23514';
    end if;
    if (select count(*) from jsonb_array_elements(v_q -> 'alternativas') a
        where coalesce((a ->> 'correta')::boolean, false)) <> 1 then
      raise exception 'Cada questão precisa de exatamente uma alternativa correta.' using errcode = '23514';
    end if;
  end loop;
end;
$$;

create function public.salvar_lista(
  p_id uuid, p_encontro uuid, p_turmas uuid[], p_titulo text, p_prazo timestamptz, p_questoes jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_encontro public.encontros%rowtype;
  v_id uuid := p_id;
  v_q jsonb;
  v_ordem integer := 0;
  v_questao uuid;
begin
  select * into v_encontro from public.encontros where id = p_encontro;
  if not found then
    raise exception 'Encontro não encontrado.' using errcode = 'P0002';
  end if;
  perform app.exigir_turmas_da_atividade(v_encontro.edicao_id, p_turmas);
  if v_encontro.avaliacao_objetiva <> 'questoes' then
    raise exception 'Este encontro usa a prova oficial; não há lista de questões.' using errcode = '23514';
  end if;
  perform app.validar_questoes(p_questoes);

  if v_id is null then
    insert into public.listas_questoes (edicao_id, encontro_id, titulo, prazo)
    values (v_encontro.edicao_id, p_encontro, btrim(p_titulo), p_prazo) returning id into v_id;
  else
    perform app.exigir_gestor_da_lista(v_id);
    if exists (select 1 from public.submissoes_questoes where lista_id = v_id) then
      raise exception 'A lista já tem respostas e não pode ser editada.' using errcode = '23514';
    end if;
    update public.listas_questoes set encontro_id = p_encontro, titulo = btrim(p_titulo), prazo = p_prazo,
      versao = versao + 1, atualizado_em = now()
    where id = v_id;
    delete from public.questoes where lista_id = v_id;
    delete from public.lista_turmas where lista_id = v_id and turma_id <> all (p_turmas);
  end if;
  insert into public.lista_turmas (lista_id, turma_id) select v_id, t from unnest(p_turmas) t on conflict do nothing;

  for v_q in select * from jsonb_array_elements(p_questoes) loop
    v_ordem := v_ordem + 1;
    insert into public.questoes (lista_id, ordem, enunciado, justificativa, capacidade)
    values (v_id, v_ordem, btrim(v_q ->> 'enunciado'), coalesce(btrim(v_q ->> 'justificativa'), ''),
            coalesce(btrim(v_q ->> 'capacidade'), ''))
    returning id into v_questao;
    insert into public.alternativas (questao_id, ordem, texto, correta)
    select v_questao, a.ordem, btrim(a.valor ->> 'texto'), coalesce((a.valor ->> 'correta')::boolean, false)
    from jsonb_array_elements(v_q -> 'alternativas') with ordinality as a (valor, ordem);
  end loop;
  return v_id;
end;
$$;

create function public.publicar_lista(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.listas_questoes%rowtype := app.exigir_gestor_da_lista(p_id);
begin
  if v.estado = 'rascunho' then
    update public.listas_questoes set estado = 'publicado', atualizado_em = now() where id = p_id;
  elsif v.estado = 'encerrado' then
    raise exception 'A lista já está encerrada.' using errcode = '23514';
  end if;
end;
$$;

create function public.encerrar_lista(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.listas_questoes%rowtype := app.exigir_gestor_da_lista(p_id);
begin
  if v.estado = 'rascunho' then
    raise exception 'Publique a lista antes de encerrá-la.' using errcode = '23514';
  elsif v.estado = 'publicado' then
    update public.listas_questoes set estado = 'encerrado', atualizado_em = now() where id = p_id;
  end if;
end;
$$;

-- Aluno ativo de uma turma da lista publicada; devolve a lista (ou recusa).
create function app.exigir_lista_do_aluno(p_lista uuid)
returns public.listas_questoes language plpgsql stable security definer set search_path = '' as $$
declare v public.listas_questoes%rowtype;
begin
  select * into v from public.listas_questoes where id = p_lista;
  if not found or v.estado = 'rascunho' or not exists (
       select 1 from public.lista_turmas lt where lt.lista_id = p_lista and app.e_aluno_ativo(lt.turma_id, auth.uid())) then
    raise exception 'Esta lista não é da sua turma.' using errcode = '42501';
  end if;
  return v;
end;
$$;

create function public.lista_para_equipe(p_lista uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v public.listas_questoes%rowtype := app.exigir_lista_do_aluno(p_lista);
  v_dupla uuid := app.equipe_ativa_do_aluno(v.edicao_id, auth.uid());
  v_encerrada boolean := app.lista_encerrada(p_lista);
  v_sub public.submissoes_questoes%rowtype;
begin
  select * into v_sub from public.submissoes_questoes where lista_id = p_lista and dupla_id = v_dupla;
  return jsonb_build_object(
    'id', v.id, 'titulo', v.titulo, 'prazo', v.prazo, 'encerrada', v_encerrada, 'versao', v.versao,
    'questoes', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'enunciado', q.enunciado, 'capacidade', q.capacidade,
               'alternativas', (select jsonb_agg(jsonb_build_object('id', a.id, 'texto', a.texto) order by a.ordem)
                                from public.alternativas a where a.questao_id = q.id))
             -- FR-017: gabarito e justificativa só depois do prazo.
             || case when v_encerrada then jsonb_build_object(
                  'gabarito', (select a.id from public.alternativas a where a.questao_id = q.id and a.correta),
                  'justificativa', q.justificativa) else '{}'::jsonb end
             order by q.ordem)
      from public.questoes q where q.lista_id = p_lista), '[]'::jsonb),
    'submissao', case when v_sub.id is null then null else
      jsonb_build_object('autorNome', (select nome from public.perfis where id = v_sub.autor_id),
                         'enviadaEm', v_sub.enviada_em)
      || case when v_encerrada then jsonb_build_object('respostas', v_sub.respostas,
                                                        'acertos', v_sub.acertos, 'total', v_sub.total)
              else '{}'::jsonb end end);
end;
$$;

create function public.enviar_respostas(p_lista uuid, p_chave uuid, p_respostas jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.listas_questoes%rowtype := app.exigir_lista_do_aluno(p_lista);
  v_dupla uuid := app.equipe_ativa_do_aluno(v.edicao_id, auth.uid());
  v_sub public.submissoes_questoes%rowtype;
  v_total integer;
  v_acertos integer;
begin
  if v_dupla is null then
    raise exception 'Você precisa fazer parte de uma equipe para enviar.' using errcode = '23514';
  end if;
  -- Serializa as submissões da lista (FR-018, SC-007).
  perform 1 from public.listas_questoes where id = p_lista for update;
  select * into v_sub from public.submissoes_questoes where lista_id = p_lista and dupla_id = v_dupla;
  if found then
    if v_sub.chave_envio = p_chave then
      return jsonb_build_object('enviadaEm', v_sub.enviada_em,
                                'autorNome', (select nome from public.perfis where id = v_sub.autor_id));
    end if;
    raise exception 'A equipe já enviou as respostas (por %, em %).',
      (select nome from public.perfis where id = v_sub.autor_id),
      to_char(v_sub.enviada_em at time zone 'America/Fortaleza', 'DD/MM/YYYY HH24:MI') using errcode = '23514';
  end if;
  if app.lista_encerrada(p_lista) then
    raise exception 'O prazo da lista terminou.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_respostas) is distinct from 'object' or exists (
       select 1 from jsonb_each_text(p_respostas) r
       where not exists (select 1 from public.questoes q join public.alternativas a on a.questao_id = q.id
                         where q.lista_id = p_lista and q.id::text = r.key and a.id::text = r.value)) then
    raise exception 'Resposta inválida para esta lista.' using errcode = '23514';
  end if;

  select count(*) into v_total from public.questoes where lista_id = p_lista;
  select count(*) into v_acertos from jsonb_each_text(p_respostas) r
  join public.alternativas a on a.id::text = r.value and a.correta;
  insert into public.submissoes_questoes (lista_id, dupla_id, versao_lista, autor_id, chave_envio, respostas,
                                          acertos, total)
  values (p_lista, v_dupla, v.versao, auth.uid(), p_chave, p_respostas, v_acertos, v_total)
  returning * into v_sub;
  return jsonb_build_object('enviadaEm', v_sub.enviada_em,
                            'autorNome', (select nome from public.perfis where id = auth.uid()));
end;
$$;

revoke all on function public.salvar_lista(uuid, uuid, uuid[], text, timestamptz, jsonb),
  public.publicar_lista(uuid), public.encerrar_lista(uuid), public.lista_para_equipe(uuid),
  public.enviar_respostas(uuid, uuid, jsonb) from public, anon;
grant execute on function public.salvar_lista(uuid, uuid, uuid[], text, timestamptz, jsonb),
  public.publicar_lista(uuid), public.encerrar_lista(uuid), public.lista_para_equipe(uuid),
  public.enviar_respostas(uuid, uuid, jsonb) to authenticated;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to authenticated;

-- =============================================================================
-- US5 — lançamentos brutos da própria equipe para a pontuação parcial (FR-021). O cálculo
-- (média por encontro, FR-026) é feito pelo domínio TS com as regras devolvidas aqui.
-- =============================================================================
create function public.lancamentos_da_minha_equipe(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_dupla uuid := app.equipe_ativa_do_aluno(p_edicao, auth.uid());
  v_turma uuid := app.turma_da_dupla(v_dupla);
begin
  if v_dupla is null then
    return jsonb_build_object('regras', app.regras_da_edicao(p_edicao), 'equipe', null,
                              'encontros', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'regras', app.regras_da_edicao(p_edicao),
    'equipe', (select e from jsonb_array_elements(app.equipes_json(v_turma)) e where e ->> 'id' = v_dupla::text),
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object(
        'encontroId', en.id, 'numero', en.numero, 'titulo', en.titulo,
        'avaliacaoObjetiva', en.avaliacao_objetiva,
        'presencas', coalesce((
          select jsonb_agg(jsonb_build_object('estudanteId', p.estudante_id, 'presente', p.presente))
          from public.presencas p
          join public.dupla_integrantes i on i.estudante_id = p.estudante_id and i.dupla_id = v_dupla
                                         and i.saida_em is null
          where p.encontro_id = en.id), '[]'::jsonb),
        'participacao', (select pa.notas from public.participacoes pa
                         where pa.encontro_id = en.id and pa.dupla_id = v_dupla),
        'desafios', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'desafioId', d.id,
                   'avaliacao', app.avaliacao_json(d.id, v_dupla),
                   'temEntrega', exists (select 1 from public.entregas e where e.desafio_id = d.id and e.dupla_id = v_dupla),
                   'atrasoMinutos', coalesce((select e.atraso_minutos from public.entregas e
                                              where e.desafio_id = d.id and e.dupla_id = v_dupla
                                              order by e.versao desc limit 1), 0),
                   'prorrogada', exists (select 1 from public.prorrogacoes pr
                                         where pr.desafio_id = d.id and pr.dupla_id = v_dupla))
                 order by d.prazo)
          from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = v_turma
          where d.encontro_id = en.id and d.estado <> 'rascunho'), '[]'::jsonb),
        'listas', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'listaId', l.id,
                   'encerrada', app.lista_encerrada(l.id),
                   -- FR-020: acertos só depois do prazo.
                   'acertos', case when app.lista_encerrada(l.id) then
                                (select s.acertos from public.submissoes_questoes s
                                 where s.lista_id = l.id and s.dupla_id = v_dupla) end,
                   'total', (select count(*) from public.questoes q where q.lista_id = l.id))
                 order by l.prazo)
          from public.listas_questoes l join public.lista_turmas lt on lt.lista_id = l.id and lt.turma_id = v_turma
          where l.encontro_id = en.id and l.estado <> 'rascunho'), '[]'::jsonb))
        order by en.numero)
      from public.encontros en where en.edicao_id = p_edicao), '[]'::jsonb));
end;
$$;

revoke all on function public.lancamentos_da_minha_equipe(uuid) from public, anon;
grant execute on function public.lancamentos_da_minha_equipe(uuid) to authenticated;
