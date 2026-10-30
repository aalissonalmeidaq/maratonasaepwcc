-- Testes da spec 004 — painel da turma: acesso no servidor e conteúdo por perfil.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício. Edição E (ativa), curso C, turmas:
--   TA: a1, a2 (equipe "Equipe Alfa"), a3 + a4 (equipe sem nome; a4 desativado depois), a5 sem
--       equipe e com um convite pendente; TB: b1, b2; TV: sem alunos.
-- 0a = coordenação de E; 0b = docente de TA; 0c = mentor de TA; 0d = docente de TB.
-- Edição F com turma TF, coordenação 0e e um encontro próprio.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0006-0000000000' || s)::uuid, 'p' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('0c'), ('0d'), ('0e'),
             ('a1'), ('a2'), ('a3'), ('a4'), ('a5'), ('b1'), ('b2'), ('f1')) as v (s);

insert into public.edicoes (id, nome, estado, regras, regras_versao) values
  ('10000000-0000-0000-0006-000000000001', 'Edição painel', 'ativa', '{"quantidadeEncontros": 4}', 'teste'),
  ('10000000-0000-0000-0006-000000000002', 'Outra edição', 'ativa', '{"quantidadeEncontros": 4}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0006-000000000001', '10000000-0000-0000-0006-000000000001', 'Curso E', 'Categoria E'),
  ('20000000-0000-0000-0006-000000000002', '10000000-0000-0000-0006-000000000002', 'Curso F', 'Categoria F');
insert into public.turmas (id, curso_id, nome, ano_letivo) values
  ('30000000-0000-0000-0006-0000000000a0', '20000000-0000-0000-0006-000000000001', 'TA', 2026),
  ('30000000-0000-0000-0006-0000000000b0', '20000000-0000-0000-0006-000000000001', 'TB', null),
  ('30000000-0000-0000-0006-0000000000e0', '20000000-0000-0000-0006-000000000001', 'TV', null),
  ('30000000-0000-0000-0006-0000000000f0', '20000000-0000-0000-0006-000000000002', 'TF', null);

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0006-0000000000' || s)::uuid;
$$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0006-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select pg_temp.u(u), '10000000-0000-0000-0006-000000000001', p::public.papel,
       case when t is null then null else pg_temp.t(t) end
from (values ('0a', 'coordenacao', null), ('0b', 'docente', 'a'), ('0c', 'mentor', 'a'),
             ('0d', 'docente', 'b'),
             ('a1', 'aluno', 'a'), ('a2', 'aluno', 'a'), ('a3', 'aluno', 'a'), ('a4', 'aluno', 'a'),
             ('a5', 'aluno', 'a'), ('b1', 'aluno', 'b'), ('b2', 'aluno', 'b')) as v (u, p, t);
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  (pg_temp.u('0e'), '10000000-0000-0000-0006-000000000002', 'coordenacao', null),
  (pg_temp.u('f1'), '10000000-0000-0000-0006-000000000002', 'aluno', pg_temp.t('f'));

insert into public.duplas (id, edicao_id, turma_id, nome) values
  ('40000000-0000-0000-0006-000000000001', '10000000-0000-0000-0006-000000000001', pg_temp.t('a'), 'Equipe Alfa'),
  ('40000000-0000-0000-0006-000000000002', '10000000-0000-0000-0006-000000000001', pg_temp.t('a'), null);
insert into public.duplas (id, edicao_id, turma_id, nome, ativa) values
  ('40000000-0000-0000-0006-000000000003', '10000000-0000-0000-0006-000000000001', pg_temp.t('a'), 'Desfeita', false);
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id) values
  ('40000000-0000-0000-0006-000000000001', '10000000-0000-0000-0006-000000000001', pg_temp.u('a1')),
  ('40000000-0000-0000-0006-000000000001', '10000000-0000-0000-0006-000000000001', pg_temp.u('a2')),
  ('40000000-0000-0000-0006-000000000002', '10000000-0000-0000-0006-000000000001', pg_temp.u('a3')),
  ('40000000-0000-0000-0006-000000000002', '10000000-0000-0000-0006-000000000001', pg_temp.u('a4'));
-- a4 deixa a turma, mas continua na equipe (spec 003: "integrante inativo").
update public.atribuicoes set ativo = false where usuario_id = pg_temp.u('a4');

insert into public.convites_equipe (edicao_id, turma_id, remetente_id, tipo) values
  ('10000000-0000-0000-0006-000000000001', pg_temp.t('a'), pg_temp.u('a5'), 'dupla');
insert into public.convites_equipe (edicao_id, turma_id, remetente_id, tipo, situacao, motivo, encerrado_em) values
  ('10000000-0000-0000-0006-000000000001', pg_temp.t('a'), pg_temp.u('a5'), 'dupla', 'cancelado', 'teste', now());

insert into public.encontros (edicao_id, numero, titulo, data, inicio, fim) values
  ('10000000-0000-0000-0006-000000000001', 2, 'Encontro dois', '2026-11-12', '13:30', '17:00'),
  ('10000000-0000-0000-0006-000000000001', 1, 'Encontro um', '2026-11-05', null, null),
  ('10000000-0000-0000-0006-000000000002', 1, 'Encontro de F', '2026-11-05', null, null);

-- ===========================================================================
-- Privilégios
-- ===========================================================================
select has_function('public', 'painel_da_turma', array['uuid'], 'FR-001: RPC do painel existe');
select ok(not has_function_privilege('anon', 'public.painel_da_turma(uuid)', 'execute'),
  'FR-002: anônimo não executa o painel');
select ok(has_function_privilege('authenticated', 'public.painel_da_turma(uuid)', 'execute'),
  'FR-002: pessoa autenticada executa (o acesso é decidido dentro da RPC)');

set local role authenticated;

-- ===========================================================================
-- US1 — equipe docente e coordenação (FR-001/002)
-- ===========================================================================
select pg_temp.como(pg_temp.u('0b'));
select is(public.painel_da_turma(pg_temp.t('a')) ->> 'visao', 'gestao', 'US1: docente da turma vê a visão de gestão');
select is(public.painel_da_turma(pg_temp.t('a')) -> 'turma',
  jsonb_build_object('id', pg_temp.t('a'), 'nome', 'TA', 'anoLetivo', 2026, 'cursoNome', 'Curso E',
                     'categoria', 'Categoria E', 'edicaoId', '10000000-0000-0000-0006-000000000001'),
  'FR-001: identificação da turma, curso, categoria e ano');
select is(
  (select array_agg(x ->> 'nome' order by x ->> 'nome') from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'alunos') x),
  array['Pessoa a1', 'Pessoa a2', 'Pessoa a3', 'Pessoa a5'],
  'FR-001: só alunos ativos da turma (a4 desativado fica de fora)');
select is(
  (select array_agg(x ->> 'nome' order by x ->> 'nome') from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'alunos') x
   where not (x ->> 'temEquipe')::boolean),
  array['Pessoa a5'], 'FR-001: aluno sem equipe identificado');
select is(jsonb_array_length(public.painel_da_turma(pg_temp.t('a')) -> 'equipes'), 2,
  'FR-001: só equipes ativas da turma');
select is(
  (select jsonb_array_length(x -> 'integrantes') from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'equipes') x
   where x ->> 'nome' = 'Equipe Alfa'),
  2, 'FR-001: integrantes ativos da equipe');
select ok(
  (select (i ->> 'integranteInativo')::boolean
   from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'equipes') x,
        jsonb_array_elements(x -> 'integrantes') i
   where i ->> 'estudanteId' = pg_temp.u('a4')::text),
  'US1: gestão vê o integrante inativo marcado');
select is((public.painel_da_turma(pg_temp.t('a')) ->> 'convitesPendentes')::int, 1,
  'FR-001: gestão vê só os convites pendentes da turma');
select is(
  (select array_agg(x ->> 'titulo') from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'encontros') x),
  array['Encontro um', 'Encontro dois'], 'FR-001: encontros da edição, em ordem de data');
select is(
  (select x ->> 'inicio' from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'encontros') x where x ->> 'numero' = '2'),
  '13:30', 'FR-001: horário em HH:MM');

select ok(public.painel_da_turma(pg_temp.t('a')) -> 'pontuacao' = 'null'::jsonb,
  'FR-005: sem lançamentos reais, a gestão não recebe pontuação (Incrementos 3/4)');

select pg_temp.como(pg_temp.u('0c'));
select is(public.painel_da_turma(pg_temp.t('a')) ->> 'visao', 'gestao', 'US1: mentor da turma vê o painel');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.painel_da_turma(pg_temp.t('b')) $$, '42501',
  'Você não tem acesso a esta turma.', 'US1: docente não vê turma não vinculada');

select pg_temp.como(pg_temp.u('0a'));
select is(public.painel_da_turma(pg_temp.t('b')) ->> 'visao', 'gestao', 'US1: coordenação vê qualquer turma da edição');
select is(public.painel_da_turma(pg_temp.t('e')) -> 'alunos', '[]'::jsonb, 'US1: turma sem alunos devolve lista vazia');
select is(public.painel_da_turma(pg_temp.t('e')) -> 'equipes', '[]'::jsonb, 'US1: turma sem equipes devolve lista vazia');
select is((public.painel_da_turma(pg_temp.t('e')) ->> 'convitesPendentes')::int, 0, 'US1: zero convites na turma vazia');
select throws_ok($$ select public.painel_da_turma(pg_temp.t('f')) $$, '42501',
  'Você não tem acesso a esta turma.', 'FR-002: coordenação não vê turma de outra edição');
select throws_ok($$ select public.painel_da_turma('30000000-0000-0000-0006-000000000999') $$, 'P0002',
  'Turma não encontrada.', 'Edge: turma inexistente');

select pg_temp.como(pg_temp.u('0e'));
select is(
  (select array_agg(x ->> 'titulo') from jsonb_array_elements(public.painel_da_turma(pg_temp.t('f')) -> 'encontros') x),
  array['Encontro de F'], 'FR-001: encontros só da edição da turma');

-- ===========================================================================
-- US2 — aluno (FR-003)
-- ===========================================================================
select pg_temp.como(pg_temp.u('a5'));
select is(public.painel_da_turma(pg_temp.t('a')) ->> 'visao', 'aluno', 'US2: aluno da turma vê a visão de aluno');
select ok(public.painel_da_turma(pg_temp.t('a')) -> 'convitesPendentes' = 'null'::jsonb,
  'FR-003: aluno não recebe o total de convites da turma');
select is(
  (select array_agg(distinct k order by k) from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'alunos') x,
          jsonb_object_keys(x) k),
  array['id', 'nome', 'temEquipe'], 'FR-003: aluno recebe só id, nome e "tem equipe" dos colegas');
select is(jsonb_array_length(public.painel_da_turma(pg_temp.t('a')) -> 'equipes'), 2,
  'US2: aluno vê as equipes formadas da turma');
select ok(
  not exists (select 1 from jsonb_array_elements(public.painel_da_turma(pg_temp.t('a')) -> 'equipes') x,
                            jsonb_array_elements(x -> 'integrantes') i
              where (i ->> 'integranteInativo')::boolean),
  'FR-003: aluno não vê a situação individual de colegas');
select ok(public.painel_da_turma(pg_temp.t('a')) -> 'pontuacao' = 'null'::jsonb,
  'FR-005: sem lançamentos reais, o aluno não recebe pontuação');
select throws_ok($$ select public.painel_da_turma(pg_temp.t('b')) $$, '42501',
  'Você não tem acesso a esta turma.', 'US2: aluno não vê o painel de outra turma');

select pg_temp.como(pg_temp.u('a4'));
select throws_ok($$ select public.painel_da_turma(pg_temp.t('a')) $$, '42501',
  'Você não tem acesso a esta turma.', 'Edge: aluno desativado perde o acesso ao painel');

select * from finish();
rollback;
