-- Testes da spec 011 — regras da edição e das turmas.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício.
--   E (ativa, regras do piloto): curso K (turmas KA, KB) e curso L (turma LA).
--   Encontros: 1 (há 7 dias, 10h), 2 (daqui a 7 dias, sem horário), 3 (daqui a 14 dias).
--   c = coordenação de E; m = mentor do curso K; ml = mentor do curso L; d = docente de KA;
--   a1, a2 = alunos de KA (equipe EQ); b1 = aluno de KB.
--   G (encerrada): coordenação cg; curso K com turma KA.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0012-0000000000' || s)::uuid, 'r' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('c1'), ('c9'), ('e1'), ('e2'), ('d1'), ('a1'), ('a2'), ('b1')) as v (s);

insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao)
select v.id::uuid, v.nome, 'ativa', '2026-03-01', '2026-12-01', app.regras_piloto(), app.regras_piloto() ->> 'versao'
from (values ('10000000-0000-0000-0012-0000000000e0', 'Edição E'),
             ('10000000-0000-0000-0012-0000000000a0', 'Edição G')) as v (id, nome);

insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0012-0000000000e1', '10000000-0000-0000-0012-0000000000e0', 'Curso K', 'Cat K'),
  ('20000000-0000-0000-0012-0000000000e2', '10000000-0000-0000-0012-0000000000e0', 'Curso L', 'Cat L'),
  ('20000000-0000-0000-0012-0000000000a1', '10000000-0000-0000-0012-0000000000a0', 'Curso K', 'Cat K');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0012-0000000000a0', '20000000-0000-0000-0012-0000000000e1', 'KA'),
  ('30000000-0000-0000-0012-0000000000b0', '20000000-0000-0000-0012-0000000000e1', 'KB'),
  ('30000000-0000-0000-0012-0000000000c0', '20000000-0000-0000-0012-0000000000e2', 'LA'),
  ('30000000-0000-0000-0012-0000000000d0', '20000000-0000-0000-0012-0000000000a1', 'KA');

insert into public.encontros (id, edicao_id, numero, titulo, data, inicio) values
  ('50000000-0000-0000-0012-000000000001', '10000000-0000-0000-0012-0000000000e0', 1, 'Encontro 1', current_date - 7, '10:00'),
  ('50000000-0000-0000-0012-000000000002', '10000000-0000-0000-0012-0000000000e0', 2, 'Encontro 2', current_date + 7, null),
  ('50000000-0000-0000-0012-000000000003', '10000000-0000-0000-0012-0000000000e0', 3, 'Encontro 3', current_date + 14, null);

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id, curso_id)
select ('00000000-0000-0000-0012-0000000000' || u)::uuid, e::uuid, p::public.papel, t::uuid, k::uuid
from (values ('c1', '10000000-0000-0000-0012-0000000000e0', 'coordenacao', null, null),
             ('c9', '10000000-0000-0000-0012-0000000000a0', 'coordenacao', null, null),
             ('e1', '10000000-0000-0000-0012-0000000000e0', 'mentor', null, '20000000-0000-0000-0012-0000000000e1'),
             ('e2', '10000000-0000-0000-0012-0000000000e0', 'mentor', null, '20000000-0000-0000-0012-0000000000e2'),
             ('d1', '10000000-0000-0000-0012-0000000000e0', 'docente', '30000000-0000-0000-0012-0000000000a0', null),
             ('a1', '10000000-0000-0000-0012-0000000000e0', 'aluno', '30000000-0000-0000-0012-0000000000a0', null),
             ('a2', '10000000-0000-0000-0012-0000000000e0', 'aluno', '30000000-0000-0000-0012-0000000000a0', null),
             ('b1', '10000000-0000-0000-0012-0000000000e0', 'aluno', '30000000-0000-0000-0012-0000000000b0', null))
  as v (u, e, p, t, k);

insert into public.duplas (id, edicao_id, turma_id, nome) values
  ('60000000-0000-0000-0012-000000000001', '10000000-0000-0000-0012-0000000000e0', '30000000-0000-0000-0012-0000000000a0', 'Equipe EQ');
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
select '60000000-0000-0000-0012-000000000001', '10000000-0000-0000-0012-0000000000e0', ('00000000-0000-0000-0012-0000000000' || s)::uuid
from (values ('a1'), ('a2')) as v (s);

update public.edicoes set estado = 'encerrada', justificativa_encerramento = 'Encerrada no teste.'
where id = '10000000-0000-0000-0012-0000000000a0';

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0012-0000000000' || s)::uuid;
$$;
create function pg_temp.e() returns uuid language sql immutable as $$ select '10000000-0000-0000-0012-0000000000e0'::uuid; $$;
create function pg_temp.g() returns uuid language sql immutable as $$ select '10000000-0000-0000-0012-0000000000a0'::uuid; $$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0012-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.enc(n int) returns uuid language sql immutable as $$
  select ('50000000-0000-0000-0012-00000000000' || n)::uuid;
$$;
create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.guardar(chave text, valor text) returns text language sql as $$
  select set_config('teste.' || chave, valor, true);
$$;
create function pg_temp.lido(chave text) returns text language sql as $$
  select current_setting('teste.' || chave);
$$;
create function pg_temp.contar(tabela text, filtro text default 'true') returns int
language plpgsql security definer as $$
declare n int;
begin
  execute format('select count(*)::int from public.%I where %s', tabela, filtro) into n;
  return n;
end;
$$;
-- Regras do piloto com uma alteração aplicada por caminho (jsonb_set).
create function pg_temp.regras_com(caminho text[], valor jsonb) returns jsonb language sql stable as $$
  select jsonb_set(app.regras_piloto(), caminho, valor);
$$;

-- ===========================================================================
-- Fundação (T005)
-- ===========================================================================
select has_table('public', 'versoes_regras', 'versoes_regras existe');
select ok((select relrowsecurity from pg_class where oid = 'public.versoes_regras'::regclass), 'RLS em versoes_regras');
select is(pg_temp.contar('versoes_regras', format('edicao_id = %L and vale_desde = %L', pg_temp.e(), '-infinity')), 1,
  'edição inserida ganha a versão inicial (vale desde sempre)');
select is((select rotulo from public.versoes_regras where edicao_id = pg_temp.e()), app.regras_piloto() ->> 'versao',
  'a versão inicial usa o rótulo da edição');
select is((select count(*)::int from public.edicoes e
           where not exists (select 1 from public.versoes_regras v where v.edicao_id = e.id and v.vale_desde = '-infinity')), 0,
  'migração: toda edição existente tem a versão inicial');
select throws_ok(format($f$ insert into public.versoes_regras (edicao_id, rotulo, regras, vale_desde, justificativa) values (%L, %L, '{}', now(), 'Justificativa válida.') $f$,
                        pg_temp.e(), app.regras_piloto() ->> 'versao'),
  '23505', null, 'rótulo único por edição');
select throws_ok(format($f$ insert into public.versoes_regras (edicao_id, rotulo, regras, vale_desde, justificativa) values (%L, 'x', '{}', now(), 'curta') $f$,
                        pg_temp.e()),
  '23514', null, 'justificativa das versões seguintes: 10 a 2000 caracteres');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ insert into public.versoes_regras (edicao_id, rotulo, regras, vale_desde, justificativa) values (%L, 'direta', '{}', now(), 'Justificativa válida.') $f$,
                        pg_temp.e()),
  '42501', null, 'escrita direta em versoes_regras é recusada');
select pg_temp.guardar('nova', public.criar_edicao(gen_random_uuid(), 'Edição nova', null, null, null)::text);
reset role;
select is(pg_temp.contar('versoes_regras', format('edicao_id = %L', pg_temp.lido('nova'))), 1,
  'criar_edicao cria a versão inicial');

select is(app.inicio_do_encontro(pg_temp.enc(1)), ((current_date - 7) + time '10:00') at time zone 'America/Sao_Paulo',
  'início do encontro com horário');
select is(app.inicio_do_encontro(pg_temp.enc(2)), ((current_date + 7) + time '00:00') at time zone 'America/Sao_Paulo',
  'início do encontro sem horário: início do dia');
select is(app.regras_vigentes(pg_temp.t('a'), now()), app.regras_piloto(), 'regras vigentes sem ajustes = versão da edição');

select lives_ok($$ select app.validar_regras(app.regras_piloto(), 'edicao') $$, 'validar_regras aceita o piloto');
select throws_ok($$ select app.validar_regras(pg_temp.regras_com('{provaOficial,pontosBonus}', '20'), 'edicao') $$,
  '23514', 'A prova oficial segue os valores do PRD e não pode ser alterada.', 'prova oficial diferente do PRD é recusada');
select throws_ok($$ select app.validar_regras(pg_temp.regras_com('{participacao,criterios}', '[]'), 'edicao') $$,
  '23514', null, 'rubrica sem critério é recusada');
select throws_ok($$ select app.validar_regras(pg_temp.regras_com('{entrega,criterioDeAtraso}', '"inexistente"'), 'edicao') $$,
  '23514', null, 'critério de atraso inexistente é recusado');
select throws_ok($$ select app.validar_regras(pg_temp.regras_com('{apresentacao,criterios,0,maximo}', '0'), 'edicao') $$,
  '23514', null, 'critério com máximo zero é recusado');
select throws_ok($$ select app.validar_regras(pg_temp.regras_com('{entrega,faixasDeAtraso}', '[{"ateMinutos":30,"desconto":2},{"ateMinutos":15,"desconto":5}]'), 'edicao') $$,
  '23514', null, 'faixas de atraso fora de ordem são recusadas');
select throws_ok($$ select app.validar_regras(pg_temp.regras_com('{quantidadeEncontros}', '21'), 'edicao') $$,
  '23514', null, 'mais de 20 encontros é recusado');
select throws_ok($$ select app.validar_regras(pg_temp.regras_com('{casasDecimais}', '5'), 'edicao') $$,
  '23514', null, 'mais de 4 casas decimais é recusado');
select is(app.sugerir_rotulo('2027.1'), '2027.2', 'sugere o próximo rótulo');
select is(app.sugerir_rotulo('piloto-a-confirmar'), 'piloto-a-confirmar.1', 'sem número no fim, acrescenta .1');

-- ===========================================================================
-- US1 — regras da edição com versões (T008, FR-001–003, FR-006, FR-013, FR-016)
-- ===========================================================================
create function pg_temp.regras_com_criterio() returns jsonb language sql stable as $$
  select jsonb_set(jsonb_set(app.regras_piloto(), '{versao}', '"2026.1"'), '{entrega,criterios}',
    (app.regras_piloto() -> 'entrega' -> 'criterios') || '[{"id":"documentacao","rotulo":"Documentação","maximo":5}]');
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select is(public.regras_da_edicao_vigentes(pg_temp.e()) ->> 'rotulo', app.regras_piloto() ->> 'versao',
  'regras vigentes da edição com o rótulo atual');
select is(public.regras_da_edicao_vigentes(pg_temp.e()) ->> 'sugestao', (app.regras_piloto() ->> 'versao') || '.1',
  'com a sugestão do próximo rótulo');
select pg_temp.guardar('v1', public.gravar_regras(pg_temp.e(), app.regras_piloto() ->> 'versao', '2026.1',
  pg_temp.regras_com_criterio(), 'Critério de documentação acrescentado.')::text);
select is((pg_temp.lido('v1')::jsonb ->> 'nova')::boolean, true, 'FR-002: versão nova gravada');
reset role;
select is((select regras_versao from public.edicoes where id = pg_temp.e()), '2026.1', 'a edição passa a ter o rótulo novo');
select ok((select regras -> 'entrega' -> 'criterios' @> '[{"id":"documentacao"}]' from public.edicoes where id = pg_temp.e()),
  'a cópia vigente traz o critério novo');
select is(pg_temp.contar('versoes_regras', format('edicao_id = %L', pg_temp.e())), 2, 'a versão anterior continua guardada');
select ok((select autor_id = pg_temp.u('c1') and justificativa = 'Critério de documentação acrescentado.' and vale_desde <= clock_timestamp()
           from public.versoes_regras where edicao_id = pg_temp.e() and rotulo = '2026.1'),
  'FR-002: com autor, justificativa e horário');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select is((public.gravar_regras(pg_temp.e(), '2026.1', '2026.1', pg_temp.regras_com_criterio(), 'Reenvio da mesma versão.') ->> 'nova')::boolean,
  false, 'FR-003: reenvio idêntico não grava');
select throws_ok(format($f$ select public.gravar_regras(%L, %L, '2026.2', pg_temp.regras_com_criterio(), 'Base desatualizada no teste.') $f$,
                        pg_temp.e(), app.regras_piloto() ->> 'versao'),
  '23514', 'As regras mudaram desde que você abriu a tela; recarregue.', 'FR-003: base desatualizada é recusada');
select throws_ok(format($f$ select public.gravar_regras(%L, '2026.1', %L, pg_temp.regras_com_criterio(), 'Rótulo repetido no teste.') $f$,
                        pg_temp.e(), app.regras_piloto() ->> 'versao'),
  '23514', null, 'FR-002: rótulo já usado na edição é recusado');
select throws_ok(format($f$ select public.gravar_regras(%L, '2026.1', '2026.2', jsonb_set(pg_temp.regras_com_criterio(), '{provaOficial,pontosRealizacao}', '6'), 'Prova alterada no teste.') $f$,
                        pg_temp.e()),
  '23514', 'A prova oficial segue os valores do PRD e não pode ser alterada.', 'FR-016: prova oficial não muda');
select throws_ok(format($f$ select public.gravar_regras(%L, '2026.1', '2026.2', jsonb_set(pg_temp.regras_com_criterio(), '{entrega,criterioDeAtraso}', '"inexistente"'), 'Atraso sem critério no teste.') $f$,
                        pg_temp.e()),
  '23514', 'Escolha outro critério de atraso antes de remover este.', 'remover o critério de atraso é recusado');
select throws_ok(format($f$ select public.gravar_regras(%L, '2026.1', '2026.2', jsonb_set(pg_temp.regras_com_criterio(), '{quantidadeEncontros}', '2'), 'Menos encontros no teste.') $f$,
                        pg_temp.e()),
  '23514', null, 'FR-006: quantidade de encontros menor que os cadastrados é recusada');
select throws_ok(format($f$ select public.gravar_regras(%L, '2026.1', '2026.2', pg_temp.regras_com_criterio(), 'curta') $f$, pg_temp.e()),
  '23514', null, 'justificativa curta é recusada');
select pg_temp.como(pg_temp.u('e1'));
select throws_ok(format($f$ select public.gravar_regras(%L, '2026.1', '2026.2', pg_temp.regras_com_criterio(), 'Mentor tentando gravar.') $f$, pg_temp.e()),
  '42501', null, 'mentor não grava regras da edição');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.gravar_regras(%L, '2026.1', '2026.2', pg_temp.regras_com_criterio(), 'Docente tentando gravar.') $f$, pg_temp.e()),
  '42501', null, 'docente não grava regras da edição');
select pg_temp.como(pg_temp.u('c9'));
select throws_ok(format($f$ select public.gravar_regras(%L, %L, '2026.2', app.regras_piloto(), 'Edição encerrada no teste.') $f$,
                        pg_temp.g(), app.regras_piloto() ->> 'versao'),
  '23514', null, 'FR-013: edição encerrada não muda de regras');
reset role;
select ok(exists (select 1 from public.auditoria where tabela = 'edicoes' and registro_id = pg_temp.e()::text
                  and antes ->> 'regras_versao' = app.regras_piloto() ->> 'versao' and depois ->> 'regras_versao' = '2026.1'),
  'auditoria guarda o antes da mudança de regras');

-- ===========================================================================
-- US2 — regras próprias da turma (T013, FR-004, FR-005, FR-008–FR-010)
-- ===========================================================================
-- Apresentação da turma com um critério próprio.
create function pg_temp.ajuste_apresentacao() returns jsonb language sql stable as $$
  select jsonb_build_object('apresentacao', jsonb_build_object('criterios',
    (app.regras_piloto() -> 'apresentacao' -> 'criterios') || '[{"id":"demonstracao","rotulo":"Demonstração","maximo":3}]'));
$$;

select has_table('public', 'ajustes_regras_turma', 'ajustes_regras_turma existe');
select ok((select relrowsecurity from pg_class where oid = 'public.ajustes_regras_turma'::regclass), 'RLS em ajustes_regras_turma');
select throws_ok(format($f$ insert into public.ajustes_regras_turma (turma_id, grupos, autor_id, papel_autor, justificativa) values (%L, '{}', %L, 'coordenacao', 'curta') $f$,
                        pg_temp.t('a'), pg_temp.u('c1')),
  '23514', null, 'justificativa do ajuste: 10 a 2000 caracteres');
select throws_ok(format($f$ insert into public.ajustes_regras_turma (turma_id, grupos, autor_id, papel_autor, justificativa) values (%L, '{}', %L, 'docente', 'Justificativa válida.') $f$,
                        pg_temp.t('a'), pg_temp.u('d1')),
  '23514', null, 'papel do autor: coordenação ou mentor');
select throws_ok(format($f$ insert into public.ajustes_regras_turma (turma_id, grupos, vale_desde, autor_id, papel_autor, justificativa) values (%1$L, '{}', '2026-05-01', %2$L, 'coordenacao', 'Justificativa válida.'), (%1$L, '{}', '2026-05-01', %2$L, 'coordenacao', 'Justificativa válida.') $f$,
                        pg_temp.t('a'), pg_temp.u('c1')),
  '23505', null, 'vale_desde único por turma');

set local role authenticated;
select pg_temp.como(pg_temp.u('e1'));
select pg_temp.guardar('aj1', public.gravar_ajustes_turma(pg_temp.t('a'), null, pg_temp.ajuste_apresentacao(),
  'Rubrica própria da turma.')::text);
select is((pg_temp.lido('aj1')::jsonb ->> 'novo')::boolean, true, 'FR-004: mentor do curso ajusta a apresentação da turma');
select throws_ok(format($f$ insert into public.ajustes_regras_turma (turma_id, grupos, autor_id, papel_autor, justificativa) values (%L, '{}', %L, 'mentor', 'Justificativa válida.') $f$,
                        pg_temp.t('a'), pg_temp.u('e1')),
  '42501', null, 'escrita direta em ajustes_regras_turma é recusada');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, %L, 'Mentor tentando penalidades.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj1')::jsonb ->> 'ajusteId',
                        pg_temp.ajuste_apresentacao() || jsonb_build_object('penalidades', app.regras_piloto() -> 'penalidades')),
  '42501', null, 'FR-005: mentor não ajusta penalidades');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, %L, 'Mentor tentando prazos.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj1')::jsonb ->> 'ajusteId',
                        jsonb_build_object('prazos', app.regras_piloto() -> 'prazos')),
  '42501', null, 'FR-005: mentor não ajusta prazos');
select pg_temp.como(pg_temp.u('e2'));
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, null, %L, 'Mentor de outro curso.') $f$,
                        pg_temp.t('a'), pg_temp.ajuste_apresentacao()),
  '42501', null, 'mentor de outro curso não ajusta a turma');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, null, %L, 'Docente tentando ajustar.') $f$,
                        pg_temp.t('a'), pg_temp.ajuste_apresentacao()),
  '42501', null, 'docente não ajusta regras da turma');

select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('aj2', public.gravar_ajustes_turma(pg_temp.t('a'), (pg_temp.lido('aj1')::jsonb ->> 'ajusteId')::uuid,
  pg_temp.ajuste_apresentacao() || jsonb_build_object('penalidades', app.regras_piloto() -> 'penalidades'),
  'Penalidades próprias da turma.')::text);
select is((pg_temp.lido('aj2')::jsonb ->> 'novo')::boolean, true, 'FR-005: coordenação ajusta penalidades da turma');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, %L, 'Prova oficial na turma.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj2')::jsonb ->> 'ajusteId',
                        jsonb_build_object('provaOficial', app.regras_piloto() -> 'provaOficial')),
  '23514', null, 'FR-016: prova oficial não é ajustável na turma');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, '{"casasDecimais": 2}', 'Casas decimais na turma.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj2')::jsonb ->> 'ajusteId'),
  '23514', null, 'casas decimais não são ajustáveis na turma');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, '{"quantidadeEncontros": 4}', 'Encontros na turma.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj2')::jsonb ->> 'ajusteId'),
  '23514', null, 'quantidade de encontros não é ajustável na turma');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, '{"inexistente": {}}', 'Grupo inexistente.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj2')::jsonb ->> 'ajusteId'),
  '23514', null, 'grupo inválido é recusado');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, %L, 'Critério com máximo zero.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj2')::jsonb ->> 'ajusteId',
                        jsonb_set(pg_temp.ajuste_apresentacao(), '{apresentacao,criterios,0,maximo}', '0')),
  '23514', 'A pontuação máxima precisa ser maior que zero.', 'cada grupo ajustado é validado');
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, %L, 'Base desatualizada no teste.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj1')::jsonb ->> 'ajusteId', pg_temp.ajuste_apresentacao()),
  '23514', 'As regras mudaram desde que você abriu a tela; recarregue.', 'FR-003: base desatualizada é recusada');
select is((public.gravar_ajustes_turma(pg_temp.t('a'), (pg_temp.lido('aj2')::jsonb ->> 'ajusteId')::uuid,
            pg_temp.ajuste_apresentacao() || jsonb_build_object('penalidades', app.regras_piloto() -> 'penalidades'),
            'Reenvio do mesmo ajuste.') ->> 'novo')::boolean,
  false, 'FR-003: conjunto igual ao vigente não grava');
select pg_temp.como(pg_temp.u('e1'));
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, %L, %L, 'Mentor tirando as penalidades.') $f$,
                        pg_temp.t('a'), pg_temp.lido('aj2')::jsonb ->> 'ajusteId', pg_temp.ajuste_apresentacao()),
  '42501', null, 'FR-005: mentor não desfaz o ajuste de penalidades da coordenação');
select pg_temp.guardar('aj3', public.gravar_ajustes_turma(pg_temp.t('a'), (pg_temp.lido('aj2')::jsonb ->> 'ajusteId')::uuid,
  pg_temp.ajuste_apresentacao() || jsonb_build_object('penalidades', app.regras_piloto() -> 'penalidades',
                                                      'presenca', app.regras_piloto() -> 'presenca'),
  'Presença definida pela turma.')::text);
select is((pg_temp.lido('aj3')::jsonb ->> 'novo')::boolean, true,
  'mentor grava os grupos de avaliação mantendo as penalidades da coordenação');

select pg_temp.como(pg_temp.u('a1'));
select is((select count(*)::int from public.ajustes_regras_turma where turma_id = pg_temp.t('a')), 3,
  'aluno da turma lê os ajustes da turma');
select pg_temp.como(pg_temp.u('b1'));
select is((select count(*)::int from public.ajustes_regras_turma where turma_id = pg_temp.t('a')), 0,
  'aluno de outra turma não lê os ajustes');
reset role;

select is(app.regras_vigentes(pg_temp.t('a'), clock_timestamp()),
          (select regras from public.edicoes where id = pg_temp.e()) || pg_temp.ajuste_apresentacao()
            || jsonb_build_object('penalidades', app.regras_piloto() -> 'penalidades'),
  'FR-008: regras da turma = edição com os grupos ajustados');
select is(app.regras_vigentes(pg_temp.t('b'), clock_timestamp()), (select regras from public.edicoes where id = pg_temp.e()),
  'turma sem ajuste usa as regras da edição');

-- Mudança posterior da edição num grupo não ajustado chega à turma (FR-009).
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select public.gravar_regras(pg_temp.e(), '2026.1', '2026.2',
  jsonb_set((select regras from public.edicoes where id = pg_temp.e()), '{entrega,limiteAtrasoMinutos}', '45'),
  'Limite de atraso ampliado.');
reset role;
select is(app.regras_vigentes(pg_temp.t('a'), clock_timestamp()) -> 'entrega' ->> 'limiteAtrasoMinutos', '45',
  'FR-009: mudança da edição em grupo não ajustado chega à turma');
select ok(app.regras_vigentes(pg_temp.t('a'), clock_timestamp()) -> 'apresentacao' -> 'criterios' @> '[{"id":"demonstracao"}]',
  'o grupo ajustado continua o da turma');

-- `{}` volta a herdar tudo (FR-010).
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select is((public.gravar_ajustes_turma(pg_temp.t('a'), (pg_temp.lido('aj3')::jsonb ->> 'ajusteId')::uuid, '{}',
            'Volta a herdar tudo da edição.') ->> 'novo')::boolean,
  true, 'FR-010: conjunto vazio desfaz os ajustes');
reset role;
select is(app.regras_vigentes(pg_temp.t('a'), clock_timestamp()), (select regras from public.edicoes where id = pg_temp.e()),
  'sem ajustes, a turma volta às regras da edição');
select is(pg_temp.contar('ajustes_regras_turma', format('turma_id = %L', pg_temp.t('a'))), 4,
  'o histórico de ajustes continua guardado');

-- Mentor desvinculado do curso perde o ajuste.
update public.atribuicoes set ativo = false where usuario_id = pg_temp.u('e1') and curso_id is not null;
set local role authenticated;
select pg_temp.como(pg_temp.u('e1'));
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, null, %L, 'Mentor desvinculado.') $f$,
                        pg_temp.t('a'), pg_temp.ajuste_apresentacao()),
  '42501', null, 'mentor desvinculado do curso não ajusta');
reset role;
update public.atribuicoes set ativo = true where usuario_id = pg_temp.u('e1') and curso_id is not null;
select set_config('app.sincronizando_mentores', '', true);

-- Edição encerrada (FR-013).
set local role authenticated;
select pg_temp.como(pg_temp.u('c9'));
select throws_ok(format($f$ select public.gravar_ajustes_turma(%L, null, %L, 'Edição encerrada no teste.') $f$,
                        pg_temp.t('d'), pg_temp.ajuste_apresentacao()),
  '23514', null, 'FR-013: turma de edição encerrada não ajusta regras');
reset role;

-- ===========================================================================
-- US4 — cada encontro com as regras do seu início (T017, FR-011, FR-012)
-- Até aqui: versões inicial, 2026.1 (critério documentação) e 2026.2 (limite 45) gravadas agora,
-- depois do início do encontro 1 e antes do 2; KA sem ajustes vigentes.
-- ===========================================================================
insert into public.duplas (id, edicao_id, turma_id, nome) values
  ('60000000-0000-0000-0012-000000000002', pg_temp.e(), pg_temp.t('b'), 'Equipe EQB');
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
values ('60000000-0000-0000-0012-000000000002', pg_temp.e(), pg_temp.u('b1'));
insert into public.desafios (id, edicao_id, encontro_id, titulo, enunciado, recursos_permitidos, politica_ia, prazo, estado) values
  ('70000000-0000-0000-0012-000000000001', pg_temp.e(), pg_temp.enc(1), 'Desafio D1', 'Enunciado.', '', '', now() - interval '6 days', 'encerrado'),
  ('70000000-0000-0000-0012-000000000002', pg_temp.e(), pg_temp.enc(2), 'Desafio D2', 'Enunciado.', '', '', now() + interval '8 days', 'publicado');
insert into public.desafio_turmas (desafio_id, turma_id)
select d::uuid, t from (values ('70000000-0000-0000-0012-000000000001'), ('70000000-0000-0000-0012-000000000002')) v (d),
  unnest(array[pg_temp.t('a'), pg_temp.t('b')]) t;

create function pg_temp.eq() returns uuid language sql immutable as $$ select '60000000-0000-0000-0012-000000000001'::uuid; $$;
create function pg_temp.eqb() returns uuid language sql immutable as $$ select '60000000-0000-0000-0012-000000000002'::uuid; $$;
create function pg_temp.dsf(n int) returns uuid language sql immutable as $$
  select ('70000000-0000-0000-0012-00000000000' || n)::uuid;
$$;
-- Nota 1 em cada critério da lista.
create function pg_temp.notas(p_criterios jsonb) returns jsonb language sql immutable as $$
  select jsonb_object_agg(c ->> 'id', 1) from jsonb_array_elements(p_criterios) c;
$$;
-- Equipe do painel de avaliação de um desafio.
create function pg_temp.equipe_no_painel(p_desafio uuid, p_dupla uuid) returns jsonb language sql as $$
  select e from jsonb_array_elements(public.painel_avaliacao(p_desafio) -> 'equipes') e where e ->> 'id' = p_dupla::text;
$$;

select is(app.regras_do_encontro(pg_temp.enc(1), pg_temp.t('a')) ->> 'versao', app.regras_piloto() ->> 'versao',
  'FR-011: encontro já iniciado usa a versão vigente no seu início');
select is(app.regras_do_encontro(pg_temp.enc(2), pg_temp.t('a')) ->> 'versao', '2026.2',
  'FR-011: encontro futuro usa a versão atual');
select ok(app.regras_do_encontro(pg_temp.enc(2), pg_temp.t('a')) -> 'entrega' -> 'criterios' @> '[{"id":"documentacao"}]'
          and not app.regras_do_encontro(pg_temp.enc(1), pg_temp.t('a')) -> 'entrega' -> 'criterios' @> '[{"id":"documentacao"}]',
  'critério novo só a partir do encontro seguinte');

-- Ajuste da apresentação em KB agora: vale para o encontro 2, não para o 1.
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select public.gravar_ajustes_turma(pg_temp.t('b'), null, pg_temp.ajuste_apresentacao(), 'Rubrica própria da turma KB.');
reset role;
select ok(app.regras_do_encontro(pg_temp.enc(2), pg_temp.t('b')) -> 'apresentacao' -> 'criterios' @> '[{"id":"demonstracao"}]'
          and not app.regras_do_encontro(pg_temp.enc(1), pg_temp.t('b')) -> 'apresentacao' -> 'criterios' @> '[{"id":"demonstracao"}]',
  'FR-011: ajuste da turma também vale a partir do encontro seguinte');

select pg_temp.guardar('notas_kb2',
  pg_temp.notas(app.regras_do_encontro(pg_temp.enc(2), pg_temp.t('b')) -> 'apresentacao' -> 'criterios')::text);
set local role authenticated;
select pg_temp.como(pg_temp.u('e1'));
select lives_ok(format($f$ select public.registrar_avaliacao(%L, %L, null, %L, false, null, null) $f$,
                       pg_temp.dsf(2), pg_temp.eqb(), pg_temp.lido('notas_kb2')),
  'avaliação do encontro 2 aceita o critério novo da turma');
select throws_ok(format($f$ select public.registrar_avaliacao(%L, %L, null, %L, false, null, null) $f$,
                        pg_temp.dsf(1), pg_temp.eqb(), pg_temp.lido('notas_kb2')),
  '23514', 'Critério desconhecido: demonstracao.', 'avaliação do encontro 1 recusa o critério novo');
select lives_ok(format($f$ select public.registrar_avaliacao(%L, %L, null, %L, false, null, null) $f$,
                       pg_temp.dsf(1), pg_temp.eqb(), pg_temp.notas(app.regras_piloto() -> 'apresentacao' -> 'criterios')),
  'avaliação do encontro 1 com os critérios do seu início');
select ok(pg_temp.equipe_no_painel(pg_temp.dsf(2), pg_temp.eqb()) -> 'regras' -> 'apresentacao' -> 'criterios' @> '[{"id":"demonstracao"}]'
          and not pg_temp.equipe_no_painel(pg_temp.dsf(1), pg_temp.eqb()) -> 'regras' -> 'apresentacao' -> 'criterios' @> '[{"id":"demonstracao"}]',
  'painel_avaliacao devolve as regras do encontro do desafio para a turma de cada equipe');
reset role;
select pg_temp.guardar('pontos_eqb_1', app.pontos_do_encontro(pg_temp.eqb(), pg_temp.enc(1))::text);

-- Versão nova renomeia e remove critério da apresentação e remove um tipo de penalidade.
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select public.gravar_regras(pg_temp.e(), '2026.2', '2026.3',
  jsonb_set(jsonb_set((select regras from public.edicoes where id = pg_temp.e()),
    '{apresentacao,criterios}', '[{"id":"clareza","rotulo":"Clareza da fala","maximo":3},{"id":"explicacao","rotulo":"Explicação das decisões e etapas","maximo":4}]'),
    '{penalidades,tipos}', (select jsonb_agg(t) from jsonb_array_elements(app.regras_piloto() -> 'penalidades' -> 'tipos') t
                            where t ->> 'id' <> 'reincidencia')),
  'Rubrica e penalidades revistas.');
reset role;
select is(app.pontos_do_encontro(pg_temp.eqb(), pg_temp.enc(1))::text, pg_temp.lido('pontos_eqb_1'),
  'FR-012: pontos do encontro 1 não mudam com a versão nova');
set local role authenticated;
select pg_temp.como(pg_temp.u('e1'));
select ok(pg_temp.equipe_no_painel(pg_temp.dsf(1), pg_temp.eqb()) -> 'avaliacao' is not null
          and pg_temp.equipe_no_painel(pg_temp.dsf(1), pg_temp.eqb()) -> 'regras' -> 'apresentacao' -> 'criterios'
              @> '[{"id":"respostas"},{"id":"clareza","rotulo":"Clareza"}]',
  'avaliação já lançada no encontro 1 segue válida, com os critérios e nomes antigos');
select ok(pg_temp.equipe_no_painel(pg_temp.dsf(2), pg_temp.eq()) -> 'regras' -> 'apresentacao' -> 'criterios'
            @> '[{"id":"clareza","rotulo":"Clareza da fala"}]'
          and not pg_temp.equipe_no_painel(pg_temp.dsf(2), pg_temp.eq()) -> 'regras' -> 'apresentacao' -> 'criterios' @> '[{"id":"respostas"}]',
  'encontro 2 usa o nome novo e não tem o critério removido');

-- Ocorrências: tipos do encontro da ocorrência para a turma da equipe.
select pg_temp.como(pg_temp.u('d1'));
select pg_temp.guardar('oc1', public.registrar_ocorrencia('a0000000-0000-0000-0012-000000000001', pg_temp.enc(1), pg_temp.eq(),
  'reincidencia', 'Fato fictício descrito com detalhes.', 'Relato fictício do docente.') ->> 'id');
select throws_ok(format($f$ select public.registrar_ocorrencia('a0000000-0000-0000-0012-000000000002', %L, %L, 'reincidencia', 'Fato fictício descrito com detalhes.', 'Relato fictício do docente.') $f$,
                        pg_temp.enc(2), pg_temp.eq()),
  '23514', null, 'tipo removido na versão nova é recusado no encontro 2');
select is((select o ->> 'tipoRotulo' from jsonb_array_elements(public.ocorrencias_visiveis(pg_temp.e(), pg_temp.t('a'))) o
           where o ->> 'id' = pg_temp.lido('oc1')),
  'Reincidência após orientação registrada', 'ocorrência do encontro 1 mantém o tipo removido depois');

-- Prazo de manifestação pelo ajuste de prazos da turma da equipe.
select pg_temp.como(pg_temp.u('c1'));
select public.gravar_ajustes_turma(pg_temp.t('a'),
  (select id from public.ajustes_regras_turma where turma_id = pg_temp.t('a') order by vale_desde desc limit 1),
  '{"prazos": {"manifestacaoHoras": 72, "revisaoHoras": 24}}', 'Prazo maior para a turma A.');
select pg_temp.como(pg_temp.u('d1'));
select ok((public.registrar_ocorrencia('a0000000-0000-0000-0012-000000000003', pg_temp.enc(2), pg_temp.eq(), 'desrespeito',
             'Fato fictício descrito com detalhes.', 'Relato fictício do docente.') ->> 'prazoManifestacao')::timestamptz
          > now() + interval '71 hours',
  'prazo de manifestação segue os prazos da turma da equipe');

-- Leituras devolvem as regras de cada encontro.
select ok((select (d -> 'regras' ->> 'versao') = app.regras_piloto() ->> 'versao'
           from jsonb_array_elements(public.atividades_da_turma(pg_temp.t('a')) -> 'desafios') d
           where d ->> 'id' = pg_temp.dsf(1)::text)
          and (select (d -> 'regras' ->> 'versao') = '2026.3'
               from jsonb_array_elements(public.atividades_da_turma(pg_temp.t('a')) -> 'desafios') d
               where d ->> 'id' = pg_temp.dsf(2)::text),
  'atividades_da_turma: regras do encontro de cada desafio');
select is(public.presencas_da_turma(pg_temp.enc(1), pg_temp.t('a')) -> 'regras' ->> 'versao', app.regras_piloto() ->> 'versao',
  'presencas_da_turma: regras do encontro');
select pg_temp.como(pg_temp.u('a1'));
select ok((select (en -> 'regras' ->> 'versao') = app.regras_piloto() ->> 'versao'
           from jsonb_array_elements(public.lancamentos_da_minha_equipe(pg_temp.e()) -> 'encontros') en
           where (en ->> 'numero')::int = 1)
          and (public.lancamentos_da_minha_equipe(pg_temp.e()) -> 'regras' -> 'prazos' ->> 'manifestacaoHoras') = '72',
  'lancamentos_da_minha_equipe: regras por encontro e as vigentes da turma');
reset role;

-- Encontro remarcado para antes da versão nova passa a usar a anterior.
update public.encontros set data = current_date - 1 where id = pg_temp.enc(3);
select is(app.regras_do_encontro(pg_temp.enc(3), pg_temp.t('b')) ->> 'versao', app.regras_piloto() ->> 'versao',
  'encontro remarcado para antes da mudança usa a versão vigente no novo início');
update public.encontros set data = current_date + 14 where id = pg_temp.enc(3);

-- ===========================================================================
-- US3 — encontros da turma e pontuação máxima (T021, FR-006, FR-008, FR-009)
-- Até aqui: EQB (KB) avaliada nos desafios dos encontros 1 e 2; EQ (KA) com ocorrências nos
-- encontros 1 e 2; encontro 3 sem lançamentos.
-- ===========================================================================
select has_table('public', 'encontros_fora_da_turma', 'encontros_fora_da_turma existe');
select ok((select relrowsecurity from pg_class where oid = 'public.encontros_fora_da_turma'::regclass),
  'RLS em encontros_fora_da_turma');
select is(app.maximo_do_encontro(app.regras_piloto(), 'questoes'), 100::numeric,
  'FR-009: máximo de um encontro com as regras do piloto');

-- Encontro com lançamentos da turma não sai.
insert into public.presencas (encontro_id, estudante_id, turma_id, presente)
values (pg_temp.enc(3), pg_temp.u('b1'), pg_temp.t('b'), true);
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_like(format($f$ select public.definir_encontros_da_turma(%L, array[%L]::uuid[]) $f$, pg_temp.t('b'), pg_temp.enc(3)),
  '%presenças%', 'encontro com presença da turma não sai');
reset role;
delete from public.presencas where encontro_id = pg_temp.enc(3);

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ insert into public.encontros_fora_da_turma (turma_id, encontro_id) values (%L, %L) $f$,
                        pg_temp.t('b'), pg_temp.enc(3)),
  '42501', null, 'escrita direta em encontros_fora_da_turma é recusada');
select throws_like(format($f$ select public.definir_encontros_da_turma(%L, array[%L]::uuid[]) $f$, pg_temp.t('b'), pg_temp.enc(2)),
  '%avaliações%', 'encontro com avaliação da turma não sai');
select throws_like(format($f$ select public.definir_encontros_da_turma(%L, array[%L]::uuid[]) $f$, pg_temp.t('a'), pg_temp.enc(2)),
  '%ocorrências%', 'encontro com ocorrência da turma não sai');
select lives_ok(format($f$ select public.definir_encontros_da_turma(%L, array[%L]::uuid[]) $f$, pg_temp.t('b'), pg_temp.enc(3)),
  'FR-008: coordenação tira o encontro 3 da turma KB');
select pg_temp.como(pg_temp.u('e1'));
select throws_ok(format($f$ select public.definir_encontros_da_turma(%L, '{}'::uuid[]) $f$, pg_temp.t('b')),
  '42501', null, 'mentor não define os encontros da turma');
select pg_temp.como(pg_temp.u('b1'));
select is((select count(*)::int from public.encontros_fora_da_turma where turma_id = pg_temp.t('b')), 1,
  'aluno da turma lê os encontros fora da turma');
select pg_temp.como(pg_temp.u('a1'));
select is((select count(*)::int from public.encontros_fora_da_turma where turma_id = pg_temp.t('b')), 0,
  'aluno de outra turma não lê');
select pg_temp.como(pg_temp.u('e1'));
select throws_ok(format($f$ select public.presencas_da_turma(%L, %L) $f$, pg_temp.enc(3), pg_temp.t('b')),
  '23514', 'Este encontro não faz parte da turma.', 'encontro fora da turma não recebe lançamentos');
reset role;

insert into public.encontros (id, edicao_id, numero, titulo, data)
values ('50000000-0000-0000-0012-000000000009', pg_temp.lido('nova')::uuid, 1, 'Encontro de outra edição', current_date + 30);
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok($$ select public.definir_encontros_da_turma('30000000-0000-0000-0012-0000000000b0', array['50000000-0000-0000-0012-000000000009']::uuid[]) $$,
  '23514', null, 'encontro de outra edição é recusado');
select pg_temp.como(pg_temp.u('c9'));
select throws_ok(format($f$ select public.definir_encontros_da_turma(%L, '{}'::uuid[]) $f$, pg_temp.t('d')),
  '23514', null, 'FR-013: turma de edição encerrada não muda de encontros');
reset role;

select ok(not app.encontro_da_turma(pg_temp.enc(3), pg_temp.t('b')) and app.encontro_da_turma(pg_temp.enc(3), pg_temp.t('a')),
  'encontro_da_turma considera as exclusões');
select is(jsonb_array_length(app.totais_da_equipe(pg_temp.eqb()) -> 'encontros'), 2, 'totais da equipe ignoram o encontro fora da turma');
select is(jsonb_array_length(app.totais_da_equipe(pg_temp.eq()) -> 'encontros'), 3, 'turma sem exclusões soma todos os encontros');
-- KA: encontro 1 com o piloto (100); 2 e 3 com a 2026.3 (entrega 45, apresentação 7) = 102 cada.
select is(app.maximo_da_turma(pg_temp.t('a')), 304::numeric, 'FR-009: máximo de KA soma os três encontros');
-- KB: encontro 1 com o piloto (100); 2 com a 2026.3 e a apresentação da turma (13) = 108; 3 fora.
select is(app.maximo_da_turma(pg_temp.t('b')), 208::numeric, 'FR-009: máximo de KB sem o encontro 3 e com o ajuste');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select is((public.pontos_da_turma(pg_temp.t('b')) -> 0 ->> 'maximo')::numeric, 208::numeric, 'pontos_da_turma traz o máximo');
select pg_temp.como(pg_temp.u('a1'));
select is((public.pontos_da_minha_equipe(pg_temp.e()) ->> 'maximo')::numeric, 304::numeric, 'pontos_da_minha_equipe traz o máximo');
select ok(exists (select 1 from jsonb_array_elements(public.lancamentos_da_minha_equipe(pg_temp.e()) -> 'encontros') en
                  where en ->> 'encontroId' = pg_temp.enc(3)::text),
  'lançamentos da equipe de KA incluem o encontro 3');
select pg_temp.como(pg_temp.u('b1'));
select ok(not exists (select 1 from jsonb_array_elements(public.lancamentos_da_minha_equipe(pg_temp.e()) -> 'encontros') en
                      where en ->> 'encontroId' = pg_temp.enc(3)::text),
  'lançamentos da equipe de KB não incluem o encontro 3');
select pg_temp.como(pg_temp.u('e1'));
select ok(not exists (select 1 from jsonb_array_elements(public.painel_da_turma(pg_temp.t('b')) -> 'encontros') en
                      where en ->> 'id' = pg_temp.enc(3)::text),
  'painel da turma lista só os encontros da turma');
reset role;

insert into public.encontros (id, edicao_id, numero, titulo, data)
values ('50000000-0000-0000-0012-000000000004', pg_temp.e(), 4, 'Encontro 4', current_date + 21);
select ok(app.encontro_da_turma(pg_temp.enc(4), pg_temp.t('a')) and app.encontro_da_turma(pg_temp.enc(4), pg_temp.t('b')),
  'encontro criado depois entra em todas as turmas');
delete from public.encontros where id = pg_temp.enc(4);

-- ===========================================================================
-- US5 — ver regras vigentes e histórico (T025, FR-014, FR-015)
-- Até aqui: E com 4 versões; KA com 5 ajustes (o vigente só com prazos); KB com a apresentação
-- própria e sem o encontro 3.
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select pg_temp.guardar('rt_a1', public.regras_da_turma(pg_temp.t('a'))::text);
select is(pg_temp.lido('rt_a1')::jsonb -> 'regras' -> 'prazos' ->> 'manifestacaoHoras', '72',
  'FR-014: aluno vê as regras vigentes da turma');
select is(pg_temp.lido('rt_a1')::jsonb -> 'gruposAjustados', '["prazos"]'::jsonb, 'com os grupos definidos para a turma');
select is((pg_temp.lido('rt_a1')::jsonb ->> 'maximo')::numeric, 304::numeric, 'e a pontuação máxima da turma');
select is(pg_temp.lido('rt_a1')::jsonb -> 'encontrosExcluidos', '[]'::jsonb, 'sem encontros fora da turma');
select is(pg_temp.lido('rt_a1')::jsonb -> 'podeAjustar', '[]'::jsonb, 'aluno não ajusta');
select ok(not (pg_temp.lido('rt_a1')::jsonb ? 'encontrosBloqueados'), 'aluno não vê os encontros bloqueados');
select pg_temp.como(pg_temp.u('d1'));
select is(public.regras_da_turma(pg_temp.t('a')) -> 'podeAjustar', '[]'::jsonb, 'docente não ajusta');
select pg_temp.como(pg_temp.u('e1'));
select is(public.regras_da_turma(pg_temp.t('a')) -> 'podeAjustar',
  '["presenca", "participacao", "questoes", "entrega", "apresentacao"]'::jsonb, 'mentor do curso ajusta os grupos de avaliação');
select pg_temp.como(pg_temp.u('c1'));
select is(jsonb_array_length(public.regras_da_turma(pg_temp.t('a')) -> 'podeAjustar'), 7, 'coordenação ajusta todos os grupos');
select is(public.regras_da_turma(pg_temp.t('b')) -> 'encontrosExcluidos', jsonb_build_array(pg_temp.enc(3)),
  'encontros fora da turma');
select ok((select jsonb_agg(b ->> 'encontroId' order by b ->> 'encontroId')
           from jsonb_array_elements(public.regras_da_turma(pg_temp.t('b')) -> 'encontrosBloqueados') b)
          = jsonb_build_array(pg_temp.enc(1), pg_temp.enc(2)),
  'coordenação vê os encontros com lançamentos da turma');
select pg_temp.como(pg_temp.u('b1'));
select throws_ok(format($f$ select public.regras_da_turma(%L) $f$, pg_temp.t('a')), '42501', null,
  'aluno de outra turma não vê as regras da turma');
select pg_temp.como(pg_temp.u('c9'));
select throws_ok(format($f$ select public.regras_da_turma(%L) $f$, pg_temp.t('a')), '42501', null,
  'conta sem vínculo com a turma não vê as regras');

select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('hist', public.historico_regras(pg_temp.e(), pg_temp.t('a'))::text);
select is(jsonb_array_length(pg_temp.lido('hist')::jsonb), 9, 'FR-015: histórico com as versões da edição e os ajustes da turma');
select is(pg_temp.lido('hist')::jsonb -> 0 ->> 'tipo', 'turma', 'mais recentes primeiro');
select is(pg_temp.lido('hist')::jsonb -> 0 -> 'grupos', '["prazos"]'::jsonb, 'com os grupos do ajuste');
select is(pg_temp.lido('hist')::jsonb -> 0 ->> 'autor', 'Pessoa c1', 'com o autor');
select is(pg_temp.lido('hist')::jsonb -> 0 ->> 'papel', 'coordenacao', 'e o papel do autor');
select ok((select h ->> 'valeDesde' is null and h ->> 'autor' is null
           from jsonb_array_elements(pg_temp.lido('hist')::jsonb) h where h ->> 'rotulo' = app.regras_piloto() ->> 'versao'),
  'versão inicial vale desde o início da edição');
select is(jsonb_array_length(public.historico_regras(pg_temp.e(), null)), 4, 'sem turma: só as versões da edição');
select pg_temp.como(pg_temp.u('e1'));
select is(jsonb_array_length(public.historico_regras(pg_temp.e(), pg_temp.t('a'))), 9, 'mentor da turma vê o histórico da turma');
select throws_ok(format($f$ select public.historico_regras(%L, null) $f$, pg_temp.e()), '42501', null,
  'mentor não vê o histórico sem turma');
select throws_ok(format($f$ select public.historico_regras(%L, %L) $f$, pg_temp.e(), pg_temp.t('c')), '42501', null,
  'mentor não vê o histórico de turma de outro curso');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.historico_regras(%L, %L) $f$, pg_temp.e(), pg_temp.t('a')), '42501', null,
  'docente não vê o histórico');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select public.historico_regras(%L, %L) $f$, pg_temp.e(), pg_temp.t('a')), '42501', null,
  'aluno não vê o histórico');
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ select public.historico_regras(%L, %L) $f$, pg_temp.e(), pg_temp.t('d')), '23514', null,
  'turma de outra edição é recusada');
reset role;

-- @@secoes

select * from finish();
rollback;
