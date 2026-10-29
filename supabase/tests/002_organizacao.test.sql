-- Testes da spec 002 — organização: cursos, turmas, vínculos, duplas e encontros.
begin;
create extension if not exists pgtap with schema extensions;

select plan(34);

-- ---------------------------------------------------------------------------
-- Cenário fictício: edição E1 (4 encontros), curso C1, turmas T1 e T2.
-- K = coordenação; D = docente T1; A1, A2, A3, A5 = alunos T1; A4 = aluno T2.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0002-0000000000' || s)::uuid, 'u' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('a1'), ('a2'), ('a3'), ('a4'), ('a5')) as v (s);

insert into public.edicoes (id, nome, regras, regras_versao) values
  ('10000000-0000-0000-0002-000000000001', 'Edição org', '{"quantidadeEncontros": 4}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0002-000000000001', '10000000-0000-0000-0002-000000000001', 'Curso org', 'Cat');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0002-000000000001', '20000000-0000-0000-0002-000000000001', 'T1'),
  ('30000000-0000-0000-0002-000000000002', '20000000-0000-0000-0002-000000000001', 'T2');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  ('00000000-0000-0000-0002-00000000000a', '10000000-0000-0000-0002-000000000001', 'coordenacao', null),
  ('00000000-0000-0000-0002-00000000000b', '10000000-0000-0000-0002-000000000001', 'docente', '30000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-0000000000a1', '10000000-0000-0000-0002-000000000001', 'aluno', '30000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-0000000000a2', '10000000-0000-0000-0002-000000000001', 'aluno', '30000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-0000000000a3', '10000000-0000-0000-0002-000000000001', 'aluno', '30000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-0000000000a5', '10000000-0000-0000-0002-000000000001', 'aluno', '30000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0002-0000000000a4', '10000000-0000-0000-0002-000000000001', 'aluno', '30000000-0000-0000-0002-000000000002');

create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;

-- Atalhos legíveis
create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0002-0000000000' || s)::uuid;
$$;

set local role authenticated;

-- ===========================================================================
-- US1 — cursos e turmas
-- ===========================================================================
select pg_temp.como(pg_temp.u('0a'));

select lives_ok(
  $$ insert into public.cursos (edicao_id, nome, categoria)
     values ('10000000-0000-0000-0002-000000000001', 'Curso novo', 'Cat B') $$,
  'US1: coordenação cria curso');
select throws_ok(
  $$ insert into public.cursos (edicao_id, nome, categoria)
     values ('10000000-0000-0000-0002-000000000001', 'Curso novo', 'Cat B') $$,
  '23505', null, 'US1: curso com nome repetido na edição é recusado');
select lives_ok(
  $$ insert into public.turmas (curso_id, nome)
     select id, 'Turma nova' from public.cursos where nome = 'Curso novo' $$,
  'US1: coordenação cria turma');
select ok(
  exists (select 1 from public.auditoria where tabela = 'cursos' and acao = 'INSERT'
          and autor_id = pg_temp.u('0a')),
  'US1: criação de curso auditada com autoria');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ insert into public.cursos (edicao_id, nome, categoria)
     values ('10000000-0000-0000-0002-000000000001', 'Curso da docente', 'Cat') $$,
  '42501', null, 'US1: docente não cria curso');

-- ===========================================================================
-- US2 — vínculos
-- ===========================================================================
select pg_temp.como(pg_temp.u('0a'));
select throws_ok(
  $$ insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
     ('00000000-0000-0000-0002-0000000000a1', '10000000-0000-0000-0002-000000000001', 'aluno',
      '30000000-0000-0000-0002-000000000002') $$,
  '23505', null, 'US2: estudante não fica ativo em duas turmas da mesma edição');

-- ===========================================================================
-- US3 — duplas
-- ===========================================================================
select lives_ok(
  $$ select public.formar_dupla('30000000-0000-0000-0002-000000000001', 'Dupla Teste',
       array['00000000-0000-0000-0002-0000000000a1', '00000000-0000-0000-0002-0000000000a2']::uuid[]) $$,
  'US3: coordenação forma dupla com dois alunos da turma');
select is(
  (select count(*)::int from public.dupla_integrantes i join public.duplas d on d.id = i.dupla_id
   where d.nome = 'Dupla Teste' and i.saida_em is null),
  2, 'US3: dupla criada com os dois integrantes');

select throws_ok(
  $$ select public.formar_dupla('30000000-0000-0000-0002-000000000001', 'Dupla Falha',
       array['00000000-0000-0000-0002-0000000000a1', '00000000-0000-0000-0002-0000000000a3']::uuid[]) $$,
  '23514', null, 'US3: estudante já em dupla ativa não entra em outra');
select is(
  (select count(*)::int from public.duplas where nome = 'Dupla Falha'),
  0, 'US3: falha não grava nada (atomicidade)');
select throws_ok(
  $$ select public.formar_dupla('30000000-0000-0000-0002-000000000001', 'Dupla Mista',
       array['00000000-0000-0000-0002-0000000000a3', '00000000-0000-0000-0002-0000000000a4']::uuid[]) $$,
  '23514', null, 'US3: estudantes de turmas diferentes são recusados');
select throws_ok(
  $$ select public.formar_dupla('30000000-0000-0000-0002-000000000001', 'Dupla Repetida',
       array['00000000-0000-0000-0002-0000000000a3', '00000000-0000-0000-0002-0000000000a3']::uuid[]) $$,
  '23514', null, 'US3: o mesmo estudante duas vezes é recusado');
select throws_ok(
  $$ select public.formar_dupla('30000000-0000-0000-0002-000000000001', 'Dupla Trio',
       array['00000000-0000-0000-0002-0000000000a3', '00000000-0000-0000-0002-0000000000a5',
             '00000000-0000-0000-0002-0000000000a4']::uuid[]) $$,
  '23514', null, 'US3: composição diferente de dois integrantes é recusada');
select throws_ok(
  $$ insert into public.duplas (edicao_id, turma_id, nome) values
     ('10000000-0000-0000-0002-000000000001', '30000000-0000-0000-0002-000000000001', 'Direta') $$,
  '42501', null, 'US3: escrita direta na tabela de duplas é negada (somente RPC)');

select throws_ok(
  $$ select public.substituir_integrante(
       (select id from public.duplas where nome = 'Dupla Teste'),
       '00000000-0000-0000-0002-0000000000a2', '00000000-0000-0000-0002-0000000000a5', 'curta') $$,
  '23514', null, 'US3: substituição sem justificativa suficiente é recusada');
select lives_ok(
  $$ select public.substituir_integrante(
       (select id from public.duplas where nome = 'Dupla Teste'),
       '00000000-0000-0000-0002-0000000000a2', '00000000-0000-0000-0002-0000000000a5',
       'Transferência de turno solicitada pela família') $$,
  'US3: substituição com justificativa');
select ok(
  exists (select 1 from public.dupla_integrantes
          where estudante_id = pg_temp.u('a2') and saida_em is not null
            and motivo_saida like 'Transferência%' and saida_por = pg_temp.u('0a')),
  'US3: histórico registra saída, motivo e responsável');
select ok(
  exists (select 1 from public.auditoria where tabela = 'dupla_integrantes'
          and justificativa like 'Transferência%'),
  'US3: substituição auditada com justificativa');
select throws_ok(
  $$ select public.substituir_integrante(
       (select id from public.duplas where nome = 'Dupla Teste'),
       '00000000-0000-0000-0002-0000000000a3', '00000000-0000-0000-0002-0000000000a2',
       'Integrante que não pertence à dupla') $$,
  '23514', null, 'US3: substituir quem não é integrante é recusado');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select public.formar_dupla('30000000-0000-0000-0002-000000000001', 'Dupla Docente',
       array['00000000-0000-0000-0002-0000000000a2', '00000000-0000-0000-0002-0000000000a3']::uuid[]) $$,
  '42501', null, 'US3: docente não forma duplas');
select is((select count(*)::int from public.duplas where ativa), 1, 'FR-008: docente vê duplas da turma vinculada');

-- Leitura do aluno
select pg_temp.como(pg_temp.u('a1'));
select is((select count(*)::int from public.duplas), 1, 'FR-008: aluno vê a própria dupla');
select ok(
  exists (select 1 from public.perfis where id = pg_temp.u('a5')),
  'FR-008: aluno vê o perfil do colega de dupla');
select ok(
  not exists (select 1 from public.perfis where id = pg_temp.u('a3')),
  'FR-008: aluno não vê perfis de outros estudantes');
select pg_temp.como(pg_temp.u('a4'));
select is((select count(*)::int from public.duplas), 0, 'FR-008: aluno de outra turma não vê a dupla');

-- ===========================================================================
-- US4 — ambientes e encontros
-- ===========================================================================
select pg_temp.como(pg_temp.u('0a'));
select lives_ok(
  $$ insert into public.ambientes (edicao_id, nome)
     values ('10000000-0000-0000-0002-000000000001', 'Laboratório 1') $$,
  'US4: coordenação cria ambiente');
select lives_ok(
  $$ insert into public.encontros (edicao_id, numero, titulo, data, inicio, fim, avaliacao_objetiva)
     values ('10000000-0000-0000-0002-000000000001', 1, 'Encontro 1', '2026-11-05', '13:30', '17:00', 'questoes') $$,
  'US4: coordenação cria encontro');
select throws_ok(
  $$ insert into public.encontros (edicao_id, numero, titulo, data, inicio, fim, avaliacao_objetiva)
     values ('10000000-0000-0000-0002-000000000001', 2, 'Invertido', '2026-11-12', '17:00', '13:30', 'questoes') $$,
  '23514', null, 'US4: término antes do início é recusado');
select throws_ok(
  $$ insert into public.encontros (edicao_id, numero, titulo, data, inicio, fim, avaliacao_objetiva)
     values ('10000000-0000-0000-0002-000000000001', 1, 'Repetido', '2026-11-12', '13:30', '17:00', 'questoes') $$,
  '23505', null, 'US4: número de encontro repetido é recusado');
select throws_ok(
  $$ insert into public.encontros (edicao_id, numero, titulo, data, inicio, fim, avaliacao_objetiva)
     values ('10000000-0000-0000-0002-000000000001', 5, 'Excedente', '2026-12-01', '13:30', '17:00', 'questoes') $$,
  '23514', null, 'US4: número acima da quantidade configurada é recusado');

select pg_temp.como(pg_temp.u('a1'));
select is((select count(*)::int from public.encontros), 1, 'US4: aluno da edição vê os encontros');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ insert into public.ambientes (edicao_id, nome)
     values ('10000000-0000-0000-0002-000000000001', 'Sala da docente') $$,
  '42501', null, 'US4: docente não cria ambiente');

-- ===========================================================================
-- Desfazer dupla mantém histórico
-- ===========================================================================
select pg_temp.como(pg_temp.u('0a'));
select lives_ok(
  $$ select public.desfazer_dupla((select id from public.duplas where nome = 'Dupla Teste'),
       'Reorganização aprovada pela coordenação') $$,
  'US3: coordenação desfaz dupla com justificativa');
select is(
  (select count(*)::int from public.dupla_integrantes i join public.duplas d on d.id = i.dupla_id
   where d.nome = 'Dupla Teste' and not d.ativa and i.saida_em is not null),
  3, 'US3: dupla desfeita preserva todo o histórico de integrantes');

reset role;
select * from finish();
rollback;
