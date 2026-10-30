-- Testes da spec 003 — equipes por convite: convites, formação, gestão, nome e edição encerrada.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício. Edição E (ativa) com curso C e turmas:
--   TP (par: a1..a4), TI (ímpar: b1..b7), TX (ímpar: c1..c5), TV (sem alunos).
-- K = coordenação de E; D = docente de TP e TI; M = mentor de TI; D2 = docente de TX.
-- Edição F (encerrada) com turma TF (d1, d2, d3) e docente DF.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0005-0000000000' || s)::uuid, 'e' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('0c'), ('0d'), ('0e'),
             ('a1'), ('a2'), ('a3'), ('a4'),
             ('b1'), ('b2'), ('b3'), ('b4'), ('b5'), ('b6'), ('b7'),
             ('c1'), ('c2'), ('c3'), ('c4'), ('c5'), ('d1'), ('d2'), ('d3')) as v (s);

insert into public.edicoes (id, nome, estado, regras, regras_versao) values
  ('10000000-0000-0000-0005-000000000001', 'Edição equipes', 'ativa', '{"quantidadeEncontros": 4}', 'teste'),
  ('10000000-0000-0000-0005-000000000002', 'Edição encerrada', 'ativa', '{"quantidadeEncontros": 4}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0005-000000000001', '10000000-0000-0000-0005-000000000001', 'Curso E', 'Cat'),
  ('20000000-0000-0000-0005-000000000002', '10000000-0000-0000-0005-000000000002', 'Curso F', 'Cat');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0005-0000000000a0', '20000000-0000-0000-0005-000000000001', 'TP'),
  ('30000000-0000-0000-0005-0000000000b0', '20000000-0000-0000-0005-000000000001', 'TI'),
  ('30000000-0000-0000-0005-0000000000c0', '20000000-0000-0000-0005-000000000001', 'TX'),
  ('30000000-0000-0000-0005-0000000000e0', '20000000-0000-0000-0005-000000000001', 'TV'),
  ('30000000-0000-0000-0005-0000000000d0', '20000000-0000-0000-0005-000000000002', 'TF');

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0005-0000000000' || s)::uuid;
$$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0005-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
-- Equipe ativa da pessoa (ou nulo), lida sem RLS.
create function pg_temp.equipe_de(p uuid) returns uuid language sql security definer as $$
  select dupla_id from public.dupla_integrantes where estudante_id = p and saida_em is null;
$$;
create function pg_temp.integrantes(d uuid) returns int language sql security definer as $$
  select count(*)::int from public.dupla_integrantes where dupla_id = d and saida_em is null;
$$;
create function pg_temp.situacao(c uuid) returns text language sql security definer as $$
  select situacao::text from public.convites_equipe where id = c;
$$;
-- Auditoria lida sem RLS (só a coordenação a lê pela API).
create function pg_temp.auditado(j text, autor uuid) returns boolean language sql security definer as $$
  select exists (select 1 from public.auditoria where tabela = 'dupla_integrantes'
                 and justificativa = j and autor_id = autor);
$$;
create function pg_temp.auditado_dupla(j text, autor uuid) returns boolean language sql security definer as $$
  select exists (select 1 from public.auditoria where tabela = 'duplas'
                 and justificativa = j and autor_id = autor);
$$;
create function pg_temp.motivo(c uuid) returns text language sql security definer as $$
  select motivo from public.convites_equipe where id = c;
$$;

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select pg_temp.u(u), '10000000-0000-0000-0005-000000000001', p::public.papel,
       case when t is null then null else pg_temp.t(t) end
from (values ('0a', 'coordenacao', null), ('0b', 'docente', 'a'), ('0b', 'docente', 'b'),
             ('0c', 'mentor', 'b'), ('0d', 'docente', 'c'),
             ('a1', 'aluno', 'a'), ('a2', 'aluno', 'a'), ('a3', 'aluno', 'a'), ('a4', 'aluno', 'a'),
             ('b1', 'aluno', 'b'), ('b2', 'aluno', 'b'), ('b3', 'aluno', 'b'), ('b4', 'aluno', 'b'),
             ('b5', 'aluno', 'b'), ('b6', 'aluno', 'b'), ('b7', 'aluno', 'b'), ('c1', 'aluno', 'c'), ('c2', 'aluno', 'c'),
             ('c3', 'aluno', 'c'), ('c4', 'aluno', 'c'), ('c5', 'aluno', 'c')) as v (u, p, t);
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select pg_temp.u(u), '10000000-0000-0000-0005-000000000002', p::public.papel, pg_temp.t('d')
from (values ('0e', 'docente'), ('d1', 'aluno'), ('d2', 'aluno'), ('d3', 'aluno')) as v (u, p);

-- ===========================================================================
-- Fundação — schema, RLS e escrita direta negada (FR-004/008/009)
-- ===========================================================================
select has_table('public', 'convites_equipe', 'FR-009: tabela de convites existe');
select has_table('public', 'convite_equipe_convidados', 'FR-009: tabela de convidados existe');
select col_is_null('public', 'duplas', 'nome', 'FR-008: nome da equipe é opcional até a escolha');
select has_column('public', 'duplas', 'nome_definido_em', 'FR-008: registra quando o nome foi escolhido');
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.convites_equipe'::regclass, 'public.convite_equipe_convidados'::regclass)),
  'FR-009: RLS habilitada nas duas tabelas novas');
select ok(
  not has_table_privilege('anon', 'public.convites_equipe', 'select')
  and not has_table_privilege('anon', 'public.convite_equipe_convidados', 'select'),
  'FR-009: anônimo não lê convites');
select ok(
  not has_table_privilege('authenticated', 'public.convites_equipe', 'insert')
  and not has_table_privilege('authenticated', 'public.convites_equipe', 'update')
  and not has_table_privilege('authenticated', 'public.convites_equipe', 'delete')
  and not has_table_privilege('authenticated', 'public.convite_equipe_convidados', 'insert')
  and not has_table_privilege('authenticated', 'public.convite_equipe_convidados', 'update')
  and not has_table_privilege('authenticated', 'public.convite_equipe_convidados', 'delete'),
  'FR-009: sem escrita direta para authenticated (somente RPC)');
select is(
  (select count(*)::int from public.duplas where nome is not null and nome_definido_em is null),
  0, 'FR-008: nomes existentes contam como já escolhidos');

set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(
  $$ insert into public.convites_equipe (edicao_id, turma_id, remetente_id, tipo)
     values ('10000000-0000-0000-0005-000000000001', '30000000-0000-0000-0005-0000000000a0',
             '00000000-0000-0000-0005-0000000000a1', 'dupla') $$,
  '42501', null, 'FR-009: aluno não insere convite diretamente');

-- ===========================================================================
-- US1 — dupla por convite (FR-001–007, FR-017)
-- ===========================================================================
create function pg_temp.guardar(chave text, valor uuid) returns uuid language sql as $$
  select set_config('teste.' || chave, valor::text, true)::uuid;
$$;
create function pg_temp.c(chave text) returns uuid language sql as $$
  select current_setting('teste.' || chave)::uuid;
$$;

select pg_temp.como(pg_temp.u('a1'));
select lives_ok(
  $$ select pg_temp.guardar('c1', public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a2')])) $$,
  'US1: aluno convida colega da turma');
select is(pg_temp.situacao(pg_temp.c('c1')), 'pendente', 'US1: convite nasce pendente');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a2')]) $$,
  '23514', 'Você já tem um convite pendente para esta pessoa.', 'US1: convite repetido é recusado');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a1')]) $$,
  '23514', 'Você não pode convidar a si mesmo.', 'US1: convite para si mesmo é recusado');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('c1')]) $$,
  '23514', 'Esta pessoa não é aluna ativa desta turma.', 'US1: colega de outra turma é recusado');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('c'), array[pg_temp.u('c1')]) $$,
  '42501', null, 'US1: aluno não envia convite em turma que não é a sua');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[]::uuid[]) $$,
  '23514', null, 'US1: convite sem convidado é recusado');
select lives_ok(
  $$ select pg_temp.guardar('c3', public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a4')])) $$,
  'FR-002: aluno pode ter vários convites enviados');

select pg_temp.como(pg_temp.u('a3'));
select lives_ok(
  $$ select pg_temp.guardar('c2', public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a2')])) $$,
  'FR-002: convidado pode ter vários convites recebidos');
select ok(
  not exists (select 1 from public.perfis where id = pg_temp.u('a4')),
  'FR-005: pode_ver_perfil inalterada (aluno não lê perfil de colega fora da equipe)');
select is(
  (select count(*)::int from public.colegas_da_turma(pg_temp.t('a'))), 3,
  'FR-005: aluno vê os colegas da própria turma');
select ok(
  (select bool_and(nome is not null) from public.colegas_da_turma(pg_temp.t('a'))),
  'FR-005: lista de colegas traz os nomes');

select pg_temp.como(pg_temp.u('a4'));
select lives_ok(
  $$ select pg_temp.guardar('c4', public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a3')])) $$,
  'US1: convite independente entre outros dois colegas');

select pg_temp.como(pg_temp.u('a2'));
select is(
  (select count(*)::int from public.meus_convites_equipe('10000000-0000-0000-0005-000000000001')
   where not sou_remetente and situacao = 'pendente'),
  2, 'US1: convidado vê os convites recebidos pendentes');
select is(
  (select remetente_nome from public.meus_convites_equipe('10000000-0000-0000-0005-000000000001')
   where id = pg_temp.c('c1')),
  'Pessoa a1', 'US1: convite recebido traz o nome de quem convidou');

select pg_temp.como(pg_temp.u('c1'));
select is((select count(*)::int from public.convites_equipe), 0, 'FR-005: aluno de outra turma não vê convites');
select throws_ok(
  $$ select public.colegas_da_turma(pg_temp.t('a')) $$,
  '42501', null, 'FR-005: aluno não lista colegas de outra turma');
select throws_ok(
  $$ select public.responder_convite_equipe(pg_temp.c('c1'), true) $$,
  '42501', null, 'US1: quem não foi convidado não responde');

select pg_temp.como(pg_temp.u('a2'));
select isnt(
  pg_temp.guardar('d1', public.responder_convite_equipe(pg_temp.c('c1'), true)), null,
  'US1: aceite forma a dupla');
select ok(
  pg_temp.equipe_de(pg_temp.u('a1')) = pg_temp.c('d1') and pg_temp.equipe_de(pg_temp.u('a2')) = pg_temp.c('d1'),
  'US1: os dois passam a estar na mesma equipe');
select is(pg_temp.integrantes(pg_temp.c('d1')), 2, 'US1: equipe com dois integrantes');
select is(pg_temp.situacao(pg_temp.c('c1')), 'formado', 'US1: convite aceito fica formado');
select is(pg_temp.situacao(pg_temp.c('c2')), 'cancelado', 'FR-003: convite recebido pelo convidado é cancelado');
select is(pg_temp.motivo(pg_temp.c('c2')), 'equipe_formada', 'FR-003: motivo do cancelamento automático');
select is(pg_temp.situacao(pg_temp.c('c3')), 'cancelado', 'FR-003: convite enviado pelo remetente é cancelado');
select is(pg_temp.situacao(pg_temp.c('c4')), 'pendente', 'FR-003: convites de terceiros não mudam');
select is(
  public.responder_convite_equipe(pg_temp.c('c1'), true), pg_temp.c('d1'),
  'US1: repetir o aceite confirmado devolve a mesma equipe, sem duplicar');
select throws_ok(
  $$ select public.responder_convite_equipe(pg_temp.c('c2'), true) $$,
  '23514', 'Este convite não está mais pendente.', 'US1: aceite de convite cancelado é recusado');
select is(
  (select count(*)::int from public.duplas where turma_id = pg_temp.t('a')), 1,
  'FR-004: só uma equipe foi gravada');
select is((select count(*)::int from public.duplas), 1, 'US1: integrante vê a própria equipe');
select is((select nome from public.duplas), null, 'US1: equipe nasce sem nome');

select pg_temp.como(pg_temp.u('a3'));
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a1')]) $$,
  '23514', 'Esta pessoa já está em uma equipe.', 'US1: quem já está em equipe não é convidado');
select lives_ok(
  $$ select public.responder_convite_equipe(pg_temp.c('c4'), false) $$,
  'US1: convidado recusa');
select is(pg_temp.situacao(pg_temp.c('c4')), 'recusado', 'US1: recusa encerra o convite como recusado');
select is(pg_temp.equipe_de(pg_temp.u('a3')), null, 'US1: recusa não forma equipe');

select pg_temp.como(pg_temp.u('a1'));
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a3')]) $$,
  '23514', 'Você já está em uma equipe.', 'US1: quem já está em equipe não convida');

select pg_temp.como(pg_temp.u('a4'));
select lives_ok(
  $$ select pg_temp.guardar('c5', public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a3')])) $$,
  'US1: novo convite após recusa');
select pg_temp.como(pg_temp.u('a3'));
select throws_ok(
  $$ select public.cancelar_convite_equipe(pg_temp.c('c5')) $$,
  '42501', null, 'US1: só quem enviou cancela');
select pg_temp.como(pg_temp.u('a4'));
select lives_ok($$ select public.cancelar_convite_equipe(pg_temp.c('c5')) $$, 'US1: remetente cancela');
select is(pg_temp.motivo(pg_temp.c('c5')), 'cancelado_pelo_remetente', 'US1: cancelamento registra o motivo');
select pg_temp.como(pg_temp.u('a3'));
select throws_ok(
  $$ select public.responder_convite_equipe(pg_temp.c('c5'), true) $$,
  '23514', 'Este convite não está mais pendente.', 'US1: convite cancelado não é aceito');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a3')]) $$,
  '42501', null, 'US1: quem não é aluno da turma não envia convite');
select is(
  (select count(*)::int from public.convites_equipe where turma_id = pg_temp.t('a')), 5,
  'US1: docente da turma vê os convites da turma');
select pg_temp.como(pg_temp.u('0a'));
select hasnt_function('public', 'formar_dupla', 'FR-007: coordenação não tem mais RPC para formar equipe');

-- Edição em rascunho permite; encerrada recusa tudo (FR-017).
reset role;
update public.edicoes set estado = 'rascunho' where id = '10000000-0000-0000-0005-000000000002';
set local role authenticated;
select pg_temp.como(pg_temp.u('d1'));
select lives_ok(
  $$ select pg_temp.guardar('c6', public.enviar_convite_equipe(pg_temp.t('d'), array[pg_temp.u('d2')])) $$,
  'FR-017: edição em rascunho aceita convites');
reset role;
update public.edicoes set estado = 'encerrada' where id = '10000000-0000-0000-0005-000000000002';
set local role authenticated;
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('d'), array[pg_temp.u('d3')]) $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.',
  'FR-017: edição encerrada recusa envio');
select throws_ok(
  $$ select public.cancelar_convite_equipe(pg_temp.c('c6')) $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.',
  'FR-017: edição encerrada recusa cancelamento');
select pg_temp.como(pg_temp.u('d2'));
select throws_ok(
  $$ select public.responder_convite_equipe(pg_temp.c('c6'), true) $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.',
  'FR-017: edição encerrada recusa aceite');
select is(pg_temp.situacao(pg_temp.c('c6')), 'pendente', 'FR-017: nada é gravado com a edição encerrada');

-- ===========================================================================
-- US2 — trio por convite em turma ímpar (FR-001/003/014, FR-017)
-- ===========================================================================
select pg_temp.como(pg_temp.u('a3'));
select is(public.turma_permite_trio(pg_temp.t('a')), false, 'US2: turma par não permite trio');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('a'), array[pg_temp.u('a4'), pg_temp.u('b1')]) $$,
  '23514', 'Nesta turma não é possível formar trio.', 'US2: convite de trio em turma par é recusado');

select pg_temp.como(pg_temp.u('b4'));
select is(public.turma_permite_trio(pg_temp.t('b')), true, 'US2: turma ímpar sem trio permite trio');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b5'), pg_temp.u('b5')]) $$,
  '23514', 'Escolha colegas diferentes.', 'US2: trio com o mesmo colega duas vezes é recusado');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b5'), pg_temp.u('b6'), pg_temp.u('b7')]) $$,
  '23514', null, 'US2: mais de dois convidados é recusado');

select pg_temp.como(pg_temp.u('b1'));
select lives_ok(
  $$ select pg_temp.guardar('t1', public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b2'), pg_temp.u('b3')])) $$,
  'US2: aluno convida dois colegas para o trio');
select pg_temp.como(pg_temp.u('b6'));
select lives_ok(
  $$ select pg_temp.guardar('t2', public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b4'), pg_temp.u('b5')])) $$,
  'US2: outro convite de trio pendente na turma');
select pg_temp.como(pg_temp.u('b5'));
select lives_ok(
  $$ select pg_temp.guardar('t3', public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b7')])) $$,
  'US2: convite de dupla pendente na mesma turma');
select pg_temp.como(pg_temp.u('b4'));
select lives_ok(
  $$ select pg_temp.guardar('t7', public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b3')])) $$,
  'US2: convite de dupla para quem está num convite de trio');

select pg_temp.como(pg_temp.u('b2'));
select is(public.responder_convite_equipe(pg_temp.c('t1'), true), null, 'US2: primeiro aceite não forma a equipe');
select is(pg_temp.equipe_de(pg_temp.u('b2')), null, 'US2: aceite parcial não é vínculo de equipe');
select is(pg_temp.situacao(pg_temp.c('t1')), 'pendente', 'US2: convite continua pendente para o outro convidado');
select pg_temp.como(pg_temp.u('b6'));
select throws_ok(
  $$ select public.retirar_aceite_convite_equipe(pg_temp.c('t1')) $$,
  '42501', null, 'FR-014: quem não aceitou não retira aceite');
select pg_temp.como(pg_temp.u('b2'));
select lives_ok($$ select public.retirar_aceite_convite_equipe(pg_temp.c('t1')) $$, 'FR-014: quem aceitou retira o aceite');
select is(pg_temp.situacao(pg_temp.c('t1')), 'cancelado', 'FR-014: retirada cancela o convite inteiro');
select is(pg_temp.motivo(pg_temp.c('t1')), 'aceite_retirado', 'FR-014: motivo da retirada');
select ok(
  pg_temp.situacao(pg_temp.c('t2')) = 'pendente' and pg_temp.situacao(pg_temp.c('t3')) = 'pendente'
  and pg_temp.situacao(pg_temp.c('t7')) = 'pendente',
  'FR-014: retirada não cancela os outros convites');

select pg_temp.como(pg_temp.u('b1'));
select lives_ok(
  $$ select pg_temp.guardar('t4', public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b2'), pg_temp.u('b3')])) $$,
  'US2: novo convite de trio');
select pg_temp.como(pg_temp.u('b2'));
select is(public.responder_convite_equipe(pg_temp.c('t4'), true), null, 'US2: aceite parcial');
select pg_temp.como(pg_temp.u('b3'));
select lives_ok($$ select public.responder_convite_equipe(pg_temp.c('t4'), false) $$, 'US2: o outro convidado recusa');
select is(pg_temp.situacao(pg_temp.c('t4')), 'recusado', 'US2: recusa encerra o convite inteiro como recusado');
select is(pg_temp.equipe_de(pg_temp.u('b2')), null, 'US2: quem aceitou continua sem equipe');
select pg_temp.como(pg_temp.u('b2'));
select throws_ok(
  $$ select public.retirar_aceite_convite_equipe(pg_temp.c('t4')) $$,
  '23514', 'Este convite não está mais pendente.', 'FR-014: não há retirada em convite encerrado');

select pg_temp.como(pg_temp.u('b1'));
select lives_ok(
  $$ select pg_temp.guardar('t5', public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b2'), pg_temp.u('b3')])) $$,
  'US2: terceiro convite de trio');
select pg_temp.como(pg_temp.u('b2'));
select is(public.responder_convite_equipe(pg_temp.c('t5'), true), null, 'US2: primeiro aceite');
select pg_temp.como(pg_temp.u('b3'));
select isnt(
  pg_temp.guardar('trio', public.responder_convite_equipe(pg_temp.c('t5'), true)), null,
  'US2: segundo aceite forma o trio');
select is(pg_temp.integrantes(pg_temp.c('trio')), 3, 'US2: trio com três integrantes');
select is(pg_temp.situacao(pg_temp.c('t7')), 'cancelado', 'FR-003: convite de quem entrou no trio é cancelado');
select is(pg_temp.motivo(pg_temp.c('t2')), 'trio_formado', 'FR-003: outros convites de trio da turma são cancelados');
select is(pg_temp.situacao(pg_temp.c('t3')), 'pendente', 'FR-003: convites de dupla de terceiros continuam');
select pg_temp.como(pg_temp.u('b2'));
select throws_ok(
  $$ select public.retirar_aceite_convite_equipe(pg_temp.c('t5')) $$,
  '23514', 'Este convite não está mais pendente.', 'FR-014: depois de formada, não há retirada');

select pg_temp.como(pg_temp.u('b4'));
select is(public.turma_permite_trio(pg_temp.t('b')), false, 'US2: turma com trio não permite outro');
select throws_ok(
  $$ select public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b6'), pg_temp.u('b7')]) $$,
  '23514', 'Nesta turma não é possível formar trio.', 'US2: segundo trio na turma é recusado');

-- Retirada com a edição encerrada (FR-017).
reset role;
update public.edicoes set estado = 'ativa' where id = '10000000-0000-0000-0005-000000000002';
set local role authenticated;
select pg_temp.como(pg_temp.u('d3'));
select lives_ok(
  $$ select pg_temp.guardar('t6', public.enviar_convite_equipe(pg_temp.t('d'), array[pg_temp.u('d1'), pg_temp.u('d2')])) $$,
  'US2: convite de trio na turma ímpar da outra edição');
select pg_temp.como(pg_temp.u('d1'));
select is(public.responder_convite_equipe(pg_temp.c('t6'), true), null, 'US2: aceite parcial antes do encerramento');
reset role;
update public.edicoes set estado = 'encerrada' where id = '10000000-0000-0000-0005-000000000002';
set local role authenticated;
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(
  $$ select public.retirar_aceite_convite_equipe(pg_temp.c('t6')) $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.',
  'FR-017: edição encerrada recusa retirada de aceite');

-- ===========================================================================
-- US4 — gestão forma e altera equipes (FR-006/007/010/012/015, FR-017)
-- ===========================================================================

select pg_temp.como(pg_temp.u('0a'));
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('a'), array[pg_temp.u('a3'), pg_temp.u('a4')],
       'Alunos que sobraram na turma') $$,
  '42501', null, 'FR-007: coordenação não forma equipe');
select pg_temp.como(pg_temp.u('0d'));
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('a'), array[pg_temp.u('a3'), pg_temp.u('a4')],
       'Alunos que sobraram na turma') $$,
  '42501', null, 'FR-010: docente de outra turma não forma equipe');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('a'), array[pg_temp.u('a3'), pg_temp.u('a4')], 'curta') $$,
  '23514', 'Informe uma justificativa com pelo menos 10 caracteres.', 'FR-010: justificativa obrigatória');
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('a'), array[pg_temp.u('a3'), pg_temp.u('a1')],
       'Alunos que sobraram na turma') $$,
  '23514', 'Esta pessoa já está em uma equipe.', 'FR-010: só alunos sem equipe');
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('a'), array[pg_temp.u('a3'), pg_temp.u('c1')],
       'Alunos que sobraram na turma') $$,
  '23514', 'Esta pessoa não é aluna ativa desta turma.', 'FR-010: só alunos da turma');
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('a'), array[pg_temp.u('a3')],
       'Alunos que sobraram na turma') $$,
  '23514', null, 'FR-010: equipe precisa de dois ou três alunos');
select lives_ok(
  $$ select pg_temp.guardar('dp', public.formar_equipe_docente(pg_temp.t('a'),
       array[pg_temp.u('a3'), pg_temp.u('a4')], 'Alunos que sobraram na turma')) $$,
  'FR-010: docente forma equipe com quem sobrou');
select is(pg_temp.integrantes(pg_temp.c('dp')), 2, 'FR-010: equipe formada com os dois alunos');
select ok(pg_temp.auditado('Alunos que sobraram na turma', pg_temp.u('0b')),
  'FR-010: formação auditada com autor e justificativa');

select pg_temp.como(pg_temp.u('0c'));
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('b'), array[pg_temp.u('b4'), pg_temp.u('b5'), pg_temp.u('b6')],
       'Trio dos que sobraram') $$,
  '23514', 'Nesta turma não é possível formar trio.', 'FR-010: trio só em turma ímpar sem trio');
select lives_ok(
  $$ select pg_temp.guardar('db', public.formar_equipe_docente(pg_temp.t('b'),
       array[pg_temp.u('b5'), pg_temp.u('b7')], 'Formada pelo mentor da turma')) $$,
  'FR-010: mentor da turma forma equipe');
select is(pg_temp.motivo(pg_temp.c('t3')), 'aluno_em_equipe', 'FR-010: convites dos envolvidos são cancelados');

-- TX (ímpar, sem trio): formação, inclusão, remoção e substituição.
select pg_temp.como(pg_temp.u('c3'));
select lives_ok(
  $$ select pg_temp.guardar('cx', public.enviar_convite_equipe(pg_temp.t('c'), array[pg_temp.u('c4')])) $$,
  'US4: convite pendente de quem será incluído');
select pg_temp.como(pg_temp.u('0d'));
select lives_ok(
  $$ select pg_temp.guardar('dx', public.formar_equipe_docente(pg_temp.t('c'),
       array[pg_temp.u('c1'), pg_temp.u('c2')], 'Formada pelo docente da turma')) $$,
  'US4: docente forma dupla na turma ímpar');
select throws_ok(
  $$ select public.incluir_integrante(pg_temp.c('dx'), pg_temp.u('c3'), 'curta') $$,
  '23514', null, 'FR-006: inclusão exige justificativa');
select lives_ok(
  $$ select public.incluir_integrante(pg_temp.c('dx'), pg_temp.u('c3'), 'Aluno que ficou sem equipe') $$,
  'US4: docente inclui aluno sem equipe (dupla vira trio)');
select is(pg_temp.integrantes(pg_temp.c('dx')), 3, 'US4: equipe passa a ter três integrantes');
select is(pg_temp.motivo(pg_temp.c('cx')), 'aluno_em_equipe', 'US4: inclusão cancela os convites do aluno');

select pg_temp.como(pg_temp.u('0a'));
select throws_ok(
  $$ select public.incluir_integrante(pg_temp.c('dx'), pg_temp.u('c4'), 'Quarto integrante indevido') $$,
  '23514', 'A equipe já tem três integrantes.', 'US4: equipe não passa de três integrantes');
select throws_ok(
  $$ select public.incluir_integrante(pg_temp.c('db'), pg_temp.u('b4'), 'Segundo trio na turma') $$,
  '23514', 'Nesta turma não é possível formar trio.', 'US4: inclusão não cria segundo trio');
select throws_ok(
  $$ select public.remover_integrante(pg_temp.c('dp'), pg_temp.u('a3'), 'Saída da dupla sem substituto') $$,
  '23514', 'Só é possível remover integrante de trio. Para dupla, substitua o integrante ou desfaça a equipe.',
  'FR-012: remover integrante de dupla é recusado');
select lives_ok(
  $$ select public.remover_integrante(pg_temp.c('dx'), pg_temp.u('c3'), 'Saída do trio aprovada') $$,
  'FR-012: coordenação remove integrante de trio');
select is(pg_temp.integrantes(pg_temp.c('dx')), 2, 'FR-012: trio vira dupla');
select is(pg_temp.equipe_de(pg_temp.u('c3')), null, 'FR-012: removido fica sem equipe');

select pg_temp.como(pg_temp.u('0d'));
select lives_ok(
  $$ select public.substituir_integrante(pg_temp.c('dx'), pg_temp.u('c2'), pg_temp.u('c4'),
       'Troca pedida pela turma') $$,
  'FR-006: docente da turma substitui integrante');
select ok(pg_temp.equipe_de(pg_temp.u('c4')) = pg_temp.c('dx') and pg_temp.equipe_de(pg_temp.u('c2')) is null,
  'FR-006: substituição troca os integrantes');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select public.substituir_integrante(pg_temp.c('db'), pg_temp.u('b5'), pg_temp.u('b1'),
       'Troca com aluno de outra equipe') $$,
  '23514', 'Esta pessoa já está em uma equipe.', 'FR-015: substituto já em outra equipe é recusado');
select ok(
  pg_temp.integrantes(pg_temp.c('trio')) = 3 and pg_temp.equipe_de(pg_temp.u('b5')) = pg_temp.c('db'),
  'FR-015: nenhuma das equipes muda');
select throws_ok(
  $$ select public.desfazer_dupla(pg_temp.c('dx'), 'Docente de outra turma') $$,
  '42501', null, 'FR-006: docente de outra turma não altera equipe');

select pg_temp.como(pg_temp.u('a1'));
select throws_ok(
  $$ select public.desfazer_dupla(pg_temp.equipe_de(pg_temp.u('a1')), 'Quero sair da equipe') $$,
  '42501', null, 'US4: integrante não desfaz a própria equipe');
select throws_ok(
  $$ select public.substituir_integrante(pg_temp.equipe_de(pg_temp.u('a1')), pg_temp.u('a1'),
       pg_temp.u('a3'), 'Quero trocar de equipe') $$,
  '42501', null, 'US4: integrante não troca de equipe');

select pg_temp.como(pg_temp.u('0c'));
select lives_ok(
  $$ select public.desfazer_dupla(pg_temp.c('db'), 'Equipe desfeita pelo mentor') $$,
  'US4: mentor da turma desfaz equipe com justificativa');
select ok(pg_temp.equipe_de(pg_temp.u('b5')) is null and pg_temp.equipe_de(pg_temp.u('b7')) is null,
  'US4: integrantes voltam a ficar sem equipe');

-- Edição encerrada: nenhuma alteração pela gestão (FR-017).
reset role;
update public.edicoes set estado = 'ativa' where id = '10000000-0000-0000-0005-000000000002';
set local role authenticated;
select pg_temp.como(pg_temp.u('0e'));
select lives_ok(
  $$ select pg_temp.guardar('df', public.formar_equipe_docente(pg_temp.t('d'),
       array[pg_temp.u('d1'), pg_temp.u('d2')], 'Formada antes do encerramento')) $$,
  'US4: equipe formada antes do encerramento');
reset role;
update public.edicoes set estado = 'encerrada' where id = '10000000-0000-0000-0005-000000000002';
set local role authenticated;
select throws_ok(
  $$ select public.formar_equipe_docente(pg_temp.t('d'), array[pg_temp.u('d3'), pg_temp.u('d1')], 'Depois do encerramento') $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.', 'FR-017: formação recusada');
select throws_ok(
  $$ select public.incluir_integrante(pg_temp.c('df'), pg_temp.u('d3'), 'Depois do encerramento') $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.', 'FR-017: inclusão recusada');
select throws_ok(
  $$ select public.substituir_integrante(pg_temp.c('df'), pg_temp.u('d1'), pg_temp.u('d3'), 'Depois do encerramento') $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.', 'FR-017: substituição recusada');
select throws_ok(
  $$ select public.remover_integrante(pg_temp.c('df'), pg_temp.u('d1'), 'Depois do encerramento') $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.', 'FR-017: remoção recusada');
select throws_ok(
  $$ select public.desfazer_dupla(pg_temp.c('df'), 'Depois do encerramento') $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.', 'FR-017: desfazer recusado');
select is(pg_temp.integrantes(pg_temp.c('df')), 2, 'FR-017: equipe intacta com a edição encerrada');

-- ===========================================================================
-- US4 — desativação, avisos e leitura de gestão (FR-005/011/013)
-- ===========================================================================
create function pg_temp.inativo_na_gestao(turma uuid, pessoa uuid) returns boolean language sql as $$
  select (x ->> 'integranteInativo')::boolean
  from public.equipes_da_turma_gestao(turma) e, jsonb_array_elements(e.integrantes) x
  where (x ->> 'estudanteId')::uuid = pessoa;
$$;

select pg_temp.como(pg_temp.u('0d'));
select lives_ok(
  $$ select public.incluir_integrante(pg_temp.c('dx'), pg_temp.u('c3'), 'Volta ao trio para teste de aviso') $$,
  'US4: trio refeito na TX');
select pg_temp.como(pg_temp.u('b4'));
select lives_ok(
  $$ select pg_temp.guardar('cb', public.enviar_convite_equipe(pg_temp.t('b'), array[pg_temp.u('b6')])) $$,
  'US4: convite pendente de quem será desativado');

-- A coordenação desativa vínculos (cadastro da spec 002, sem bloqueio da turma).
select pg_temp.como(pg_temp.u('0a'));
select lives_ok(
  $$ update public.atribuicoes set ativo = false
     where usuario_id in (pg_temp.u('b4'), pg_temp.u('c4')) and papel = 'aluno' $$,
  'FR-011: desativação de aluno continua permitida à coordenação');
select is(pg_temp.motivo(pg_temp.c('cb')), 'aluno_inativo', 'FR-011: convites pendentes do desativado são cancelados');
select is(pg_temp.equipe_de(pg_temp.u('c4')), pg_temp.c('dx'), 'FR-011: integrante desativado continua na equipe');

select pg_temp.como(pg_temp.u('0d'));
select is(
  (select count(*)::int from public.equipes_da_turma_gestao(pg_temp.t('c'))), 1,
  'FR-005: docente da turma lê as equipes ativas da turma');
select is(pg_temp.inativo_na_gestao(pg_temp.t('c'), pg_temp.u('c4')), true, 'FR-011: aviso de integrante inativo');
select is(pg_temp.inativo_na_gestao(pg_temp.t('c'), pg_temp.u('c1')), false, 'FR-011: integrante ativo sem aviso');
select ok(
  (select bool_and(x ->> 'nome' is not null)
   from public.equipes_da_turma_gestao(pg_temp.t('c')) e, jsonb_array_elements(e.integrantes) x),
  'FR-011: nome do inativo continua visível para a gestão');
select is(
  (select trio_em_turma_par from public.equipes_da_turma_gestao(pg_temp.t('c'))), true,
  'FR-013: trio em turma que passou a ter número par de alunos ativos é sinalizado');

select pg_temp.como(pg_temp.u('0a'));
select is(
  (select count(*)::int from public.equipes_da_turma_gestao(pg_temp.t('c'))), 1,
  'FR-005: coordenação da edição lê as equipes da turma');
select is(
  (select count(*)::int from public.equipes_da_turma_gestao(pg_temp.t('e'))), 0,
  'FR-005: turma sem equipes devolve lista vazia');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select * from public.equipes_da_turma_gestao(pg_temp.t('c')) $$,
  '42501', null, 'FR-005: docente de outra turma não lê a gestão da turma');
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(
  $$ select * from public.equipes_da_turma_gestao(pg_temp.t('c')) $$,
  '42501', null, 'FR-005: aluno não lê a leitura de gestão');
select throws_ok(
  $$ select * from public.equipes_da_turma_gestao('30000000-0000-0000-0005-0000000000f0') $$,
  '42501', null, 'FR-005: turma inexistente recebe a mesma recusa');

select pg_temp.como(pg_temp.u('0a'));
select lives_ok(
  $$ update public.atribuicoes set ativo = true where usuario_id = pg_temp.u('c4') and papel = 'aluno' $$,
  'FR-011: reativação de aluno');
select pg_temp.como(pg_temp.u('0d'));
select is(pg_temp.inativo_na_gestao(pg_temp.t('c'), pg_temp.u('c4')), false, 'FR-011: aviso some após a reativação');
select is(
  (select trio_em_turma_par from public.equipes_da_turma_gestao(pg_temp.t('c'))), false,
  'FR-013: aviso de trio some quando a turma volta a ser ímpar');

-- ===========================================================================
-- US3 — nome da equipe (FR-008, FR-017)
-- ===========================================================================
select pg_temp.como(pg_temp.u('0a'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('d1'), 'Nome da coordenação') $$,
  '42501', null, 'FR-008: coordenação não escolhe o primeiro nome');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('d1'), 'Nome da docente') $$,
  '42501', null, 'FR-008: docente não escolhe o primeiro nome');
select pg_temp.como(pg_temp.u('a3'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('d1'), 'Nome de fora') $$,
  '42501', 'Somente integrantes da equipe podem escolher o nome.', 'FR-008: quem não é da equipe não escolhe');

select pg_temp.como(pg_temp.u('a1'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('d1'), 'X') $$,
  '23514', 'Informe um nome de 2 a 80 caracteres.', 'FR-008: nome com tamanho válido');
select lives_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('d1'), '  Equipe Órbita  ') $$,
  'FR-008: integrante escolhe o nome');
select is((select nome from public.duplas where id = pg_temp.c('d1')), 'Equipe Órbita', 'FR-008: nome gravado sem espaços extras');
select pg_temp.como(pg_temp.u('a2'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('d1'), 'Outro nome') $$,
  '23514', 'A equipe já escolheu o nome; só docente ou mentor da turma podem alterá-lo.',
  'FR-008: o nome só é escolhido uma vez');
select throws_ok(
  $$ select public.renomear_equipe(pg_temp.c('d1'), 'Outro nome', 'Aluno tentando renomear') $$,
  '42501', null, 'FR-008: aluno não renomeia');

select pg_temp.como(pg_temp.u('a3'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('dp'), 'equipe órbita') $$,
  '23514', 'Já existe uma equipe com este nome na turma.', 'FR-008: nome único na turma, sem diferenciar maiúsculas');

select pg_temp.como(pg_temp.u('c2'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('dx'), 'Nome de ex-integrante') $$,
  '42501', null, 'FR-008: ex-integrante não escolhe o nome');
reset role;
update public.atribuicoes set ativo = false where usuario_id = pg_temp.u('c1') and papel = 'aluno';
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('dx'), 'Nome de inativo') $$,
  '42501', null, 'FR-008: integrante com vínculo inativo não escolhe o nome');
reset role;
update public.atribuicoes set ativo = true where usuario_id = pg_temp.u('c1') and papel = 'aluno';
set local role authenticated;

select pg_temp.como(pg_temp.u('0a'));
select throws_ok(
  $$ select public.renomear_equipe(pg_temp.c('d1'), 'Nome da coordenação', 'Coordenação tentando renomear') $$,
  '42501', null, 'FR-008: coordenação não renomeia');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok(
  $$ select public.renomear_equipe(pg_temp.c('d1'), 'Equipe Vetor', 'curta') $$,
  '23514', 'Informe uma justificativa com pelo menos 10 caracteres.', 'FR-008: renomear exige justificativa');
select throws_ok(
  $$ select public.renomear_equipe(pg_temp.c('dp'), 'Equipe Nova', 'Antes da escolha dos alunos') $$,
  '23514', 'A equipe ainda não escolheu o nome.', 'FR-008: gestão não dá o primeiro nome por renomeação');
select lives_ok(
  $$ select public.renomear_equipe(pg_temp.c('d1'), 'Equipe Vetor', 'Nome inadequado para o evento') $$,
  'FR-008: docente da turma renomeia com justificativa');
select is((select nome from public.duplas where id = pg_temp.c('d1')), 'Equipe Vetor', 'FR-008: novo nome gravado');
select ok(
  (select nome_definido_em is not null from public.duplas where id = pg_temp.c('d1')),
  'FR-008: a escolha continua registrada após renomear');
select ok(pg_temp.auditado_dupla('Nome inadequado para o evento', pg_temp.u('0b')),
  'FR-008: renomeação auditada com autor e justificativa');

-- Edição encerrada (FR-017).
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(
  $$ select public.definir_nome_equipe(pg_temp.c('df'), 'Nome tardio') $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.', 'FR-017: nome recusado');
select pg_temp.como(pg_temp.u('0e'));
select throws_ok(
  $$ select public.renomear_equipe(pg_temp.c('df'), 'Nome tardio', 'Depois do encerramento') $$,
  '23514', 'A edição está encerrada; as equipes não podem mais ser alteradas.', 'FR-017: renomeação recusada');

reset role;
select * from finish();
rollback;
