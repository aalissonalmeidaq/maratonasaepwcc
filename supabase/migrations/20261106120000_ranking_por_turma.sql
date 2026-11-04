-- =============================================================================
-- Spec 012 — ranking por turma. A classificação passa a ser publicada por turma (substitui o
-- ranking por categoria da spec 007). As publicações por categoria já feitas continuam como
-- estão, como "por categoria (anterior)": imutáveis e só para a coordenação.
-- =============================================================================

-- ===========================================================================
-- Fundação (T004)
-- ===========================================================================
-- `turma_id` nulo = publicação por categoria anterior; `lote_id` agrupa as turmas publicadas
-- numa mesma chamada (R1, R2). Adicionar colunas não dispara o gatilho de imutabilidade.
alter table public.publicacoes_ranking
  add column turma_id uuid references public.turmas (id) on delete restrict,
  add column lote_id uuid;

alter table public.publicacoes_ranking drop constraint publicacoes_versao_unica;
create unique index publicacoes_versao_categoria on public.publicacoes_ranking (edicao_id, categoria, versao)
  where turma_id is null;
create unique index publicacoes_versao_turma on public.publicacoes_ranking (turma_id, versao)
  where turma_id is not null;
create index publicacoes_turma_idx on public.publicacoes_ranking (turma_id, versao desc)
  where turma_id is not null;

-- Toda publicação nova é de uma turma da própria edição.
create function app.validar_publicacao_nova()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.turma_id is null then
    raise exception 'A publicação por categoria foi substituída pela publicação por turma.'
      using errcode = '23514';
  end if;
  if not exists (select 1 from public.turmas t join public.cursos c on c.id = t.curso_id
                 where t.id = new.turma_id and c.edicao_id = new.edicao_id) then
    raise exception 'A turma não pertence à edição.' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger publicacoes_so_por_turma before insert on public.publicacoes_ranking
  for each row execute function app.validar_publicacao_nova();

-- A RPC por categoria fica só para avisar quem ainda a chama.
create or replace function public.publicar_ranking(p_edicao uuid, p_categoria text, p_estado text,
                                                   p_justificativa text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'A publicação por categoria foi substituída pela publicação por turma.'
    using errcode = '23514';
end;
$$;

create function app.equipes_da_turma(p_turma uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select d.id from public.duplas d where d.turma_id = p_turma and d.ativa;
$$;

-- O que impede a publicação definitiva da turma (FR-004): o formato de
-- `app.pendencias_da_categoria`, só com as equipes da turma. Os componentes já são só dos
-- encontros da turma (spec 011), pois vêm de `app.totais_da_equipe`.
create function app.pendencias_do_ranking_da_turma(p_turma uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with eq as (select id from app.equipes_da_turma(p_turma) as id)
  select jsonb_build_object(
    'componentes', coalesce((
      select jsonb_agg(jsonb_build_object('duplaId', d.id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'),
                                          'encontroNumero', (en ->> 'numero')::int, 'componente', c)
                       order by d.nome, (en ->> 'numero')::int, c)
      from eq join public.duplas d on d.id = eq.id,
           jsonb_array_elements(app.totais_da_equipe(d.id) -> 'encontros') en,
           jsonb_array_elements_text(en -> 'pontuacao' -> 'pendencias') c), '[]'::jsonb),
    'ocorrencias', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'),
                                          'estado', o.estado) order by o.criado_em)
      from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
      where o.dupla_id in (select id from eq) and o.estado in ('registrada', 'manifestada')), '[]'::jsonb),
    'revisoes', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'))
                       order by r.criado_em)
      from public.pedidos_revisao r join public.duplas d on d.id = r.dupla_id
      where r.dupla_id in (select id from eq) and r.estado = 'aberto'), '[]'::jsonb));
$$;

-- Como a anterior, com os componentes só de encontros realizados (lista do ranking e painel da
-- coordenação, R4): encontros futuros sempre têm componentes pendentes.
create function app.pendencias_realizadas_da_turma(p_turma uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select v || jsonb_build_object('componentes', coalesce((
    select jsonb_agg(c) from jsonb_array_elements(v -> 'componentes') c
    where app.encontro_realizado((select en.id from public.encontros en
                                  join public.cursos k on k.edicao_id = en.edicao_id
                                  join public.turmas t on t.curso_id = k.id
                                  where t.id = p_turma and en.numero = (c ->> 'encontroNumero')::int))),
    '[]'::jsonb))
  from (select app.pendencias_do_ranking_da_turma(p_turma) as v) x;
$$;

-- Prova pendente na turma: como `app.provas_pendentes_da_categoria` (spec 008), só com os
-- encontros de prova oficial realizados que são da turma.
create function app.provas_pendentes_da_turma(p_turma uuid)
returns integer language sql stable security definer set search_path = '' as $$
  with enc as (
    select en.id from public.encontros en
    join public.cursos k on k.edicao_id = en.edicao_id
    join public.turmas t on t.curso_id = k.id
    where t.id = p_turma and en.avaliacao_objetiva = 'prova_oficial' and app.encontro_realizado(en.id)
      and app.encontro_da_turma(en.id, p_turma)
  )
  select ((select count(*) from enc join public.resultados_prova r on r.encontro_id = enc.id
           join public.duplas d on d.id = r.dupla_id
           where d.turma_id = p_turma and d.ativa
             and (r.realizacao = 'pendente' or (r.realizacao = 'confirmada' and r.nota_estado = 'pendente')))
        + (select count(*) from enc cross join app.equipes_da_turma(p_turma) as eq (id)
           join public.dupla_integrantes i on i.dupla_id = eq.id and i.saida_em is null
           where not exists (select 1 from public.resultados_prova r
                             where r.encontro_id = enc.id and r.estudante_id = i.estudante_id)))::integer;
$$;

create function app.ultima_publicacao_da_turma(p_turma uuid)
returns public.publicacoes_ranking language sql stable security definer set search_path = '' as $$
  select * from public.publicacoes_ranking where turma_id = p_turma order by versao desc limit 1;
$$;

revoke all on function app.validar_publicacao_nova(), app.equipes_da_turma(uuid),
  app.pendencias_do_ranking_da_turma(uuid), app.pendencias_realizadas_da_turma(uuid),
  app.provas_pendentes_da_turma(uuid), app.ultima_publicacao_da_turma(uuid) from public, anon;
grant execute on function app.equipes_da_turma(uuid), app.pendencias_do_ranking_da_turma(uuid),
  app.pendencias_realizadas_da_turma(uuid), app.provas_pendentes_da_turma(uuid),
  app.ultima_publicacao_da_turma(uuid) to authenticated;

-- ===========================================================================
-- US1 — publicação por turma, em lote (T007, FR-001 a FR-007a)
-- ===========================================================================
-- Publica uma turma: trava, confere a versão base, as equipes e (definitiva) as pendências,
-- e grava a versão. Recusas são `23514`, tratadas turma a turma pelo lote (R2, R3).
create function app.publicar_turma(p_edicao uuid, p_turma uuid, p_versao_base int, p_estado public.estado_ranking,
                                   p_justificativa text, p_lote uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ultima public.publicacoes_ranking;
  v_equipes jsonb;
  v_posicoes jsonb;
  v_pend jsonb;
  v_lista text;
  v_id uuid := gen_random_uuid();
  v_versao int;
  v_revisao timestamptz;
  v_nome text := (select nome from public.turmas where id = p_turma);
begin
  -- Uma publicação por vez na turma: versões sem corrida (FR-006).
  perform pg_advisory_xact_lock(hashtext('ranking-turma/' || p_turma::text));
  v_ultima := app.ultima_publicacao_da_turma(p_turma);
  if v_ultima.versao is distinct from p_versao_base then
    raise exception 'O ranking desta turma mudou desde que você abriu a tela; recarregue.' using errcode = '23514';
  end if;
  if not exists (select 1 from app.equipes_da_turma(p_turma)) then
    raise exception 'A turma não tem equipes ativas.' using errcode = '23514';
  end if;

  if p_estado = 'definitivo' then
    v_pend := app.pendencias_do_ranking_da_turma(p_turma);
    if jsonb_array_length(v_pend -> 'componentes') + jsonb_array_length(v_pend -> 'ocorrencias')
       + jsonb_array_length(v_pend -> 'revisoes') > 0 then
      select string_agg(x, '; ') into v_lista from (
        select (c ->> 'duplaNome') || ' — encontro ' || (c ->> 'encontroNumero') || ': ' ||
               case c ->> 'componente' when 'participacao' then 'participação'
                                       when 'avaliacaoObjetiva' then 'questões/prova oficial'
                                       when 'entrega' then 'entrega' else 'apresentação' end as x
        from jsonb_array_elements(v_pend -> 'componentes') c
        union all
        select (o ->> 'duplaNome') || ' — ocorrência sem decisão' from jsonb_array_elements(v_pend -> 'ocorrencias') o
        union all
        select (r ->> 'duplaNome') || ' — revisão aberta' from jsonb_array_elements(v_pend -> 'revisoes') r
        limit 20) t;
      raise exception 'A publicação definitiva foi recusada por pendências: %.', v_lista using errcode = '23514';
    end if;
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object('duplaId', d.id, 'nome', coalesce(d.nome, 'Equipe sem nome')) || app.totais_da_equipe(d.id)),
           '[]'::jsonb)
    into v_equipes
  from public.duplas d where d.id in (select app.equipes_da_turma(p_turma));
  -- `classificar` (spec 007) devolve só os campos do ranking; o detalhe por encontro volta pela equipe.
  select coalesce(jsonb_agg(p || jsonb_build_object('encontros',
           (select e -> 'encontros' from jsonb_array_elements(v_equipes) e where e ->> 'duplaId' = p ->> 'duplaId'))
           order by ord), '[]'::jsonb)
    into v_posicoes
  from jsonb_array_elements(app.classificar(v_equipes)) with ordinality as x (p, ord);

  -- Reenvio idêntico (mesmo estado e posições): devolve a versão existente sem gravar.
  if v_ultima.id is not null and v_ultima.estado = p_estado and (
       select coalesce(jsonb_agg(jsonb_build_object('duplaId', pp.dupla_id, 'posicao', pp.posicao,
                                                    'compartilhada', pp.compartilhada, 'total', pp.total,
                                                    'pendente', pp.pendente, 'detalhe', pp.detalhe)
                                 order by pp.posicao, pp.dupla_id), '[]'::jsonb)
       from public.publicacao_posicoes pp where pp.publicacao_id = v_ultima.id)
     = (select coalesce(jsonb_agg(jsonb_build_object('duplaId', (p ->> 'duplaId')::uuid, 'posicao', (p ->> 'posicao')::int,
                                                     'compartilhada', (p ->> 'compartilhada')::boolean,
                                                     'total', (p -> 'totais' -> 'total'), 'pendente', (p -> 'totais' -> 'pendente'),
                                                     'detalhe', p -> 'encontros')
                                  order by (p ->> 'posicao')::int, (p ->> 'duplaId')::uuid), '[]'::jsonb)
        from jsonb_array_elements(v_posicoes) p) then
    return jsonb_build_object('id', v_ultima.id, 'versao', v_ultima.versao);
  end if;

  v_versao := coalesce(v_ultima.versao, 0) + 1;
  if v_versao > 1 then
    perform app.registrar_justificativa(p_justificativa);
  end if;
  -- Prazo de revisão pelas regras vigentes da turma (R5): a coordenação pode ajustar os prazos.
  v_revisao := case when p_estado = 'provisorio'
                    then now() + make_interval(hours => (app.regras_vigentes(p_turma, clock_timestamp()) -> 'prazos' ->> 'revisaoHoras')::int)
               end;
  insert into public.publicacoes_ranking (id, edicao_id, turma_id, lote_id, categoria, versao, estado, justificativa,
                                          regras_versao, revisao_ate)
  values (v_id, p_edicao, p_turma, p_lote, app.categoria_da_turma(p_turma), v_versao, p_estado,
          case when v_versao > 1 then btrim(p_justificativa) else nullif(btrim(coalesce(p_justificativa, '')), '') end,
          (select regras_versao from public.edicoes where id = p_edicao), v_revisao);
  insert into public.publicacao_posicoes (publicacao_id, dupla_id, nome, posicao, compartilhada, total, entrega,
                                          avaliacao_objetiva, presenca, pendente, detalhe)
  select v_id, (p ->> 'duplaId')::uuid, p ->> 'nome', (p ->> 'posicao')::int, (p ->> 'compartilhada')::boolean,
         (p -> 'totais' ->> 'total')::numeric, (p -> 'totais' ->> 'entrega')::numeric,
         (p -> 'totais' ->> 'avaliacaoObjetiva')::numeric, (p -> 'totais' ->> 'presenca')::numeric,
         (p -> 'totais' ->> 'pendente')::boolean, p -> 'encontros'
  from jsonb_array_elements(v_posicoes) p;

  -- Aviso só para quem acompanha a turma (FR-012a): aluno, docente e mentor (da turma ou do curso).
  perform app.avisar(array(
      select distinct a.usuario_id from public.atribuicoes a
      where a.edicao_id = p_edicao and a.ativo and (
              (a.turma_id = p_turma and a.papel in ('aluno', 'docente', 'mentor'))
              or (a.papel = 'mentor' and a.curso_id = (select curso_id from public.turmas where id = p_turma)))),
    'ranking_publicado',
    'Ranking ' || case p_estado when 'parcial' then 'parcial' when 'provisorio' then 'provisório' else 'definitivo' end
      || ' publicado — ' || v_nome,
    jsonb_build_object('publicacaoId', v_id, 'turmaId', p_turma));
  return jsonb_build_object('id', v_id, 'versao', v_versao);
end;
$$;

create function public.publicar_ranking_turmas(p_edicao uuid, p_turmas jsonb, p_estado text,
                                               p_justificativa text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_estado public.estado_ranking;
  v_lote uuid := gen_random_uuid();
  v_item jsonb;
  v_turma uuid;
  v_r jsonb;
  v_resposta jsonb := '[]'::jsonb;
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'Só a coordenação da edição publica o ranking.');
  perform app.exigir_edicao_em_andamento(p_edicao);
  if p_estado is null or p_estado not in ('parcial', 'provisorio', 'definitivo') then
    raise exception 'Estado do ranking desconhecido.' using errcode = '23514';
  end if;
  v_estado := p_estado::public.estado_ranking;
  if p_turmas is null or jsonb_typeof(p_turmas) <> 'array' or jsonb_array_length(p_turmas) not between 1 and 100 then
    raise exception 'Escolha de 1 a 100 turmas para publicar.' using errcode = '23514';
  end if;
  if (select count(distinct x ->> 'turmaId') from jsonb_array_elements(p_turmas) x) <> jsonb_array_length(p_turmas) then
    raise exception 'Cada turma aparece uma só vez na publicação.' using errcode = '23514';
  end if;
  if exists (select 1 from jsonb_array_elements(p_turmas) x
             where app.edicao_da_turma((x ->> 'turmaId')::uuid) is distinct from p_edicao) then
    raise exception 'Todas as turmas precisam ser desta edição.' using errcode = '23514';
  end if;

  -- Cada turma numa subtransação: a recusa de uma não desfaz as outras (FR-007a).
  for v_item in select x from jsonb_array_elements(p_turmas) x loop
    v_turma := (v_item ->> 'turmaId')::uuid;
    begin
      v_r := app.publicar_turma(p_edicao, v_turma, (v_item ->> 'versaoBase')::int, v_estado, p_justificativa, v_lote);
      v_resposta := v_resposta || jsonb_build_array(jsonb_build_object(
        'turmaId', v_turma, 'turma', (select nome from public.turmas where id = v_turma),
        'publicada', true, 'versao', v_r -> 'versao', 'motivo', null));
    exception when sqlstate '23514' then
      v_resposta := v_resposta || jsonb_build_array(jsonb_build_object(
        'turmaId', v_turma, 'turma', (select nome from public.turmas where id = v_turma),
        'publicada', false, 'versao', null, 'motivo', sqlerrm));
    end;
  end loop;
  return v_resposta;
end;
$$;

-- Lista do ranking da coordenação (FR-007): pendências só de encontros realizados (R4, SC-006).
create function public.ranking_da_edicao(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'Só a coordenação consulta o ranking das turmas.');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'turmaId', x.id, 'turma', x.nome, 'categoria', x.categoria,
             'equipes', (select count(*) from app.equipes_da_turma(x.id)),
             'ultima', (select jsonb_build_object('id', p.id, 'versao', p.versao, 'estado', p.estado,
                                                  'publicadoEm', p.publicado_em)
                        from public.publicacoes_ranking p where p.turma_id = x.id order by p.versao desc limit 1),
             'pendencias', jsonb_build_object(
               'componentes', jsonb_array_length(x.pend -> 'componentes'),
               'ocorrencias', jsonb_array_length(x.pend -> 'ocorrencias'),
               'revisoes', jsonb_array_length(x.pend -> 'revisoes')))
           order by x.categoria, x.nome)
    from (select t.id, t.nome, c.categoria, app.pendencias_realizadas_da_turma(t.id) as pend
          from public.turmas t join public.cursos c on c.id = t.curso_id
          where c.edicao_id = p_edicao) x), '[]'::jsonb);
end;
$$;

create function public.pendencias_ranking_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(app.edicao_da_turma(p_turma),
    'Só a coordenação consulta as pendências do ranking da turma.');
  return app.pendencias_do_ranking_da_turma(p_turma);
end;
$$;

create function public.historico_publicacoes_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(app.edicao_da_turma(p_turma),
    'Só a coordenação consulta o histórico de publicações.');
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'versao', p.versao, 'estado', p.estado,
                                        'publicadoEm', p.publicado_em, 'justificativa', p.justificativa,
                                        'revisaoAte', p.revisao_ate,
                                        'publicadoPorNome', (select nome from public.perfis where id = p.publicado_por))
                     order by p.versao desc)
    from public.publicacoes_ranking p where p.turma_id = p_turma), '[]'::jsonb);
end;
$$;

revoke all on function app.publicar_turma(uuid, uuid, int, public.estado_ranking, text, uuid) from public, anon, authenticated;
revoke all on function public.publicar_ranking_turmas(uuid, jsonb, text, text), public.ranking_da_edicao(uuid),
  public.pendencias_ranking_turma(uuid), public.historico_publicacoes_turma(uuid) from public, anon;
grant execute on function public.publicar_ranking_turmas(uuid, jsonb, text, text), public.ranking_da_edicao(uuid),
  public.pendencias_ranking_turma(uuid), public.historico_publicacoes_turma(uuid) to authenticated;

-- ===========================================================================
-- US2 — aluno vê o ranking da própria turma (T014, FR-008 a FR-011, FR-014)
-- ===========================================================================
-- Última publicação da turma por perfil (R6): aluno só da própria turma, com o detalhe só da
-- própria equipe; docente e mentor das turmas em que atuam e coordenação, com o detalhe de todas.
create function public.ranking_da_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_edicao uuid := app.edicao_da_turma(p_turma);
  v_minha uuid;
  v_gestao boolean;
  v_pub public.publicacoes_ranking;
begin
  if v_edicao is null then
    raise exception 'Turma não encontrada.' using errcode = 'P0002';
  end if;
  v_minha := app.equipe_ativa_do_aluno(v_edicao, v_uid);
  v_gestao := app.e_coordenacao(v_edicao) or exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = v_uid and a.edicao_id = v_edicao and a.ativo and (
            (a.turma_id = p_turma and a.papel in ('docente', 'mentor'))
            or (a.papel = 'mentor' and a.curso_id = (select curso_id from public.turmas where id = p_turma))));
  if not v_gestao and (v_minha is null or app.turma_da_dupla(v_minha) <> p_turma) then
    raise exception 'Você não acompanha esta turma.' using errcode = '42501';
  end if;

  v_pub := app.ultima_publicacao_da_turma(p_turma);
  if v_pub.id is null then return null; end if;
  return jsonb_build_object(
    'id', v_pub.id, 'turmaId', v_pub.turma_id, 'turma', (select nome from public.turmas where id = p_turma),
    'categoria', v_pub.categoria, 'versao', v_pub.versao, 'estado', v_pub.estado,
    'publicadoEm', v_pub.publicado_em, 'revisaoAte', v_pub.revisao_ate,
    'posicoes', coalesce((
      select jsonb_agg(jsonb_build_object('duplaId', pp.dupla_id, 'nome', pp.nome, 'posicao', pp.posicao,
                                          'compartilhada', pp.compartilhada, 'total', pp.total,
                                          'pendente', pp.pendente, 'minha', pp.dupla_id is not distinct from v_minha)
                       || case when v_gestao or pp.dupla_id = v_minha
                               then jsonb_build_object('detalhe', pp.detalhe) else '{}'::jsonb end
                       order by pp.posicao, pp.nome)
      from public.publicacao_posicoes pp where pp.publicacao_id = v_pub.id), '[]'::jsonb));
end;
$$;
revoke all on function public.ranking_da_turma(uuid) from public, anon;
grant execute on function public.ranking_da_turma(uuid) to authenticated;

-- Painel do aluno (spec 008) com a posição e a revisão pela publicação da turma (FR-014).
create or replace function public.painel_do_aluno(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_turma uuid;
  v_dupla uuid;
  v_encerrada boolean;
  v_pub public.publicacoes_ranking;
  v_acoes jsonb := '[]'::jsonb;
begin
  select a.turma_id into v_turma from public.atribuicoes a
  where a.usuario_id = v_uid and a.edicao_id = p_edicao and a.papel = 'aluno' and a.ativo limit 1;
  if v_turma is null then
    raise exception 'O painel do aluno é só para estudantes desta edição.' using errcode = '42501';
  end if;
  v_dupla := app.equipe_ativa_do_aluno(p_edicao, v_uid);
  v_encerrada := exists (select 1 from public.edicoes where id = p_edicao and estado = 'encerrada');

  if v_dupla is not null then
    -- Spec 012: a publicação é a da turma do aluno.
    v_pub := app.ultima_publicacao_da_turma(v_turma);
  end if;

  if v_dupla is not null and not v_encerrada then
    select coalesce(jsonb_agg(a order by a ->> 'prazo'), '[]'::jsonb) into v_acoes from (
      -- Manifestação ainda no prazo.
      select jsonb_build_object('tipo', 'manifestacao',
               'titulo', 'Manifestação sobre a ocorrência do encontro ' || en.numero,
               'prazo', app.prazo_manifestacao_efetivo(o.id), 'caminho', '/aluno/ocorrencias') as a
      from public.ocorrencias o join public.encontros en on en.id = o.encontro_id
      where o.dupla_id = v_dupla and o.estado = 'registrada'
        and now() <= app.prazo_manifestacao_efetivo(o.id)
      union all
      -- Decisão de ocorrência dentro do prazo de revisão e ainda sem pedido.
      select jsonb_build_object('tipo', 'revisao_ocorrencia',
               'titulo', 'Revisão da decisão da ocorrência do encontro ' || en.numero,
               'prazo', app.prazo_revisao_efetivo(v_dupla, o.id, null), 'caminho', '/aluno/ocorrencias')
      from public.ocorrencias o join public.encontros en on en.id = o.encontro_id
      where o.dupla_id = v_dupla and o.estado in ('confirmada', 'arquivada')
        and now() <= app.prazo_revisao_efetivo(v_dupla, o.id, null)
        and not exists (select 1 from public.pedidos_revisao r where r.ocorrencia_id = o.id and r.dupla_id = v_dupla)
      union all
      -- Publicação provisória da turma dentro do prazo de revisão.
      select jsonb_build_object('tipo', 'revisao_publicacao',
               'titulo', 'Revisão dos pontos do ranking provisório (versão ' || v_pub.versao || ')',
               'prazo', app.prazo_revisao_efetivo(v_dupla, null, v_pub.id), 'caminho', '/aluno/ranking')
      where v_pub.id is not null and v_pub.estado = 'provisorio'
        and now() <= app.prazo_revisao_efetivo(v_dupla, null, v_pub.id)
        and exists (select 1 from public.publicacao_posicoes pp where pp.publicacao_id = v_pub.id and pp.dupla_id = v_dupla)
    ) x;
  end if;

  return jsonb_build_object(
    'equipe', (select jsonb_build_object('id', d.id, 'nome', coalesce(d.nome, 'Equipe sem nome'))
               from public.duplas d where d.id = v_dupla),
    'previa', case when v_dupla is not null then (
      select jsonb_build_object('total', t -> 'total', 'pendente', t -> 'pendente')
      from (select app.totais_da_equipe(v_dupla) -> 'totais' as t) x) end,
    'ranking', case when v_pub.id is not null then (
      select jsonb_build_object('estado', v_pub.estado, 'versao', v_pub.versao,
                                'posicao', pp.posicao, 'compartilhada', coalesce(pp.compartilhada, false),
                                'publicadoEm', v_pub.publicado_em)
      from (select 1) um left join public.publicacao_posicoes pp
        on pp.publicacao_id = v_pub.id and pp.dupla_id = v_dupla) end,
    'proximoEncontro', app.proximo_encontro_json(p_edicao),
    'proximoPrazo', (
      select jsonb_build_object('tipo', x.tipo, 'id', x.id, 'titulo', x.titulo, 'prazo', x.prazo)
      from (
        select 'desafio' as tipo, d.id, d.titulo,
               case when v_dupla is null then d.prazo else app.prazo_efetivo(d.id, v_dupla) end as prazo
        from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = v_turma
        where d.estado = 'publicado'
        union all
        select 'lista', l.id, l.titulo, l.prazo
        from public.listas_questoes l join public.lista_turmas lt on lt.lista_id = l.id and lt.turma_id = v_turma
        where l.estado = 'publicado'
      ) x where x.prazo > now() order by x.prazo, x.titulo limit 1),
    'acoes', v_acoes,
    'avisosNaoLidos', (select count(*) from public.avisos a where a.destinatario_id = v_uid and a.lido_em is null));
end;
$$;

-- ===========================================================================
-- US3 — painéis e relatório pela publicação da turma (T018, FR-013, FR-015, FR-016)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.painel_da_turma(p_turma uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_edicao uuid := app.edicao_da_turma(p_turma);
  v_gestao boolean;
begin
  if v_edicao is null then
    raise exception 'Turma não encontrada.' using errcode = 'P0002';
  end if;
  v_gestao := app.e_coordenacao(v_edicao) or app.atua_na_turma(p_turma);
  if not (v_gestao or app.e_aluno_ativo(p_turma, auth.uid())) then
    raise exception 'Você não tem acesso a esta turma.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'visao', case when v_gestao then 'gestao' else 'aluno' end,
    'turma', (
      select jsonb_build_object('id', t.id, 'nome', t.nome, 'anoLetivo', t.ano_letivo,
                                'cursoNome', c.nome, 'categoria', c.categoria, 'edicaoId', c.edicao_id)
      from public.turmas t join public.cursos c on c.id = t.curso_id
      where t.id = p_turma),
    -- FR-003: dos colegas, só nome e se já têm equipe.
    'alunos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome,
                                          'temEquipe', app.tem_equipe_ativa(v_edicao, p.id))
                       order by p.nome, p.id)
      from public.atribuicoes a join public.perfis p on p.id = a.usuario_id
      where a.turma_id = p_turma and a.papel = 'aluno' and a.ativo), '[]'::jsonb),
    'equipes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'nome', d.nome,
               'integrantes', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'estudanteId', i.estudante_id, 'nome', p.nome,
                          'integranteInativo',
                            v_gestao and not app.e_aluno_ativo(p_turma, i.estudante_id))
                        order by p.nome, i.estudante_id)
                 from public.dupla_integrantes i join public.perfis p on p.id = i.estudante_id
                 where i.dupla_id = d.id and i.saida_em is null), '[]'::jsonb))
             order by d.nome nulls last, d.id)
      from public.duplas d
      where d.turma_id = p_turma and d.ativa), '[]'::jsonb),
    'convitesPendentes', case when v_gestao then (
      select count(*)::integer from public.convites_equipe c
      where c.turma_id = p_turma and c.situacao = 'pendente') end,
    -- Spec 012: a última publicação do ranking da turma.
    'pontuacao', (
      select jsonb_build_object('ficticia', false, 'estado', p.estado, 'publicada', true,
        'equipes', coalesce((
          select jsonb_agg(jsonb_build_object('equipeId', pp.dupla_id, 'nome', pp.nome, 'total', pp.total,
                                              'posicao', pp.posicao, 'compartilhada', pp.compartilhada,
                                              'pendente', pp.pendente) order by pp.posicao, pp.nome)
          from public.publicacao_posicoes pp
          where pp.publicacao_id = p.id), '[]'::jsonb))
      from public.publicacoes_ranking p
      where p.turma_id = p_turma
      order by p.versao desc limit 1),
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'numero', e.numero, 'titulo', e.titulo, 'data', e.data,
               'inicio', to_char(e.inicio, 'HH24:MI'), 'fim', to_char(e.fim, 'HH24:MI'),
               'estado', e.estado, 'ambienteNome', a.nome)
             order by e.data, e.numero)
      from public.encontros e left join public.ambientes a on a.id = e.ambiente_id
      where e.edicao_id = v_edicao and app.encontro_da_turma(e.id, p_turma)), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.painel_da_coordenacao(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'O painel da edição é só para a coordenação.');
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
$$;

CREATE OR REPLACE FUNCTION public.relatorio(p_tipo text, p_edicao uuid, p_categoria text DEFAULT NULL::text, p_turma uuid DEFAULT NULL::uuid, p_encontro uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_turmas uuid[] := app.turmas_do_relatorio(p_edicao, p_turma);
  v_colunas jsonb;
  v_linhas jsonb;
begin
  if p_tipo is null or p_tipo not in ('pontos', 'presenca', 'entregas', 'ocorrencias', 'revisoes') then
    raise exception 'Relatório desconhecido.' using errcode = '23514';
  end if;
  -- FR-013: a equipe docente não vê os pedidos de revisão nas telas (spec 007).
  if p_tipo = 'revisoes' and not app.e_coordenacao(p_edicao) then
    raise exception 'Os pedidos de revisão só são exportados pela coordenação.' using errcode = '42501';
  end if;
  if p_encontro is not null and not exists (select 1 from public.encontros where id = p_encontro and edicao_id = p_edicao) then
    raise exception 'O encontro não pertence à edição.' using errcode = '23514';
  end if;
  if p_categoria is not null then
    v_turmas := array(select t from unnest(v_turmas) t where app.categoria_da_turma(t) = p_categoria);
  end if;

  if p_tipo = 'pontos' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"presenca","rotulo":"Presença","tipo":"numero"},{"id":"participacao","rotulo":"Participação","tipo":"numero"},{"id":"avaliacaoObjetiva","rotulo":"Questões/prova oficial","tipo":"numero"},{"id":"entrega","rotulo":"Entrega prática","tipo":"numero"},{"id":"apresentacao","rotulo":"Apresentação","tipo":"numero"},{"id":"descontos","rotulo":"Descontos","tipo":"numero"},{"id":"total","rotulo":"Total","tipo":"numero"},{"id":"pendencias","rotulo":"Pendências","tipo":"texto"},{"id":"posicaoNaTurma","rotulo":"Posição na turma","tipo":"numero"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             -- Spec 012 (FR-016): posição da equipe na última publicação da turma.
             'posicaoNaTurma', (select pp2.posicao from public.publicacao_posicoes pp2
                                where pp2.dupla_id = d.id
                                  and pp2.publicacao_id = (app.ultima_publicacao_da_turma(d.turma_id)).id),
             'encontro', en.numero, 'presenca', pp.p -> 'presenca', 'participacao', pp.p -> 'participacao',
             'avaliacaoObjetiva', pp.p -> 'avaliacaoObjetiva', 'entrega', pp.p -> 'entrega',
             'apresentacao', pp.p -> 'apresentacao', 'descontos', pp.p -> 'descontos', 'total', pp.p -> 'total',
             'pendencias', (select coalesce(string_agg(case x when 'participacao' then 'participação'
                                                             when 'avaliacaoObjetiva' then 'questões/prova oficial'
                                                             when 'entrega' then 'entrega' else 'apresentação' end,
                                                        ', ' order by o), '')
                            from jsonb_array_elements_text(pp.p -> 'pendencias') with ordinality q (x, o)))
           order by c.categoria, t.nome, d.nome, en.numero)
      into v_linhas
    from public.duplas d join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    join public.encontros en on en.edicao_id = p_edicao and (p_encontro is null or en.id = p_encontro)
    cross join lateral (select app.pontos_do_encontro(d.id, en.id) as p) pp
    where d.turma_id = any (v_turmas) and d.ativa;

  elsif p_tipo = 'presenca' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"estudante","rotulo":"Estudante","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"presente","rotulo":"Presente","tipo":"sim_nao"},{"id":"observacao","rotulo":"Observação","tipo":"texto"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome,
             -- Equipe da data do encontro, pelo histórico de integrantes (U1).
             'equipe', coalesce((
               select coalesce(d.nome, 'Equipe sem nome') from public.dupla_integrantes i
               join public.duplas d on d.id = i.dupla_id
               where i.estudante_id = pr.estudante_id and i.edicao_id = p_edicao
                 and i.entrada_em < ((en.data + 1)::timestamp at time zone 'America/Sao_Paulo')
                 and (i.saida_em is null or i.saida_em >= (en.data::timestamp at time zone 'America/Sao_Paulo'))
               order by i.entrada_em desc limit 1), 'Sem equipe'),
             'estudante', pe.nome, 'encontro', en.numero, 'presente', pr.presente, 'observacao', pr.observacao)
           order by c.categoria, t.nome, en.numero, pe.nome)
      into v_linhas
    from public.presencas pr join public.encontros en on en.id = pr.encontro_id
    join public.turmas t on t.id = pr.turma_id join public.cursos c on c.id = t.curso_id
    join public.perfis pe on pe.id = pr.estudante_id
    where pr.turma_id = any (v_turmas) and (p_encontro is null or pr.encontro_id = p_encontro);

  elsif p_tipo = 'entregas' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"desafio","rotulo":"Desafio","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"versao","rotulo":"Versão","tipo":"numero"},{"id":"recebidaEm","rotulo":"Recebida em","tipo":"data_hora"},{"id":"atrasoMinutos","rotulo":"Atraso (minutos)","tipo":"numero"},{"id":"forma","rotulo":"Forma","tipo":"texto"},{"id":"avaliada","rotulo":"Avaliada","tipo":"sim_nao"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             'desafio', de.titulo, 'encontro', en.numero, 'versao', e.versao, 'recebidaEm', e.recebida_em,
             'atrasoMinutos', e.atraso_minutos,
             'forma', case when e.arquivo_path is not null then 'Arquivo' else 'Link' end,
             'avaliada', exists (select 1 from public.avaliacoes av where av.desafio_id = e.desafio_id and av.dupla_id = e.dupla_id))
           order by c.categoria, t.nome, d.nome, en.numero, de.titulo, e.versao)
      into v_linhas
    from public.entregas e join public.duplas d on d.id = e.dupla_id
    join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    join public.desafios de on de.id = e.desafio_id join public.encontros en on en.id = de.encontro_id
    where d.turma_id = any (v_turmas) and (p_encontro is null or de.encontro_id = p_encontro);

  elsif p_tipo = 'ocorrencias' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"tipo","rotulo":"Tipo","tipo":"texto"},{"id":"estado","rotulo":"Estado","tipo":"texto"},{"id":"registradaEm","rotulo":"Registrada em","tipo":"data_hora"},{"id":"decididaEm","rotulo":"Decidida em","tipo":"data_hora"},{"id":"apresentacaoDependente","rotulo":"Apresentação dependente","tipo":"sim_nao"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             'encontro', en.numero,
             'tipo', coalesce((select x ->> 'rotulo' from jsonb_array_elements(app.regras_do_encontro(o.encontro_id, app.turma_da_dupla(o.dupla_id)) -> 'penalidades' -> 'tipos') x
                               where x ->> 'id' = o.tipo), o.tipo),
             'estado', case o.estado when 'registrada' then 'Registrada' when 'manifestada' then 'Manifestada'
                                     when 'confirmada' then 'Confirmada' else 'Arquivada' end,
             'registradaEm', o.criado_em, 'decididaEm', o.decidido_em,
             'apresentacaoDependente', o.apresentacao_dependente)
           order by c.categoria, t.nome, d.nome, en.numero, o.criado_em)
      into v_linhas
    from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
    join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    join public.encontros en on en.id = o.encontro_id
    where o.edicao_id = p_edicao and d.turma_id = any (v_turmas) and (p_encontro is null or o.encontro_id = p_encontro);

  else
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"objeto","rotulo":"Objeto","tipo":"texto"},{"id":"componente","rotulo":"Componente","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"estado","rotulo":"Estado","tipo":"texto"},{"id":"pedidoEm","rotulo":"Pedido em","tipo":"data_hora"},{"id":"respondidoEm","rotulo":"Respondido em","tipo":"data_hora"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             'objeto', case r.objeto when 'ocorrencia' then 'Ocorrência' else 'Publicação do ranking' end,
             'componente', case r.componente when 'presenca' then 'Presença' when 'participacao' then 'Participação'
                                             when 'avaliacaoObjetiva' then 'Questões/prova oficial'
                                             when 'entrega' then 'Entrega prática' when 'apresentacao' then 'Apresentação' end,
             'encontro', en.numero,
             'estado', case r.estado when 'aberto' then 'Aberto' when 'deferido' then 'Deferido' else 'Indeferido' end,
             'pedidoEm', r.criado_em, 'respondidoEm', r.respondido_em)
           order by c.categoria, t.nome, d.nome, r.criado_em)
      into v_linhas
    from public.pedidos_revisao r join public.duplas d on d.id = r.dupla_id
    join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    left join public.ocorrencias o on o.id = r.ocorrencia_id
    left join public.encontros en on en.id = coalesce(r.encontro_id, o.encontro_id)
    where r.edicao_id = p_edicao and d.turma_id = any (v_turmas)
      and (p_encontro is null or coalesce(r.encontro_id, o.encontro_id) = p_encontro);
  end if;

  v_linhas := coalesce(v_linhas, '[]'::jsonb);
  insert into public.exportacoes_relatorio (edicao_id, tipo, filtros, linhas)
  values (p_edicao, p_tipo,
          jsonb_build_object('categoria', p_categoria, 'turmaId', p_turma, 'encontroId', p_encontro),
          jsonb_array_length(v_linhas));
  return jsonb_build_object('colunas', v_colunas, 'linhas', v_linhas);
end;
$function$;

-- ===========================================================================
-- US4 — histórico por categoria preservado (T023, FR-017)
-- ===========================================================================
-- Categorias com publicações anteriores à spec 012 (só a coordenação).
create function public.publicacoes_anteriores(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'Só a coordenação consulta as publicações anteriores.');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'categoria', x.categoria, 'versoes', x.versoes,
             'ultima', (select jsonb_build_object('versao', p.versao, 'estado', p.estado, 'publicadoEm', p.publicado_em)
                        from public.publicacoes_ranking p
                        where p.edicao_id = p_edicao and p.categoria = x.categoria and p.turma_id is null
                        order by p.versao desc limit 1))
           order by x.categoria)
    from (select categoria, count(*)::int as versoes from public.publicacoes_ranking
          where edicao_id = p_edicao and turma_id is null group by categoria) x), '[]'::jsonb);
end;
$$;

-- Última publicação por categoria anterior: só a coordenação, com o detalhe de todas.
create or replace function public.ranking_publicado(p_edicao uuid, p_categoria text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pub public.publicacoes_ranking;
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao,
    'As publicações por categoria anteriores são só da coordenação; veja o ranking da turma.');
  select * into v_pub from public.publicacoes_ranking
  where edicao_id = p_edicao and turma_id is null and (p_categoria is null or categoria = p_categoria)
  order by categoria, versao desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_pub.id, 'turmaId', null, 'turma', null, 'categoria', v_pub.categoria, 'versao', v_pub.versao,
    'estado', v_pub.estado, 'publicadoEm', v_pub.publicado_em, 'revisaoAte', v_pub.revisao_ate,
    'posicoes', coalesce((
      select jsonb_agg(jsonb_build_object('duplaId', pp.dupla_id, 'nome', pp.nome, 'posicao', pp.posicao,
                                          'compartilhada', pp.compartilhada, 'total', pp.total,
                                          'pendente', pp.pendente, 'minha', false, 'detalhe', pp.detalhe)
                       order by pp.posicao, pp.nome)
      from public.publicacao_posicoes pp where pp.publicacao_id = v_pub.id), '[]'::jsonb));
end;
$$;

create or replace function public.historico_publicacoes(p_edicao uuid, p_categoria text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'Só a coordenação consulta o histórico de publicações.');
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'versao', p.versao, 'estado', p.estado,
                                        'publicadoEm', p.publicado_em, 'justificativa', p.justificativa,
                                        'revisaoAte', p.revisao_ate,
                                        'publicadoPorNome', (select nome from public.perfis where id = p.publicado_por))
                     order by p.versao desc)
    from public.publicacoes_ranking p
    where p.edicao_id = p_edicao and p.categoria = p_categoria and p.turma_id is null), '[]'::jsonb);
end;
$$;

-- Pedido novo de revisão só sobre publicações por turma (R7); os já abertos seguem.
create function app.recusar_revisao_de_publicacao_anterior()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.objeto = 'publicacao'
     and exists (select 1 from public.publicacoes_ranking where id = new.publicacao_id and turma_id is null) then
    raise exception 'Esta publicação por categoria é anterior; peça revisão sobre o ranking da sua turma.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger pedidos_revisao_sobre_turma before insert on public.pedidos_revisao
  for each row execute function app.recusar_revisao_de_publicacao_anterior();

revoke all on function public.publicacoes_anteriores(uuid), app.recusar_revisao_de_publicacao_anterior()
  from public, anon;
grant execute on function public.publicacoes_anteriores(uuid) to authenticated;

-- ===========================================================================
-- Premiação por turma (T027, FR-018, FR-018a, FR-018b)
-- ===========================================================================
-- Decisão da coordenação sobre um empate persistente numa posição premiada da definitiva (R8).
-- Ligada à publicação: uma nova definitiva da turma volta a pedir decisão, sem apagar esta.
create table public.decisoes_premiacao (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.publicacoes_ranking (id) on delete restrict,
  posicao integer not null check (posicao >= 1),
  premiadas uuid[] not null check (cardinality(premiadas) >= 1),
  decisao text not null check (char_length(btrim(decisao)) between 3 and 500),
  justificativa text not null check (char_length(btrim(justificativa)) between 10 and 2000),
  decidido_por uuid not null references public.perfis (id) default auth.uid(),
  decidido_em timestamptz not null default now(),
  constraint decisoes_premiacao_unica unique (publicacao_id, posicao)
);
create trigger decisoes_premiacao_imutaveis before update or delete on public.decisoes_premiacao
  for each row execute function app.impedir_alteracao_publicada();
create trigger auditoria_decisoes_premiacao after insert or update or delete on public.decisoes_premiacao
  for each row execute function app.registrar_auditoria();
alter table public.decisoes_premiacao enable row level security;
revoke all on public.decisoes_premiacao from anon;
revoke insert, update, delete, truncate on public.decisoes_premiacao from authenticated;
create policy decisoes_premiacao_ler on public.decisoes_premiacao for select to authenticated
  using (app.e_coordenacao((select edicao_id from public.publicacoes_ranking where id = publicacao_id)));

-- Premiação de uma turma pela última publicação (R8). `p_perfil`: 'coordenacao', 'gestao'
-- (docente, mentor: vê também a provisória) ou 'aluno' (só a definitiva). Mesma regra de
-- `premiacaoDaTurma` em `src/modules/resultado/domain/premiacao.ts`.
create function app.premiacao_da_turma(p_turma uuid, p_perfil text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pub public.publicacoes_ranking := app.ultima_publicacao_da_turma(p_turma);
  v_mostra boolean;
  v_itens jsonb;
  v_situacao text := 'a_definir';
begin
  v_mostra := v_pub.estado = 'definitivo' or (v_pub.estado = 'provisorio' and p_perfil <> 'aluno');
  v_mostra := coalesce(v_mostra, false);

  with itens as (
    select (i ->> 'posicao')::int as posicao, i ->> 'descricao' as descricao, i ->> 'detalhes' as detalhes
    from public.edicoes e, jsonb_array_elements(e.premiacao) i
    where e.id = app.edicao_da_turma(p_turma)
  ), pos as (
    select pp.dupla_id, pp.nome, pp.posicao,
           count(*) over (partition by pp.posicao) as na_posicao
    from public.publicacao_posicoes pp where v_mostra and pp.publicacao_id = v_pub.id
  ), item as (
    select it.*,
           (select count(*) from pos where pos.posicao = it.posicao) as quantos,
           (select d from public.decisoes_premiacao d
            where v_pub.estado = 'definitivo' and d.publicacao_id = v_pub.id and d.posicao = it.posicao) as dec
    from itens it
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'posicao', item.posicao, 'descricao', item.descricao, 'detalhes', item.detalhes,
           'equipes', coalesce((
             select jsonb_agg(jsonb_build_object('id', pos.dupla_id, 'nome', pos.nome) order by pos.nome)
             from pos where pos.posicao = item.posicao
               and ((item.dec).id is null or (item.quantos < 2) or pos.dupla_id = any ((item.dec).premiadas))), '[]'::jsonb),
           'empate', item.quantos > 1,
           'semEquipePorEmpate', v_mostra and item.quantos = 0
             and exists (select 1 from pos where pos.posicao < item.posicao
                                              and pos.posicao + pos.na_posicao - 1 >= item.posicao),
           'decisao', case when item.quantos > 1 and (item.dec).id is not null then jsonb_build_object(
             'decisao', (item.dec).decisao, 'premiadas', to_jsonb((item.dec).premiadas),
             'justificativa', (item.dec).justificativa, 'decididoEm', (item.dec).decidido_em) end)
         order by item.posicao), '[]'::jsonb)
    into v_itens
  from item;

  if v_mostra and v_pub.estado = 'provisorio' then
    v_situacao := 'provisorio';
  elsif v_mostra and v_pub.estado = 'definitivo' then
    v_situacao := case when exists (select 1 from jsonb_array_elements(v_itens) x
                                    where (x ->> 'empate')::boolean and x -> 'decisao' = 'null'::jsonb)
                       then 'empate_a_decidir' else 'final' end;
  end if;
  return jsonb_build_object('turmaId', p_turma, 'turma', (select nome from public.turmas where id = p_turma),
                            'situacao', v_situacao,
                            'publicacaoId', case when v_mostra then v_pub.id end,
                            'itens', v_itens);
end;
$$;

-- Premiação das turmas visíveis a quem chama (FR-018a): coordenação, todas; docente e mentor, as
-- turmas em que atuam (também a provisória); aluno, a própria turma (só a definitiva).
create function public.premiacao_da_edicao(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_coord boolean := app.e_coordenacao(p_edicao);
begin
  if not v_coord and not app.participa_da_edicao(p_edicao) then
    raise exception 'Você não participa desta edição.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(app.premiacao_da_turma(x.id, x.perfil) order by x.categoria, x.nome)
    from (
      select t.id, t.nome, c.categoria,
             case when v_coord then 'coordenacao'
                  when exists (select 1 from public.atribuicoes a
                               where a.usuario_id = v_uid and a.edicao_id = p_edicao and a.ativo
                                 and ((a.turma_id = t.id and a.papel in ('docente', 'mentor'))
                                      or (a.papel = 'mentor' and a.curso_id = t.curso_id))) then 'gestao'
                  else 'aluno' end as perfil
      from public.turmas t join public.cursos c on c.id = t.curso_id
      where c.edicao_id = p_edicao and (
              v_coord
              or exists (select 1 from public.atribuicoes a
                         where a.usuario_id = v_uid and a.edicao_id = p_edicao and a.ativo and (
                                 (a.turma_id = t.id and a.papel in ('aluno', 'docente', 'mentor'))
                                 or (a.papel = 'mentor' and a.curso_id = t.curso_id))))
    ) x), '[]'::jsonb);
end;
$$;

create function public.decidir_premiacao_empate(p_publicacao uuid, p_posicao int, p_premiadas uuid[],
                                                p_decisao text, p_justificativa text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_pub public.publicacoes_ranking;
  v_empatadas uuid[];
  v_id uuid;
  v_em timestamptz;
begin
  select * into v_pub from public.publicacoes_ranking where id = p_publicacao;
  if not found then
    raise exception 'Publicação não encontrada.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_da_edicao(v_pub.edicao_id, 'Só a coordenação decide a premiação.');
  perform app.exigir_edicao_em_andamento(v_pub.edicao_id);
  if v_pub.turma_id is null or v_pub.estado <> 'definitivo' then
    raise exception 'Só a publicação definitiva de uma turma tem premiação a decidir.' using errcode = '23514';
  end if;
  perform pg_advisory_xact_lock(hashtext('ranking-turma/' || v_pub.turma_id::text));
  if (app.ultima_publicacao_da_turma(v_pub.turma_id)).id <> v_pub.id then
    raise exception 'Esta não é a publicação mais recente da turma; recarregue.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.edicoes e, jsonb_array_elements(e.premiacao) i
                 where e.id = v_pub.edicao_id and (i ->> 'posicao')::int = p_posicao) then
    raise exception 'Esta posição não tem prêmio configurado.' using errcode = '23514';
  end if;
  select array_agg(dupla_id) into v_empatadas from public.publicacao_posicoes
  where publicacao_id = v_pub.id and posicao = p_posicao;
  if coalesce(cardinality(v_empatadas), 0) < 2 then
    raise exception 'Não há empate nesta posição.' using errcode = '23514';
  end if;
  if p_premiadas is null or cardinality(p_premiadas) = 0 then
    raise exception 'Escolha ao menos uma equipe premiada.' using errcode = '23514';
  end if;
  if not (p_premiadas <@ v_empatadas) then
    raise exception 'As equipes premiadas precisam estar entre as empatadas.' using errcode = '23514';
  end if;
  if p_decisao is null or char_length(btrim(p_decisao)) not between 3 and 500 then
    raise exception 'Descreva a decisão com 3 a 500 caracteres.' using errcode = '23514';
  end if;
  if exists (select 1 from public.decisoes_premiacao where publicacao_id = v_pub.id and posicao = p_posicao) then
    raise exception 'Este empate já foi decidido.' using errcode = '23514';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  insert into public.decisoes_premiacao (publicacao_id, posicao, premiadas, decisao, justificativa)
  values (v_pub.id, p_posicao, (select array_agg(distinct x) from unnest(p_premiadas) x), btrim(p_decisao),
          btrim(p_justificativa))
  returning id, decidido_em into v_id, v_em;
  return jsonb_build_object('id', v_id, 'decididoEm', v_em);
end;
$$;

revoke all on function app.premiacao_da_turma(uuid, text) from public, anon, authenticated;
revoke all on function public.premiacao_da_edicao(uuid),
  public.decidir_premiacao_empate(uuid, int, uuid[], text, text) from public, anon;
grant execute on function public.premiacao_da_edicao(uuid),
  public.decidir_premiacao_empate(uuid, int, uuid[], text, text) to authenticated;
