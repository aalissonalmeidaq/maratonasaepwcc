-- Testes da spec 002 (revisão 2026-10-30): convites de primeiro acesso (FR-011) e situação de
-- acesso para a coordenação (US6 cenário 6). Funções exclusivas do servidor só para service_role.
begin;
create extension if not exists pgtap with schema extensions;

select plan(27);

-- ---------------------------------------------------------------------------
-- Cenário fictício: edição E e edição E2. K = coordenação de E; K2 = coordenação de E2;
-- D = docente de T; A = aluno de T sem convite (conta antiga); P = aluno de T com convite.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0004-0000000000' || s)::uuid, 'c' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('0c'), ('a1'), ('e1')) as v (s);

insert into public.edicoes (id, nome, regras, regras_versao) values
  ('10000000-0000-0000-0004-000000000001', 'Edição convites', '{}', 'teste'),
  ('10000000-0000-0000-0004-000000000002', 'Outra edição', '{}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0004-000000000001', '10000000-0000-0000-0004-000000000001', 'Curso', 'Cat');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0004-000000000001', '20000000-0000-0000-0004-000000000001', 'T');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  ('00000000-0000-0000-0004-00000000000a', '10000000-0000-0000-0004-000000000001', 'coordenacao', null),
  ('00000000-0000-0000-0004-00000000000c', '10000000-0000-0000-0004-000000000002', 'coordenacao', null),
  ('00000000-0000-0000-0004-00000000000b', '10000000-0000-0000-0004-000000000001', 'docente', '30000000-0000-0000-0004-000000000001'),
  ('00000000-0000-0000-0004-0000000000a1', '10000000-0000-0000-0004-000000000001', 'aluno', '30000000-0000-0000-0004-000000000001'),
  ('00000000-0000-0000-0004-0000000000e1', '10000000-0000-0000-0004-000000000001', 'aluno', '30000000-0000-0000-0004-000000000001');

create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0004-0000000000' || s)::uuid;
$$;

-- ===========================================================================
-- Ninguém além do servidor acessa convites
-- ===========================================================================
set local role anon;
select throws_ok($$ select count(*) from public.convites_acesso $$, '42501', null,
  'anon não lê convites');

set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select count(*) from public.convites_acesso $$, '42501', null,
  'coordenação não lê convites diretamente');
select throws_ok(
  $$ insert into public.convites_acesso (usuario_id, edicao_id, token_hash)
     values ('00000000-0000-0000-0004-0000000000e1', '10000000-0000-0000-0004-000000000001', 'x') $$,
  '42501', null, 'coordenação não grava convites diretamente');
select throws_ok(
  $$ select public.registrar_convite('00000000-0000-0000-0004-0000000000e1',
       '10000000-0000-0000-0004-000000000001', 'h', '00000000-0000-0000-0004-00000000000a') $$,
  '42501', null, 'registrar_convite é só do servidor');
select throws_ok($$ select * from public.consumir_convite('h') $$, '42501', null,
  'consumir_convite é só do servidor');
select throws_ok(
  $$ select public.desfazer_consumo('00000000-0000-0000-0000-000000000000') $$, '42501', null,
  'desfazer_consumo é só do servidor');
select throws_ok($$ select public.usuario_por_email('ca1@exemplo.invalid') $$, '42501', null,
  'usuario_por_email é só do servidor');

-- ===========================================================================
-- Ciclo do convite (service_role, como nas Edge Functions)
-- ===========================================================================
reset role;
set local role service_role;

select lives_ok(
  $$ select public.registrar_convite(pg_temp.u('e1'), '10000000-0000-0000-0004-000000000001',
       'hash-1', pg_temp.u('0a')) $$,
  'servidor registra convite');
select is(
  (select expira_em - criado_em from public.convites_acesso where token_hash = 'hash-1'),
  interval '7 days', 'convite vale 7 dias');
select lives_ok(
  $$ select public.registrar_convite(pg_temp.u('e1'), '10000000-0000-0000-0004-000000000001',
       'hash-2', pg_temp.u('0a')) $$,
  'reenvio registra novo convite');
select isnt(
  (select revogado_em from public.convites_acesso where token_hash = 'hash-1'), null,
  'reenvio revoga o convite anterior');
select is(
  (select count(*)::int from public.convites_acesso
   where usuario_id = pg_temp.u('e1') and usado_em is null and revogado_em is null),
  1, 'no máximo um convite válido por pessoa');
select is((select count(*)::int from public.consumir_convite('hash-1')), 0,
  'convite revogado não é aceito');
select is((select usuario_id from public.consumir_convite('hash-2')), pg_temp.u('e1'),
  'convite válido é consumido e devolve a pessoa');
select is((select count(*)::int from public.consumir_convite('hash-2')), 0,
  'convite usado não é aceito de novo');
select lives_ok(
  $$ select public.desfazer_consumo(
       (select id from public.convites_acesso where token_hash = 'hash-2')) $$,
  'servidor desfaz o consumo quando o Auth recusa a senha');
select is((select count(*)::int from public.consumir_convite('hash-2')), 1,
  'depois de desfeito, o convite volta a valer');

insert into public.convites_acesso (usuario_id, edicao_id, token_hash, criado_em, expira_em)
values (pg_temp.u('a1'), '10000000-0000-0000-0004-000000000001', 'hash-vencido',
        now() - interval '8 days', now() - interval '1 day');
select is((select count(*)::int from public.consumir_convite('hash-vencido')), 0,
  'convite vencido não é aceito');
select throws_ok(
  $$ update public.convites_acesso set usado_em = now(), revogado_em = now()
     where token_hash = 'hash-vencido' $$,
  '23514', null, 'convite não pode estar usado e revogado ao mesmo tempo');
delete from public.convites_acesso where token_hash = 'hash-vencido';

select is(public.usuario_por_email('CA1@Exemplo.Invalid'), pg_temp.u('a1'),
  'usuario_por_email ignora maiúsculas');
select is(public.usuario_por_email('ninguem@exemplo.invalid'), null,
  'usuario_por_email devolve nulo para e-mail sem conta');

-- Novo convite pendente para P (o anterior foi usado).
select public.registrar_convite(pg_temp.u('e1'), '10000000-0000-0000-0004-000000000001',
  'hash-3', pg_temp.u('0a'));

-- ===========================================================================
-- Situação de acesso (coordenação da edição)
-- ===========================================================================
reset role;
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select is(
  (select email from public.situacao_de_acesso('10000000-0000-0000-0004-000000000001')
   where usuario_id = pg_temp.u('e1')),
  'ce1@exemplo.invalid', 'coordenação vê o e-mail das pessoas da edição');
select is(
  (select acesso_ativo from public.situacao_de_acesso('10000000-0000-0000-0004-000000000001')
   where usuario_id = pg_temp.u('e1')),
  false, 'com convite pendente e sem login: aguardando primeiro acesso');
select is(
  (select acesso_ativo from public.situacao_de_acesso('10000000-0000-0000-0004-000000000001')
   where usuario_id = pg_temp.u('a1')),
  true, 'conta antiga sem convite: acesso ativo');

reset role;
update auth.users set last_sign_in_at = now() + interval '1 minute' where id = pg_temp.u('e1');
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select is(
  (select acesso_ativo from public.situacao_de_acesso('10000000-0000-0000-0004-000000000001')
   where usuario_id = pg_temp.u('e1')),
  true, 'login depois do convite (ex.: pela recuperação de senha): acesso ativo');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select * from public.situacao_de_acesso('10000000-0000-0000-0004-000000000001') $$,
  '42501', null, 'docente não consulta a situação de acesso');
select pg_temp.como(pg_temp.u('0c'));
select throws_ok(
  $$ select * from public.situacao_de_acesso('10000000-0000-0000-0004-000000000001') $$,
  '42501', null, 'coordenação de outra edição não consulta a situação de acesso');

reset role;
select * from finish();
rollback;
