-- =============================================================================
-- Spec 015 (FR-013) — fuso oficial de Juazeiro do Norte (CE): America/Fortaleza. As funções são
-- recriadas a partir da versão vigente de cada uma, só com o fuso trocado. Os dois fusos têm
-- UTC−3 sem horário de verão desde 2019: os resultados atuais não mudam. `create or replace`
-- mantém donos e permissões.
-- =============================================================================

CREATE OR REPLACE FUNCTION app.encontro_realizado(p_encontro uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select e.estado = 'realizado'
      or (e.estado <> 'cancelado' and e.data < (now() at time zone 'America/Fortaleza')::date)
  from public.encontros e where e.id = p_encontro;
$function$
;

CREATE OR REPLACE FUNCTION app.proximo_encontro_json(p_edicao uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object('id', e.id, 'numero', e.numero, 'titulo', e.titulo, 'data', e.data,
                            'inicio', to_char(e.inicio, 'HH24:MI'))
  from public.encontros e
  where e.edicao_id = p_edicao and e.estado = 'agendado'
    and e.data >= (now() at time zone 'America/Fortaleza')::date
  order by e.data, e.numero limit 1;
$function$
;

CREATE OR REPLACE FUNCTION app.inicio_do_encontro(p_encontro uuid)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (data + coalesce(inicio, time '00:00')) at time zone 'America/Fortaleza'
  from public.encontros where id = p_encontro;
$function$
;

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
                 and i.entrada_em < ((en.data + 1)::timestamp at time zone 'America/Fortaleza')
                 and (i.saida_em is null or i.saida_em >= (en.data::timestamp at time zone 'America/Fortaleza'))
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
$function$
;

