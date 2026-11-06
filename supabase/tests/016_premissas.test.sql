-- Testes da spec 015 — premissas em validação.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ===========================================================================
-- Estrutura e catálogo (T002, FR-001, FR-002)
-- ===========================================================================
select has_table('public', 'premissas', 'catálogo de premissas');
select has_table('public', 'respostas_premissas', 'respostas às premissas');
select ok((select relrowsecurity from pg_class where oid = 'public.premissas'::regclass), 'RLS em premissas');
select ok((select relrowsecurity from pg_class where oid = 'public.respostas_premissas'::regclass),
  'RLS em respostas_premissas');
select enum_has_labels('public', 'decisao_premissa', array['confirmada', 'precisa_mudar'], 'decisões possíveis');

select is((select string_agg(codigo, ',' order by codigo) from public.premissas),
  (select string_agg('P' || lpad(n::text, 2, '0'), ',' order by n) from generate_series(1, 32) n),
  'FR-002: catálogo com exatamente P01–P32');
select is((select string_agg(codigo, ',' order by codigo) from public.premissas where resolvida_por is null),
  'P01,P02,P06,P08,P13,P32', 'em aberto: identidade visual, premiação e e-mails (dependem da unidade)');
select is((select resolvida_por from public.premissas where codigo = 'P25'), 'spec 016', 'P25 resolvida pela spec 016 (multiunidade)');
select is((select count(*)::int from public.premissas where resolvida_por = 'decisão do projeto de 06/11/2026'), 25,
  'as demais foram decididas pelo projeto em 06/11/2026');
select is((select string_agg(codigo || ':' || tema, ',' order by codigo) from public.premissas
           where codigo in ('P01', 'P08', 'P09', 'P19', 'P20', 'P24', 'P25', 'P28', 'P29', 'P31', 'P32')),
  'P01:Identidade visual,P08:Identidade visual,P09:Pontuação,P19:Pontuação,P20:Equipes e atividades,'
  || 'P24:Equipes e atividades,P25:Acesso e edições,P28:Acesso e edições,P29:Comunicados e relatórios,'
  || 'P31:Comunicados e relatórios,P32:Operação',
  'temas conforme o Apêndice A');

select ok(not has_table_privilege(r, t, p), format('%s sem %s em %s', r, p, t))
from unnest(array['anon', 'authenticated']) r,
     unnest(array['public.premissas', 'public.respostas_premissas']) t,
     unnest(array['select', 'insert', 'update', 'delete']) p;

-- ===========================================================================
-- Cenário fictício: E encerrada (c1 só coordena E), F ativa (c2 coordena; d1 docente; b1 mentor;
-- a1 estudante). Atribuições inseridas sem gatilhos, como fixtures.
-- ===========================================================================
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0016-0000000000' || s)::uuid, 'p' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s) || case when s in ('f1', 'f2') then '{"master": true}'::jsonb else '{}'::jsonb end,
       'authenticated', 'authenticated'
from (values ('c1'), ('c2'), ('d1'), ('b1'), ('a1'), ('e1'), ('f1'), ('f2'), ('f3'), ('f4')) as v (s);
-- Spec 016: só o master (f1, f2) responde; gestão (f3) e analista (f4) são da unidade inicial.
insert into public.masters (usuario_id) values ('00000000-0000-0000-0016-0000000000f1'), ('00000000-0000-0000-0016-0000000000f2');
insert into public.funcoes_unidade (usuario_id, funcao) values
  ('00000000-0000-0000-0016-0000000000f3', 'gestao'), ('00000000-0000-0000-0016-0000000000f4', 'analista');

insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao)
select v.id::uuid, v.nome, v.estado::public.estado_edicao, '2026-03-01', '2026-12-01', app.regras_piloto(),
       app.regras_piloto() ->> 'versao'
from (values ('10000000-0000-0000-0016-0000000000e0', 'Edição E', 'ativa'),
             ('10000000-0000-0000-0016-0000000000f0', 'Edição F', 'ativa')) as v (id, nome, estado);
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0016-0000000000f1', '10000000-0000-0000-0016-0000000000f0', 'Curso P', 'Categoria P');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0016-0000000000f1', '20000000-0000-0000-0016-0000000000f1', 'PA');

set local session_replication_role = replica;
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select ('00000000-0000-0000-0016-0000000000' || u)::uuid, e::uuid, p::public.papel, t::uuid
from (values ('c1', '10000000-0000-0000-0016-0000000000e0', 'coordenacao', null),
             ('c2', '10000000-0000-0000-0016-0000000000f0', 'coordenacao', null),
             ('d1', '10000000-0000-0000-0016-0000000000f0', 'docente', '30000000-0000-0000-0016-0000000000f1'),
             ('a1', '10000000-0000-0000-0016-0000000000f0', 'aluno', '30000000-0000-0000-0016-0000000000f1'))
  as v (u, e, p, t);
insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id)
values (pg_catalog.uuid('00000000-0000-0000-0016-0000000000b1'), '10000000-0000-0000-0016-0000000000f0', 'mentor',
        '20000000-0000-0000-0016-0000000000f1');
set local session_replication_role = origin;
update public.edicoes set estado = 'encerrada', encerrada_em = now(), justificativa_encerramento = 'Fim do ciclo.'
where id = '10000000-0000-0000-0016-0000000000e0';

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0016-0000000000' || s)::uuid;
$$;
create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.guardar(chave text, valor text) returns text language sql as $$
  select set_config('teste.' || chave, valor, true);
$$;
create function pg_temp.lido(chave text) returns jsonb language sql as $$
  select current_setting('teste.' || chave)::jsonb;
$$;
create function pg_temp.premissa(lista jsonb, codigo text) returns jsonb language sql immutable as $$
  select p from jsonb_array_elements(lista -> 'premissas') p where p ->> 'codigo' = codigo;
$$;

-- ===========================================================================
-- US1 — leitura (T006, FR-003, FR-004, SC-004)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('c1', public.premissas_em_validacao()::text);
select pg_temp.como(pg_temp.u('d1'));
select pg_temp.guardar('d1', public.premissas_em_validacao()::text);
select pg_temp.como(pg_temp.u('b1'));
select pg_temp.guardar('b1', public.premissas_em_validacao()::text);
select pg_temp.como(pg_temp.u('f1'));
select pg_temp.guardar('f1', public.premissas_em_validacao()::text);
select pg_temp.como(pg_temp.u('f3'));
select pg_temp.guardar('f3', public.premissas_em_validacao()::text);
select pg_temp.como(pg_temp.u('f4'));
select throws_ok('select public.premissas_em_validacao()', '42501', null, 'spec 016: analista não lê as premissas');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok('select public.premissas_em_validacao()', '42501', null, 'SC-004: estudante não lê as premissas');
select pg_temp.como(pg_temp.u('e1'));
select throws_ok('select public.premissas_em_validacao()', '42501', null, 'SC-004: conta sem vínculo não lê');
reset role;
set local role anon;
select throws_ok('select public.premissas_em_validacao()', '42501', null, 'SC-004: visitante não lê');
reset role;

select ok(not (pg_temp.lido('c1') ->> 'podeResponder')::boolean,
  'spec 016: coordenação (só de edição encerrada) lê sem poder responder');
select ok((pg_temp.lido('f1') ->> 'podeResponder')::boolean, 'spec 016: o master lê e pode responder');
select ok(not (pg_temp.lido('f3') ->> 'podeResponder')::boolean, 'spec 016: a gestão lê sem poder responder');
select is(pg_temp.lido('f3') -> 'premissas', pg_temp.lido('c1') -> 'premissas', 'spec 016: gestão e master veem a mesma lista');
select is(jsonb_array_length(pg_temp.lido('c1') -> 'premissas'), 32, 'FR-003: as 32 premissas (inclusive resolvidas)');
select ok(not (pg_temp.lido('d1') ->> 'podeResponder')::boolean, 'FR-004: docente lê sem poder responder');
select ok(not (pg_temp.lido('b1') ->> 'podeResponder')::boolean, 'FR-004: mentor lê sem poder responder');
select is(pg_temp.lido('d1') -> 'premissas', pg_temp.lido('c1') -> 'premissas', 'docente vê a mesma lista');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys(pg_temp.premissa(pg_temp.lido('c1'), 'P01')) k),
  'atual,codigo,historico,ondeAfeta,opcoes,ordem,pergunta,premissaEmUso,referencia,resolvidaPor,situacao,tema',
  'contrato: chaves da premissa');
select is(pg_temp.premissa(pg_temp.lido('c1'), 'P01') ->> 'situacao', 'aguardando', 'sem resposta: aguardando');
select is(pg_temp.premissa(pg_temp.lido('c1'), 'P01') -> 'historico', '[]'::jsonb, 'sem histórico');
select is(pg_temp.premissa(pg_temp.lido('c1'), 'P01') -> 'opcoes',
  '["Usar os arquivos de docs/referencias/", "Usar os arquivos de VETORIZADAS CLAUDE/"]'::jsonb, 'opções do catálogo');
select is((select string_agg(p ->> 'codigo', ',' order by o) from jsonb_array_elements(pg_temp.lido('c1') -> 'premissas')
             with ordinality x (p, o) where o <= 3), 'P13,P01,P02', 'ordem: Pontuação primeiro, por ordem');
select is((select p ->> 'codigo' from jsonb_array_elements(pg_temp.lido('c1') -> 'premissas') with ordinality x (p, o)
             where p ->> 'resolvidaPor' is null order by o desc limit 1), 'P32', 'ordem: Operação por último entre as pendentes');

-- ===========================================================================
-- US2 — respostas (T021, FR-006 a FR-010, SC-002, SC-004)
-- ===========================================================================
select pg_temp.guardar('aud0', (select count(*) from public.auditoria where tabela = 'respostas_premissas')::text);
set local role authenticated;
select pg_temp.como(pg_temp.u('f1'));
select pg_temp.guardar('r1', public.responder_premissa('P01', 'confirmada', '  Conferido com o regulamento.  ', null)::text);
select throws_ok(
  format($f$ select public.responder_premissa('P01', 'precisa_mudar', 'Outra leitura do regulamento.', null) $f$),
  '40001', null, 'FR-008: resposta-base desatualizada (era aguardando) é recusada');
select pg_temp.como(pg_temp.u('f2'));
select pg_temp.guardar('r2', public.responder_premissa('P01', 'precisa_mudar', 'Usar uma casa decimal.',
  (pg_temp.lido('r1') ->> 'id')::uuid)::text);
select throws_ok(
  format($f$ select public.responder_premissa('P01', 'confirmada', 'Volta para duas casas.', %L) $f$, pg_temp.lido('r1') ->> 'id'),
  '40001', 'Esta premissa foi respondida por outra pessoa. Veja a resposta atual antes de registrar.',
  'FR-008: resposta-base antiga é recusada com a mensagem do contrato');
select throws_ok($$ select public.responder_premissa('P99', 'confirmada', 'Premissa que não existe.', null) $$,
  '23514', null, 'premissa inexistente');
select throws_ok($$ select public.responder_premissa('P02', null, 'Sem decisão informada.', null) $$,
  '23514', null, 'decisão obrigatória');
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', '   curta   ', null) $$,
  '23514', 'Justifique com 10 a 2.000 caracteres.', 'FR-006: justificativa curta (após tirar espaços)');
select throws_ok(format($f$ select public.responder_premissa('P02', 'confirmada', %L, null) $f$, repeat('a', 2001)),
  '23514', null, 'FR-006: justificativa longa');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', 'Docente tentando responder.', null) $$,
  '42501', 'Somente o master registra respostas às premissas.', 'SC-004: docente não responde');
select pg_temp.como(pg_temp.u('c1'));
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', 'Coordenação tentando responder.', null) $$,
  '42501', 'Somente o master registra respostas às premissas.', 'spec 016: coordenação não responde');
select pg_temp.como(pg_temp.u('f3'));
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', 'Gestão tentando responder.', null) $$,
  '42501', 'Somente o master registra respostas às premissas.', 'spec 016: gestão não responde');
select pg_temp.como(pg_temp.u('f4'));
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', 'Analista tentando responder.', null) $$,
  '42501', null, 'spec 016: analista não responde');
select pg_temp.como(pg_temp.u('b1'));
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', 'Mentor tentando responder.', null) $$,
  '42501', null, 'SC-004: mentor não responde');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', 'Estudante tentando responder.', null) $$,
  '42501', null, 'SC-004: estudante não responde');
select pg_temp.como(pg_temp.u('d1'));
select pg_temp.guardar('d1b', public.premissas_em_validacao()::text);
reset role;
set local role anon;
select throws_ok($$ select public.responder_premissa('P02', 'confirmada', 'Visitante tentando responder.', null) $$,
  '42501', null, 'SC-004: visitante não responde');
reset role;

select is((select string_agg(k, ',' order by k) from jsonb_object_keys(pg_temp.lido('r1')) k),
  'autorNome,decisao,id,justificativa,registradoEm', 'contrato: chaves da resposta');
select is(pg_temp.lido('r1') ->> 'justificativa', 'Conferido com o regulamento.', 'justificativa sem espaços nas pontas');
select is(pg_temp.lido('r1') ->> 'autorNome', 'Pessoa f1', 'FR-007: nome de quem registrou (o master)');
select is(pg_temp.premissa(pg_temp.lido('d1b'), 'P01') ->> 'situacao', 'precisa_mudar', 'FR-007: vale a resposta mais recente');
select is(pg_temp.premissa(pg_temp.lido('d1b'), 'P01') -> 'atual', pg_temp.lido('r2'), 'atual = última registrada');
select is((select string_agg(r ->> 'autorNome' || ':' || (r ->> 'decisao'), ',' order by o)
           from jsonb_array_elements(pg_temp.premissa(pg_temp.lido('d1b'), 'P01') -> 'historico') with ordinality x (r, o)),
  'Pessoa f1:confirmada,Pessoa f2:precisa_mudar', 'FR-007: histórico em ordem, docente também vê');
select is((select count(*)::int from public.respostas_premissas where premissa in ('P01', 'P02')), 2,
  'recusas não gravam nada');
select is((select count(*) from public.auditoria where tabela = 'respostas_premissas')::text,
  ((pg_temp.lido('aud0'))::int + 2)::text, 'FR-010: uma linha de auditoria por resposta');
select is((select justificativa from public.auditoria where tabela = 'respostas_premissas'
           and registro_id = pg_temp.lido('r2') ->> 'id'), 'Usar uma casa decimal.', 'FR-010: auditoria com a justificativa');

update public.perfis set nome = 'Pessoa f2 renomeada' where id = pg_temp.u('f2');
select is((select autor_nome from public.respostas_premissas where id = (pg_temp.lido('r2') ->> 'id')::uuid),
  'Pessoa f2', 'nome guardado no registro não muda com o perfil');
select throws_ok($$ update public.respostas_premissas set justificativa = 'Alterada depois.' $$,
  '42501', null, 'FR-007: resposta não é alterada');
select throws_ok($$ delete from public.respostas_premissas $$, '42501', null, 'FR-007: resposta não é apagada');

update public.premissas set resolvida_por = 'spec 099' where codigo = 'P32';
set local role authenticated;
select pg_temp.como(pg_temp.u('f2'));
select throws_ok($$ select public.responder_premissa('P32', 'confirmada', 'Premissa já resolvida.', null) $$,
  '23514', null, 'premissa resolvida não recebe resposta');
select pg_temp.guardar('c2b', public.premissas_em_validacao()::text);
reset role;
select is((select p ->> 'codigo' from jsonb_array_elements(pg_temp.lido('c2b') -> 'premissas') with ordinality x (p, o)
             order by o desc limit 1), 'P32', 'resolvida vem no fim da lista');

-- ===========================================================================
-- US3 — fuso de Juazeiro do Norte (T030, FR-013)
-- ===========================================================================
select is((select string_agg(n.nspname || '.' || p.proname, ', ' order by p.proname)
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('app', 'public') and p.prosrc like '%America/Sao_Paulo%'),
  null, 'FR-013: nenhuma função usa America/Sao_Paulo');
select ok((select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('app', 'public') and p.prosrc like '%America/Fortaleza%') >= 4,
  'FR-013: as funções de data usam America/Fortaleza');

select * from finish();
rollback;
