-- =============================================================================
-- Spec 013 — encerramento da edição por turma. As pendências de ranking mostradas antes de
-- encerrar passam a ser as turmas cuja última publicação não é a definitiva (spec 012), no lugar
-- das categorias sem ranking. As pendências continuam sem impedir o encerramento (spec 010) e o
-- registro de encerramentos anteriores não muda.
-- =============================================================================

-- Pendências mostradas antes de encerrar (spec 010, R10); não impedem o encerramento.
-- `turmasSemDefinitiva`: turmas com equipes ativas cuja última publicação não é a definitiva
-- (R1). Publicações por categoria anteriores (sem turma) não contam.
create or replace function app.pendencias_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ocorrenciasSemDecisao', (select count(*) from public.ocorrencias
                              where edicao_id = p_id and estado in ('registrada', 'manifestada')),
    'revisoesAbertas', (select count(*) from public.pedidos_revisao where edicao_id = p_id and estado = 'aberto'),
    'turmasSemDefinitiva', coalesce((
      select jsonb_agg(jsonb_build_object(
               'turmaId', x.id, 'turma', x.nome, 'categoria', x.categoria,
               'estado', coalesce(x.estado::text, 'sem_publicacao'))
             order by x.categoria, x.nome)
      from (select t.id, t.nome, c.categoria, (app.ultima_publicacao_da_turma(t.id)).estado
            from public.turmas t join public.cursos c on c.id = t.curso_id
            where c.edicao_id = p_id and exists (select 1 from app.equipes_da_turma(t.id))) x
      where x.estado is distinct from 'definitivo'), '[]'::jsonb));
$$;

-- Edições da coordenação com o registro do encerramento, como foi gravado (R3, FR-006a).
create or replace function public.edicoes_que_coordeno()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'nome', e.nome, 'inicio', e.inicio, 'fim', e.fim, 'estado', e.estado,
           'regrasVersao', e.regras_versao, 'encerradaEm', e.encerrada_em,
           'justificativaEncerramento', e.justificativa_encerramento,
           'pendenciasNoEncerramento', e.pendencias_no_encerramento)
         order by case e.estado when 'ativa' then 0 when 'rascunho' then 1 else 2 end,
                  e.inicio desc nulls last, e.criado_em desc), '[]'::jsonb)
  from public.edicoes e
  where app.e_coordenacao(e.id);
$$;
