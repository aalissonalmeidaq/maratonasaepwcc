-- Testes da spec 016 — unidades, usuário master e gestão da unidade.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ===========================================================================
-- Estrutura e migração (T003, FR-001, FR-008, FR-010, SC-003)
-- ===========================================================================
select has_table('public', t, 'tabela ' || t) from unnest(array['unidades', 'masters', 'funcoes_unidade']) t;
select ok((select relrowsecurity from pg_class where oid = ('public.' || t)::regclass), 'RLS em ' || t)
from unnest(array['unidades', 'masters', 'funcoes_unidade']) t;
select ok(not has_table_privilege(r, 'public.' || t, p), format('%s sem %s em %s', r, p, t))
from unnest(array['anon', 'authenticated']) r,
     unnest(array['unidades', 'masters', 'funcoes_unidade']) t,
     unnest(array['select', 'insert', 'update', 'delete']) p;
select enum_has_labels('public', 'funcao_unidade', array['gestao', 'coordenacao', 'docente', 'mentor', 'analista'],
  'funções da unidade');
select has_column('public', 'perfis', 'unidade_id', 'perfis.unidade_id');
select has_column('public', 'edicoes', 'unidade_id', 'edicoes.unidade_id');
select has_column('public', 'cadastro_cursos', 'unidade_id', 'cadastro_cursos.unidade_id');
select col_not_null('public', 'edicoes', 'unidade_id', 'edição sempre tem unidade');
select col_not_null('public', 'cadastro_cursos', 'unidade_id', 'curso do cadastro sempre tem unidade');

select is((select string_agg(nome || ':' || ativa, ',') from public.unidades), 'SENAI Juazeiro do Norte:true',
  'FR-010: só a unidade inicial, ativa');
select is((select count(*)::int from public.edicoes e join public.unidades u on u.id = e.unidade_id
           where u.nome <> 'SENAI Juazeiro do Norte'), 0, 'SC-003: edições do seed na unidade inicial');
select is((select count(*)::int from public.cadastro_cursos c join public.unidades u on u.id = c.unidade_id
           where u.nome <> 'SENAI Juazeiro do Norte'), 0, 'SC-003: cursos do cadastro na unidade inicial');
select is((select count(*)::int from public.perfis p left join public.masters m on m.usuario_id = p.id
           where p.unidade_id is null and m.usuario_id is null), 0,
  'SC-003: toda conta que não é master tem unidade');
select ok(exists (select 1 from public.funcoes_unidade f join public.atribuicoes a
                  on a.usuario_id = f.usuario_id and a.papel::text = f.funcao::text and a.ativo
                  where f.funcao = 'coordenacao'), 'funções criadas das atribuições (coordenação)');
select is((select count(*)::int from public.atribuicoes a where a.ativo and a.papel in ('coordenacao', 'docente', 'mentor')
           and not exists (select 1 from public.funcoes_unidade f where f.usuario_id = a.usuario_id
                           and f.funcao::text = a.papel::text and f.ativa)), 0,
  'toda atribuição de coordenação, docência ou mentoria tem a função na unidade');
select is((select count(*)::int from public.funcoes_unidade f
           join public.perfis p on p.id = f.usuario_id
           where f.funcao = 'gestao' and p.id not in (select id from auth.users where email = 'gestao@exemplo.invalid')), 0,
  'a migração não cria gestão (só o seed local cria a conta de gestão de teste)');

-- ===========================================================================
-- Integridade entre unidades (T005, FR-006b, FR-007, FR-008; salvaguardas S1 e S3)
-- Cenário: unidade inicial (I) e Unidade B. Contas de B nascem com unidade_id no meta.
-- ===========================================================================
create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0017-0000000000' || s)::uuid;
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
create function pg_temp.ui() returns uuid language sql stable security definer as $$
  select id from public.unidades where nome = 'SENAI Juazeiro do Norte';
$$;
create function pg_temp.ub() returns uuid language sql stable security definer as $$
  select id from public.unidades where nome = 'Unidade B';
$$;

-- Contas da unidade inicial (antes de existir a B: padrão da unidade inicial).
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select pg_temp.u(s), 'u' || s || '@exemplo.invalid', jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('a1'), ('a2'), ('a3'), ('a4')) v (s);
select is((select count(*)::int from public.perfis where id in (pg_temp.u('a1'), pg_temp.u('a2')) and unidade_id = pg_temp.ui()), 2,
  'conta sem unidade informada nasce na unidade inicial enquanto há uma só');

insert into public.unidades (id, nome) values ('10000000-0000-0000-0017-0000000000b0', 'Unidade B');

select throws_ok($$ insert into auth.users (id, email, raw_user_meta_data, aud, role)
  values ('00000000-0000-0000-0017-0000000000ff', 'semunidade@exemplo.invalid', '{"nome": "Sem unidade"}', 'authenticated', 'authenticated') $$,
  '23514', 'Informe a unidade.', 'S1: com duas unidades, conta sem unidade é recusada');
select throws_ok($$ insert into public.edicoes (nome, estado, regras, regras_versao) values ('Edição sem unidade', 'rascunho', app.regras_piloto(), 'x') $$,
  '23514', 'Informe a unidade.', 'S1: com duas unidades, edição sem unidade é recusada');
select throws_ok($$ insert into public.cadastro_cursos (nome, categoria) values ('Curso sem unidade', 'Cat') $$,
  '23514', 'Informe a unidade.', 'S1: com duas unidades, curso do cadastro sem unidade é recusado');

insert into auth.users (id, email, raw_user_meta_data, aud, role)
select pg_temp.u(s), 'u' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s, 'unidade_id', '10000000-0000-0000-0017-0000000000b0'), 'authenticated', 'authenticated'
from (values ('b1'), ('b2'), ('b3')) v (s);
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (pg_temp.u('f0'), 'mestre@exemplo.invalid', '{"nome": "Master Teste", "master": true}', 'authenticated', 'authenticated');
select is((select unidade_id from public.perfis where id = pg_temp.u('b1')), pg_temp.ub(), 'conta nasce na unidade informada');
select is((select unidade_id from public.perfis where id = pg_temp.u('f0')), null, 'conta master não tem unidade');
insert into public.masters (usuario_id) values (pg_temp.u('f0'));

insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao, unidade_id) values
  ('20000000-0000-0000-0017-0000000000a0', 'Edição I', 'ativa', '2026-03-01', '2026-12-01', app.regras_piloto(), 'x', pg_temp.ui()),
  ('20000000-0000-0000-0017-0000000000b0', 'Edição B', 'ativa', '2026-03-01', '2026-12-01', app.regras_piloto(), 'x', pg_temp.ub());

select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel) values (%L, %L, 'aluno') $f$,
  pg_temp.u('a3'), '20000000-0000-0000-0017-0000000000b0'), '23514', null,
  'FR-008: atribuição em edição de outra unidade é recusada');
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel) values (%L, %L, 'aluno') $f$,
  pg_temp.u('f0'), '20000000-0000-0000-0017-0000000000b0'), '23514', null, 'S3: master não recebe atribuição');

-- Administração do banco (sem pessoa autenticada): a atribuição de equipe concede a função junto.
insert into public.atribuicoes (usuario_id, edicao_id, papel) values (pg_temp.u('b1'), '20000000-0000-0000-0017-0000000000b0', 'coordenacao');
select ok(exists (select 1 from public.funcoes_unidade where usuario_id = pg_temp.u('b1') and funcao = 'coordenacao' and ativa),
  'administração do banco: atribuição de coordenação concede a função');

-- Pessoa autenticada: atribuição de equipe exige a função na unidade.
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select throws_ok(format($f$ select public.atribuir_coordenacao(%L, %L) $f$, '20000000-0000-0000-0017-0000000000b0', pg_temp.u('b2')),
  '23514', null, 'FR-006b: coordenação sem a função na unidade é recusada');
reset role;

insert into public.cadastro_cursos (id, nome, categoria, unidade_id)
values ('30000000-0000-0000-0017-0000000000b0', 'Curso da B', 'Cat B', pg_temp.ub());
select throws_ok($$ insert into public.cursos (edicao_id, nome, categoria, cadastro_curso_id)
  values ('20000000-0000-0000-0017-0000000000a0', 'Curso da B', 'Cat B', '30000000-0000-0000-0017-0000000000b0') $$,
  '23514', 'O curso do cadastro é de outra unidade.', 'FR-008: cadastro de outra unidade não entra na edição');

select throws_ok(format($f$ update public.perfis set unidade_id = %L where id = %L $f$, pg_temp.ui(), pg_temp.u('b2')),
  '23514', null, 'unidade da conta não muda');
select throws_ok(format($f$ update public.perfis set unidade_id = %L where id = %L $f$, pg_temp.ui(), pg_temp.u('f0')),
  '23514', null, 'master não ganha unidade');
select throws_ok(format($f$ insert into public.masters (usuario_id) values (%L) $f$, pg_temp.u('b3')),
  '23514', null, 'conta de unidade não vira master');

-- ===========================================================================
-- Auxiliares e sessão (T007, FR-006b, FR-009)
-- ===========================================================================
insert into public.funcoes_unidade (usuario_id, funcao) values (pg_temp.u('b2'), 'gestao'), (pg_temp.u('b2'), 'coordenacao');
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select ok(app.e_master(), 'e_master: master');
select is(app.unidade_do_usuario(), null, 'master sem unidade');
select pg_temp.guardar('conta_master', public.minha_conta()::text);
select pg_temp.como(pg_temp.u('b2'));
select ok(not app.e_master(), 'e_master: conta de unidade não');
select is(app.unidade_do_usuario(), pg_temp.ub(), 'unidade_do_usuario');
select ok(app.tem_funcao('gestao') and app.tem_funcao('coordenacao') and not app.tem_funcao('docente'), 'tem_funcao (acumuladas)');
select pg_temp.guardar('conta_b2', public.minha_conta()::text);
select pg_temp.como(pg_temp.u('b1'));
select ok(app.e_coordenacao('20000000-0000-0000-0017-0000000000b0'), 'coordenação da B com a unidade ativa');
select ok(app.participa_da_edicao('20000000-0000-0000-0017-0000000000b0'), 'participa com a unidade ativa');
reset role;

select is(pg_temp.lido('conta_master')::jsonb - 'nome', '{"master": true, "unidade": null, "funcoes": [], "papeis": []}'::jsonb,
  'minha_conta do master');
select is(pg_temp.lido('conta_b2')::jsonb -> 'unidade' ->> 'nome', 'Unidade B', 'minha_conta: unidade');
select is(pg_temp.lido('conta_b2')::jsonb -> 'funcoes', '["coordenacao", "gestao"]'::jsonb, 'minha_conta: funções ativas, em ordem');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys(pg_temp.lido('conta_b2')::jsonb) k),
  'funcoes,master,nome,papeis,unidade', 'minha_conta: chaves do contrato');

update public.unidades set ativa = false, desativada_em = now(), justificativa_desativacao = 'Teste.' where id = pg_temp.ub();
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select ok(not app.e_coordenacao('20000000-0000-0000-0017-0000000000b0'), 'FR-009: unidade desativada: sem coordenação');
select ok(not app.participa_da_edicao('20000000-0000-0000-0017-0000000000b0'), 'FR-009: sem participação');
select ok(not app.tem_papel('20000000-0000-0000-0017-0000000000b0', array['coordenacao']::public.papel[]), 'FR-009: sem papel');
select ok(not app.e_coordenacao_em_alguma() and not app.coordena_alguma_edicao(), 'FR-009: sem coordenação em alguma');
select pg_temp.como(pg_temp.u('b2'));
select ok(not app.tem_funcao('gestao'), 'FR-009: sem função com a unidade desativada');
select is((public.minha_conta() -> 'unidade' ->> 'ativa')::boolean, false, 'minha_conta mostra a unidade desativada');
reset role;
update public.unidades set ativa = true, desativada_em = null, justificativa_desativacao = null where id = pg_temp.ub();

-- ===========================================================================
-- US1 — master (T014, FR-001 a FR-004, FR-014, SC-004)
-- Estado: unidades I e B; f0 master; b2 gestão e coordenação da B; b1 coordenação da B.
-- ===========================================================================
create function pg_temp.un(n text) returns uuid language sql stable security definer as $$
  select id from public.unidades where nome = n;
$$;
create function pg_temp.rpc_recusada(p_usuario uuid, p_chamada text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute p_chamada;
    execute 'reset role';
    return 'aceita';
  exception when others then
    execute 'reset role';
    return sqlstate;
  end;
end;
$$;

-- Só o master: gestão, coordenação e estudante são recusados em todas as RPCs de rede.
select is(pg_temp.rpc_recusada(pg_temp.u(who), chamada), '42501', who || ': ' || split_part(chamada, '(', 1) || ' recusado')
from (values ('b2'), ('b1'), ('a1')) c (who),
     (values ('select public.unidades_da_rede()'),
             ('select public.cadastrar_unidade(gen_random_uuid(), ''Unidade X'')'),
             ('select public.renomear_unidade(pg_temp.ub(), ''Outro nome'')'),
             ('select public.definir_situacao_unidade(pg_temp.ub(), false, ''Justificativa longa.'')'),
             ('select public.definir_gestao(pg_temp.u(''b1''), true, ''Concessão de gestão.'')'),
             ('select public.masters_da_rede()'),
             ('select public.definir_master(pg_temp.u(''b1''), true, ''Convite de master.'')')) q (chamada);
select ok(not has_function_privilege('authenticated', 'app.promover_master(text)', 'execute'),
  'FR-002: app.promover_master não é executável por quem está autenticado');
select ok(not has_function_privilege('anon', 'app.promover_master(text)', 'execute'), 'FR-002: nem por anon');

-- Cadastro, nome único e idempotência.
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select pg_temp.guardar('uc1', public.cadastrar_unidade('10000000-0000-0000-0017-0000000000c1', 'Unidade C')::text);
select pg_temp.guardar('uc2', public.cadastrar_unidade('10000000-0000-0000-0017-0000000000c1', 'Unidade C')::text);
select throws_ok($$ select public.cadastrar_unidade(gen_random_uuid(), '  unidade c ') $$, '23514',
  'Já existe uma unidade com esse nome.', 'FR-003: nome repetido (sem diferenciar maiúsculas e espaços)');
select throws_ok($$ select public.cadastrar_unidade(gen_random_uuid(), 'X') $$, '23514', null, 'nome curto demais');
select pg_temp.guardar('rede', public.unidades_da_rede()::text);
select pg_temp.guardar('masters', public.masters_da_rede()::text);
reset role;

select is(pg_temp.lido('uc1'), pg_temp.lido('uc2'), 'cadastro com a mesma chave devolve a mesma unidade');
select is((select count(*)::int from public.unidades), 3, 'a unidade foi criada uma vez só');
select is((select string_agg(u ->> 'nome', ',' order by o) from jsonb_array_elements(pg_temp.lido('rede')::jsonb) with ordinality x (u, o)),
  'SENAI Juazeiro do Norte,Unidade B,Unidade C', 'unidades_da_rede: por nome');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys((pg_temp.lido('rede')::jsonb) -> 0) k),
  'ativa,desativadaEm,gestao,id,justificativaDesativacao,nome', 'contrato: chaves da unidade');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys(((pg_temp.lido('rede')::jsonb) -> 1 -> 'gestao') -> 0) k),
  'ativa,email,nome,situacaoAcesso,usuarioId', 'contrato: chaves da conta de gestão');
select is(((pg_temp.lido('rede')::jsonb) -> 1 -> 'gestao' -> 0 ->> 'nome'), 'Pessoa b2', 'gestão da Unidade B');
select is(jsonb_array_length((pg_temp.lido('rede')::jsonb) -> 2 -> 'gestao'), 0, 'Unidade C nasce sem gestão');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys((pg_temp.lido('masters')::jsonb) -> 0) k),
  'ativo,email,nome,situacaoAcesso,usuarioId', 'contrato: chaves do master');
select is((select count(*)::int from public.auditoria where tabela = 'unidades' and registro_id = pg_temp.lido('uc1')), 1,
  'FR-014: cadastro na auditoria');

-- Renomear e desativar/reativar.
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select lives_ok(format($f$ select public.renomear_unidade(%L, 'Unidade Cê') $f$, pg_temp.un('Unidade C')), 'renomear');
select throws_ok(format($f$ select public.renomear_unidade(%L, 'unidade b') $f$, pg_temp.un('Unidade Cê')), '23514',
  'Já existe uma unidade com esse nome.', 'renomear para nome existente');
select throws_ok(format($f$ select public.definir_situacao_unidade(%L, false, 'curta') $f$, pg_temp.un('Unidade Cê')), '23514', null,
  'FR-003: desativar exige justificativa');
select lives_ok(format($f$ select public.definir_situacao_unidade(%L, false, 'Encerramento do convênio.') $f$, pg_temp.un('Unidade Cê')),
  'desativar com justificativa');
reset role;
select is((select ativa from public.unidades where nome = 'Unidade Cê'), false, 'unidade desativada');
select ok((select desativada_em is not null and justificativa_desativacao = 'Encerramento do convênio.' from public.unidades where nome = 'Unidade Cê'),
  'data e justificativa da desativação gravadas');
select is((select justificativa from public.auditoria where tabela = 'unidades' and registro_id = pg_temp.lido('uc1')
           and acao = 'UPDATE' order by ocorrido_em desc, id desc limit 1), 'Encerramento do convênio.', 'FR-014: justificativa na auditoria');
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select lives_ok(format($f$ select public.definir_situacao_unidade(%L, true, null) $f$, pg_temp.un('Unidade Cê')), 'reativar');
reset role;
select ok((select ativa and desativada_em is null and justificativa_desativacao is null from public.unidades where nome = 'Unidade Cê'),
  'reativada: data e justificativa limpas');

-- Gestão: concede, mantém ao menos uma ativa.
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select pg_temp.u(s), 'u' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s, 'unidade_id', pg_temp.un('Unidade Cê')), 'authenticated', 'authenticated'
from (values ('c1'), ('c2')) v (s);
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select lives_ok(format($f$ select public.definir_gestao(%L, true, 'Cadastro da gestão.') $f$, pg_temp.u('c1')), 'concede a função de gestão');
select throws_ok(format($f$ select public.definir_gestao(%L, false, 'Troca de gestão.') $f$, pg_temp.u('c1')), '23514',
  'A unidade precisa manter ao menos uma conta de gestão ativa.', 'FR-003: a última gestão ativa não é desativada');
select lives_ok(format($f$ select public.definir_gestao(%L, true, 'Segunda gestão.') $f$, pg_temp.u('c2')), 'segunda gestão');
select lives_ok(format($f$ select public.definir_gestao(%L, false, 'Troca de gestão.') $f$, pg_temp.u('c1')), 'desativa uma das duas');
select throws_ok(format($f$ select public.definir_gestao(%L, true, 'Master não é de unidade.') $f$, pg_temp.u('f0')), '23514', null,
  'conta master não recebe função de unidade');
select throws_ok($$ select public.definir_gestao(gen_random_uuid(), true, 'Conta inexistente.') $$, '23514', null, 'conta inexistente');
select pg_temp.guardar('rede2', public.unidades_da_rede()::text);
reset role;
select is((select string_agg((g ->> 'nome') || ':' || (g ->> 'ativa'), ',' order by g ->> 'nome')
           from jsonb_array_elements((pg_temp.lido('rede2')::jsonb) -> 2 -> 'gestao') g), 'Pessoa c1:false,Pessoa c2:true',
  'gestão da Unidade Cê com a situação');
select is((select count(*)::int from public.funcoes_unidade where usuario_id = pg_temp.u('c1') and funcao = 'gestao' and not ativa), 1,
  'a função desativada fica registrada');

-- Masters: convidar, não desativar a si mesmo, promover pela administração.
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (pg_temp.u('f1'), 'mestre2@exemplo.invalid', '{"nome": "Master Dois", "master": true}', 'authenticated', 'authenticated'),
       (pg_temp.u('f2'), 'mestre3@exemplo.invalid', '{"nome": "Master Três", "master": true}', 'authenticated', 'authenticated');
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select lives_ok(format($f$ select public.definir_master(%L, true, 'Convite de master.') $f$, pg_temp.u('f1')), 'master convida outro master');
select throws_ok(format($f$ select public.definir_master(%L, false, 'Saída voluntária.') $f$, pg_temp.u('f0')), '23514',
  'Ninguém desativa o próprio acesso de master.', 'FR-002: não desativa a si mesmo');
select throws_ok(format($f$ select public.definir_master(%L, true, 'Conta de unidade.') $f$, pg_temp.u('b1')), '23514', null,
  'conta de unidade não vira master pela interface');
select lives_ok(format($f$ select public.definir_master(%L, false, 'Saída da rede.') $f$, pg_temp.u('f1')), 'desativa outro master');
reset role;
select is((select ativo from public.masters where usuario_id = pg_temp.u('f1')), false, 'master desativado');
select lives_ok($$ select app.promover_master('mestre3@exemplo.invalid') $$, 'FR-002: administração promove o primeiro master');
select is((select ativo from public.masters where usuario_id = pg_temp.u('f2')), true, 'promovido');
select throws_ok($$ select app.promover_master('ub1@exemplo.invalid') $$, '23514', null,
  'a administração também não promove conta de unidade');
select throws_ok($$ select app.promover_master('ninguem@exemplo.invalid') $$, '23514', null, 'e-mail inexistente');

-- O master não lê dados de edição (FR-004, SC-004).
select is(pg_temp.rpc_recusada(pg_temp.u('f0'), format('select public.painel_da_coordenacao(%L)', '20000000-0000-0000-0017-0000000000a0')),
  '42501', 'FR-004: master recusado no painel da coordenação');
select is(pg_temp.rpc_recusada(pg_temp.u('f0'), format('select public.relatorio(''pontos'', %L, null, null, null)', '20000000-0000-0000-0017-0000000000a0')),
  '42501', 'FR-004: master recusado nos relatórios');
select is(pg_temp.rpc_recusada(pg_temp.u('f0'), format('select public.pessoas_para_vincular(%L, ''a'')', '20000000-0000-0000-0017-0000000000a0')),
  '42501', 'FR-004: master recusado na busca de pessoas');
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select is((select count(*)::int from public.edicoes), 0, 'SC-004: master não lê edições');
select is((select count(*)::int from public.atribuicoes), 0, 'SC-004: master não lê atribuições');
select is((select count(*)::int from public.duplas), 0, 'SC-004: master não lê equipes');
reset role;

-- ===========================================================================
-- US2 — gestão da unidade e analista (T021, FR-005, FR-006, FR-006a, FR-006c, FR-007, SC-004)
-- Estado: unidade B com b2 (gestão e coordenação), b1 (coordenação da Edição B), unidade I com a1..a4.
-- Contas novas na B: d1 (candidata a coordenação), d2 (docente), d3 (analista), d4 (estudante).
-- ===========================================================================
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select pg_temp.u(s), 'u' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s, 'unidade_id', pg_temp.ub()), 'authenticated', 'authenticated'
from (values ('d1'), ('d2'), ('d3'), ('d4')) v (s);
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (pg_temp.u('a5'), 'ua5@exemplo.invalid', jsonb_build_object('nome', 'Pessoa a5', 'unidade_id', pg_temp.ui()), 'authenticated', 'authenticated');
insert into public.funcoes_unidade (usuario_id, funcao) values (pg_temp.u('a5'), 'gestao');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('40000000-0000-0000-0017-0000000000b0', '20000000-0000-0000-0017-0000000000b0', 'Curso da Edição B', 'Cat B');
insert into public.turmas (id, curso_id, nome) values
  ('50000000-0000-0000-0017-0000000000b0', '40000000-0000-0000-0017-0000000000b0', 'Turma B1');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
values (pg_temp.u('d4'), '20000000-0000-0000-0017-0000000000b0', 'aluno', '50000000-0000-0000-0017-0000000000b0');

-- Equipe: só a gestão da própria unidade; sem estudantes.
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select pg_temp.guardar('equipe', public.equipe_da_unidade()::text);
reset role;
select is((select string_agg(e ->> 'nome', ',' order by e ->> 'nome') from jsonb_array_elements(pg_temp.lido('equipe')::jsonb) e),
  'Pessoa b1,Pessoa b2', 'equipe_da_unidade: só quem tem função na unidade B (sem estudantes nem a unidade I)');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys((pg_temp.lido('equipe')::jsonb) -> 0) k),
  'ativo,email,funcoes,nome,situacaoAcesso,usuarioId', 'contrato: chaves da equipe');
select is(pg_temp.rpc_recusada(pg_temp.u('b1'), 'select public.equipe_da_unidade()'), '42501', 'coordenação não vê a equipe da unidade');
select is(pg_temp.rpc_recusada(pg_temp.u('a1'), 'select public.equipe_da_unidade()'), '42501', 'estudante recusado');
select is(pg_temp.rpc_recusada(pg_temp.u('f0'), 'select public.equipe_da_unidade()'), '42501', 'master recusado');

-- Funções: a gestão concede as da equipe (nunca a gestão), só na própria unidade.
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select lives_ok(format($f$ select public.definir_funcoes(%L, array['coordenacao']::public.funcao_unidade[], 'Cadastro da conta.') $f$, pg_temp.u('d1')),
  'FR-005: gestão concede a função de coordenação');
select lives_ok(format($f$ select public.definir_funcoes(%L, array['docente']::public.funcao_unidade[], 'Cadastro da conta.') $f$, pg_temp.u('d2')), 'docente');
select lives_ok(format($f$ select public.definir_funcoes(%L, array['analista']::public.funcao_unidade[], 'Cadastro da conta.') $f$, pg_temp.u('d3')), 'analista');
select throws_ok(format($f$ select public.definir_funcoes(%L, array['gestao']::public.funcao_unidade[], 'Tentativa de gestão.') $f$, pg_temp.u('d1')),
  '23514', 'A função de gestão só o master concede.', 'a gestão não concede gestão');
select throws_ok(format($f$ select public.definir_funcoes(%L, array['docente']::public.funcao_unidade[], 'Outra unidade.') $f$, pg_temp.u('a4')),
  '42501', null, 'FR-008: conta de outra unidade recusada');
select throws_ok(format($f$ select public.definir_funcoes(%L, array[]::public.funcao_unidade[], 'Sem nenhuma função.') $f$, pg_temp.u('d2')),
  '23514', null, 'ao menos uma função (para sair, desativar a conta)');
select pg_temp.guardar('equipe2', public.equipe_da_unidade()::text);
reset role;
select is((select e -> 'funcoes' from jsonb_array_elements(pg_temp.lido('equipe2')::jsonb) e where e ->> 'nome' = 'Pessoa d1'),
  '["coordenacao"]'::jsonb, 'função concedida aparece na equipe');
select is(pg_temp.rpc_recusada(pg_temp.u('b1'),
  format($f$ select public.definir_funcoes(%L, array['docente']::public.funcao_unidade[], 'Sem ser gestão.') $f$, pg_temp.u('d2'))), '42501',
  'FR-005: coordenação não concede funções');

-- Função não é acesso a dados: a gestão (com a função de coordenação, sem atribuição) não vê a edição.
select is(pg_temp.rpc_recusada(pg_temp.u('b2'), format('select public.painel_da_coordenacao(%L)', '20000000-0000-0000-0017-0000000000b0')), '42501',
  'SC-004: gestão não lê o painel de uma edição de que não participa');
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select is((select count(*)::int from public.duplas), 0, 'SC-004: gestão não lê equipes');
select is((select count(*)::int from public.edicoes), 0, 'gestão não lê a tabela de edições (usa a lista da unidade)');
reset role;

-- Criar edição: gestão indica a coordenação; coordenação cria a própria.
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select throws_ok($$ select public.criar_edicao('30000000-0000-0000-0017-0000000000e1', 'Edição da gestão', '2026-03-01', '2026-12-01', null) $$,
  '23514', 'Indique a coordenação da edição.', 'gestão sem coordenação indicada');
select throws_ok(format($f$ select public.criar_edicao('30000000-0000-0000-0017-0000000000e1', 'Edição da gestão', '2026-03-01', '2026-12-01', null, %L) $f$, pg_temp.u('d2')),
  '23514', 'A pessoa indicada não tem a função de coordenação na unidade.', 'indicada sem a função de coordenação');
select throws_ok(format($f$ select public.criar_edicao('30000000-0000-0000-0017-0000000000e1', 'Edição da gestão', '2026-03-01', '2026-12-01', null, %L) $f$, pg_temp.u('a4')),
  '23514', null, 'indicada de outra unidade');
select pg_temp.guardar('ed1', public.criar_edicao('30000000-0000-0000-0017-0000000000e1', 'Edição da gestão', '2026-03-01', '2026-12-01', null, pg_temp.u('d1'))::text);
select pg_temp.guardar('ed1b', public.criar_edicao('30000000-0000-0000-0017-0000000000e1', 'Edição da gestão', '2026-03-01', '2026-12-01', null, pg_temp.u('d1'))::text);
reset role;
select is(pg_temp.lido('ed1'), pg_temp.lido('ed1b'), 'reenvio com a mesma chave devolve a mesma edição');
select is((select unidade_id from public.edicoes where id = pg_temp.lido('ed1')::uuid), pg_temp.ub(), 'FR-006: a edição nasce na unidade de quem criou');
select is((select estado::text from public.edicoes where id = pg_temp.lido('ed1')::uuid), 'rascunho', 'nasce em preparação');
select is((select string_agg(usuario_id::text, ',') from public.atribuicoes where edicao_id = pg_temp.lido('ed1')::uuid and papel = 'coordenacao' and ativo),
  pg_temp.u('d1')::text, 'a coordenação é a indicada (não a gestão)');

set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select pg_temp.guardar('ed2', public.criar_edicao('30000000-0000-0000-0017-0000000000e2', 'Edição da coordenação', '2026-03-01', '2026-12-01', null)::text);
reset role;
select is((select string_agg(usuario_id::text, ',') from public.atribuicoes where edicao_id = pg_temp.lido('ed2')::uuid and papel = 'coordenacao' and ativo),
  pg_temp.u('b1')::text, '3a: quem coordena cria a edição e fica como coordenação');
select is(pg_temp.rpc_recusada(pg_temp.u('d2'), $q$ select public.criar_edicao('30000000-0000-0000-0017-0000000000e3', 'Edição do docente', '2026-03-01', '2026-12-01', null) $q$),
  '42501', 'docente não cria edição');
select is(pg_temp.rpc_recusada(pg_temp.u('a1'), $q$ select public.criar_edicao('30000000-0000-0000-0017-0000000000e3', 'Edição do aluno', '2026-03-01', '2026-12-01', null) $q$),
  '42501', 'estudante não cria edição');
select is(pg_temp.rpc_recusada(pg_temp.u('f0'), $q$ select public.criar_edicao('30000000-0000-0000-0017-0000000000e3', 'Edição do master', '2026-03-01', '2026-12-01', null) $q$),
  '42501', 'master não cria edição');

-- Coordenação da edição: a gestão acrescenta e retira; sempre sobra uma.
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select lives_ok(format($f$ select public.definir_coordenacao_da_edicao(%L, %L, true, null) $f$, pg_temp.lido('ed2'), pg_temp.u('d1')),
  'FR-006c: gestão acrescenta uma coordenação');
select lives_ok(format($f$ select public.definir_coordenacao_da_edicao(%L, %L, false, 'Troca da coordenação.') $f$, pg_temp.lido('ed2'), pg_temp.u('b1')),
  'gestão retira outra');
select throws_ok(format($f$ select public.definir_coordenacao_da_edicao(%L, %L, false, 'Troca da coordenação.') $f$, pg_temp.lido('ed2'), pg_temp.u('d1')),
  '23514', 'Indique outra coordenação antes.', 'FR-006c: a última coordenação ativa não é retirada');
select throws_ok(format($f$ select public.definir_coordenacao_da_edicao(%L, %L, true, null) $f$, pg_temp.lido('ed2'), pg_temp.u('d2')),
  '23514', null, 'só quem tem a função de coordenação');
select throws_ok(format($f$ select public.definir_coordenacao_da_edicao(%L, %L, false, 'curta') $f$, pg_temp.lido('ed2'), pg_temp.u('b1')),
  '23514', null, 'retirar exige justificativa');
reset role;
select is(pg_temp.rpc_recusada(pg_temp.u('d2'),
  format($f$ select public.definir_coordenacao_da_edicao(%L, %L, true, null) $f$, pg_temp.lido('ed2'), pg_temp.u('d1'))), '42501',
  'docente não indica coordenação');
select is(pg_temp.rpc_recusada(pg_temp.u('a5'),
  format($f$ select public.definir_coordenacao_da_edicao(%L, %L, true, null) $f$, pg_temp.lido('ed2'), pg_temp.u('d1'))), '42501',
  'FR-008: gestão de outra unidade recusada');
select is((select count(*)::int from public.atribuicoes where edicao_id = pg_temp.lido('ed2')::uuid and papel = 'coordenacao' and ativo), 1,
  'sobrou uma coordenação ativa na edição');

-- Edição encerrada não muda de coordenação.
insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao, unidade_id, encerrada_em, justificativa_encerramento)
values ('20000000-0000-0000-0017-0000000000b9', 'Edição B encerrada', 'encerrada', '2025-03-01', '2025-12-01', app.regras_piloto(), 'x', pg_temp.ub(), now(), 'Fim do ciclo.');
select isnt(pg_temp.rpc_recusada(pg_temp.u('b2'),
  format($f$ select public.definir_coordenacao_da_edicao(%L, %L, true, null) $f$, '20000000-0000-0000-0017-0000000000b9', pg_temp.u('d1'))), 'aceita',
  'edição encerrada não muda de coordenação');

-- Lista de edições da unidade (gestão e analista), sem dados de estudantes.
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select pg_temp.guardar('edicoes_b', public.edicoes_da_unidade()::text);
select pg_temp.como(pg_temp.u('a5'));
select pg_temp.guardar('edicoes_i', public.edicoes_da_unidade()::text);
reset role;
select is((select string_agg(e ->> 'nome', ',' order by e ->> 'nome') from jsonb_array_elements(pg_temp.lido('edicoes_b')::jsonb) e),
  'Edição B,Edição B encerrada,Edição da coordenação,Edição da gestão', 'edicoes_da_unidade: só as da unidade B');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.lido('edicoes_i')::jsonb) e where e ->> 'nome' = 'Edição I')
          and not exists (select 1 from jsonb_array_elements(pg_temp.lido('edicoes_i')::jsonb) e
                          where e ->> 'nome' in ('Edição B', 'Edição B encerrada', 'Edição da coordenação', 'Edição da gestão')),
  'a gestão da I vê a edição da I e nenhuma da B');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys((pg_temp.lido('edicoes_b')::jsonb) -> 0) k),
  'coordenacao,estado,fim,id,inicio,nome', 'contrato: chaves da edição');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys((pg_temp.lido('edicoes_b')::jsonb) -> 0 -> 'coordenacao' -> 0) k),
  'ativa,nome,usuarioId', 'contrato: chaves da coordenação da edição');
select is(pg_temp.rpc_recusada(pg_temp.u('b1'), 'select public.edicoes_da_unidade()'), '42501', 'coordenação usa a lista própria, não a da unidade');

-- Desativar e reativar contas da equipe.
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select throws_ok(format($f$ select public.desativar_membro(%L, 'curta') $f$, pg_temp.u('d3')), '23514', null, 'desativar exige justificativa');
select throws_ok(format($f$ select public.desativar_membro(%L, 'Saída da equipe da unidade.') $f$, pg_temp.u('b2')), '23514', null,
  'ninguém desativa a si mesmo');
select throws_ok(format($f$ select public.desativar_membro(%L, 'Conta de gestão não.') $f$, pg_temp.u('c1')), '42501', null,
  'conta de gestão: só o master');
select throws_ok(format($f$ select public.desativar_membro(%L, 'Última coordenação.') $f$, pg_temp.u('d1')), '23514',
  'Indique outra coordenação antes.', 'FR-006c: a última coordenação de uma edição não é desativada');
select lives_ok(format($f$ select public.desativar_membro(%L, 'Saída da equipe da unidade.') $f$, pg_temp.u('d3')), 'desativa a analista');
reset role;
select ok(not (select ativo from public.perfis where id = pg_temp.u('d3'))
          and not exists (select 1 from public.funcoes_unidade where usuario_id = pg_temp.u('d3') and ativa), 'conta e funções desativadas');
select is(pg_temp.rpc_recusada(pg_temp.u('d3'), format('select public.painel_da_coordenacao(%L)', '20000000-0000-0000-0017-0000000000b0')), '42501',
  'conta desativada perde o acesso de analista');
set local role authenticated;
select pg_temp.como(pg_temp.u('b2'));
select lives_ok(format($f$ select public.reativar_membro(%L) $f$, pg_temp.u('d3')), 'reativa');
reset role;
select ok((select ativo from public.perfis where id = pg_temp.u('d3'))
          and exists (select 1 from public.funcoes_unidade where usuario_id = pg_temp.u('d3') and funcao = 'analista' and ativa),
  'conta e função de volta');

-- Busca de pessoas para vincular: só da unidade, com função de equipe ativa.
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select pg_temp.guardar('busca', public.pessoas_para_vincular('20000000-0000-0000-0017-0000000000b0', '')::text);
reset role;
select is((select string_agg(p ->> 'nome', ',' order by p ->> 'nome') from jsonb_array_elements(pg_temp.lido('busca')::jsonb) p),
  'Pessoa b2,Pessoa d1,Pessoa d2,Pessoa d3,Pessoa d4', 'FR-007: equipe da unidade B com função e estudantes das edições que a pessoa coordena (nada da unidade I)');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys((pg_temp.lido('busca')::jsonb) -> 0) k), 'nome,usuarioId',
  'contrato inalterado da busca');

-- Analista: lê painel e relatórios da própria unidade; nada mais.
set local role authenticated;
select pg_temp.como(pg_temp.u('d3'));
select lives_ok(format($f$ select public.painel_da_coordenacao(%L) $f$, '20000000-0000-0000-0017-0000000000b0'), 'FR-006a: analista lê o painel');
select lives_ok(format($f$ select public.relatorio('pontos', %L, null, null, null) $f$, '20000000-0000-0000-0017-0000000000b0'), 'analista exporta relatório');
select pg_temp.guardar('edicoes_d3', public.edicoes_da_unidade()::text);
reset role;
select is((select count(*)::int from jsonb_array_elements(pg_temp.lido('edicoes_d3')::jsonb)), 4, 'analista vê a lista de edições da unidade');
select is(pg_temp.rpc_recusada(pg_temp.u('d3'), format($f$ select public.relatorio('revisoes', %L, null, null, null) $f$, '20000000-0000-0000-0017-0000000000b0')), '42501',
  'analista não exporta pedidos de revisão');
select is(pg_temp.rpc_recusada(pg_temp.u('d3'), format('select public.painel_da_coordenacao(%L)', '20000000-0000-0000-0017-0000000000a0')), '42501',
  'FR-008: analista da B não lê o painel da edição da unidade I');
select is(pg_temp.rpc_recusada(pg_temp.u('d3'), format($f$ select public.atribuir_coordenacao(%L, %L) $f$, '20000000-0000-0000-0017-0000000000b0', pg_temp.u('d1'))),
  '42501', 'analista não altera nada (coordenação)');
select is(pg_temp.rpc_recusada(pg_temp.u('d3'), format($f$ select public.definir_coordenacao_da_edicao(%L, %L, true, null) $f$, '20000000-0000-0000-0017-0000000000b0', pg_temp.u('d1'))),
  '42501', 'analista não altera nada (definir coordenação)');
set local role authenticated;
select pg_temp.como(pg_temp.u('d3'));
select is((select count(*)::int from public.duplas), 0, 'analista não lê equipes pelas tabelas');
select is((select count(*)::int from public.atribuicoes), 0, 'analista não lê atribuições');
reset role;


-- ===========================================================================
-- US3 — isolamento entre unidades e unidade/conta desativada (T027, FR-008, FR-009, SC-001)
-- Unidade I: a6 coordenação, a7 docente, a8 estudante, a9 analista (Edição I, Turma I1).
-- Unidade B: b1 coordenação, d2 docente, d3 analista, d4 estudante, b2 gestão (Edição B).
-- ===========================================================================
create function pg_temp.visto_como(p_usuario uuid, p_consulta text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute p_consulta into n;
  exception when others then
    execute 'reset role';
    return -1;
  end;
  execute 'reset role';
  return n;
end;
$$;
-- 'ok:N' (linhas afetadas) ou o código do erro.
create function pg_temp.tentar(p_usuario uuid, p_comando text) returns text language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute p_comando;
    get diagnostics n = row_count;
  exception when others then
    execute 'reset role';
    return sqlstate;
  end;
  execute 'reset role';
  return 'ok:' || n;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
select pg_temp.u(s), 'u' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s, 'unidade_id', pg_temp.ui()), 'authenticated', 'authenticated'
from (values ('a6'), ('a7'), ('a8'), ('a9')) v (s);
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('40000000-0000-0000-0017-0000000000a0', '20000000-0000-0000-0017-0000000000a0', 'Curso da Edição I', 'Cat I');
insert into public.turmas (id, curso_id, nome) values
  ('50000000-0000-0000-0017-0000000000a0', '40000000-0000-0000-0017-0000000000a0', 'Turma I1');
insert into public.funcoes_unidade (usuario_id, funcao) values (pg_temp.u('a9'), 'analista'), (pg_temp.u('a6'), 'coordenacao'), (pg_temp.u('a7'), 'docente');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  (pg_temp.u('a6'), '20000000-0000-0000-0017-0000000000a0', 'coordenacao', null),
  (pg_temp.u('a7'), '20000000-0000-0000-0017-0000000000a0', 'docente', '50000000-0000-0000-0017-0000000000a0'),
  (pg_temp.u('a8'), '20000000-0000-0000-0017-0000000000a0', 'aluno', '50000000-0000-0000-0017-0000000000a0');

insert into public.cadastro_cursos (id, nome, categoria, unidade_id) values
  ('30000000-0000-0000-0017-0000000000a0', 'Curso da I', 'Cat I', pg_temp.ui());

-- Varredura do catálogo: nada novo escapa das guardas (T028).
select is((select string_agg(c.relname, ',' order by c.relname) from pg_class c
           where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and c.relrowsecurity
             and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
                             and p.policyname = 'conta_ativa' and p.permissive = 'RESTRICTIVE')),
  null, 'FR-009: toda tabela com RLS tem a política restritiva conta_ativa');
select ok(exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                  and policyname = 'conta_ativa' and permissive = 'RESTRICTIVE'), 'FR-009: o armazenamento também');
select is((select string_agg(p.proname, ',' order by p.proname) from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' and p.prosecdef
             and has_function_privilege('authenticated', p.oid, 'execute')
             and p.proname not in ('minha_conta', 'regulamento_publico')
             and p.prosrc not like '%exigir_conta_ativa%'),
  null, 'FR-009: toda RPC pública (menos minha_conta e regulamento_publico) começa pela guarda de conta ativa');

-- Isolamento: cada perfil de uma unidade não enxerga nada da outra (leituras).
select is(pg_temp.visto_como(pg_temp.u(who), replace(consulta, '{OUTRA}',
            case when who in ('a6', 'a7', 'a8', 'a9', 'a5') then '10000000-0000-0000-0017-0000000000b0' else pg_temp.ui()::text end)),
          0::bigint, who || ': ' || rotulo || ' da outra unidade')
from (values ('a6'), ('a7'), ('a8'), ('a9'), ('a5'), ('b1'), ('b2'), ('d2'), ('d3'), ('d4')) u (who),
     (values ('edições', $q$ select count(*) from public.edicoes where unidade_id = '{OUTRA}' $q$),
             ('cursos', $q$ select count(*) from public.cursos c join public.edicoes e on e.id = c.edicao_id where e.unidade_id = '{OUTRA}' $q$),
             ('turmas', $q$ select count(*) from public.turmas t join public.cursos c on c.id = t.curso_id join public.edicoes e on e.id = c.edicao_id where e.unidade_id = '{OUTRA}' $q$),
             ('atribuições', $q$ select count(*) from public.atribuicoes a join public.edicoes e on e.id = a.edicao_id where e.unidade_id = '{OUTRA}' $q$),
             ('cadastro de cursos', $q$ select count(*) from public.cadastro_cursos where unidade_id = '{OUTRA}' $q$),
             ('cadastro de turmas', $q$ select count(*) from public.cadastro_turmas kt join public.cadastro_cursos k on k.id = kt.cadastro_curso_id where k.unidade_id = '{OUTRA}' $q$),
             ('perfis', $q$ select count(*) from public.perfis where unidade_id = '{OUTRA}' $q$)) q (rotulo, consulta);

-- Isolamento: escritas na outra unidade não passam.
select ok(pg_temp.tentar(pg_temp.u(who), replace(comando, '{OUTRA}',
            case when who in ('a6', 'a7', 'a8', 'a9', 'a5') then '10000000-0000-0000-0017-0000000000b0' else pg_temp.ui()::text end))
          in ('42501', 'ok:0'), who || ': escrita na outra unidade recusada (' || rotulo || ')')
from (values ('a6'), ('a7'), ('a8'), ('a9'), ('a5'), ('b1'), ('b2'), ('d2'), ('d3'), ('d4')) u (who),
     (values ('editar edição', $q$ update public.edicoes set nome = 'Invadida' where unidade_id = '{OUTRA}' $q$),
             ('apagar atribuição', $q$ delete from public.atribuicoes a using public.edicoes e where e.id = a.edicao_id and e.unidade_id = '{OUTRA}' $q$),
             ('editar cadastro', $q$ update public.cadastro_cursos set nome = 'Invadido' where unidade_id = '{OUTRA}' $q$),
             ('apagar cadastro', $q$ delete from public.cadastro_cursos where unidade_id = '{OUTRA}' $q$),
             ('editar perfil alheio', $q$ update public.perfis set nome = 'Invadido' where unidade_id = '{OUTRA}' $q$)) q (rotulo, comando);

-- Isolamento: as RPCs por edição recusam a edição de outra unidade.
select is(pg_temp.rpc_recusada(pg_temp.u(who), replace(replace(chamada, '{ED}',
            case when who in ('a6', 'a7', 'a8', 'a9', 'a5') then '20000000-0000-0000-0017-0000000000b0' else '20000000-0000-0000-0017-0000000000a0' end),
            '{EU}', pg_temp.u(who)::text)), '42501', who || ': ' || split_part(chamada, '(', 1) || ' na outra unidade')
from (values ('a6'), ('a7'), ('a8'), ('a9'), ('b1'), ('d2'), ('d3'), ('d4')) u (who),
     (values ($q$ select public.painel_da_coordenacao('{ED}') $q$),
             ($q$ select public.relatorio('pontos', '{ED}', null, null, null) $q$),
             ($q$ select public.pessoas_para_vincular('{ED}', '') $q$),
             ($q$ select public.atribuir_coordenacao('{ED}', '{EU}') $q$),
             ($q$ select public.definir_coordenacao_da_edicao('{ED}', '{EU}', true, null) $q$),
             ($q$ select public.painel_da_gestao('{ED}') $q$),
             ($q$ select public.painel_do_aluno('{ED}') $q$)) q (chamada);
select is(pg_temp.rpc_recusada(pg_temp.u(who), $q$ select public.definir_coordenacao_da_edicao('20000000-0000-0000-0017-0000000000b0', gen_random_uuid(), true, null) $q$),
  '42501', who || ': gestão da unidade I não indica coordenação na B')
from (values ('a5')) u (who);

-- Listas por pessoa só trazem a própria unidade.
set local role authenticated;
select pg_temp.como(pg_temp.u('a6'));
select pg_temp.guardar('coord_a6', public.edicoes_que_coordeno()::text);
select pg_temp.guardar('cad_a6', public.cadastro()::text);
reset role;
select is((select string_agg(e ->> 'nome', ',') from jsonb_array_elements(pg_temp.lido('coord_a6')::jsonb) e where e ->> 'nome' like 'Edição B%'
           or e ->> 'nome' like 'Edição da %'), null, 'edicoes_que_coordeno: nada da unidade B');
select is((select string_agg(k ->> 'nome', ',') from jsonb_array_elements(pg_temp.lido('cad_a6')::jsonb) k where k ->> 'nome' = 'Curso da B'),
  null, 'cadastro(): nada da unidade B');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.lido('cad_a6')::jsonb) k where k ->> 'nome' = 'Curso da I'),
  'cadastro(): o curso da própria unidade aparece');

-- O mesmo nome de curso no cadastro vale por unidade.
set local role authenticated;
select pg_temp.como(pg_temp.u('a6'));
select lives_ok($$ select public.salvar_curso_do_cadastro(null, 'Curso da B', 'Cat I') $$, 'a unidade I cadastra um curso com o nome que a B já tem');
reset role;
select is((select count(*)::int from public.cadastro_cursos where lower(nome) = 'curso da b'), 2, 'um curso por unidade, cada um com o seu');

-- Unidade desativada (FR-009): ninguém dela lê nem escreve; a conta ainda sabe que está desativada.
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select pg_temp.guardar('b1_antes_perfil', (select count(*) from public.perfis where id = pg_temp.u('b1'))::text);
select pg_temp.guardar('b1_antes_atrib', (select count(*) from public.atribuicoes)::text);
reset role;
select ok(pg_temp.lido('b1_antes_perfil')::int = 1 and pg_temp.lido('b1_antes_atrib')::int >= 1, 'antes: a coordenação da B enxerga o próprio perfil e as atribuições');

update public.unidades set ativa = false, desativada_em = now(), justificativa_desativacao = 'Teste da guarda.' where id = pg_temp.ub();

select is(pg_temp.visto_como(pg_temp.u('b1'), 'select count(*) from public.perfis where id = ''' || pg_temp.u('b1') || ''''), 0::bigint,
  'FR-009: unidade desativada: nem o próprio perfil é lido (política restritiva)');
select is(pg_temp.visto_como(pg_temp.u('b1'), 'select count(*) from public.atribuicoes'), 0::bigint, 'FR-009: nem as atribuições');
select is(pg_temp.visto_como(pg_temp.u('d4'), 'select count(*) from public.edicoes'), 0::bigint, 'FR-009: o estudante não lê edições');
select is(pg_temp.rpc_recusada(pg_temp.u(who), chamada), '42501', who || ': ' || split_part(chamada, '(', 1) || ' com a unidade desativada')
from (values ('b1', $q$ select public.painel_da_coordenacao('20000000-0000-0000-0017-0000000000b0') $q$),
             ('b1', $q$ select public.edicoes_que_coordeno() $q$),
             ('b1', $q$ select public.cadastro() $q$),
             ('b1', $q$ select public.pessoas_para_vincular('20000000-0000-0000-0017-0000000000b0', '') $q$),
             ('b1', $q$ select public.criar_edicao(gen_random_uuid(), 'Edição nova', null, null, null) $q$),
             ('d4', $q$ select public.painel_do_aluno('20000000-0000-0000-0017-0000000000b0') $q$),
             ('d4', $q$ select public.meus_avisos(10) $q$),
             ('d4', $q$ select public.pontos_da_minha_equipe('20000000-0000-0000-0017-0000000000b0') $q$),
             ('d4', $q$ select * from public.meus_convites_equipe('20000000-0000-0000-0017-0000000000b0') $q$),
             ('d4', $q$ select public.comunicados_para_mim('20000000-0000-0000-0017-0000000000b0') $q$),
             ('d4', $q$ select public.marcar_avisos_lidos(array[]::uuid[]) $q$),
             ('d2', $q$ select public.painel_da_gestao('20000000-0000-0000-0017-0000000000b0') $q$),
             ('d2', $q$ select public.ocorrencias_visiveis('20000000-0000-0000-0017-0000000000b0', null) $q$),
             ('d3', $q$ select public.painel_da_coordenacao('20000000-0000-0000-0017-0000000000b0') $q$),
             ('d3', $q$ select public.edicoes_da_unidade() $q$),
             ('b2', $q$ select public.equipe_da_unidade() $q$),
             ('b2', $q$ select public.edicoes_da_unidade() $q$),
             ('b2', $q$ select public.desativar_membro(gen_random_uuid(), 'Teste da guarda da unidade.') $q$)) v (who, chamada);
select is(pg_temp.rpc_recusada(pg_temp.u('b1'), 'select public.minha_conta()'), 'aceita', 'a conta de unidade desativada ainda lê a própria sessão');
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select pg_temp.guardar('conta_b1', public.minha_conta()::text);
reset role;
select is((pg_temp.lido('conta_b1')::jsonb -> 'unidade' ->> 'ativa')::boolean, false, 'minha_conta informa que a unidade está desativada');

-- Quem é de outra unidade e o master seguem trabalhando.
select is(pg_temp.rpc_recusada(pg_temp.u('a5'), 'select public.equipe_da_unidade()'), 'aceita', 'a gestão da unidade I segue funcionando');
select is(pg_temp.rpc_recusada(pg_temp.u('a6'), format('select public.painel_da_coordenacao(%L)', '20000000-0000-0000-0017-0000000000a0')), 'aceita',
  'a coordenação da unidade I segue funcionando');
select is(pg_temp.rpc_recusada(pg_temp.u('f0'), 'select public.unidades_da_rede()'), 'aceita', 'o master segue funcionando');

-- Reativada, tudo volta.
update public.unidades set ativa = true, desativada_em = null, justificativa_desativacao = null where id = pg_temp.ub();
select is(pg_temp.rpc_recusada(pg_temp.u('b1'), format('select public.painel_da_coordenacao(%L)', '20000000-0000-0000-0017-0000000000b0')), 'aceita',
  'reativada: a coordenação da B volta');
select is(pg_temp.visto_como(pg_temp.u('b1'), 'select count(*) from public.perfis where id = ''' || pg_temp.u('b1') || ''''), 1::bigint,
  'reativada: o perfil volta a ser lido');

-- Conta desativada (perfil inativo), mesmo com a unidade ativa.
update public.perfis set ativo = false where id = pg_temp.u('d2');
select is(pg_temp.rpc_recusada(pg_temp.u('d2'), format('select public.painel_da_gestao(%L)', '20000000-0000-0000-0017-0000000000b0')), '42501',
  'conta desativada: recusada em toda operação');
select is(pg_temp.visto_como(pg_temp.u('d2'), 'select count(*) from public.perfis'), 0::bigint, 'conta desativada: nada lido pelas tabelas');
update public.perfis set ativo = true where id = pg_temp.u('d2');


-- Revisão do PR: reativar devolve só o que a desativação desligou; conta desativada não recebe
-- funções; a coordenação que cria docente novo concede a função com a conta.
set local role authenticated;
select pg_temp.como(pg_temp.u('a5'));
select lives_ok(format($f$ select public.definir_funcoes(%L, array['analista','mentor']::public.funcao_unidade[], 'Mentoria temporária.') $f$, pg_temp.u('a9')), 'a gestão acrescenta mentor');
select lives_ok(format($f$ select public.definir_funcoes(%L, array['analista']::public.funcao_unidade[], 'Mentoria encerrada.') $f$, pg_temp.u('a9')), 'a gestão retira mentor');
select lives_ok(format($f$ select public.desativar_membro(%L, 'Saída temporária da pessoa.') $f$, pg_temp.u('a9')), 'desativa a conta');
select throws_ok(format($f$ select public.definir_funcoes(%L, array['analista','docente']::public.funcao_unidade[], 'Com a conta desativada.') $f$, pg_temp.u('a9')),
  '23514', 'A conta está desativada. Reative-a antes.', 'conta desativada não recebe funções');
select lives_ok(format($f$ select public.reativar_membro(%L) $f$, pg_temp.u('a9')), 'reativa a conta');
reset role;
select is((select string_agg(funcao::text || ':' || ativa, ',' order by funcao::text) from public.funcoes_unidade where usuario_id = pg_temp.u('a9')),
  'analista:true,mentor:false', 'reativação devolve só a função que a desativação desligou');

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (pg_temp.u('ad'), 'novo-docente@exemplo.invalid', jsonb_build_object('nome', 'Docente novo', 'unidade_id', pg_temp.ui()), 'authenticated', 'authenticated');
set local role authenticated;
select pg_temp.como(pg_temp.u('a6'));
select lives_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, '20000000-0000-0000-0017-0000000000a0', 'docente', '50000000-0000-0000-0017-0000000000a0') $f$, pg_temp.u('ad')),
  'a coordenação vincula o docente que acabou de criar (criar-conta)');
reset role;
select ok(exists (select 1 from public.funcoes_unidade where usuario_id = pg_temp.u('ad') and funcao = 'docente' and ativa), 'a função de docente nasceu com a conta');
set local role authenticated;
select pg_temp.como(pg_temp.u('a6'));
select throws_ok(format($f$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (%L, '20000000-0000-0000-0017-0000000000a0', 'coordenacao', null) $f$, pg_temp.u('ad')),
  '23514', null, 'a coordenação não concede coordenação por vínculo (só a gestão)');
reset role;

-- ===========================================================================
-- Spec 018 — premissas fora do site: nenhum objeto de premissas existe no banco.
-- ===========================================================================
select is(to_regclass('public.premissas'), null, 'spec 018: a tabela premissas não existe');
select is(to_regclass('public.respostas_premissas'), null, 'spec 018: a tabela respostas_premissas não existe');
select is(to_regtype('public.decisao_premissa'), null, 'spec 018: o tipo decisao_premissa não existe');
select is((select string_agg(n.nspname || '.' || p.proname, ',' order by p.proname) from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('public', 'app')
             and p.proname in ('premissas_em_validacao', 'responder_premissa', 'recusar_alteracao_de_resposta',
                               'resposta_json', 'atua_como_docente_em_alguma')),
  null, 'spec 018: nenhuma função de premissas existe');
set local role authenticated;
select pg_temp.como(pg_temp.u('f0'));
select throws_ok('select public.premissas_em_validacao()', '42883', null, 'spec 018: premissas_em_validacao não existe');
select throws_ok($$ select public.responder_premissa('P01', 'confirmada', 'Tentativa de resposta.', null) $$, '42883', null,
  'spec 018: responder_premissa não existe');
reset role;


select * from finish();
rollback;
