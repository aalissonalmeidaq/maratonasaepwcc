-- =============================================================================
-- Spec 004 — painel da turma (somente leitura).
-- Uma RPC decide o acesso (coordenação da edição, docente/mentor da turma, aluno ativo da
-- turma) e devolve só os dados coletivos que cada perfil pode ver. Nenhuma tabela nova.
-- =============================================================================

create function public.painel_da_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
    -- FR-005: ainda não há lançamentos reais nem ranking publicado (Incrementos 3/4).
    'pontuacao', null,
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'numero', e.numero, 'titulo', e.titulo, 'data', e.data,
               'inicio', to_char(e.inicio, 'HH24:MI'), 'fim', to_char(e.fim, 'HH24:MI'),
               'estado', e.estado, 'ambienteNome', a.nome)
             order by e.data, e.numero)
      from public.encontros e left join public.ambientes a on a.id = e.ambiente_id
      where e.edicao_id = v_edicao), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.painel_da_turma(uuid) from public, anon;
grant execute on function public.painel_da_turma(uuid) to authenticated;
