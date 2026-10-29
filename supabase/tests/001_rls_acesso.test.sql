-- Testes de autorização (RLS) da spec 001 — executar com `supabase test db`.
-- Usuários fictícios com perfis e vínculos distintos; tudo desfeito no rollback.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------------------------------------------------------------------------
-- Cenário fictício
--   Edição E1: curso C1 (turmas T1 e T2); coordenação K; docente D (T1);
--              aluno A1 (T1); aluno A2 (T2); apoio P (sem turma)
--   Edição E2: coordenação K2 (não participa de E1)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'k@exemplo.invalid',  '{"nome":"Coord Teste"}',   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'd@exemplo.invalid',  '{"nome":"Docente Teste"}', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'a1@exemplo.invalid', '{"nome":"Aluno Um"}',      'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 'a2@exemplo.invalid', '{"nome":"Aluno Dois"}',    'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000e', 'p@exemplo.invalid',  '{"nome":"Apoio Teste"}',   'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000f', 'k2@exemplo.invalid', '{"nome":"Coord Outra"}',   'authenticated', 'authenticated');

insert into public.edicoes (id, nome, regras, regras_versao) values
  ('10000000-0000-0000-0000-000000000001', 'Edição teste 1', '{}', 'teste'),
  ('10000000-0000-0000-0000-000000000002', 'Edição teste 2', '{}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Curso teste', 'Cat A');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'T1'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'T2');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  ('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'coordenacao', null),
  ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'docente', '30000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001', 'aluno', '30000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-00000000000d', '10000000-0000-0000-0000-000000000001', 'aluno', '30000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-00000000000e', '10000000-0000-0000-0000-000000000001', 'apoio', null),
  ('00000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-000000000002', 'coordenacao', null);

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

-- ---------------------------------------------------------------------------
-- Estrutura
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'todas as tabelas do schema public têm RLS habilitado');

select ok(
  (select count(*) from public.perfis where id::text like '00000000-0000-0000-0000-00000000000_') = 6,
  'perfis criados automaticamente a partir de auth.users');

select throws_ok(
  $$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
     ('00000000-0000-0000-0000-00000000000f', '10000000-0000-0000-0000-000000000002', 'docente',
      '30000000-0000-0000-0000-000000000001') $$,
  '23514', null, 'turma de outra edição é rejeitada na atribuição');

-- ---------------------------------------------------------------------------
-- Aluno A1
-- ---------------------------------------------------------------------------
set local role authenticated;
select pg_temp.como('00000000-0000-0000-0000-00000000000c');

select is((select count(*)::int from public.turmas), 1, 'aluno vê apenas a própria turma');
select is((select count(*)::int from public.perfis), 1, 'aluno vê apenas o próprio perfil');
select is((select count(*)::int from public.atribuicoes), 1, 'aluno vê apenas as próprias atribuições');
select is((select count(*)::int from public.auditoria), 0, 'aluno não lê a auditoria');
select is((select count(*)::int from public.edicoes), 1, 'aluno vê apenas a edição de que participa');

select throws_ok(
  $$ insert into public.atribuicoes (usuario_id, edicao_id, papel)
     values ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001', 'coordenacao') $$,
  '42501', null, 'aluno não consegue atribuir papel a si mesmo');

select is_empty(
  $$ update public.atribuicoes set papel = 'coordenacao'
     where usuario_id = '00000000-0000-0000-0000-00000000000c' returning id $$,
  'aluno não consegue alterar o próprio papel');

select is_empty(
  $$ update public.turmas set nome = 'invadida' returning id $$,
  'aluno não altera turmas');

select throws_ok(
  $$ delete from public.auditoria $$,
  '42501', null, 'auditoria não pode ser apagada pela API');

-- ---------------------------------------------------------------------------
-- Docente D (vinculada só à T1)
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-00000000000b');

select is((select count(*)::int from public.turmas), 1, 'docente vê apenas turmas vinculadas');
select ok(
  exists (select 1 from public.perfis where id = '00000000-0000-0000-0000-00000000000c'),
  'docente vê perfil de aluno da sua turma');
select ok(
  not exists (select 1 from public.perfis where id = '00000000-0000-0000-0000-00000000000d'),
  'docente não vê perfil de aluno de outra turma');

-- ---------------------------------------------------------------------------
-- Apoio P (sem permissões atribuídas além do vínculo à edição)
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-00000000000e');

select is((select count(*)::int from public.turmas), 0, 'apoio não recebe acesso amplo às turmas');
select is((select count(*)::int from public.perfis), 1, 'apoio não vê perfis de estudantes');

-- ---------------------------------------------------------------------------
-- Coordenação K (edição 1)
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-00000000000a');

select is((select count(*)::int from public.turmas), 2, 'coordenação vê todas as turmas da edição');

select lives_ok(
  $$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
     ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'docente',
      '30000000-0000-0000-0000-000000000002') $$,
  'coordenação atribui docente a outra turma');

select ok(
  exists (select 1 from public.auditoria
          where tabela = 'atribuicoes' and acao = 'INSERT'
            and autor_id = '00000000-0000-0000-0000-00000000000a'),
  'atribuição registrada na auditoria com a autoria');

select is_empty(
  $$ update public.atribuicoes set ativo = false
     where usuario_id = '00000000-0000-0000-0000-00000000000a' returning id $$,
  'coordenação não altera as próprias atribuições');

-- ---------------------------------------------------------------------------
-- Coordenação K2 (outra edição)
-- ---------------------------------------------------------------------------
select pg_temp.como('00000000-0000-0000-0000-00000000000f');

select is((select count(*)::int from public.turmas), 0, 'coordenação de outra edição não vê turmas da edição 1');

reset role;
select * from finish();
rollback;
