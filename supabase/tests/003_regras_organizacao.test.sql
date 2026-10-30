-- Testes da spec 002 (esclarecimentos de 2026-10-30): curso da turma com dupla ativa (FR-001,
-- US1 cenário 4) e remoção de ambiente em uso (FR-012, US4 cenário 5).
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- ---------------------------------------------------------------------------
-- Cenário fictício: edição E (4 encontros), cursos C1 e C2, turmas T1 (com dupla) e T2 (sem).
-- K = coordenação; D = docente T1; A1, A2 = alunos T1.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0003-0000000000' || s)::uuid, 'r' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('a1'), ('a2')) as v (s);

insert into public.edicoes (id, nome, regras, regras_versao) values
  ('10000000-0000-0000-0003-000000000001', 'Edição regras', '{"quantidadeEncontros": 4}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0003-000000000001', '10000000-0000-0000-0003-000000000001', 'Curso 1', 'Cat 1'),
  ('20000000-0000-0000-0003-000000000002', '10000000-0000-0000-0003-000000000001', 'Curso 2', 'Cat 2');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0003-000000000001', '20000000-0000-0000-0003-000000000001', 'T1'),
  ('30000000-0000-0000-0003-000000000002', '20000000-0000-0000-0003-000000000001', 'T2');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  ('00000000-0000-0000-0003-00000000000a', '10000000-0000-0000-0003-000000000001', 'coordenacao', null),
  ('00000000-0000-0000-0003-00000000000b', '10000000-0000-0000-0003-000000000001', 'docente', '30000000-0000-0000-0003-000000000001'),
  ('00000000-0000-0000-0003-0000000000a1', '10000000-0000-0000-0003-000000000001', 'aluno', '30000000-0000-0000-0003-000000000001'),
  ('00000000-0000-0000-0003-0000000000a2', '10000000-0000-0000-0003-000000000001', 'aluno', '30000000-0000-0000-0003-000000000001');
insert into public.ambientes (id, edicao_id, nome) values
  ('40000000-0000-0000-0003-000000000001', '10000000-0000-0000-0003-000000000001', 'Lab em uso'),
  ('40000000-0000-0000-0003-000000000002', '10000000-0000-0000-0003-000000000001', 'Lab livre');
insert into public.encontros (edicao_id, numero, titulo, data, ambiente_id) values
  ('10000000-0000-0000-0003-000000000001', 1, 'Abertura', '2026-11-06', '40000000-0000-0000-0003-000000000001'),
  ('10000000-0000-0000-0003-000000000001', 2, 'Desafio', '2026-11-13', '40000000-0000-0000-0003-000000000001');

create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0003-0000000000' || s)::uuid;
$$;

set local role authenticated;
-- Equipe formada por convite entre os alunos (spec 003).
select pg_temp.como(pg_temp.u('a1'));
select set_config('teste.convite', public.enviar_convite_equipe(
  '30000000-0000-0000-0003-000000000001', array[pg_temp.u('a2')])::text, true);
select pg_temp.como(pg_temp.u('a2'));
select public.responder_convite_equipe(current_setting('teste.convite')::uuid, true);
select pg_temp.como(pg_temp.u('0a'));

-- ===========================================================================
-- FR-001 — curso da turma com dupla ativa
-- ===========================================================================
select throws_ok(
  $$ update public.turmas set curso_id = '20000000-0000-0000-0003-000000000002'
     where id = '30000000-0000-0000-0003-000000000001' $$,
  '23514', 'Esta turma já tem duplas; o curso não pode ser alterado.',
  'FR-001: curso de turma com dupla ativa não muda');
select lives_ok(
  $$ update public.turmas set nome = 'T1 renomeada', ano_letivo = 2026
     where id = '30000000-0000-0000-0003-000000000001' $$,
  'FR-001: nome e ano letivo continuam editáveis com dupla ativa');
select lives_ok(
  $$ update public.turmas set curso_id = '20000000-0000-0000-0003-000000000002'
     where id = '30000000-0000-0000-0003-000000000002' $$,
  'FR-001: turma sem dupla troca de curso');
select is(
  (select curso_id from public.turmas where id = '30000000-0000-0000-0003-000000000002'),
  '20000000-0000-0000-0003-000000000002'::uuid,
  'FR-001: troca de curso gravada');

select public.desfazer_dupla(
  (select id from public.duplas where turma_id = '30000000-0000-0000-0003-000000000001' and ativa),
  'Desfeita no teste de regras');
select lives_ok(
  $$ update public.turmas set curso_id = '20000000-0000-0000-0003-000000000002'
     where id = '30000000-0000-0000-0003-000000000001' $$,
  'FR-001: com a dupla desfeita, o curso pode mudar');

-- ===========================================================================
-- FR-012 — ambientes
-- ===========================================================================
select lives_ok(
  $$ update public.ambientes set nome = 'Lab em uso (bloco B)', observacoes = 'Térreo'
     where id = '40000000-0000-0000-0003-000000000001' $$,
  'FR-012: coordenação edita ambiente');
select throws_ok(
  $$ delete from public.ambientes where id = '40000000-0000-0000-0003-000000000001' $$,
  '23514',
  'Este ambiente está em uso nos encontros: 1 — Abertura; 2 — Desafio. Troque o ambiente desses encontros antes de removê-lo.',
  'FR-012: ambiente em uso não é removido e a mensagem lista os encontros');
select is(
  (select count(*)::int from public.encontros
   where ambiente_id = '40000000-0000-0000-0003-000000000001'),
  2, 'FR-012: encontros mantêm o ambiente');
select lives_ok(
  $$ delete from public.ambientes where id = '40000000-0000-0000-0003-000000000002' $$,
  'FR-012: ambiente sem encontros é removido');

select pg_temp.como(pg_temp.u('0b'));
delete from public.ambientes where id = '40000000-0000-0000-0003-000000000001';
select pg_temp.como(pg_temp.u('0a'));
select is(
  (select count(*)::int from public.ambientes where id = '40000000-0000-0000-0003-000000000001'),
  1, 'FR-012: docente não remove ambiente');

select lives_ok(
  $$ update public.encontros set ambiente_id = null where numero in (1, 2)
       and edicao_id = '10000000-0000-0000-0003-000000000001';
     delete from public.ambientes where id = '40000000-0000-0000-0003-000000000001' $$,
  'FR-012: depois de trocar o ambiente dos encontros, a remoção é aceita');

reset role;
select lives_ok(
  $$ insert into public.ambientes (id, edicao_id, nome) values
       ('40000000-0000-0000-0003-000000000003', '10000000-0000-0000-0003-000000000001', 'Lab final');
     update public.encontros set ambiente_id = '40000000-0000-0000-0003-000000000003'
       where edicao_id = '10000000-0000-0000-0003-000000000001';
     delete from public.edicoes where id = '10000000-0000-0000-0003-000000000001' $$,
  'Remover a edição inteira continua possível (cascata com ambiente em uso)');

select * from finish();
rollback;
