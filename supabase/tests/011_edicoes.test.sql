-- Testes da spec 010 — gestão de edições, turmas e vínculos.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício.
--   E (ativa, início 2026-03-01): coordenação c1; docente d1 em KA; aluno a1 em KA.
--   F (rascunho): coordenação c2.
--   G (encerrada no fim das fixtures): coordenação c9 (cg); turma KA.
--   b1 e b2 (p1 e p2 nas tarefas): contas sem vínculo.
-- Cadastro: curso "Curso K" (turmas KA, KB, KC) e curso "Curso L" (turma LA). KA participa de E e G.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0011-0000000000' || s)::uuid, 'e' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('c1'), ('c2'), ('c9'), ('d1'), ('a1'), ('b1'), ('b2')) as v (s);

insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao) values
  ('10000000-0000-0000-0011-0000000000e0', 'Edição E', 'ativa', '2026-03-01', '2026-11-30',
   '{"versao":"teste","quantidadeEncontros":4}', 'teste'),
  ('10000000-0000-0000-0011-0000000000f0', 'Edição F', 'rascunho', null, null,
   '{"versao":"teste","quantidadeEncontros":4}', 'teste'),
  ('10000000-0000-0000-0011-0000000000a0', 'Edição G', 'ativa', '2025-03-01', '2025-11-30',
   '{"versao":"teste","quantidadeEncontros":4}', 'teste');

-- Cursos e turmas inseridos direto (sem id de cadastro): o gatilho de compatibilidade liga ao
-- cadastro por nome, criando o item quando falta.
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0011-0000000000e0', '10000000-0000-0000-0011-0000000000e0', 'Curso K', 'Categoria K'),
  ('20000000-0000-0000-0011-0000000000a0', '10000000-0000-0000-0011-0000000000a0', 'Curso K', 'Categoria K');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0011-0000000000e0', '20000000-0000-0000-0011-0000000000e0', 'KA'),
  ('30000000-0000-0000-0011-0000000000a0', '20000000-0000-0000-0011-0000000000a0', 'KA');

insert into public.cadastro_turmas (id, cadastro_curso_id, nome)
select ('40000000-0000-0000-0011-0000000000' || s)::uuid,
       (select id from public.cadastro_cursos where nome = 'Curso K'), n
from (values ('b0', 'KB'), ('c0', 'KC')) as v (s, n);
insert into public.cadastro_cursos (id, nome, categoria) values
  ('50000000-0000-0000-0011-0000000000d0', 'Curso L', 'Categoria L');
insert into public.cadastro_turmas (id, cadastro_curso_id, nome) values
  ('40000000-0000-0000-0011-0000000000d0', '50000000-0000-0000-0011-0000000000d0', 'LA');

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select ('00000000-0000-0000-0011-0000000000' || u)::uuid, e::uuid, p::public.papel, t::uuid
from (values ('c1', '10000000-0000-0000-0011-0000000000e0', 'coordenacao', null),
             ('c2', '10000000-0000-0000-0011-0000000000f0', 'coordenacao', null),
             ('c9', '10000000-0000-0000-0011-0000000000a0', 'coordenacao', null),
             ('d1', '10000000-0000-0000-0011-0000000000e0', 'docente', '30000000-0000-0000-0011-0000000000e0'),
             ('a1', '10000000-0000-0000-0011-0000000000e0', 'aluno', '30000000-0000-0000-0011-0000000000e0'))
  as v (u, e, p, t);

update public.edicoes set estado = 'encerrada' where id = '10000000-0000-0000-0011-0000000000a0';

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0011-0000000000' || s)::uuid;
$$;
create function pg_temp.ed(s text) returns uuid language sql immutable as $$
  select ('10000000-0000-0000-0011-0000000000' || s || '0')::uuid;
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
create function pg_temp.cad_curso(p_nome text) returns uuid language sql stable security definer as $$
  select id from public.cadastro_cursos where nome = p_nome;
$$;
create function pg_temp.cad_turma(p_curso text, p_nome text) returns uuid language sql stable security definer as $$
  select t.id from public.cadastro_turmas t join public.cadastro_cursos c on c.id = t.cadastro_curso_id
  where c.nome = p_curso and t.nome = p_nome;
$$;

-- ===========================================================================
-- Fundação (T003)
-- ===========================================================================
select has_table('public', 'cadastro_cursos', 'cadastro_cursos existe');
select has_table('public', 'cadastro_turmas', 'cadastro_turmas existe');
select ok((select relrowsecurity from pg_class where oid = 'public.cadastro_cursos'::regclass), 'RLS em cadastro_cursos');
select ok((select relrowsecurity from pg_class where oid = 'public.cadastro_turmas'::regclass), 'RLS em cadastro_turmas');

select throws_ok($$ insert into public.cadastro_cursos (nome, categoria) values ('X', 'Cat') $$,
  '23514', null, 'curso do cadastro: nome com menos de 2 caracteres é recusado');
select throws_ok($$ insert into public.cadastro_cursos (nome, categoria) values ('Curso válido', ' ') $$,
  '23514', null, 'curso do cadastro: categoria vazia é recusada');
select throws_ok($$ insert into public.cadastro_cursos (nome, categoria) values ('curso k', 'Outra') $$,
  '23505', null, 'curso do cadastro: nome repetido sem caixa é recusado');
select throws_ok(format($f$ insert into public.cadastro_turmas (cadastro_curso_id, nome) values (%L, '') $f$,
                        pg_temp.cad_curso('Curso K')),
  '23514', null, 'turma do cadastro: nome vazio é recusado');
select throws_ok(format($f$ insert into public.cadastro_turmas (cadastro_curso_id, nome, ano_letivo) values (%L, 'KZ', 1999) $f$,
                        pg_temp.cad_curso('Curso K')),
  '23514', null, 'turma do cadastro: ano letivo fora de 2000 a 2100 é recusado');
select throws_ok(format($f$ insert into public.cadastro_turmas (cadastro_curso_id, nome) values (%L, 'kb') $f$,
                        pg_temp.cad_curso('Curso K')),
  '23505', null, 'turma do cadastro: nome repetido no curso (sem caixa) é recusado');

select col_not_null('public', 'cursos', 'cadastro_curso_id', 'curso na edição sempre ligado ao cadastro');
select col_not_null('public', 'turmas', 'cadastro_turma_id', 'turma na edição sempre ligada ao cadastro');
select is((select cadastro_curso_id from public.cursos where id = '20000000-0000-0000-0011-0000000000e0'),
  pg_temp.cad_curso('Curso K'), 'curso inserido direto foi ligado ao item de mesmo nome do cadastro');
select is((select cadastro_curso_id from public.cursos where id = '20000000-0000-0000-0011-0000000000a0'),
  pg_temp.cad_curso('Curso K'), 'o mesmo curso em outra edição usa o mesmo item do cadastro');
select is((select cadastro_turma_id from public.turmas where id = '30000000-0000-0000-0011-0000000000a0'),
  (select cadastro_turma_id from public.turmas where id = '30000000-0000-0000-0011-0000000000e0'),
  'a mesma turma em duas edições usa o mesmo item do cadastro, com linhas diferentes na edição');
select throws_ok(format($f$ insert into public.cursos (edicao_id, nome, categoria, cadastro_curso_id)
                            values (%L, 'Curso K bis', 'Cat', %L) $f$, pg_temp.ed('e'), pg_temp.cad_curso('Curso K')),
  '23505', null, 'um item do cadastro aparece no máximo uma vez por edição');
select is((select count(*)::int from public.cursos c join public.cadastro_cursos k on k.id = c.cadastro_curso_id
           where lower(k.nome) <> lower(c.nome)), 0, 'migração: todo curso na edição tem o nome do item do cadastro');
select is((select count(*)::int from public.turmas t join public.cadastro_turmas k on k.id = t.cadastro_turma_id
           where lower(k.nome) <> lower(t.nome)), 0, 'migração: toda turma na edição tem o nome do item do cadastro');

select has_column('public', 'edicoes', 'chave_envio', 'edições: chave de envio');
select has_column('public', 'edicoes', 'ativada_em', 'edições: horário da ativação');
select has_column('public', 'edicoes', 'encerrada_em', 'edições: horário do encerramento');
select has_column('public', 'edicoes', 'justificativa_encerramento', 'edições: justificativa do encerramento');
select has_column('public', 'edicoes', 'pendencias_no_encerramento', 'edições: pendências no encerramento');
select has_column('public', 'atribuicoes', 'curso_id', 'atribuições: curso do vínculo de mentor');
select has_column('public', 'atribuicoes', 'origem_id', 'atribuições: origem das derivadas');
select ok((select pg_get_constraintdef(oid) from pg_constraint where conname = 'atribuicoes_unica') like '%curso_id%',
  'a unicidade das atribuições inclui o curso');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok($$ insert into public.cadastro_cursos (nome, categoria) values ('Curso novo', 'Cat') $$,
  '42501', null, 'escrita direta no cadastro por authenticated é recusada');
select ok((select count(*) from public.cadastro_cursos) >= 2, 'quem coordena alguma edição lê o cadastro');
select pg_temp.como(pg_temp.u('d1'));
select is((select count(*)::int from public.cadastro_cursos), 0, 'docente não lê o cadastro');
reset role;

-- ===========================================================================
-- US1 — criar a edição (T007, FR-001–003, FR-013, FR-016, FR-018)
-- ===========================================================================
-- Versão inicial da edição do seed (spec 011): as regras com que ela nasceu, mesmo depois de
-- versões novas gravadas pelos testes de ponta a ponta.
select is(app.regras_piloto(), (select regras from public.versoes_regras
                                where edicao_id = 'b0000000-0000-0000-0000-000000000001' and vale_desde = '-infinity'),
  'app.regras_piloto() é igual ao REGRAS_PILOTO copiado no seed');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('nova', public.criar_edicao('61000000-0000-0000-0011-000000000001', '  Maratona 2027 (fictícia) ',
  '2027-03-01', '2027-11-30', null)::text);
select is(public.criar_edicao('61000000-0000-0000-0011-000000000001', 'Outro nome', null, null, null)::text,
  pg_temp.lido('nova'), 'FR-013: a mesma chave devolve a mesma edição');
reset role;
select is((select nome || '|' || estado || '|' || regras_versao from public.edicoes where id = pg_temp.lido('nova')::uuid),
  'Maratona 2027 (fictícia)|rascunho|piloto-2026.0-a-confirmar',
  'FR-001: nasce em rascunho, nome sem espaços nas pontas, regras do piloto');
select is((select regras from public.edicoes where id = pg_temp.lido('nova')::uuid), app.regras_piloto(),
  'FR-001: base nula copia as regras do piloto');
select is(pg_temp.contar('edicoes', format('chave_envio = %L', '61000000-0000-0000-0011-000000000001')), 1,
  'FR-013: uma só edição para a chave');
select ok(exists (select 1 from public.atribuicoes where usuario_id = pg_temp.u('c1') and edicao_id = pg_temp.lido('nova')::uuid
                  and papel = 'coordenacao' and ativo), 'FR-001: a criadora é coordenação da edição nova');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('copia', public.criar_edicao(gen_random_uuid(), 'Cópia de E', null, null, pg_temp.ed('e'))::text);
select throws_ok(format($f$ select public.criar_edicao(gen_random_uuid(), 'Cópia de F', null, null, %L) $f$, pg_temp.ed('f')),
  '42501', null, 'base: edição que a pessoa não coordena é recusada');
select throws_ok($$ select public.criar_edicao(gen_random_uuid(), 'ab', null, null, null) $$,
  '23514', null, 'nome com menos de 3 caracteres é recusado');
select throws_ok($$ select public.criar_edicao(gen_random_uuid(), 'Nome válido', '2027-05-02', '2027-05-01', null) $$,
  '23514', null, 'fim antes do início é recusado');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok($$ select public.criar_edicao(gen_random_uuid(), 'Do docente', null, null, null) $$,
  '42501', null, 'FR-002: docente não cria edição');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.criar_edicao(gen_random_uuid(), 'Do aluno', null, null, null) $$,
  '42501', null, 'FR-002: aluno não cria edição');
select pg_temp.como(pg_temp.u('b1'));
select throws_ok($$ select public.criar_edicao(gen_random_uuid(), 'Sem vínculo', null, null, null) $$,
  '42501', null, 'FR-002: conta sem coordenação não cria edição');
select is((select count(*)::int from public.edicoes where id = pg_temp.lido('nova')::uuid), 0,
  'conta sem vínculo não lê a edição nova');
select pg_temp.como(pg_temp.u('c1'));
select is((select count(*)::int from public.edicoes where id = pg_temp.lido('nova')::uuid), 1, 'a criadora lê a edição nova');
reset role;
select is((select regras_versao from public.edicoes where id = pg_temp.lido('copia')::uuid), 'teste',
  'base = edição coordenada copia a versão das regras');

-- Alterar.
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.alterar_edicao(%L, 'Edição E renomeada', '2026-03-02', '2026-11-30') $f$, pg_temp.ed('e')),
  'FR-003: a coordenação altera nome e período');
select pg_temp.guardar('aud_e', (select count(*) from public.auditoria where tabela = 'edicoes')::text);
select lives_ok(format($f$ select public.alterar_edicao(%L, 'Edição E renomeada', '2026-03-02', '2026-11-30') $f$, pg_temp.ed('e')),
  'mesmos valores não falham');
select throws_ok(format($f$ select public.alterar_edicao(%L, 'Edição E', null, null) $f$, pg_temp.ed('e')),
  '23514', null, 'edição ativa não fica sem início ou fim');
select throws_ok(format($f$ update public.edicoes set nome = 'Direto' where id = %L $f$, pg_temp.ed('e')),
  '42501', null, 'R1: UPDATE direto em edicoes é recusado');
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.alterar_edicao(%L, 'Invadida', null, null) $f$, pg_temp.ed('e')),
  '42501', null, 'FR-003: coordenação de outra edição não altera');
reset role;
select is((select count(*) from public.auditoria where tabela = 'edicoes')::text, pg_temp.lido('aud_e'),
  'FR-013: mesmos valores não geram auditoria nova');

-- Lista e apagar.
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select is((select array_agg(x ->> 'estado' order by ord) from jsonb_array_elements(public.edicoes_que_coordeno()) with ordinality as t (x, ord)),
  array['ativa', 'rascunho', 'rascunho'], 'FR-018: edições que coordeno na ordem ativa → rascunho');
select ok((select bool_and(x ? 'regrasVersao' and x ? 'inicio') from jsonb_array_elements(public.edicoes_que_coordeno()) x),
  'FR-018: com período e versão das regras');
select throws_ok(format($f$ select public.apagar_edicao(%L) $f$, pg_temp.ed('e')),
  '23514', null, 'FR-016: edição ativa não é apagada');
select lives_ok(format($f$ select public.apagar_edicao(%L) $f$, pg_temp.lido('copia')),
  'FR-016: edição em rascunho vazia é apagada');
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.apagar_edicao(%L) $f$, pg_temp.lido('nova')),
  '42501', null, 'FR-016: quem não coordena não apaga');
reset role;
select is(pg_temp.contar('edicoes', format('id = %L', pg_temp.lido('copia'))), 0, 'a edição apagada não existe mais');

-- ===========================================================================
-- US2 — cadastro permanente e vínculo das turmas (T012, FR-004–006)
-- ===========================================================================
create function pg_temp.turma_na(p_edicao uuid, p_nome text) returns uuid language sql stable security definer as $$
  select t.id from public.turmas t join public.cursos c on c.id = t.curso_id where c.edicao_id = p_edicao and t.nome = p_nome;
$$;
create function pg_temp.curso_na(p_edicao uuid, p_nome text) returns uuid language sql stable security definer as $$
  select id from public.cursos where edicao_id = p_edicao and nome = p_nome;
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('cm', public.salvar_curso_do_cadastro(null, 'Curso M', 'Categoria M')::text);
select throws_ok($$ select public.salvar_curso_do_cadastro(null, 'curso m', 'Outra') $$,
  '23514', 'Já existe um curso com esse nome no cadastro.', 'FR-004: curso com nome repetido (sem caixa)');
select pg_temp.guardar('ma', public.salvar_turma_do_cadastro(null, pg_temp.lido('cm')::uuid, 'MA', null)::text);
select throws_ok(format($f$ select public.salvar_turma_do_cadastro(null, %L, 'ma', null) $f$, pg_temp.lido('cm')),
  '23514', 'Já existe uma turma com esse nome neste curso.', 'FR-004: turma com nome repetido no curso');
select throws_ok($$ select public.salvar_curso_do_cadastro(null, 'X', 'Cat') $$,
  '23514', null, 'FR-004: nome de curso curto é recusado');
select ok((select bool_or(x ->> 'nome' = 'Curso K' and jsonb_array_length(x -> 'turmas') = 3) from jsonb_array_elements(public.cadastro()) x),
  'cadastro(): curso K com as três turmas');
select ok((select bool_or(t -> 'edicoes' @> jsonb_build_array(jsonb_build_object('id', pg_temp.ed('e'))))
           from jsonb_array_elements(public.cadastro()) x, jsonb_array_elements(x -> 'turmas') t where x ->> 'nome' = 'Curso K'),
  'cadastro(): cada turma mostra as edições de que participa');
select throws_ok(format($f$ insert into public.cursos (edicao_id, nome, categoria) values (%L, 'Direto', 'Cat') $f$, pg_temp.ed('e')),
  '42501', null, 'R4: escrita direta em cursos é recusada');
select throws_ok(format($f$ update public.turmas set nome = 'KA2' where id = %L $f$, pg_temp.turma_na(pg_temp.ed('e'), 'KA')),
  '42501', null, 'R4: escrita direta em turmas é recusada');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok($$ select public.salvar_curso_do_cadastro(null, 'Curso D', 'Cat') $$,
  '42501', null, 'FR-004: docente não escreve no cadastro');
select throws_ok($$ select public.cadastro() $$, '42501', null, 'docente não lê o cadastro pela RPC');

-- Vincular.
select pg_temp.como(pg_temp.u('c2'));
select is(jsonb_array_length(public.vincular_turmas(pg_temp.ed('f'), array[pg_temp.cad_turma('Curso K', 'KA'), pg_temp.cad_turma('Curso K', 'KB')])), 2,
  'FR-005: vincula duas turmas do cadastro à edição F');
select pg_temp.guardar('n_turmas', pg_temp.contar('turmas')::text);
select lives_ok(format($f$ select public.vincular_turmas(%L, array[%L]::uuid[]) $f$, pg_temp.ed('f'), pg_temp.cad_turma('Curso K', 'KA')),
  'FR-013: vincular de novo não falha');
select is(pg_temp.contar('turmas')::text, pg_temp.lido('n_turmas'), 'FR-013: vincular de novo não cria turma');
select throws_ok(format($f$ select public.vincular_turmas(%L, array[%L]::uuid[]) $f$, pg_temp.ed('e'), pg_temp.cad_turma('Curso K', 'KC')),
  '42501', null, 'FR-005: só a coordenação da edição vincula');
reset role;
select is((select categoria from public.cursos where id = pg_temp.curso_na(pg_temp.ed('f'), 'Curso K')), 'Categoria K',
  'FR-005: o curso vem junto, com a categoria do cadastro');
select isnt(pg_temp.turma_na(pg_temp.ed('f'), 'KA'), pg_temp.turma_na(pg_temp.ed('e'), 'KA'),
  'FR-006: a mesma turma do cadastro tem linhas diferentes em E e F');
select is(pg_temp.contar('atribuicoes', format('turma_id = %L', pg_temp.turma_na(pg_temp.ed('f'), 'KA'))), 0,
  'FR-006: alunos e docentes de KA em E não aparecem em KA de F');

-- Sincronia (só edições em preparação).
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.salvar_curso_do_cadastro(%L, 'Curso K', 'Categoria K2') $f$, pg_temp.cad_curso('Curso K')),
  'FR-004: corrige a categoria no cadastro');
reset role;
select is((select categoria from public.cursos where id = pg_temp.curso_na(pg_temp.ed('f'), 'Curso K')), 'Categoria K2',
  'FR-004: a correção chega sozinha à edição em preparação');
select is((select categoria from public.cursos where id = pg_temp.curso_na(pg_temp.ed('e'), 'Curso K')), 'Categoria K',
  'FR-004: a correção não chega sozinha à edição ativa');
select is((select categoria from public.cursos where id = pg_temp.curso_na(pg_temp.ed('a'), 'Curso K')), 'Categoria K',
  'FR-004: a edição encerrada não muda');

set local role authenticated;
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.atualizar_do_cadastro(%L) $f$, pg_temp.ed('e')),
  '42501', null, 'atualizar a partir do cadastro: só a coordenação da edição');
select pg_temp.como(pg_temp.u('c1'));
select is(public.atualizar_do_cadastro(pg_temp.ed('e')), '{"cursos": 1, "turmas": 0}'::jsonb,
  'FR-004: a coordenação da edição ativa aplica a correção');
select pg_temp.guardar('aud_cursos', pg_temp.contar('auditoria', $f$tabela = 'cursos'$f$)::text);
select is(public.atualizar_do_cadastro(pg_temp.ed('e')), '{"cursos": 0, "turmas": 0}'::jsonb,
  'sem diferença, nada é aplicado');
reset role;
select is((select categoria from public.cursos where id = pg_temp.curso_na(pg_temp.ed('e'), 'Curso K')), 'Categoria K2',
  'a edição ativa passou a ter a categoria corrigida');
select is(pg_temp.contar('auditoria', $f$tabela = 'cursos'$f$)::text, pg_temp.lido('aud_cursos'),
  'sem diferença, nenhuma auditoria nova');
set local role authenticated;
select pg_temp.como(pg_temp.u('c9'));
select throws_ok(format($f$ select public.atualizar_do_cadastro(%L) $f$, pg_temp.ed('a')),
  '23514', null, 'edição encerrada não é atualizada a partir do cadastro');

-- Apagar do cadastro.
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.apagar_do_cadastro('turma', %L) $f$, pg_temp.cad_turma('Curso L', 'LA')),
  'FR-004: turma que nunca participou de edição é apagada');
select throws_ok(format($f$ select public.apagar_do_cadastro('turma', %L) $f$, pg_temp.cad_turma('Curso K', 'KA')),
  '23514', null, 'FR-004: turma que participa de edição não é apagada');
select throws_ok(format($f$ select public.apagar_do_cadastro('curso', %L) $f$, pg_temp.cad_curso('Curso K')),
  '23514', null, 'FR-004: curso com turmas não é apagado');

-- Desvincular.
select pg_temp.como(pg_temp.u('c2'));
select lives_ok(format($f$ select public.desvincular_turma(%L) $f$, pg_temp.turma_na(pg_temp.ed('f'), 'KB')),
  'FR-005: turma sem pessoas nem registros sai da edição');
select lives_ok(format($f$ select public.desvincular_turma(%L) $f$, pg_temp.turma_na(pg_temp.ed('f'), 'KA')),
  'FR-005: a última turma também sai');
reset role;
select is(pg_temp.curso_na(pg_temp.ed('f'), 'Curso K'), null, 'curso sem turmas e sem mentores sai da edição junto');
select ok(pg_temp.cad_turma('Curso K', 'KB') is not null, 'a turma desvinculada continua no cadastro');
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ select public.desvincular_turma(%L) $f$, pg_temp.turma_na(pg_temp.ed('e'), 'KA')),
  '23514', null, 'FR-005: turma com aluno ou docente não sai');
reset role;

-- ===========================================================================
-- US3 — gestão por turma (T017, FR-007)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.vincular_turmas(%L, array[%L]::uuid[]) $f$, pg_temp.ed('e'), pg_temp.cad_turma('Curso K', 'KB')),
  'KB passa a participar de E');
select ok((select bool_and(x ? 'usuarioId' and x ? 'nome' and not (x ? 'email'))
           from jsonb_array_elements(public.pessoas_para_vincular(pg_temp.ed('e'), 'Pessoa')) x),
  'FR-007: a busca devolve id e nome, nunca e-mail');
select ok(public.pessoas_para_vincular(pg_temp.ed('e'), 'Pessoa') @> jsonb_build_array(jsonb_build_object('usuarioId', pg_temp.u('a1'))),
  'FR-007: encontra quem participa de edição que a pessoa coordena');
select ok(not (public.pessoas_para_vincular(pg_temp.ed('e'), 'Pessoa') @> jsonb_build_array(jsonb_build_object('usuarioId', pg_temp.u('b1')))),
  'FR-007: não encontra contas fora das edições que a pessoa coordena');
select is(jsonb_array_length(public.pessoas_para_vincular(pg_temp.ed('e'), 'ninguém com esse nome')), 0,
  'FR-007: busca sem resultado devolve lista vazia');

-- Vínculos de aluno e docente pela coordenação (políticas de atribuições da spec 001).
select lives_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, %L, 'aluno', %L) $f$,
                       pg_temp.u('b1'), pg_temp.ed('e'), pg_temp.turma_na(pg_temp.ed('e'), 'KA')),
  'FR-007: a coordenação vincula um aluno com conta à turma');
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, %L, 'aluno', %L) $f$,
                        pg_temp.u('a1'), pg_temp.ed('e'), pg_temp.turma_na(pg_temp.ed('e'), 'KB')),
  '23505', null, 'FR-007: aluno ativo em outra turma da mesma edição é recusado');
select lives_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, %L, 'docente', %L) $f$,
                       pg_temp.u('b2'), pg_temp.ed('e'), pg_temp.turma_na(pg_temp.ed('e'), 'KB')),
  'FR-007: a coordenação vincula um docente à turma');
select lives_ok(format($f$ update public.atribuicoes set ativo = false where usuario_id = %L and edicao_id = %L and papel = 'aluno' $f$,
                       pg_temp.u('b1'), pg_temp.ed('e')),
  'FR-007: a coordenação desvincula o aluno');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, %L, 'aluno', %L) $f$,
                        pg_temp.u('b2'), pg_temp.ed('e'), pg_temp.turma_na(pg_temp.ed('e'), 'KA')),
  '42501', null, 'US3-8: docente da turma não vincula alunos');
select throws_ok(format($f$ select public.pessoas_para_vincular(%L, 'Pessoa') $f$, pg_temp.ed('e')),
  '42501', null, 'US3-8: docente não usa a busca de pessoas');
reset role;
select is((select ativo from public.atribuicoes where usuario_id = pg_temp.u('b1') and edicao_id = pg_temp.ed('e') and papel = 'aluno'),
  false, 'FR-007: o vínculo desvinculado fica inativo, com histórico');

-- ===========================================================================
-- US4 — mentor vinculado ao curso (T022, FR-008, FR-009)
-- ===========================================================================
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0011-0000000000f1', 'ef1@exemplo.invalid', '{"nome": "Mentora f1"}', 'authenticated', 'authenticated');
create function pg_temp.mentor_atua(p_turma uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from public.atribuicoes where usuario_id = '00000000-0000-0000-0011-0000000000f1'
                 and turma_id = p_turma and papel = 'mentor' and ativo);
$$;

select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, %L, 'mentor', %L) $f$,
                        pg_temp.u('f1'), pg_temp.ed('e'), pg_temp.turma_na(pg_temp.ed('e'), 'KA')),
  '23514', null, 'FR-008: mentor direto numa turma (sem origem) é recusado');
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id) values (%L, %L, 'docente', %L) $f$,
                        pg_temp.u('f1'), pg_temp.ed('e'), pg_temp.curso_na(pg_temp.ed('e'), 'Curso K')),
  '23514', null, 'só o mentor tem vínculo ao curso');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.vincular_mentor_ao_curso(%L, %L) $f$, pg_temp.curso_na(pg_temp.ed('e'), 'Curso K'), pg_temp.u('f1')),
  'FR-008: a coordenação vincula a mentora ao curso');
reset role;
select ok(pg_temp.mentor_atua(pg_temp.turma_na(pg_temp.ed('e'), 'KA')) and pg_temp.mentor_atua(pg_temp.turma_na(pg_temp.ed('e'), 'KB')),
  'FR-008: a mentora atua em todas as turmas do curso na edição');
select pg_temp.guardar('n_atrib', pg_temp.contar('atribuicoes')::text);
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.vincular_mentor_ao_curso(%L, %L) $f$, pg_temp.curso_na(pg_temp.ed('e'), 'Curso K'), pg_temp.u('f1')),
  'FR-013: vincular de novo não falha');
reset role;
select is(pg_temp.contar('atribuicoes')::text, pg_temp.lido('n_atrib'), 'FR-013: vincular de novo não cria linhas');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.vincular_turmas(%L, array[%L]::uuid[]) $f$, pg_temp.ed('e'), pg_temp.cad_turma('Curso K', 'KC')),
  'KC é vinculada depois');
reset role;
select ok(pg_temp.mentor_atua(pg_temp.turma_na(pg_temp.ed('e'), 'KC')), 'FR-008: a mentora passa a atuar na turma vinculada depois');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id, origem_id)
                            select %L, %L, 'mentor', %L, id from public.atribuicoes where usuario_id = %L and curso_id is not null $f$,
                        pg_temp.u('b1'), pg_temp.ed('e'), pg_temp.turma_na(pg_temp.ed('e'), 'KA'), pg_temp.u('f1')),
  '42501', null, 'escrita direta numa linha derivada é recusada');
select throws_ok(format($f$ update public.atribuicoes set ativo = false where usuario_id = %L and turma_id = %L and papel = 'mentor' $f$,
                        pg_temp.u('f1'), pg_temp.turma_na(pg_temp.ed('e'), 'KA')),
  '42501', null, 'derivada não é desativada direto');
select lives_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, %L, 'docente', %L) $f$,
                       pg_temp.u('f1'), pg_temp.ed('e'), pg_temp.turma_na(pg_temp.ed('e'), 'KA')),
  'a mentora também é docente de KA');
select lives_ok(format($f$ select public.desvincular_turma(%L) $f$, pg_temp.turma_na(pg_temp.ed('e'), 'KC')),
  'R5: turma só com mentor do curso pode ser desvinculada');
select lives_ok(format($f$ select public.desvincular_mentor_do_curso(%L, %L) $f$, pg_temp.curso_na(pg_temp.ed('e'), 'Curso K'), pg_temp.u('f1')),
  'FR-008: a coordenação desvincula a mentora do curso');
reset role;
select ok(not pg_temp.mentor_atua(pg_temp.turma_na(pg_temp.ed('e'), 'KA')) and not pg_temp.mentor_atua(pg_temp.turma_na(pg_temp.ed('e'), 'KB')),
  'FR-008: desvinculada do curso, deixa de atuar como mentora em todas as turmas');
select ok(exists (select 1 from public.atribuicoes where usuario_id = pg_temp.u('f1') and papel = 'docente' and ativo),
  'desvincular do curso não mexe no vínculo de docente');
select is(pg_temp.contar('atribuicoes', format('usuario_id = %L and papel = %L', pg_temp.u('f1'), 'mentor')), 3,
  'o histórico do mentor fica (vínculo ao curso e derivadas de KA e KB, inativos)');

-- Última turma do curso (em F).
set local role authenticated;
select pg_temp.como(pg_temp.u('c2'));
select lives_ok(format($f$ select public.vincular_turmas(%L, array[%L]::uuid[]) $f$, pg_temp.ed('f'), pg_temp.cad_turma('Curso K', 'KA')),
  'KA volta para F');
select lives_ok(format($f$ select public.vincular_mentor_ao_curso(%L, %L) $f$, pg_temp.curso_na(pg_temp.ed('f'), 'Curso K'), pg_temp.u('f1')),
  'mentora vinculada ao curso K de F');
select lives_ok(format($f$ select public.desvincular_turma(%L) $f$, pg_temp.turma_na(pg_temp.ed('f'), 'KA')),
  'R5: a última turma do curso sai, mesmo com mentora');
reset role;
select ok(pg_temp.curso_na(pg_temp.ed('f'), 'Curso K') is not null
          and not exists (select 1 from public.atribuicoes where curso_id = pg_temp.curso_na(pg_temp.ed('f'), 'Curso K') and ativo),
  'R5: com mentores, o curso fica fora da edição e o vínculo da mentora fica inativo');
set local role authenticated;
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.vincular_mentor_ao_curso(%L, %L) $f$, pg_temp.curso_na(pg_temp.ed('f'), 'Curso K'), pg_temp.u('f1')),
  '23514', 'Vincule uma turma deste curso antes de vincular mentores.', 'curso sem turma na edição não recebe mentor');
select lives_ok(format($f$ select public.vincular_turmas(%L, array[%L]::uuid[]) $f$, pg_temp.ed('f'), pg_temp.cad_turma('Curso K', 'KA')),
  'KA vinculada de novo a F');
reset role;
select ok(not pg_temp.mentor_atua(pg_temp.turma_na(pg_temp.ed('f'), 'KA')), 'vincular de novo a turma não reativa a mentora');
select is(pg_temp.contar('atribuicoes', $f$papel = 'mentor' and turma_id is not null and origem_id is null$f$), 0,
  'FR-009: nenhum mentor fica vinculado direto a turma (migração e regra)');

-- ===========================================================================
-- US5 — ativar e encerrar (T027, FR-010–012, FR-020; SC-005)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.ativar_edicao(%L) $f$, pg_temp.ed('f')),
  '23514', 'Para ativar, falta: início e fim.', 'FR-010: ativar sem período é recusado com o que falta');
select lives_ok(format($f$ select public.alterar_edicao(%L, 'Edição F', '2027-03-01', '2027-11-30') $f$, pg_temp.ed('f')),
  'período preenchido');
select ok((public.ativar_edicao(pg_temp.ed('f')) ->> 'ativadaEm') is not null, 'FR-010: a edição F é ativada');
reset role;
select is((select estado::text from public.edicoes where id = pg_temp.ed('e')), 'ativa',
  'FR-020: E continua ativa junto com F (duas edições ativas)');
select pg_temp.guardar('aud_f', pg_temp.contar('auditoria', format('tabela = %L and registro_id = %L', 'edicoes', pg_temp.ed('f')))::text);
set local role authenticated;
select pg_temp.como(pg_temp.u('c2'));
select lives_ok(format($f$ select public.ativar_edicao(%L) $f$, pg_temp.ed('f')), 'FR-013: ativar de novo não falha');
reset role;
select is(pg_temp.contar('auditoria', format('tabela = %L and registro_id = %L', 'edicoes', pg_temp.ed('f')))::text, pg_temp.lido('aud_f'),
  'FR-013: ativar de novo não gera auditoria');
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ select public.ativar_edicao(%L) $f$, pg_temp.ed('f')), '42501', null,
  'FR-020: c1 não ativa a edição F');
select throws_ok(format($f$ select public.vincular_turmas(%L, array[%L]::uuid[]) $f$, pg_temp.ed('f'), pg_temp.cad_turma('Curso K', 'KB')),
  '42501', null, 'FR-020: c1 não vincula turmas em F');
select throws_ok(format($f$ select public.encerrar_edicao(%L, 'Justificativa válida.') $f$, pg_temp.ed('f')), '42501', null,
  'FR-020: c1 não encerra F');
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.alterar_edicao(%L, 'Invadida', '2026-03-01', '2026-11-30') $f$, pg_temp.ed('e')), '42501', null,
  'FR-020: c2 não altera E');
select throws_ok(format($f$ select public.encerrar_edicao(%L, 'Justificativa válida.') $f$, pg_temp.ed('e')), '42501', null,
  'FR-020: c2 não encerra E');

-- Pendências e encerramento.
select pg_temp.como(pg_temp.u('c1'));
select is(public.pendencias_da_edicao(pg_temp.ed('e')) - 'turmasSemDefinitiva',
  '{"ocorrenciasSemDecisao": 0, "revisoesAbertas": 0}'::jsonb, 'FR-011: contagens de ocorrências e revisões');
-- Spec 013: a pendência de ranking é por turma e só conta turmas com equipes (as de E não têm).
select is(public.pendencias_da_edicao(pg_temp.ed('e')) -> 'turmasSemDefinitiva', '[]'::jsonb,
  'FR-011 (spec 013): turmas sem equipes não entram nas pendências de ranking');
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.encerrar_edicao(%L, 'curta') $f$, pg_temp.ed('f')), '23514', null,
  'FR-010: justificativa curta é recusada');
select ok((public.encerrar_edicao(pg_temp.ed('f'), 'Fim do ciclo de teste.') ->> 'encerradaEm') is not null,
  'FR-010: a edição F é encerrada com justificativa, mesmo com pendências');
select lives_ok(format($f$ select public.encerrar_edicao(%L, 'Fim do ciclo de teste.') $f$, pg_temp.ed('f')),
  'FR-013: encerrar de novo não falha');
reset role;
select is((select estado || '|' || justificativa_encerramento || '|' || (pendencias_no_encerramento ? 'turmasSemDefinitiva')::text
           from public.edicoes where id = pg_temp.ed('f')), 'encerrada|Fim do ciclo de teste.|true',
  'FR-011: estado, justificativa e pendências gravados');
set local role authenticated;
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.ativar_edicao(%L) $f$, pg_temp.ed('f')), '23514', null,
  'FR-012: edição encerrada não volta a ativa');
select throws_ok(format($f$ select public.alterar_edicao(%L, 'Outro nome', '2027-03-01', '2027-11-30') $f$, pg_temp.ed('f')), '23514', null,
  'FR-012: edição encerrada não muda de nome');
select pg_temp.como(pg_temp.u('c9'));
select ok((select count(*) from public.turmas t join public.cursos c on c.id = t.curso_id where c.edicao_id = pg_temp.ed('a')) > 0,
  'FR-012: a leitura da edição encerrada continua');
select throws_ok(format($f$ select public.salvar_comunicado(gen_random_uuid(), null, %L, 'Título', 'Texto.', 'todos', '{}') $f$, pg_temp.ed('a')),
  '23514', 'A edição está encerrada; os comunicados só podem ser lidos.', 'SC-005: comunicado em edição encerrada (mensagem da spec 009)');
reset role;

-- Bloqueio central de escrita (R8).
select throws_ok(format($f$ insert into public.cursos (edicao_id, nome, categoria) values (%L, 'Curso novo em G', 'Cat') $f$, pg_temp.ed('a')),
  '23514', 'A edição está encerrada; os dados só podem ser lidos.', 'SC-005: curso em edição encerrada');
select throws_ok(format($f$ update public.turmas set nome = 'KA alterada' where id = %L $f$, pg_temp.turma_na(pg_temp.ed('a'), 'KA')),
  '23514', 'A edição está encerrada; os dados só podem ser lidos.', 'SC-005: turma de edição encerrada');
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, %L, 'aluno', %L) $f$,
                        pg_temp.u('b2'), pg_temp.ed('a'), pg_temp.turma_na(pg_temp.ed('a'), 'KA')),
  '23514', 'A edição está encerrada; os dados só podem ser lidos.', 'SC-005: vínculo em edição encerrada');
select throws_ok(format($f$ insert into public.encontros (edicao_id, numero, titulo, data) values (%L, 9, 'Encontro novo', current_date) $f$, pg_temp.ed('a')),
  '23514', 'A edição está encerrada; os dados só podem ser lidos.', 'SC-005: encontro em edição encerrada');
select is((select count(distinct c.relname)::int from pg_trigger g join pg_class c on c.oid = g.tgrelid
           where g.tgname = 'bloquear_edicao_encerrada' and c.relnamespace = 'public'::regnamespace
             and c.relname = any (array['cursos', 'turmas', 'atribuicoes', 'ambientes', 'encontros', 'duplas',
               'dupla_integrantes', 'convites_equipe', 'convite_equipe_convidados', 'desafios', 'desafio_turmas',
               'entregas', 'prorrogacoes', 'presencas', 'participacoes', 'avaliacoes', 'listas_questoes',
               'lista_turmas', 'questoes', 'alternativas', 'submissoes_questoes', 'resultados_prova', 'ocorrencias',
               'manifestacoes', 'excecoes_prazo', 'publicacoes_ranking', 'publicacao_posicoes', 'pedidos_revisao',
               'comunicados', 'comunicado_turmas'])), 30,
  'R8: o bloqueio está em todas as 30 tabelas da edição');
select ok(not exists (select 1 from pg_trigger g join pg_class c on c.oid = g.tgrelid
                      where g.tgname = 'bloquear_edicao_encerrada'
                        and c.relname in ('avisos', 'exportacoes_relatorio', 'edicoes', 'auditoria')),
  'R8: avisos, exportações, edições e auditoria ficam fora do bloqueio');

-- ===========================================================================
-- US6 — coordenação da edição (T031, FR-013, FR-014)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.atribuir_coordenacao(%L, %L) $f$, pg_temp.ed('e'), pg_temp.u('b1')),
  'FR-014: c1 atribui b1 como coordenação de E');
reset role;
select pg_temp.guardar('n_coord', pg_temp.contar('atribuicoes')::text);
select pg_temp.guardar('aud_coord', pg_temp.contar('auditoria', $f$tabela = 'atribuicoes'$f$)::text);
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select lives_ok(format($f$ select public.atribuir_coordenacao(%L, %L) $f$, pg_temp.ed('e'), pg_temp.u('b1')),
  'FR-013: atribuir de novo conclui sem erro');
reset role;
select is(pg_temp.contar('atribuicoes')::text, pg_temp.lido('n_coord'), 'FR-013: atribuir de novo não cria linha');
select is(pg_temp.contar('auditoria', $f$tabela = 'atribuicoes'$f$)::text, pg_temp.lido('aud_coord'),
  'FR-013: atribuir de novo não gera auditoria');
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select ok(app.e_coordenacao(pg_temp.ed('e')), 'FR-014: b1 passa a gerir a edição E');
select throws_ok(format($f$ select public.atribuir_coordenacao(%L, %L) $f$, pg_temp.ed('e'), pg_temp.u('b1')),
  '42501', null, 'FR-014: ninguém altera a própria atribuição (atribuir)');
select throws_ok(format($f$ select public.desativar_coordenacao(%L, %L) $f$, pg_temp.ed('e'), pg_temp.u('b1')),
  '42501', null, 'FR-014: ninguém altera a própria atribuição (desativar)');
select lives_ok(format($f$ select public.desativar_coordenacao(%L, %L) $f$, pg_temp.ed('e'), pg_temp.u('c1')),
  'FR-014: b1 desativa c1 (b1 continua ativa)');
select lives_ok(format($f$ select public.desativar_coordenacao(%L, %L) $f$, pg_temp.ed('e'), pg_temp.u('c1')),
  'FR-013: desativar de novo não falha');
select pg_temp.como(pg_temp.u('c2'));
select throws_ok(format($f$ select public.atribuir_coordenacao(%L, %L) $f$, pg_temp.ed('e'), pg_temp.u('b2')),
  '42501', null, 'coordenação de outra edição não atribui');
reset role;
select throws_ok(format($f$ update public.atribuicoes set ativo = false where usuario_id = %L and edicao_id = %L and papel = 'coordenacao' $f$,
                        pg_temp.u('b1'), pg_temp.ed('e')),
  '23514', 'A edição precisa de pelo menos uma coordenação ativa.', 'FR-014: a última coordenação ativa não é desativada');
select throws_ok(format($f$ delete from public.atribuicoes where usuario_id = %L and edicao_id = %L and papel = 'coordenacao' $f$,
                        pg_temp.u('b1'), pg_temp.ed('e')),
  '23514', 'A edição precisa de pelo menos uma coordenação ativa.', 'FR-014: a última coordenação ativa não é apagada');

-- ===========================================================================
-- Revisão do PR #13 — vínculo de mentor coerente com a edição; remoção em cascata das derivadas
-- ===========================================================================
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0011-0000000000f2', 'ef2@exemplo.invalid', '{"nome": "Mentor f2"}', 'authenticated', 'authenticated');
insert into public.edicoes (id, nome, estado, regras, regras_versao) values
  ('10000000-0000-0000-0011-0000000000b0', 'Edição H', 'rascunho', '{"versao":"teste","quantidadeEncontros":4}', 'teste');
insert into public.atribuicoes (usuario_id, edicao_id, papel) values
  (pg_temp.u('c2'), pg_temp.ed('b'), 'coordenacao');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0011-0000000000b0', pg_temp.ed('b'), 'Curso L', 'Categoria L');

set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id) values (%L, %L, 'mentor', %L) $f$,
                        pg_temp.u('f2'), pg_temp.ed('e'), '20000000-0000-0000-0011-0000000000b0'),
  '23514', 'O curso informado não pertence à edição da atribuição.',
  'revisão: vínculo de mentor com curso de outra edição é recusado');
reset role;

-- Remover o vínculo ao curso apaga as derivadas em cascata (sem a proteção barrar).
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select lives_ok(format($f$ select public.vincular_mentor_ao_curso(%L, %L) $f$, pg_temp.curso_na(pg_temp.ed('e'), 'Curso K'), pg_temp.u('f2')),
  'mentor f2 vinculado ao curso K de E');
select lives_ok(format($f$ delete from public.atribuicoes where usuario_id = %L and curso_id is not null $f$, pg_temp.u('f2')),
  'revisão: a coordenação remove o vínculo ao curso');
reset role;
select is(pg_temp.contar('atribuicoes', format('usuario_id = %L', pg_temp.u('f2'))), 0,
  'revisão: as linhas derivadas saem junto com o vínculo ao curso');
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select ok(not (public.pessoas_para_vincular(pg_temp.ed('e'), 'Pessoa') @> jsonb_build_array(jsonb_build_object('usuarioId', pg_temp.u('b1')))),
  'revisão: a busca não oferece a própria pessoa');
reset role;

-- @@secoes

select * from finish();
rollback;
