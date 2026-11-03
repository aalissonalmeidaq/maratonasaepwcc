-- Testes da spec 009 — comunicados e regulamento.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício. Edição E (ativa) com turmas TA e TB:
--   0a = coordenação; 0b = docente de TA (dA); 0c = mentor de TA (mA); 0d = docente de TB (dB);
--   0e = docente e mentor de TA (dm, duas atribuições); 09 = apoio de E;
--   a1 e a2 = alunos de TA; b1 = aluno de TB.
-- Edição G (encerrada) com coordenação 0f e turma TG.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0010-0000000000' || s)::uuid, 'q' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('0c'), ('0d'), ('0e'), ('0f'), ('09'),
             ('a1'), ('a2'), ('a3'), ('b1')) as v (s);

insert into public.edicoes (id, nome, estado, regras, regras_versao)
select id::uuid, nome, 'ativa', '{"versao":"teste","quantidadeEncontros":4}'::jsonb, 'teste'
from (values ('10000000-0000-0000-0010-000000000001', 'Edição comunicados'),
             ('10000000-0000-0000-0010-000000000003', 'Edição encerrada')) as v (id, nome);
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0010-000000000001', '10000000-0000-0000-0010-000000000001', 'Curso 1', 'Cat 1'),
  ('20000000-0000-0000-0010-000000000003', '10000000-0000-0000-0010-000000000003', 'Curso G', 'Cat G');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0010-0000000000a0', '20000000-0000-0000-0010-000000000001', 'TA'),
  ('30000000-0000-0000-0010-0000000000b0', '20000000-0000-0000-0010-000000000001', 'TB'),
  ('30000000-0000-0000-0010-0000000000e0', '20000000-0000-0000-0010-000000000003', 'TG');

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0010-0000000000' || s)::uuid;
$$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0010-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.e() returns uuid language sql immutable as $$
  select '10000000-0000-0000-0010-000000000001'::uuid;
$$;
create function pg_temp.g() returns uuid language sql immutable as $$
  select '10000000-0000-0000-0010-000000000003'::uuid;
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
-- Verdadeiro se o JSON contém, em qualquer nível, uma chave com o nome dado.
create function pg_temp.tem_chave(j jsonb, chave text) returns boolean language sql immutable as $$
  select j::text ~ ('"' || chave || '"\s*:');
$$;
-- Comunicado inserido como superusuário (para testar as funções de público na fundação).
create function pg_temp.comunicado(p_id text, p_publico text, p_estado text, p_turmas text[], p_autor text)
returns uuid language plpgsql security definer as $$
declare v uuid := ('c1000000-0000-0000-0010-0000000000' || p_id)::uuid;
begin
  insert into public.comunicados (id, edicao_id, autor_id, autor_papel, titulo, texto, publico, estado,
                                  chave_envio, publicado_em, retirado_em, justificativa_retirada)
  values (v, pg_temp.e(), pg_temp.u(p_autor), 'coordenacao', 'Comunicado ' || p_id, 'Texto fictício.',
          p_publico, p_estado, gen_random_uuid(),
          case when p_estado <> 'rascunho' then now() end,
          case when p_estado = 'retirado' then now() end,
          case when p_estado = 'retirado' then 'Retirado no teste.' end);
  insert into public.comunicado_turmas (comunicado_id, turma_id)
  select v, pg_temp.t(t) from unnest(coalesce(p_turmas, '{}')) t;
  return v;
end;
$$;
create function pg_temp.dest(p uuid) returns text[] language sql security definer as $$
  select coalesce(array_agg(right(d::text, 2) order by d), '{}') from unnest(app.destinatarios_do_comunicado(p)) d;
$$;

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select pg_temp.u(u), pg_temp.e(), p::public.papel,
       case when t is null then null else pg_temp.t(t) end
from (values ('0a', 'coordenacao', null), ('0b', 'docente', 'a'),
             ('0d', 'docente', 'b'), ('0e', 'docente', 'a'), ('09', 'apoio', null),
             ('a1', 'aluno', 'a'), ('a2', 'aluno', 'a'), ('b1', 'aluno', 'b')) as v (u, p, t);
-- Spec 010: mentor é vinculado ao curso. Para manter as asserções por turma desta spec, o
-- vínculo ao curso fica inativo e só a linha derivada da turma do mentor fica ativa (fixture).
select set_config('app.sincronizando_mentores', 'on', true);
insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id, ativo)
select pg_temp.u('0c'), pg_temp.e(), 'mentor', curso_id, false from public.turmas where id = pg_temp.t('a');
update public.atribuicoes set ativo = true
where usuario_id = pg_temp.u('0c') and papel = 'mentor' and turma_id = pg_temp.t('a');
insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id, ativo)
select pg_temp.u('0e'), pg_temp.e(), 'mentor', curso_id, false from public.turmas where id = pg_temp.t('a');
update public.atribuicoes set ativo = true
where usuario_id = pg_temp.u('0e') and papel = 'mentor' and turma_id = pg_temp.t('a');
select set_config('app.sincronizando_mentores', '', true);
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  (pg_temp.u('0f'), pg_temp.g(), 'coordenacao', null);
update public.edicoes set estado = 'encerrada' where id = pg_temp.g();

-- ===========================================================================
-- Fundação — tabelas, RLS, avisos e público (T003, FR-002, FR-005, FR-006)
-- ===========================================================================
select has_table('public', 'comunicados', 'Fundação: tabela comunicados existe');
select has_table('public', 'comunicado_turmas', 'Fundação: tabela comunicado_turmas existe');
select ok(coalesce((select bool_and(c.relrowsecurity) and count(*) = 2 from pg_class c
                    join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname in ('comunicados', 'comunicado_turmas')), false),
  'Fundação: RLS habilitada nas duas tabelas');
select ok(
  to_regclass('public.comunicados') is not null and to_regclass('public.comunicado_turmas') is not null
  and not has_table_privilege('authenticated', 'public.comunicados', 'insert')
  and not has_table_privilege('authenticated', 'public.comunicados', 'update')
  and not has_table_privilege('authenticated', 'public.comunicados', 'delete')
  and not has_table_privilege('authenticated', 'public.comunicado_turmas', 'insert')
  and not has_table_privilege('authenticated', 'public.comunicado_turmas', 'delete')
  and not has_table_privilege('anon', 'public.comunicados', 'select'),
  'Fundação: sem escrita direta para authenticated e sem acesso para anon');

create function pg_temp.inserir(p_titulo text, p_texto text, p_publico text, p_estado text,
                                p_papel text default 'coordenacao') returns void
language plpgsql security definer as $$
begin
  insert into public.comunicados (edicao_id, autor_id, autor_papel, titulo, texto, publico, estado,
                                  chave_envio, publicado_em)
  values (pg_temp.e(), pg_temp.u('0a'), p_papel, p_titulo, p_texto, p_publico, p_estado, gen_random_uuid(),
          case when p_estado <> 'rascunho' then now() end);
end;
$$;
select throws_ok($$ select pg_temp.inserir('   ', 'Texto', 'todos', 'rascunho') $$, '23514', null,
  'Fundação: título só com espaços é recusado');
select throws_ok($$ select pg_temp.inserir(repeat('x', 201), 'Texto', 'todos', 'rascunho') $$, '23514', null,
  'Fundação: título com 201 caracteres é recusado');
select lives_ok($$ select pg_temp.inserir(repeat('x', 200), repeat('y', 5000), 'todos', 'rascunho') $$,
  'Fundação: título com 200 e texto com 5.000 caracteres são aceitos');
select throws_ok($$ select pg_temp.inserir('Título', '', 'todos', 'rascunho') $$, '23514', null,
  'Fundação: texto vazio é recusado');
select throws_ok($$ select pg_temp.inserir('Título', repeat('y', 5001), 'todos', 'rascunho') $$, '23514', null,
  'Fundação: texto com 5.001 caracteres é recusado');
select throws_ok($$ select pg_temp.inserir('Título', 'Texto', 'pais', 'rascunho') $$, '23514', null,
  'Fundação: público fora de todos, estudantes e equipe docente é recusado');
select throws_ok($$ select pg_temp.inserir('Título', 'Texto', 'todos', 'arquivado') $$, '23514', null,
  'Fundação: estado fora de rascunho, publicado e retirado é recusado');
select throws_ok($$ select pg_temp.inserir('Título', 'Texto', 'todos', 'rascunho', 'apoio') $$, '23514', null,
  'Fundação: papel do autor fora de coordenação, docente e mentor é recusado');
select throws_ok(
  $$ insert into public.comunicados (edicao_id, autor_id, autor_papel, titulo, texto, publico, estado, chave_envio)
     values (pg_temp.e(), pg_temp.u('0a'), 'coordenacao', 'T', 'X', 'todos', 'publicado', gen_random_uuid()) $$,
  '23514', null, 'Fundação: publicado sem data de publicação é recusado');
select throws_ok(
  $$ insert into public.comunicados (edicao_id, autor_id, autor_papel, titulo, texto, publico, estado, chave_envio,
                                     publicado_em, retirado_em)
     values (pg_temp.e(), pg_temp.u('0a'), 'coordenacao', 'T', 'X', 'todos', 'retirado', gen_random_uuid(),
             now(), now()) $$,
  '23514', null, 'Fundação: retirado sem justificativa é recusado');
select ok((select estado = 'rascunho' and versao = 1 from public.comunicados limit 1),
  'Fundação: estado padrão rascunho e versão 1');
select throws_ok(
  $$ insert into public.comunicados (edicao_id, autor_id, autor_papel, titulo, texto, publico, chave_envio)
     select pg_temp.e(), pg_temp.u('0a'), 'coordenacao', 'T', 'X', 'todos', chave_envio
     from public.comunicados limit 1 $$,
  '23505', null, 'Fundação: chave de envio única');
select ok((select count(*) > 0 from public.auditoria where tabela = 'comunicados' and acao = 'INSERT'),
  'Fundação: a inserção é auditada');
delete from public.comunicados;

select lives_ok(
  $$ insert into public.avisos (destinatario_id, tipo, titulo)
     values (pg_temp.u('a1'), 'comunicado_publicado', 'A'), (pg_temp.u('a1'), 'comunicado_atualizado', 'B') $$,
  'Fundação: avisos aceitam os tipos de comunicado');
select throws_ok(
  $$ insert into public.avisos (destinatario_id, tipo, titulo) values (pg_temp.u('a1'), 'comunicado_lido', 'C') $$,
  '23514', null, 'Fundação: avisos continuam recusando tipo desconhecido');
delete from public.avisos;

-- Público: destinatários e leitura (R3, R4). Autor 0a (coordenação).
select pg_temp.guardar('est_ta', pg_temp.comunicado('01', 'estudantes', 'publicado', array['a'], '0a')::text);
select pg_temp.guardar('doc_ta', pg_temp.comunicado('02', 'equipe_docente', 'publicado', array['a'], '0a')::text);
select pg_temp.guardar('todos', pg_temp.comunicado('03', 'todos', 'publicado', null, '0a')::text);
select pg_temp.guardar('rasc', pg_temp.comunicado('04', 'todos', 'rascunho', null, '0a')::text);
select pg_temp.guardar('ret', pg_temp.comunicado('05', 'todos', 'retirado', null, '0a')::text);
select pg_temp.guardar('todos_b', pg_temp.comunicado('06', 'todos', 'publicado', null, '0b')::text);

select is(pg_temp.dest(pg_temp.lido('est_ta')::uuid), array['a1', 'a2'],
  'R4: estudantes de TA alcança só a1 e a2');
select is(pg_temp.dest(pg_temp.lido('doc_ta')::uuid), array['0b', '0c', '0e'],
  'R4: equipe docente de TA alcança dA, mA e dm (uma vez)');
select is(pg_temp.dest(pg_temp.lido('todos')::uuid), array['0b', '0c', '0d', '0e', 'a1', 'a2', 'b1'],
  'R4: todos sem turma alcança estudantes, docentes e mentores; não a coordenação nem o apoio');
select is(pg_temp.dest(pg_temp.lido('todos_b')::uuid), array['0c', '0d', '0e', 'a1', 'a2', 'b1'],
  'R4: o autor não recebe aviso do próprio comunicado');
select is(pg_temp.dest(pg_temp.lido('rasc')::uuid), '{}'::text[], 'R4: rascunho não tem destinatários');

create function pg_temp.le(p uuid, quem text) returns boolean language plpgsql security definer as $$
begin
  perform pg_temp.como(pg_temp.u(quem));
  return app.pode_ler_comunicado(p);
end;
$$;
select ok(pg_temp.le(pg_temp.lido('est_ta')::uuid, 'a1'), 'R3: aluno de TA lê o comunicado para estudantes de TA');
select ok(not pg_temp.le(pg_temp.lido('est_ta')::uuid, 'b1'), 'R3: aluno de TB não lê');
select ok(not pg_temp.le(pg_temp.lido('est_ta')::uuid, '0b'), 'R3: docente de TA não lê comunicado para estudantes');
select ok(pg_temp.le(pg_temp.lido('doc_ta')::uuid, '0c'), 'R3: mentor de TA lê o da equipe docente de TA');
select ok(not pg_temp.le(pg_temp.lido('doc_ta')::uuid, '0d'), 'R3: docente de TB não lê o da equipe docente de TA');
select ok(not pg_temp.le(pg_temp.lido('todos')::uuid, '09'), 'R3: apoio não lê (fora deste incremento)');
select ok(not pg_temp.le(pg_temp.lido('rasc')::uuid, 'a1'), 'FR-006: rascunho não é legível pelo público');
select ok(not pg_temp.le(pg_temp.lido('ret')::uuid, 'a1'), 'FR-006: retirado não é legível pelo público');
update public.atribuicoes set ativo = false where usuario_id = pg_temp.u('a2');
select ok(not pg_temp.le(pg_temp.lido('est_ta')::uuid, 'a2'), 'R3: atribuição inativa não lê');
update public.atribuicoes set ativo = true where usuario_id = pg_temp.u('a2');

-- RLS da tabela.
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select is((select count(*)::int from public.comunicados), 3, 'RLS: aluno de TA vê só os do seu público (TA e os dois para todos)');
select is((select count(*)::int from public.comunicado_turmas), 1, 'RLS: aluno vê só as turmas dos comunicados legíveis');
select pg_temp.como(pg_temp.u('0a'));
select is((select count(*)::int from public.comunicados), 6, 'RLS: coordenação vê todos, inclusive rascunho e retirado');
reset role;
delete from public.comunicados;

-- ===========================================================================
-- US1 — publicação (T008, FR-001 a FR-004, FR-010 a FR-012, esclarecimentos 1 e 2)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select pg_temp.guardar('c_geral', public.salvar_comunicado(
  'a0000000-0000-0000-0010-000000000001', null, pg_temp.e(), 'Aviso geral', 'Texto geral.', 'todos', '{}')::text);
select is(public.salvar_comunicado('a0000000-0000-0000-0010-000000000001', null, pg_temp.e(),
          'Aviso geral', 'Texto geral.', 'todos', '{}')::text, pg_temp.lido('c_geral'),
  'R5: a mesma chave devolve o mesmo rascunho');
select is(pg_temp.contar('comunicados'), 1, 'R5: o reenvio não cria outro rascunho');
select is((select autor_papel || '/' || estado from public.comunicados where id = pg_temp.lido('c_geral')::uuid),
  'coordenacao/rascunho', 'FR-001: coordenação cria rascunho sem turma, como coordenação');
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), '', 'Texto.', 'todos', '{}') $$,
  '23514', null, 'FR-001: título vazio é recusado');
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), 'T', 'Texto.', 'todos',
                                                    array[pg_temp.t('e')]) $$,
  '42501', null, 'FR-002: turma de outra edição é recusada também para a coordenação');

select pg_temp.como(pg_temp.u('0b'));
select pg_temp.guardar('c_doc', public.salvar_comunicado(
  gen_random_uuid(), null, pg_temp.e(), 'Mudança de sala', 'Laboratório 2.', 'estudantes', array[pg_temp.t('a')])::text);
select is((select autor_papel from public.comunicados where id = pg_temp.lido('c_doc')::uuid), 'docente',
  'Esclarecimento 1: docente publica para a própria turma');
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), 'T', 'X.', 'estudantes',
                                                    array[pg_temp.t('b')]) $$,
  '42501', null, 'FR-002: docente não publica para turma em que não atua');
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), 'T', 'X.', 'todos', '{}') $$,
  '42501', null, 'FR-002: docente não publica para a edição inteira (sem turma)');
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), 'T', 'X.', 'estudantes',
                                                    array[pg_temp.t('e')]) $$,
  '42501', null, 'FR-002: docente não usa turma de outra edição');

select pg_temp.como(pg_temp.u('0c'));
select pg_temp.guardar('c_mentor', public.salvar_comunicado(
  gen_random_uuid(), null, pg_temp.e(), 'Reunião da equipe docente', 'Sala dos professores.', 'equipe_docente',
  array[pg_temp.t('a')])::text);
select is((select autor_papel from public.comunicados where id = pg_temp.lido('c_mentor')::uuid), 'mentor',
  'Esclarecimento 1: mentor publica para a própria turma');
select pg_temp.como(pg_temp.u('0e'));
select pg_temp.guardar('c_dm', public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), 'T', 'X.',
                                                        'estudantes', array[pg_temp.t('a')])::text);
select is((select autor_papel from public.comunicados where id = pg_temp.lido('c_dm')::uuid), 'docente',
  'R2: docente e mentor ao mesmo tempo aparece como docente');

select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), 'T', 'X.', 'estudantes',
                                                    array[pg_temp.t('a')]) $$,
  '42501', null, 'US1: estudante não cria comunicado');
select pg_temp.como(pg_temp.u('09'));
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.e(), 'T', 'X.', 'todos', '{}') $$,
  '42501', null, 'US1: papel de apoio não cria comunicado');

-- Edição do rascunho: autor e coordenação; outro docente não.
select pg_temp.como(pg_temp.u('0b'));
select lives_ok($$ select public.salvar_comunicado(gen_random_uuid(), pg_temp.lido('c_doc')::uuid, pg_temp.e(),
                     'Mudança de sala', 'Laboratório 2, bloco B.', 'estudantes', array[pg_temp.t('a')]) $$,
  'US1: o autor edita o próprio rascunho');
select pg_temp.como(pg_temp.u('0d'));
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), pg_temp.lido('c_doc')::uuid, pg_temp.e(),
                     'Outro', 'Outro.', 'estudantes', array[pg_temp.t('a')]) $$,
  '42501', null, 'US1: outro docente não edita o rascunho');
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.salvar_comunicado(gen_random_uuid(), pg_temp.lido('c_doc')::uuid, pg_temp.e(),
                     'Mudança de sala', 'Laboratório 2, bloco B.', 'estudantes', array[pg_temp.t('a')]) $$,
  'US1: a coordenação edita o rascunho de um docente');
select is((select autor_id from public.comunicados where id = pg_temp.lido('c_doc')::uuid), pg_temp.u('0b'),
  'US1: a edição pela coordenação mantém o autor');

-- Apagar rascunho.
select pg_temp.guardar('c_apagar', public.salvar_comunicado(
  gen_random_uuid(), null, pg_temp.e(), 'Para apagar', 'Rascunho.', 'todos', '{}')::text);
select lives_ok($$ select public.apagar_rascunho(pg_temp.lido('c_apagar')::uuid) $$, 'FR-010: rascunho pode ser apagado');
select is(pg_temp.contar('comunicados', format('id = %L', pg_temp.lido('c_apagar'))), 0, 'FR-010: o rascunho some');

-- Publicação: avisos únicos, sem aviso para o autor, idempotente.
select pg_temp.como(pg_temp.u('0b'));
select pg_temp.guardar('pub1', public.publicar_comunicado(pg_temp.lido('c_doc')::uuid)::text);
select is((pg_temp.lido('pub1')::jsonb ->> 'avisos')::int, 2, 'FR-004: um aviso para cada estudante de TA');
select ok(pg_temp.lido('pub1')::jsonb ->> 'publicadoEm' is not null, 'FR-003: a publicação devolve a data do servidor');
select is(pg_temp.contar('avisos', format($f$tipo = 'comunicado_publicado' and referencia ->> 'comunicadoId' = %L$f$,
                                          pg_temp.lido('c_doc'))), 2, 'FR-004: avisos com a referência do comunicado');
select is(pg_temp.contar('avisos', format('destinatario_id = %L', pg_temp.u('0b'))), 0,
  'FR-004: o autor não recebe aviso');
select pg_temp.guardar('pub2', public.publicar_comunicado(pg_temp.lido('c_doc')::uuid)::text);
select is((pg_temp.lido('pub2')::jsonb ->> 'avisos')::int, 0, 'FR-011: publicar de novo não gera avisos');
select is(pg_temp.lido('pub2')::jsonb ->> 'publicadoEm', pg_temp.lido('pub1')::jsonb ->> 'publicadoEm',
  'FR-011: publicar de novo devolve a mesma data');
select is(pg_temp.contar('avisos', format($f$referencia ->> 'comunicadoId' = %L$f$, pg_temp.lido('c_doc'))), 2,
  'SC-003: os avisos não duplicam');
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), pg_temp.lido('c_doc')::uuid, pg_temp.e(),
                     'T', 'X.', 'todos', array[pg_temp.t('a')]) $$,
  '23514', null, 'US3: publicado não pode ser editado (público fixo)');
select throws_ok($$ select public.apagar_rascunho(pg_temp.lido('c_doc')::uuid) $$, '23514', null,
  'FR-010: publicado não pode ser apagado');

-- Quem publica: outro docente não; coordenação sim. dm recebe um só aviso.
select pg_temp.como(pg_temp.u('0d'));
select throws_ok($$ select public.publicar_comunicado(pg_temp.lido('c_mentor')::uuid) $$, '42501', null,
  'US1: outro docente não publica o rascunho alheio');
select pg_temp.como(pg_temp.u('0a'));
select is((public.publicar_comunicado(pg_temp.lido('c_mentor')::uuid) ->> 'avisos')::int, 2,
  'R4: equipe docente de TA avisa dA e dm (o autor mA não)');
select is(pg_temp.contar('avisos', format($f$destinatario_id = %L and referencia ->> 'comunicadoId' = %L$f$,
                                          pg_temp.u('0e'), pg_temp.lido('c_mentor'))), 1,
  'R4: quem é docente e mentor recebe um só aviso');

-- Gestão: coordenação vê todos; docente só os próprios; estudante não.
select pg_temp.guardar('ger_c', public.comunicados_que_gerencio(pg_temp.e())::text);
select is(jsonb_array_length(pg_temp.lido('ger_c')::jsonb), pg_temp.contar('comunicados', format('edicao_id = %L', pg_temp.e())),
  'FR-003: a coordenação vê todos os comunicados da edição');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.lido('ger_c')::jsonb) x
                  where x ->> 'id' = pg_temp.lido('c_geral') and x ->> 'estado' = 'rascunho'),
  'FR-006: a coordenação vê rascunhos');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.lido('ger_c')::jsonb) x
                  where x ->> 'id' = pg_temp.lido('c_doc') and x -> 'autor' ->> 'nome' = 'Pessoa 0b'
                    and x -> 'autor' ->> 'papel' = 'docente' and (x ->> 'podeEditar')::boolean),
  'FR-003: com o autor e o papel');
select ok(not pg_temp.tem_chave(pg_temp.lido('ger_c')::jsonb, 'email')
          and not pg_temp.tem_chave(pg_temp.lido('ger_c')::jsonb, 'autorId'),
  'FR-017: sem e-mail nem id do autor');
select pg_temp.como(pg_temp.u('0b'));
select ok((select bool_and(x ->> 'id' = pg_temp.lido('c_doc')) from jsonb_array_elements(public.comunicados_que_gerencio(pg_temp.e())) x),
  'FR-013: docente vê só os próprios comunicados');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.comunicados_que_gerencio(pg_temp.e()) $$, '42501', null,
  'US1: estudante não gerencia comunicados');
reset role;

-- Edição encerrada (FR-012).
-- Spec 010: a edição encerrada recusa escrita; a fixture reabre só durante a gravação.
update public.edicoes set estado = 'ativa' where id = pg_temp.g();
insert into public.comunicados (id, edicao_id, autor_id, autor_papel, titulo, texto, publico, chave_envio)
values ('c1000000-0000-0000-0010-0000000000f1', pg_temp.g(), pg_temp.u('0f'), 'coordenacao', 'Da G', 'Texto.',
        'todos', gen_random_uuid());
update public.edicoes set estado = 'encerrada' where id = pg_temp.g();
set local role authenticated;
select pg_temp.como(pg_temp.u('0f'));
select throws_ok($$ select public.salvar_comunicado(gen_random_uuid(), null, pg_temp.g(), 'T', 'X.', 'todos', '{}') $$,
  '23514', 'A edição está encerrada; os comunicados só podem ser lidos.', 'FR-012: edição encerrada recusa criar');
select throws_ok($$ select public.publicar_comunicado('c1000000-0000-0000-0010-0000000000f1') $$,
  '23514', 'A edição está encerrada; os comunicados só podem ser lidos.', 'FR-012: edição encerrada recusa publicar');
reset role;

-- ===========================================================================
-- US2 — leitura (T013, FR-005, FR-007, FR-008, FR-017; caso de borda de mais de um papel)
-- Publicados até aqui: c_doc (estudantes de TA, por dA) e c_mentor (equipe docente de TA).
-- ===========================================================================
update public.comunicados set publicado_em = now() - interval '1 hour' where id = pg_temp.lido('c_doc')::uuid;
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select pg_temp.guardar('c_tb', public.salvar_comunicado(
  gen_random_uuid(), null, pg_temp.e(), 'Equipe docente de TB', 'Reunião.', 'equipe_docente', array[pg_temp.t('b')])::text);
select pg_temp.guardar('c_todos', public.salvar_comunicado(
  gen_random_uuid(), null, pg_temp.e(), 'Para todos', 'Recado geral.', 'todos', '{}')::text);
select public.publicar_comunicado(pg_temp.lido('c_tb')::uuid);
select public.publicar_comunicado(pg_temp.lido('c_todos')::uuid);

select pg_temp.como(pg_temp.u('a1'));
select pg_temp.guardar('m_a1', public.comunicados_para_mim(pg_temp.e())::text);
select is((select array_agg(x ->> 'titulo' order by o) from jsonb_array_elements(pg_temp.lido('m_a1')::jsonb) with ordinality t (x, o)),
  array['Para todos', 'Mudança de sala'], 'FR-005/FR-007: só os do público, do mais recente ao mais antigo');
select ok((select bool_and((x ->> 'novo')::boolean) from jsonb_array_elements(pg_temp.lido('m_a1')::jsonb) x),
  'FR-008: comunicados com aviso não lido vêm como novos');
select is((select x -> 'autor' from jsonb_array_elements(pg_temp.lido('m_a1')::jsonb) x where x ->> 'id' = pg_temp.lido('c_doc')),
  '{"nome": "Pessoa 0b", "papel": "docente"}'::jsonb, 'US2: autor só com nome e papel');
select is((select x -> 'turmas' -> 0 ->> 'nome' from jsonb_array_elements(pg_temp.lido('m_a1')::jsonb) x
           where x ->> 'id' = pg_temp.lido('c_doc')), 'TA', 'US2: com as turmas do público');
select ok(not pg_temp.tem_chave(pg_temp.lido('m_a1')::jsonb, 'email')
          and not pg_temp.tem_chave(pg_temp.lido('m_a1')::jsonb, 'autorId')
          and not pg_temp.tem_chave(pg_temp.lido('m_a1')::jsonb, 'estado'),
  'FR-017: sem e-mail, id do autor nem dados de gestão');
select ok(not (pg_temp.lido('m_a1')::jsonb @> jsonb_build_array(jsonb_build_object('id', pg_temp.lido('c_geral')))),
  'FR-006: rascunho não aparece para o público');

select pg_temp.como(pg_temp.u('b1'));
select ok(not (public.comunicados_para_mim(pg_temp.e()) @> jsonb_build_array(jsonb_build_object('id', pg_temp.lido('c_doc')))),
  'SC-001: estudante de TB não vê o comunicado de TA');
select pg_temp.como(pg_temp.u('0d'));
select ok(public.comunicados_para_mim(pg_temp.e()) @> jsonb_build_array(jsonb_build_object('id', pg_temp.lido('c_tb'))),
  'US2: docente de TB vê o da equipe docente de TB');
select pg_temp.como(pg_temp.u('0b'));
select ok(not (public.comunicados_para_mim(pg_temp.e()) @> jsonb_build_array(jsonb_build_object('id', pg_temp.lido('c_tb')))),
  'US2: docente de TA não vê o da equipe docente de TB');
select pg_temp.como(pg_temp.u('0e'));
select is((select count(*)::int from jsonb_array_elements(public.comunicados_para_mim(pg_temp.e())) x
           where x ->> 'id' = pg_temp.lido('c_mentor')), 1,
  'Caso de borda: quem é docente e mentor vê o comunicado uma só vez');
reset role;

-- Entrou depois da publicação: vê, sem "Novo" nem aviso retroativo. Desativado: não vê mais.
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values (pg_temp.u('a3'), pg_temp.e(), 'aluno', pg_temp.t('a'));
update public.atribuicoes set ativo = false where usuario_id = pg_temp.u('a2');
set local role authenticated;
select pg_temp.como(pg_temp.u('a3'));
select is((select (x ->> 'novo')::boolean from jsonb_array_elements(public.comunicados_para_mim(pg_temp.e())) x
           where x ->> 'id' = pg_temp.lido('c_doc')), false,
  'Caso de borda: quem entra depois vê o comunicado sem o selo "Novo"');
select pg_temp.como(pg_temp.u('a2'));
select is(jsonb_array_length(public.comunicados_para_mim(pg_temp.e())), 0, 'US2: estudante desativado não vê mais');

-- Marcar como lido (FR-008).
select pg_temp.como(pg_temp.u('a1'));
select pg_temp.guardar('nl_antes', (public.meus_avisos() ->> 'naoLidos'));
select is(public.marcar_comunicado_lido(pg_temp.lido('c_doc')::uuid), 1, 'FR-008: marca o aviso do comunicado como lido');
select is((select (x ->> 'novo')::boolean from jsonb_array_elements(public.comunicados_para_mim(pg_temp.e())) x
           where x ->> 'id' = pg_temp.lido('c_doc')), false, 'FR-008: o selo "Novo" some');
select is((public.meus_avisos() ->> 'naoLidos')::int, pg_temp.lido('nl_antes')::int - 1,
  'FR-008: o contador de avisos diminui');
select pg_temp.como(pg_temp.u('b1'));
select is(public.marcar_comunicado_lido(pg_temp.lido('c_doc')::uuid), 0, 'US2: quem está fora do público não marca nada');

-- Edição encerrada: a leitura continua.
select pg_temp.como(pg_temp.u('0f'));
select lives_ok($$ select public.comunicados_para_mim(pg_temp.g()) $$, 'FR-012: leitura funciona na edição encerrada');
select lives_ok($$ select public.comunicados_que_gerencio(pg_temp.g()) $$, 'FR-012: gestão lê na edição encerrada');
reset role;
update public.atribuicoes set ativo = true where usuario_id = pg_temp.u('a2');

-- ===========================================================================
-- US3 — correção e retirada (T017, FR-004, FR-009, FR-011, FR-012, SC-004; esclarecimento 3)
-- c_doc: estudantes de TA, por dA; público atual a1, a2 e a3 (a1 já leu).
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select pg_temp.guardar('cor1', public.corrigir_comunicado(pg_temp.lido('c_doc')::uuid, 'Mudança de sala',
  'Laboratório 3.', 'Sala trocada pela manutenção.')::text);
select is((pg_temp.lido('cor1')::jsonb ->> 'versao')::int, 2, 'FR-009: a correção gera a versão 2');
select ok(pg_temp.lido('cor1')::jsonb ->> 'corrigidoEm' is not null, 'FR-009: com a data da correção');
select is((pg_temp.lido('cor1')::jsonb ->> 'avisos')::int, 3, 'Esclarecimento 3: o público é avisado de novo');
select is(pg_temp.contar('avisos', format($f$tipo = 'comunicado_atualizado' and referencia ->> 'comunicadoId' = %L$f$,
                                          pg_temp.lido('c_doc'))), 3, 'SC-003: um aviso "atualizado" por pessoa');
select pg_temp.como(pg_temp.u('a1'));
select is((select (x ->> 'novo')::boolean from jsonb_array_elements(public.comunicados_para_mim(pg_temp.e())) x
           where x ->> 'id' = pg_temp.lido('c_doc')), true, 'Esclarecimento 3: o selo "Novo" volta para quem já leu');
reset role;
select ok(exists (select 1 from public.auditoria
                  where tabela = 'comunicados' and acao = 'UPDATE' and registro_id = pg_temp.lido('c_doc')
                    and antes ->> 'texto' = 'Laboratório 2, bloco B.' and depois ->> 'texto' = 'Laboratório 3.'
                    and justificativa = 'Sala trocada pela manutenção.'),
  'SC-004: a auditoria guarda a versão anterior e a justificativa');

set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select is((public.corrigir_comunicado(pg_temp.lido('c_doc')::uuid, 'Mudança de sala', 'Laboratório 3.',
           'Reenvio da mesma correção.') ->> 'avisos')::int, 0, 'FR-011: a mesma correção não avisa de novo');
select is((select versao from public.comunicados where id = pg_temp.lido('c_doc')::uuid), 2,
  'FR-011: a mesma correção não muda a versão');
select throws_ok($$ select public.corrigir_comunicado(pg_temp.lido('c_doc')::uuid, 'T', 'Outro.', 'curta') $$,
  '23514', null, 'FR-009: justificativa curta é recusada');
select throws_ok($$ select public.corrigir_comunicado(pg_temp.lido('c_geral')::uuid, 'T', 'Outro.', 'Justificativa válida.') $$,
  '42501', null, 'FR-009: docente não corrige comunicado da coordenação');
select pg_temp.como(pg_temp.u('0d'));
select throws_ok($$ select public.corrigir_comunicado(pg_temp.lido('c_doc')::uuid, 'T', 'Outro.', 'Justificativa válida.') $$,
  '42501', null, 'FR-009: outro docente não corrige');
select pg_temp.como(pg_temp.u('0c'));
select throws_ok($$ select public.retirar_comunicado(pg_temp.lido('c_doc')::uuid, 'Justificativa válida.') $$,
  '42501', null, 'FR-009: mentor da turma que não é o autor não retira');
select pg_temp.como(pg_temp.u('0a'));
select is((public.corrigir_comunicado(pg_temp.lido('c_doc')::uuid, 'Mudança de sala', 'Laboratório 4.',
           'Correção feita pela coordenação.') ->> 'versao')::int, 3, 'FR-009: a coordenação corrige o comunicado do docente');
select throws_ok($$ select public.corrigir_comunicado(pg_temp.lido('c_geral')::uuid, 'T', 'Outro.', 'Justificativa válida.') $$,
  '23514', null, 'FR-009: rascunho não é corrigido (edita-se)');
select is((select publico from public.comunicados where id = pg_temp.lido('c_doc')::uuid), 'estudantes',
  'US3: o público não muda com a correção');
reset role;

update public.atribuicoes set ativo = false where usuario_id = pg_temp.u('0b');
set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.corrigir_comunicado(pg_temp.lido('c_doc')::uuid, 'T', 'Outro.', 'Justificativa válida.') $$,
  '42501', null, 'Premissa: quem deixou de atuar na turma não corrige mais');
reset role;
update public.atribuicoes set ativo = true where usuario_id = pg_temp.u('0b');

-- Retirada.
select pg_temp.guardar('av_antes', pg_temp.contar('avisos')::text);
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.retirar_comunicado(pg_temp.lido('c_doc')::uuid, 'Publicado por engano.') $$,
  'FR-009: a coordenação retira com justificativa');
select lives_ok($$ select public.retirar_comunicado(pg_temp.lido('c_doc')::uuid, 'Publicado por engano.') $$,
  'FR-011: retirar de novo não muda nada');
select throws_ok($$ select public.corrigir_comunicado(pg_temp.lido('c_doc')::uuid, 'T', 'Outro.', 'Justificativa válida.') $$,
  '23514', null, 'US3: retirado não é corrigido');
select throws_ok($$ select public.publicar_comunicado(pg_temp.lido('c_doc')::uuid) $$,
  '23514', null, 'US3: retirado não volta a ser publicado');
select throws_ok($$ select public.retirar_comunicado(pg_temp.lido('c_geral')::uuid, 'Justificativa válida.') $$,
  '23514', null, 'US3: rascunho não é retirado (apaga-se)');
select ok((select x ->> 'estado' = 'retirado' and x ->> 'justificativaRetirada' = 'Publicado por engano.'
                  and x ->> 'retiradoEm' is not null and not (x ->> 'podeEditar')::boolean
           from jsonb_array_elements(public.comunicados_que_gerencio(pg_temp.e())) x
           where x ->> 'id' = pg_temp.lido('c_doc')),
  'US3: a coordenação vê "Retirado" com a justificativa');
select pg_temp.como(pg_temp.u('a1'));
select ok(not (public.comunicados_para_mim(pg_temp.e()) @> jsonb_build_array(jsonb_build_object('id', pg_temp.lido('c_doc')))),
  'US3: o público não vê mais o comunicado retirado');
reset role;
select is(pg_temp.contar('avisos'), pg_temp.lido('av_antes')::int, 'FR-004: a retirada não gera aviso');
select is(pg_temp.contar('avisos', format($f$lido_em is null and referencia ->> 'comunicadoId' = %L$f$,
                                          pg_temp.lido('c_doc'))), 0,
  'FR-005: a retirada encerra os avisos pendentes do comunicado (o contador não aponta para o que sumiu)');

-- Edição encerrada (FR-012).
-- Spec 010: a edição encerrada recusa escrita; a fixture reabre só durante a gravação.
update public.edicoes set estado = 'ativa' where id = pg_temp.g();
update public.comunicados set estado = 'publicado', publicado_em = now()
where id = 'c1000000-0000-0000-0010-0000000000f1';
update public.edicoes set estado = 'encerrada' where id = pg_temp.g();
set local role authenticated;
select pg_temp.como(pg_temp.u('0f'));
select throws_ok($$ select public.corrigir_comunicado('c1000000-0000-0000-0010-0000000000f1', 'T', 'Outro.', 'Justificativa válida.') $$,
  '23514', 'A edição está encerrada; os comunicados só podem ser lidos.', 'FR-012: edição encerrada recusa corrigir');
select throws_ok($$ select public.retirar_comunicado('c1000000-0000-0000-0010-0000000000f1', 'Justificativa válida.') $$,
  '23514', 'A edição está encerrada; os comunicados só podem ser lidos.', 'FR-012: edição encerrada recusa retirar');
reset role;

-- @@secoes

select * from finish();
rollback;
