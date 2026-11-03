-- =============================================================================
-- Spec 008 — painéis com dados reais (aluno, equipe docente e coordenação) e relatórios CSV.
-- Só leitura das specs 004, 006 e 007, sem regra de cálculo nova. Os relatórios são autorizados
-- e montados no servidor; o navegador só serializa o CSV. Nenhuma resposta traz nota individual
-- da prova, e-mail ou identificador de pessoa (FR-006, FR-011, FR-011a).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Registro das exportações (FR-009). Escrita só pela RPC `relatorio`.
-- ---------------------------------------------------------------------------
create table public.exportacoes_relatorio (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  tipo text not null check (tipo in ('pontos', 'presenca', 'entregas', 'ocorrencias', 'revisoes')),
  filtros jsonb not null default '{}'::jsonb check (jsonb_typeof(filtros) = 'object'),
  linhas integer not null check (linhas >= 0),
  autor_id uuid not null references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now()
);
create index exportacoes_edicao_idx on public.exportacoes_relatorio (edicao_id, criado_em desc);

create trigger auditoria_exportacoes_relatorio after insert or update or delete on public.exportacoes_relatorio
  for each row execute function app.registrar_auditoria();
revoke all on public.exportacoes_relatorio from anon;
revoke insert, update, delete, truncate on public.exportacoes_relatorio from authenticated;
alter table public.exportacoes_relatorio enable row level security;
create policy exportacoes_ler on public.exportacoes_relatorio for select to authenticated
  using (app.e_coordenacao(edicao_id) or autor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Encontro realizado (R2, FR-004a): estado "realizado" ou data anterior a hoje em Brasília, sem
-- estar cancelado. O encontro de hoje só passa a contar no dia seguinte.
-- ---------------------------------------------------------------------------
create function app.encontro_realizado(p_encontro uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select e.estado = 'realizado'
      or (e.estado <> 'cancelado' and e.data < (now() at time zone 'America/Sao_Paulo')::date)
  from public.encontros e where e.id = p_encontro;
$$;

-- Como `app.pendencias_da_categoria` (spec 007), mas os componentes vêm só de encontros
-- realizados. A recusa do definitivo continua usando a função original, com todos os encontros.
create function app.pendencias_realizadas_da_categoria(p_edicao uuid, p_categoria text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select v || jsonb_build_object('componentes', coalesce((
    select jsonb_agg(c) from jsonb_array_elements(v -> 'componentes') c
    where app.encontro_realizado((select en.id from public.encontros en
                                  where en.edicao_id = p_edicao and en.numero = (c ->> 'encontroNumero')::int))),
    '[]'::jsonb))
  from (select app.pendencias_da_categoria(p_edicao, p_categoria) as v) x;
$$;

revoke all on function app.encontro_realizado(uuid), app.pendencias_realizadas_da_categoria(uuid, text)
  from public, anon;
grant execute on function app.encontro_realizado(uuid), app.pendencias_realizadas_da_categoria(uuid, text)
  to authenticated;

-- Próximo encontro da edição: não cancelado, nem realizado, a partir de hoje em Brasília.
create function app.proximo_encontro_json(p_edicao uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', e.id, 'numero', e.numero, 'titulo', e.titulo, 'data', e.data,
                            'inicio', to_char(e.inicio, 'HH24:MI'))
  from public.encontros e
  where e.edicao_id = p_edicao and e.estado = 'agendado'
    and e.data >= (now() at time zone 'America/Sao_Paulo')::date
  order by e.data, e.numero limit 1;
$$;
revoke all on function app.proximo_encontro_json(uuid) from public, anon;
grant execute on function app.proximo_encontro_json(uuid) to authenticated;

-- ===========================================================================
-- US1 — painel do aluno (FR-002, FR-006, FR-014). Só a própria equipe, a categoria dela e os
-- próprios avisos; na edição encerrada não há ações a pedir.
-- ===========================================================================
create function public.painel_do_aluno(p_edicao uuid)
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
    select * into v_pub from public.publicacoes_ranking
    where edicao_id = p_edicao and categoria = app.categoria_da_turma(v_turma)
    order by versao desc limit 1;
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
      -- Publicação provisória da categoria dentro do prazo de revisão.
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
revoke all on function public.painel_do_aluno(uuid) from public, anon;
grant execute on function public.painel_do_aluno(uuid) to authenticated;

-- ===========================================================================
-- US2 — painel da equipe docente (FR-003, FR-004a, R3). Só as turmas em que a pessoa atua como
-- docente ou mentora; pendências de registro só de encontros realizados. Ocorrências sem
-- decisão aparecem como na lista da spec 007, sem filtro de encontro.
-- ===========================================================================
create function app.pendencias_da_turma(p_turma uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with enc as (
    select en.id, en.numero from public.encontros en
    where en.edicao_id = app.edicao_da_turma(p_turma) and app.encontro_realizado(en.id)
  ), eq as (
    select d.id, coalesce(d.nome, 'Equipe sem nome') as nome from public.duplas d
    where d.turma_id = p_turma and d.ativa
  ), itens as (
    -- Presença: estudantes ativos da turma sem registro no encontro (um item por encontro).
    select 'presenca' as tipo, enc.numero, 1 as ordem,
           'Presença não registrada: ' || count(*) || case when count(*) = 1 then ' estudante' else ' estudantes' end as descricao,
           '/docente/presenca' as caminho
    from enc join public.atribuicoes a on a.turma_id = p_turma and a.papel = 'aluno' and a.ativo
    where not exists (select 1 from public.presencas p where p.encontro_id = enc.id and p.estudante_id = a.usuario_id)
    group by enc.numero
    union all
    -- Participação: equipe ativa sem registro no encontro.
    select 'participacao', enc.numero, 2, 'Participação não registrada — ' || eq.nome, '/docente/presenca'
    from enc cross join eq
    where not exists (select 1 from public.participacoes pa where pa.encontro_id = enc.id and pa.dupla_id = eq.id)
    union all
    -- Entrega recebida sem avaliação.
    select 'avaliacao', enc.numero, 3, 'Entrega sem avaliação — ' || eq.nome || ', ' || d.titulo, '/docente/avaliacoes'
    from enc join public.desafios d on d.encontro_id = enc.id
    join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = p_turma
    cross join eq
    where exists (select 1 from public.entregas e where e.desafio_id = d.id and e.dupla_id = eq.id)
      and not exists (select 1 from public.avaliacoes av where av.desafio_id = d.id and av.dupla_id = eq.id)
    union all
    -- Ocorrência da turma aguardando decisão.
    select 'ocorrencia', en.numero, 4,
           'Ocorrência sem decisão — ' || coalesce(d.nome, 'Equipe sem nome') || ' (' ||
           coalesce((select t ->> 'rotulo' from jsonb_array_elements(app.regras_da_edicao(o.edicao_id) -> 'penalidades' -> 'tipos') t
                     where t ->> 'id' = o.tipo), o.tipo) || ')',
           '/docente/ocorrencias'
    from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
    join public.encontros en on en.id = o.encontro_id
    where d.turma_id = p_turma and o.estado in ('registrada', 'manifestada')
  )
  select coalesce(jsonb_agg(jsonb_build_object('tipo', tipo, 'encontroNumero', numero, 'descricao', descricao,
                                               'caminho', caminho) order by numero, ordem, descricao), '[]'::jsonb)
  from itens;
$$;

create function public.painel_da_gestao(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_turmas uuid[];
begin
  select coalesce(array_agg(distinct a.turma_id), '{}') into v_turmas from public.atribuicoes a
  where a.usuario_id = auth.uid() and a.edicao_id = p_edicao and a.ativo and a.papel in ('docente', 'mentor');
  if cardinality(v_turmas) = 0 then
    raise exception 'O painel da equipe docente é só para docentes e mentores das turmas.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'proximoEncontro', app.proximo_encontro_json(p_edicao),
    'turmas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'nome', t.nome, 'categoria', c.categoria,
               'equipes', (select count(*) from public.duplas d where d.turma_id = t.id and d.ativa),
               'equipesPendentes', (select count(*) from public.duplas d
                                    where d.turma_id = t.id and d.ativa
                                      and (app.totais_da_equipe(d.id) -> 'totais' ->> 'pendente')::boolean),
               'pendencias', app.pendencias_da_turma(t.id))
             order by t.nome, t.id)
      from public.turmas t join public.cursos c on c.id = t.curso_id
      where t.id = any (v_turmas)), '[]'::jsonb));
end;
$$;

revoke all on function app.pendencias_da_turma(uuid), public.painel_da_gestao(uuid) from public, anon;
grant execute on function app.pendencias_da_turma(uuid), public.painel_da_gestao(uuid) to authenticated;

-- ===========================================================================
-- US3 — painel da coordenação (FR-004, FR-004a). Contadores das mesmas funções da spec 007;
-- componentes e prova só de encontros realizados.
-- ===========================================================================
-- Prova pendente na categoria: resultados pendentes (realização ou nota, como no cálculo) mais
-- integrantes atuais sem resultado, nos encontros de prova oficial já realizados.
create function app.provas_pendentes_da_categoria(p_edicao uuid, p_categoria text)
returns integer language sql stable security definer set search_path = '' as $$
  with enc as (
    select en.id from public.encontros en
    where en.edicao_id = p_edicao and en.avaliacao_objetiva = 'prova_oficial' and app.encontro_realizado(en.id)
  )
  select ((select count(*) from enc join public.resultados_prova r on r.encontro_id = enc.id
           join public.duplas d on d.id = r.dupla_id
           where app.categoria_da_turma(d.turma_id) = p_categoria
             and (r.realizacao = 'pendente' or (r.realizacao = 'confirmada' and r.nota_estado = 'pendente')))
        + (select count(*) from enc cross join app.equipes_da_categoria(p_edicao, p_categoria) as eq (id)
           join public.dupla_integrantes i on i.dupla_id = eq.id and i.saida_em is null
           where not exists (select 1 from public.resultados_prova r
                             where r.encontro_id = enc.id and r.estudante_id = i.estudante_id)))::integer;
$$;

create function public.painel_da_coordenacao(p_edicao uuid)
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
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object(
               'categoria', x.categoria,
               'componentesPendentes', jsonb_array_length(x.pend -> 'componentes'),
               'provasPendentes', app.provas_pendentes_da_categoria(p_edicao, x.categoria),
               'ocorrenciasSemDecisao', jsonb_array_length(x.pend -> 'ocorrencias'),
               'revisoesAbertas', jsonb_array_length(x.pend -> 'revisoes'),
               'publicacao', (select jsonb_build_object('estado', p.estado, 'versao', p.versao,
                                                        'publicadoEm', p.publicado_em)
                              from public.publicacoes_ranking p
                              where p.edicao_id = p_edicao and p.categoria = x.categoria
                              order by p.versao desc limit 1))
             order by x.categoria)
      from (select c.categoria, app.pendencias_realizadas_da_categoria(p_edicao, c.categoria) as pend
            from (select distinct categoria from public.cursos where edicao_id = p_edicao) c) x), '[]'::jsonb));
end;
$$;

revoke all on function app.provas_pendentes_da_categoria(uuid, text), public.painel_da_coordenacao(uuid)
  from public, anon;
grant execute on function app.provas_pendentes_da_categoria(uuid, text), public.painel_da_coordenacao(uuid)
  to authenticated;

-- ===========================================================================
-- US4 — relatórios CSV (FR-007 a FR-013, R4, R6). O servidor autoriza, filtra e devolve
-- colunas e linhas; o navegador só serializa. Cada exportação fica em exportacoes_relatorio.
-- Nenhum relatório traz nota individual, e-mail, id de pessoa nem textos livres (fato,
-- evidência, manifestação, justificativas).
-- ===========================================================================
-- Turmas que quem chama pode exportar: a coordenação, toda a edição; docente ou mentor, só as
-- turmas em que atua. Pedir turma em que não atua é recusado.
create function app.turmas_do_relatorio(p_edicao uuid, p_turma uuid)
returns uuid[] language plpgsql stable security definer set search_path = '' as $$
declare
  v_turmas uuid[];
begin
  if p_turma is not null and app.edicao_da_turma(p_turma) is distinct from p_edicao then
    raise exception 'A turma não pertence à edição.' using errcode = '23514';
  end if;
  if app.e_coordenacao(p_edicao) then
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
$$;

create function public.relatorio(p_tipo text, p_edicao uuid, p_categoria text default null,
                                 p_turma uuid default null, p_encontro uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"presenca","rotulo":"Presença","tipo":"numero"},{"id":"participacao","rotulo":"Participação","tipo":"numero"},{"id":"avaliacaoObjetiva","rotulo":"Questões/prova oficial","tipo":"numero"},{"id":"entrega","rotulo":"Entrega prática","tipo":"numero"},{"id":"apresentacao","rotulo":"Apresentação","tipo":"numero"},{"id":"descontos","rotulo":"Descontos","tipo":"numero"},{"id":"total","rotulo":"Total","tipo":"numero"},{"id":"pendencias","rotulo":"Pendências","tipo":"texto"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
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
             'tipo', coalesce((select x ->> 'rotulo' from jsonb_array_elements(app.regras_da_edicao(o.edicao_id) -> 'penalidades' -> 'tipos') x
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
$$;

revoke all on function app.turmas_do_relatorio(uuid, uuid), public.relatorio(text, uuid, text, uuid, uuid)
  from public, anon;
grant execute on function app.turmas_do_relatorio(uuid, uuid), public.relatorio(text, uuid, text, uuid, uuid)
  to authenticated;
