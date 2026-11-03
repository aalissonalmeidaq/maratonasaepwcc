-- Testes da spec 008 — painéis com dados reais e relatórios CSV.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício. Edição E (ativa, regras completas do piloto):
--   curso "Cat 1": turma TA (a1+a2 = A1, a3+a4 = A2, a5 sem equipe) e turma TB (b1+b2 = B1);
--   curso "Cat 2": turma TC (c1+c2 = C1, c3+c4 = C2, sem lançamentos).
--   0a = coordenação de E; 0b = docente de TA; 0c = mentor de TA; 0d = docente de TB.
--   Encontro 1 no passado (realizado pela data); encontro 2 no futuro; encontro 3 cancelado no
--   passado; encontro 4 (prova oficial) no futuro.
-- Edição G (encerrada) com coordenação 0f, docente 0d em TG, turma TG, equipe G1 (f1+f2) e um encontro passado.
-- As equipes foram formadas há 30 dias, antes de todos os encontros.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0009-0000000000' || s)::uuid, 'p' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('0c'), ('0d'), ('0f'),
             ('a1'), ('a2'), ('a3'), ('a4'), ('a5'), ('b1'), ('b2'),
             ('c1'), ('c2'), ('c3'), ('c4'), ('f1'), ('f2')) as v (s);

create function pg_temp.regras() returns jsonb language sql immutable as $$
  select '{"versao":"piloto-2026.0-a-confirmar","quantidadeEncontros":4,"casasDecimais":2,"presenca":{"pontosPorIntegrante":5,"maximoPorDupla":10},"participacao":{"criterios":[{"id":"envolvimento","rotulo":"Envolvimento nas atividades","maximo":4},{"id":"colaboracao","rotulo":"Colaboração","maximo":3},{"id":"organizacao","rotulo":"Organização e cumprimento das orientações","maximo":3}]},"questoes":{"maximo":30},"entrega":{"criterios":[{"id":"compreensao","rotulo":"Compreensão do problema","maximo":10},{"id":"aplicacao","rotulo":"Aplicação de conhecimentos técnicos","maximo":10},{"id":"qualidade","rotulo":"Qualidade e adequação da solução","maximo":10},{"id":"organizacao","rotulo":"Organização e entrega","maximo":10}],"criterioDeAtraso":"organizacao","faixasDeAtraso":[{"ateMinutos":15,"desconto":2},{"ateMinutos":30,"desconto":5}],"limiteAtrasoMinutos":30},"apresentacao":{"criterios":[{"id":"clareza","rotulo":"Clareza","maximo":3},{"id":"explicacao","rotulo":"Explicação das decisões e etapas","maximo":4},{"id":"respostas","rotulo":"Respostas às perguntas","maximo":3}]},"provaOficial":{"pontosRealizacao":5,"notaMinimaBonus":70,"pontosBonus":10,"maximoPorDupla":30},"penalidades":{"tetoDescontosPorEncontro":10,"tipos":[{"id":"reincidencia","rotulo":"Reincidência após orientação registrada","pontos":2},{"id":"desrespeito","rotulo":"Desrespeito com responsabilidade da equipe","pontos":5},{"id":"uso_nao_autorizado","rotulo":"Uso não autorizado","pontos":5},{"id":"plagio","rotulo":"Plágio comprovado","zeraEntrega":true}]},"prazos":{"manifestacaoHoras":24,"revisaoHoras":24}}'::jsonb;
$$;

insert into public.edicoes (id, nome, estado, regras, regras_versao)
select id::uuid, nome, 'ativa', pg_temp.regras(), 'piloto-2026.0-a-confirmar'
from (values ('10000000-0000-0000-0009-000000000001', 'Edição painéis'),
             ('10000000-0000-0000-0009-000000000003', 'Edição encerrada')) as v (id, nome);
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0009-000000000001', '10000000-0000-0000-0009-000000000001', 'Curso 1', 'Cat 1'),
  ('20000000-0000-0000-0009-000000000002', '10000000-0000-0000-0009-000000000001', 'Curso 2', 'Cat 2'),
  ('20000000-0000-0000-0009-000000000003', '10000000-0000-0000-0009-000000000003', 'Curso G', 'Cat G');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0009-0000000000a0', '20000000-0000-0000-0009-000000000001', 'TA'),
  ('30000000-0000-0000-0009-0000000000b0', '20000000-0000-0000-0009-000000000001', 'TB'),
  ('30000000-0000-0000-0009-0000000000c0', '20000000-0000-0000-0009-000000000002', 'TC'),
  ('30000000-0000-0000-0009-0000000000e0', '20000000-0000-0000-0009-000000000003', 'TG');
insert into public.encontros (id, edicao_id, numero, titulo, data, inicio, avaliacao_objetiva, estado) values
  ('50000000-0000-0000-0009-000000000001', '10000000-0000-0000-0009-000000000001', 1, 'Encontro passado', current_date - 7, '13:30', 'questoes', 'agendado'),
  ('50000000-0000-0000-0009-000000000002', '10000000-0000-0000-0009-000000000001', 2, 'Encontro futuro', current_date + 7, '13:30', 'questoes', 'agendado'),
  ('50000000-0000-0000-0009-000000000003', '10000000-0000-0000-0009-000000000001', 3, 'Encontro cancelado', current_date - 3, null, 'questoes', 'cancelado'),
  ('50000000-0000-0000-0009-000000000004', '10000000-0000-0000-0009-000000000001', 4, 'Encontro da prova', current_date + 14, null, 'prova_oficial', 'agendado'),
  ('50000000-0000-0000-0009-0000000000f1', '10000000-0000-0000-0009-000000000003', 1, 'Encontro da edição G', current_date - 2, null, 'questoes', 'realizado');

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0009-0000000000' || s)::uuid;
$$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0009-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.d(s text) returns uuid language sql immutable as $$
  select ('40000000-0000-0000-0009-0000000000' || s)::uuid;
$$;
create function pg_temp.en(n text) returns uuid language sql immutable as $$
  select ('50000000-0000-0000-0009-0000000000' || lpad(n, 2, '0'))::uuid;
$$;
create function pg_temp.e() returns uuid language sql immutable as $$
  select '10000000-0000-0000-0009-000000000001'::uuid;
$$;
create function pg_temp.g() returns uuid language sql immutable as $$
  select '10000000-0000-0000-0009-000000000003'::uuid;
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
create function pg_temp.executar(comando text) returns void language plpgsql security definer as $$
begin
  execute comando;
end;
$$;
-- Verdadeiro se o JSON contém, em qualquer nível, uma chave com o nome dado.
create function pg_temp.tem_chave(j jsonb, chave text) returns boolean language sql immutable as $$
  select j::text ~ ('"' || chave || '"\s*:');
$$;

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select pg_temp.u(u), pg_temp.e(), p::public.papel,
       case when t is null then null else pg_temp.t(t) end
from (values ('0a', 'coordenacao', null), ('0b', 'docente', 'a'), ('0c', 'mentor', 'a'),
             ('0d', 'docente', 'b'),
             ('a1', 'aluno', 'a'), ('a2', 'aluno', 'a'), ('a3', 'aluno', 'a'), ('a4', 'aluno', 'a'),
             ('a5', 'aluno', 'a'), ('b1', 'aluno', 'b'), ('b2', 'aluno', 'b'),
             ('c1', 'aluno', 'c'), ('c2', 'aluno', 'c'), ('c3', 'aluno', 'c'), ('c4', 'aluno', 'c')) as v (u, p, t);
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  (pg_temp.u('0f'), pg_temp.g(), 'coordenacao', null),
  (pg_temp.u('0d'), pg_temp.g(), 'docente', pg_temp.t('e')),
  (pg_temp.u('f1'), pg_temp.g(), 'aluno', pg_temp.t('e')),
  (pg_temp.u('f2'), pg_temp.g(), 'aluno', pg_temp.t('e'));

insert into public.duplas (id, edicao_id, turma_id, nome) values
  (pg_temp.d('a1'), pg_temp.e(), pg_temp.t('a'), 'Equipe A1'),
  (pg_temp.d('a2'), pg_temp.e(), pg_temp.t('a'), 'Equipe A2'),
  (pg_temp.d('b1'), pg_temp.e(), pg_temp.t('b'), 'Equipe B1'),
  (pg_temp.d('c1'), pg_temp.e(), pg_temp.t('c'), 'Equipe C1'),
  (pg_temp.d('c2'), pg_temp.e(), pg_temp.t('c'), 'Equipe C2'),
  (pg_temp.d('f1'), pg_temp.g(), pg_temp.t('e'), 'Equipe G1');
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id, entrada_em)
select pg_temp.d(d), case when d = 'f1' then pg_temp.g() else pg_temp.e() end, pg_temp.u(u),
       now() - interval '30 days'
from (values ('a1', 'a1'), ('a1', 'a2'), ('a2', 'a3'), ('a2', 'a4'), ('b1', 'b1'), ('b1', 'b2'),
             ('c1', 'c1'), ('c1', 'c2'), ('c2', 'c3'), ('c2', 'c4'), ('f1', 'f1'), ('f1', 'f2')) as v (d, u);
update public.edicoes set estado = 'encerrada' where id = pg_temp.g();

-- ===========================================================================
-- Fundação — exportacoes_relatorio e encontro realizado (T003, FR-004a, FR-009)
-- ===========================================================================
select has_table('public', 'exportacoes_relatorio', 'Fundação: tabela exportacoes_relatorio existe');
select ok(coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = 'exportacoes_relatorio'), false),
  'Fundação: RLS habilitada em exportacoes_relatorio');
select ok(
  to_regclass('public.exportacoes_relatorio') is not null
  and not has_table_privilege('authenticated', 'public.exportacoes_relatorio', 'insert')
  and not has_table_privilege('authenticated', 'public.exportacoes_relatorio', 'update')
  and not has_table_privilege('authenticated', 'public.exportacoes_relatorio', 'delete')
  and not has_table_privilege('anon', 'public.exportacoes_relatorio', 'select'),
  'Fundação: sem escrita direta para authenticated e sem acesso para anon');
select throws_ok(
  $$ insert into public.exportacoes_relatorio (edicao_id, tipo, filtros, linhas, autor_id)
     values (pg_temp.e(), 'notas', '{}', 0, pg_temp.u('0a')) $$,
  '23514', null, 'Fundação: tipo fora dos cinco relatórios é recusado');
select throws_ok(
  $$ insert into public.exportacoes_relatorio (edicao_id, tipo, filtros, linhas, autor_id)
     values (pg_temp.e(), 'pontos', '{}', -1, pg_temp.u('0a')) $$,
  '23514', null, 'Fundação: quantidade de linhas não pode ser negativa');
select lives_ok(
  $$ insert into public.exportacoes_relatorio (edicao_id, tipo, filtros, linhas, autor_id)
     select pg_temp.e(), t, '{}', 0, pg_temp.u('0a')
     from unnest(array['pontos', 'presenca', 'entregas', 'ocorrencias', 'revisoes']) t $$,
  'Fundação: os cinco tipos são aceitos');
select ok((select count(*) = 5 from public.auditoria where tabela = 'exportacoes_relatorio' and acao = 'INSERT'),
  'Fundação: a inserção é auditada');
delete from public.exportacoes_relatorio;

select is(app.encontro_realizado(pg_temp.en('1')), true, 'R2: data passada não cancelada é realizado');
select is(app.encontro_realizado(pg_temp.en('2')), false, 'R2: encontro futuro não é realizado');
select is(app.encontro_realizado(pg_temp.en('3')), false, 'R2: encontro cancelado não é realizado');
update public.encontros set estado = 'realizado' where id = pg_temp.en('2');
select is(app.encontro_realizado(pg_temp.en('2')), true, 'R2: estado "realizado" conta mesmo com data futura');
update public.encontros set estado = 'agendado' where id = pg_temp.en('2');
update public.encontros set data = (now() at time zone 'America/Sao_Paulo')::date where id = pg_temp.en('1');
select is(app.encontro_realizado(pg_temp.en('1')), false, 'R2: encontro de hoje só conta no dia seguinte');
update public.encontros set data = current_date - 7 where id = pg_temp.en('1');

-- ===========================================================================
-- US1 — painel do aluno (T007, FR-002, FR-006, FR-014)
-- Lançamentos: presença de a1 e a2 no encontro 1. Prazos abertos: lista L1 da TA (1 dia),
-- desafio D1 da TA (2 dias); o desafio de TB e o rascunho da TA não contam.
-- Ocorrência registrada para A1 (manifestação no prazo) e dois avisos de a1 (um lido).
-- ===========================================================================
insert into public.presencas (encontro_id, estudante_id, turma_id, presente) values
  (pg_temp.en('1'), pg_temp.u('a1'), pg_temp.t('a'), true),
  (pg_temp.en('1'), pg_temp.u('a2'), pg_temp.t('a'), true);
insert into public.desafios (id, edicao_id, encontro_id, titulo, enunciado, recursos_permitidos,
                             politica_ia, prazo, estado) values
  ('60000000-0000-0000-0009-000000000001', pg_temp.e(), pg_temp.en('2'), 'Desafio D1', 'Enunciado.', '', '', now() + interval '2 days', 'publicado'),
  ('60000000-0000-0000-0009-000000000002', pg_temp.e(), pg_temp.en('2'), 'Desafio de TB', 'Enunciado.', '', '', now() + interval '1 hour', 'publicado'),
  ('60000000-0000-0000-0009-000000000003', pg_temp.e(), pg_temp.en('2'), 'Rascunho da TA', 'Enunciado.', '', '', now() + interval '30 minutes', 'rascunho');
insert into public.desafio_turmas (desafio_id, turma_id) values
  ('60000000-0000-0000-0009-000000000001', pg_temp.t('a')),
  ('60000000-0000-0000-0009-000000000002', pg_temp.t('b')),
  ('60000000-0000-0000-0009-000000000003', pg_temp.t('a'));
insert into public.listas_questoes (id, edicao_id, encontro_id, titulo, prazo, estado) values
  ('70000000-0000-0000-0009-000000000001', pg_temp.e(), pg_temp.en('2'), 'Lista L1', now() + interval '1 day', 'publicado');
insert into public.lista_turmas (lista_id, turma_id) values
  ('70000000-0000-0000-0009-000000000001', pg_temp.t('a'));
insert into public.ocorrencias (id, edicao_id, encontro_id, dupla_id, tipo, fato, fato_chave, evidencia,
                                prazo_manifestacao, chave_envio, autor_id)
values ('c0000000-0000-0000-0009-000000000001', pg_temp.e(), pg_temp.en('1'), pg_temp.d('a1'), 'reincidencia',
        'Fato fictício descrito com detalhes.', 'f1', 'Relato.', now() + interval '24 hours',
        gen_random_uuid(), pg_temp.u('0b'));
insert into public.avisos (destinatario_id, tipo, titulo, lido_em) values
  (pg_temp.u('a1'), 'ocorrencia_registrada', 'Aviso fictício 1', null),
  (pg_temp.u('a1'), 'ranking_publicado', 'Aviso fictício 2', now());

set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select pg_temp.guardar('pa', public.painel_do_aluno(pg_temp.e())::text);
select is(pg_temp.lido('pa')::jsonb -> 'equipe' ->> 'nome', 'Equipe A1', 'US1: a equipe da aluna');
select is((pg_temp.lido('pa')::jsonb -> 'previa' ->> 'total')::numeric,
          (app.totais_da_equipe(pg_temp.d('a1')) -> 'totais' ->> 'total')::numeric,
  'SC-001: prévia igual a app.totais_da_equipe');
select is((pg_temp.lido('pa')::jsonb -> 'previa' ->> 'pendente')::boolean, true, 'US1: prévia com pendências');
select is(pg_temp.lido('pa')::jsonb -> 'ranking', 'null'::jsonb, 'US1: sem publicação, ranking nulo');
select is(pg_temp.lido('pa')::jsonb -> 'proximoEncontro' ->> 'id', pg_temp.en('2')::text,
  'US1: próximo encontro é o futuro (não o cancelado nem o passado)');
select is(pg_temp.lido('pa')::jsonb -> 'proximoEncontro' ->> 'inicio', '13:30', 'US1: horário do próximo encontro');
select is(pg_temp.lido('pa')::jsonb -> 'proximoPrazo' ->> 'titulo', 'Lista L1',
  'US1: prazo aberto mais próximo da turma (sem outra turma nem rascunho)');
select is(pg_temp.lido('pa')::jsonb -> 'proximoPrazo' ->> 'tipo', 'lista', 'US1: o prazo indica o tipo');
select ok(pg_temp.lido('pa')::jsonb -> 'acoes' @> '[{"tipo":"manifestacao","caminho":"/aluno/ocorrencias"}]',
  'US1: a manifestação pendente aparece com o caminho');
select is((pg_temp.lido('pa')::jsonb ->> 'avisosNaoLidos')::int, (public.meus_avisos() ->> 'naoLidos')::int,
  'SC-001: avisos não lidos iguais a meus_avisos');
select is((pg_temp.lido('pa')::jsonb ->> 'avisosNaoLidos')::int, 1, 'US1: só o aviso não lido conta');
select ok(not pg_temp.tem_chave(pg_temp.lido('pa')::jsonb, 'nota'), 'FR-006: painel sem a chave nota');
select ok(position(pg_temp.d('a2')::text in pg_temp.lido('pa')) = 0, 'FR-006: nada de outra equipe');

-- Publicação do ranking parcial da Cat 1.
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.publicar_ranking(pg_temp.e(), 'Cat 1', 'parcial') $$, 'US1: coordenação publica o parcial');
select pg_temp.como(pg_temp.u('a1'));
select is(public.painel_do_aluno(pg_temp.e()) -> 'ranking' -> 'posicao',
          (select p -> 'posicao' from jsonb_array_elements(public.ranking_publicado(pg_temp.e()) -> 'posicoes') p
           where (p ->> 'minha')::boolean),
  'SC-001: posição igual à de ranking_publicado');
select is(public.painel_do_aluno(pg_temp.e()) -> 'ranking' ->> 'estado', 'parcial', 'US1: estado da publicação');
select is((public.painel_do_aluno(pg_temp.e()) -> 'ranking' ->> 'versao')::int, 1, 'US1: versão da publicação');
select ok(not pg_temp.tem_chave(public.painel_do_aluno(pg_temp.e()), 'nota'), 'FR-006: sem nota depois da publicação');

-- Aluno sem equipe.
select pg_temp.como(pg_temp.u('a5'));
select is(public.painel_do_aluno(pg_temp.e()) -> 'equipe', 'null'::jsonb, 'US1: sem equipe, equipe nula');
select is(public.painel_do_aluno(pg_temp.e()) -> 'previa', 'null'::jsonb, 'US1: sem equipe, prévia nula');
select is(public.painel_do_aluno(pg_temp.e()) -> 'ranking', 'null'::jsonb, 'US1: sem equipe, ranking nulo');
select is(public.painel_do_aluno(pg_temp.e()) -> 'proximoEncontro' ->> 'id', pg_temp.en('2')::text,
  'US1: sem equipe, ainda vê os encontros');

-- Edição encerrada: só leitura, sem ações (FR-014).
select pg_temp.como(pg_temp.u('f1'));
select lives_ok($$ select public.painel_do_aluno(pg_temp.g()) $$, 'FR-014: edição encerrada continua respondendo');
select is(public.painel_do_aluno(pg_temp.g()) -> 'equipe' ->> 'nome', 'Equipe G1', 'FR-014: equipe na edição encerrada');
select is(public.painel_do_aluno(pg_temp.g()) -> 'acoes', '[]'::jsonb, 'FR-014: edição encerrada não pede ações');

-- Outros perfis.
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.painel_do_aluno(pg_temp.e()) $$, '42501', null, 'US1: docente é recusado');
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select public.painel_do_aluno(pg_temp.e()) $$, '42501', null, 'US1: coordenação é recusada');
reset role;

-- ===========================================================================
-- US2 — painel da equipe docente (T011, FR-003, FR-004a, FR-006, FR-014)
-- Desafio D0 (encontro 1, TA) com entrega de A1 sem avaliação; entrega de A2 no D1 (encontro 2,
-- futuro) também sem avaliação, que não conta.
-- ===========================================================================
insert into public.desafios (id, edicao_id, encontro_id, titulo, enunciado, recursos_permitidos,
                             politica_ia, prazo, estado) values
  ('60000000-0000-0000-0009-000000000000', pg_temp.e(), pg_temp.en('1'), 'Desafio D0', 'Enunciado.', '', '', now() - interval '7 days', 'encerrado');
insert into public.desafio_turmas (desafio_id, turma_id) values
  ('60000000-0000-0000-0009-000000000000', pg_temp.t('a'));
insert into public.entregas (desafio_id, dupla_id, versao, autor_id, protocolo, link, chave_envio) values
  ('60000000-0000-0000-0009-000000000000', pg_temp.d('a1'), 1, pg_temp.u('a1'), 'P9-1', 'https://exemplo.invalid/1', gen_random_uuid()),
  ('60000000-0000-0000-0009-000000000001', pg_temp.d('a2'), 1, pg_temp.u('a3'), 'P9-2', 'https://exemplo.invalid/2', gen_random_uuid());
create function pg_temp.pendencias_ta(p jsonb) returns jsonb language sql immutable as $$
  select coalesce((select t -> 'pendencias' from jsonb_array_elements(p -> 'turmas') t where t ->> 'nome' = 'TA'), '[]');
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select pg_temp.guardar('pg', public.painel_da_gestao(pg_temp.e())::text);
select is((select jsonb_agg(t ->> 'nome') from jsonb_array_elements(pg_temp.lido('pg')::jsonb -> 'turmas') t),
  '["TA"]'::jsonb, 'US2: docente de TA vê só TA');
select is(pg_temp.lido('pg')::jsonb -> 'proximoEncontro' ->> 'id', pg_temp.en('2')::text, 'US2: próximo encontro');
select ok(pg_temp.pendencias_ta(pg_temp.lido('pg')::jsonb)
          @> '[{"tipo":"presenca","encontroNumero":1,"caminho":"/docente/presenca"}]',
  'US2: presença não registrada no encontro 1 (realizado)');
select ok((select bool_and(x ->> 'descricao' like '%3 estudantes%')
           from jsonb_array_elements(pg_temp.pendencias_ta(pg_temp.lido('pg')::jsonb)) x where x ->> 'tipo' = 'presenca'),
  'US2: a pendência de presença conta os 3 estudantes sem registro');
select ok(not exists (select 1 from jsonb_array_elements(pg_temp.pendencias_ta(pg_temp.lido('pg')::jsonb)) x
                      where (x ->> 'encontroNumero')::int in (2, 3, 4)),
  'FR-004a: nenhuma pendência de encontro futuro ou cancelado');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.pendencias_ta(pg_temp.lido('pg')::jsonb)) x
                  where x ->> 'tipo' = 'participacao' and x ->> 'descricao' like '%Equipe A2%'),
  'US2: participação não registrada por equipe');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.pendencias_ta(pg_temp.lido('pg')::jsonb)) x
                  where x ->> 'tipo' = 'avaliacao' and x ->> 'descricao' like '%Equipe A1%Desafio D0%'
                    and x ->> 'caminho' = '/docente/avaliacoes'),
  'US2: entrega recebida sem avaliação');
select ok(not exists (select 1 from jsonb_array_elements(pg_temp.pendencias_ta(pg_temp.lido('pg')::jsonb)) x
                      where x ->> 'descricao' like '%Desafio D1%'),
  'FR-004a: entrega do encontro futuro não gera pendência');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.pendencias_ta(pg_temp.lido('pg')::jsonb)) x
                  where x ->> 'tipo' = 'ocorrencia' and x ->> 'caminho' = '/docente/ocorrencias'),
  'US2: ocorrência sem decisão listada');
select is((select (t ->> 'equipesPendentes')::int from jsonb_array_elements(pg_temp.lido('pg')::jsonb -> 'turmas') t),
          (select count(*)::int from public.duplas d
           where d.turma_id = pg_temp.t('a') and d.ativa and (app.totais_da_equipe(d.id) -> 'totais' ->> 'pendente')::boolean),
  'SC-001: equipes com pendência iguais às dos totais');
select is((select (t ->> 'equipes')::int from jsonb_array_elements(pg_temp.lido('pg')::jsonb -> 'turmas') t), 2,
  'US2: quantidade de equipes ativas da turma');
select ok(not pg_temp.tem_chave(pg_temp.lido('pg')::jsonb, 'nota'), 'FR-006/SC-002: painel sem a chave nota');

-- Registrar a avaliação e a presença remove as pendências.
select lives_ok($$ select public.registrar_avaliacao('60000000-0000-0000-0009-000000000000', pg_temp.d('a1'),
  '{"compreensao":10,"aplicacao":10,"qualidade":10,"organizacao":10}', '{"clareza":3,"explicacao":4,"respostas":3}',
  false, 'Feedback fictício.', null) $$, 'US2: docente registra a avaliação');
select ok(not exists (select 1 from jsonb_array_elements(pg_temp.pendencias_ta(public.painel_da_gestao(pg_temp.e()))) x
                      where x ->> 'tipo' = 'avaliacao'),
  'US2: a pendência de avaliação some depois do registro');
select lives_ok($$ select public.registrar_presencas(pg_temp.en('1'), pg_temp.t('a'),
  jsonb_build_array(jsonb_build_object('estudanteId', pg_temp.u('a3'), 'presente', true),
                    jsonb_build_object('estudanteId', pg_temp.u('a4'), 'presente', false),
                    jsonb_build_object('estudanteId', pg_temp.u('a5'), 'presente', true)), null) $$,
  'US2: docente registra a presença que faltava');
select ok(not exists (select 1 from jsonb_array_elements(pg_temp.pendencias_ta(public.painel_da_gestao(pg_temp.e()))) x
                      where x ->> 'tipo' = 'presenca'),
  'US2: a pendência de presença some depois do registro');

-- Outras turmas e perfis.
select pg_temp.como(pg_temp.u('0d'));
select is((select jsonb_agg(t ->> 'nome') from jsonb_array_elements(public.painel_da_gestao(pg_temp.e()) -> 'turmas') t),
  '["TB"]'::jsonb, 'US2: docente de TB não vê TA');
select ok(position('Equipe A' in public.painel_da_gestao(pg_temp.e())::text) = 0,
  'US2: nenhum item de TA para o docente de TB');
select lives_ok($$ select public.painel_da_gestao(pg_temp.g()) $$, 'FR-014: edição encerrada continua respondendo');
select is((select jsonb_agg(t ->> 'nome') from jsonb_array_elements(public.painel_da_gestao(pg_temp.g()) -> 'turmas') t),
  '["TG"]'::jsonb, 'FR-014: turmas da edição encerrada');
select pg_temp.como(pg_temp.u('0c'));
select is((select jsonb_agg(t ->> 'nome') from jsonb_array_elements(public.painel_da_gestao(pg_temp.e()) -> 'turmas') t),
  '["TA"]'::jsonb, 'US2: mentor de TA vê TA');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.painel_da_gestao(pg_temp.e()) $$, '42501', null, 'US2: aluno é recusado');
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select public.painel_da_gestao(pg_temp.e()) $$, '42501', null,
  'US2: coordenação sem vínculo de docente é recusada');
reset role;

-- ===========================================================================
-- US3 — painel da coordenação (T015, FR-004, FR-004a, FR-006, FR-014)
-- Estado: Cat 1 publicada (parcial, v1); ocorrência de A1 sem decisão; Cat 2 sem publicação.
-- ===========================================================================
create function pg_temp.cat(p jsonb, nome text) returns jsonb language sql immutable as $$
  select c from jsonb_array_elements(p -> 'categorias') c where c ->> 'categoria' = nome;
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select pg_temp.guardar('pc', public.painel_da_coordenacao(pg_temp.e())::text);
select is(pg_temp.lido('pc')::jsonb -> 'indicadores',
  '{"cursos":2,"turmas":3,"equipes":5,"estudantes":11,"encontrosRealizados":1,"encontrosTotal":3}'::jsonb,
  'US3: indicadores da edição (o encontro cancelado fica fora do total)');
select is((select jsonb_agg(c ->> 'categoria') from jsonb_array_elements(pg_temp.lido('pc')::jsonb -> 'categorias') c),
  '["Cat 1","Cat 2"]'::jsonb, 'US3: uma linha por categoria');
select is((pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 1') ->> 'componentesPendentes')::int,
          jsonb_array_length(app.pendencias_realizadas_da_categoria(pg_temp.e(), 'Cat 1') -> 'componentes'),
  'SC-001: componentes pendentes iguais às pendências dos encontros realizados');
select ok((select bool_and((c ->> 'encontroNumero')::int = 1)
           from jsonb_array_elements(app.pendencias_realizadas_da_categoria(pg_temp.e(), 'Cat 1') -> 'componentes') c)
          and jsonb_array_length(app.pendencias_realizadas_da_categoria(pg_temp.e(), 'Cat 1') -> 'componentes')
              < jsonb_array_length(app.pendencias_da_categoria(pg_temp.e(), 'Cat 1') -> 'componentes'),
  'FR-004a: só encontros realizados; a lista completa da spec 007 não muda');
select is((pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 1') ->> 'ocorrenciasSemDecisao')::int,
          jsonb_array_length(public.pendencias_da_categoria(pg_temp.e(), 'Cat 1') -> 'ocorrencias'),
  'SC-001: ocorrências sem decisão iguais às da spec 007');
select is((pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 1') ->> 'ocorrenciasSemDecisao')::int, 1,
  'US3: a ocorrência registrada de A1 conta');
select is((pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 1') ->> 'revisoesAbertas')::int,
          jsonb_array_length(public.pendencias_da_categoria(pg_temp.e(), 'Cat 1') -> 'revisoes'),
  'SC-001: revisões abertas iguais às da spec 007');
select is((pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 1') ->> 'provasPendentes')::int, 0,
  'FR-004a: prova de encontro futuro não gera pendência');
select is(pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 1') -> 'publicacao' ->> 'estado', 'parcial',
  'US3: última publicação da categoria');
select is((pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 1') -> 'publicacao' ->> 'versao')::int, 1,
  'US3: versão da última publicação');
select is(pg_temp.cat(pg_temp.lido('pc')::jsonb, 'Cat 2') -> 'publicacao', 'null'::jsonb,
  'US3: categoria sem publicação');
select ok(not pg_temp.tem_chave(pg_temp.lido('pc')::jsonb, 'nota'), 'FR-006/SC-002: painel sem a chave nota');

-- Prova realizada: integrantes sem resultado e resultados pendentes contam; nota confirmada não.
reset role;
update public.encontros set data = current_date - 1 where id = pg_temp.en('4');
insert into public.resultados_prova (encontro_id, estudante_id, dupla_id, realizacao, nota, nota_estado, fonte,
                                     escala_confirmada, autorizacao_confirmada) values
  (pg_temp.en('4'), pg_temp.u('a1'), pg_temp.d('a1'), 'confirmada', 80, 'confirmada', 'Planilha fictícia', true, true),
  (pg_temp.en('4'), pg_temp.u('a2'), pg_temp.d('a1'), 'pendente', null, 'pendente', null, false, false),
  (pg_temp.en('4'), pg_temp.u('a3'), pg_temp.d('a2'), 'confirmada', null, 'pendente', null, false, false);
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select is((pg_temp.cat(public.painel_da_coordenacao(pg_temp.e()), 'Cat 1') ->> 'provasPendentes')::int, 5,
  'US3: prova pendente = 2 resultados pendentes + 3 integrantes sem resultado');
select is((pg_temp.cat(public.painel_da_coordenacao(pg_temp.e()), 'Cat 2') ->> 'provasPendentes')::int, 4,
  'US3: na Cat 2, os 4 integrantes sem resultado');
select ok(not pg_temp.tem_chave(public.painel_da_coordenacao(pg_temp.e()), 'nota'),
  'SC-002: com notas registradas, o painel continua sem a chave nota');
reset role;
delete from public.resultados_prova where encontro_id = pg_temp.en('4');
update public.encontros set data = current_date + 14 where id = pg_temp.en('4');

-- Edição encerrada e outros perfis.
set local role authenticated;
select pg_temp.como(pg_temp.u('0f'));
select lives_ok($$ select public.painel_da_coordenacao(pg_temp.g()) $$, 'FR-014: edição encerrada continua respondendo');
select is((public.painel_da_coordenacao(pg_temp.g()) -> 'indicadores' ->> 'equipes')::int, 1,
  'FR-014: indicadores da edição encerrada');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.painel_da_coordenacao(pg_temp.e()) $$, '42501', null, 'US3: docente é recusado');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.painel_da_coordenacao(pg_temp.e()) $$, '42501', null, 'US3: aluno é recusado');
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select public.painel_da_coordenacao(pg_temp.g()) $$, '42501', null,
  'US3: coordenação de outra edição é recusada');
reset role;

-- ===========================================================================
-- US4 — relatórios (T019, FR-007 a FR-011a, FR-013, FR-014, SC-002, SC-003, SC-006)
-- Estado: presença do encontro 1 em TA (a4 ausente); entregas D0/A1 (avaliada) e D1/A2;
-- ocorrência de A1 registrada. a3 sai da equipe A2 agora, depois do encontro 1.
-- ===========================================================================
update public.dupla_integrantes set saida_em = now(), motivo_saida = 'Saída fictícia.'
where estudante_id = pg_temp.u('a3');
insert into public.pedidos_revisao (edicao_id, dupla_id, objeto, ocorrencia_id, justificativa, chave_envio, autor_id)
values (pg_temp.e(), pg_temp.d('a1'), 'ocorrencia', 'c0000000-0000-0000-0009-000000000001',
        'Pedido fictício com justificativa.', gen_random_uuid(), pg_temp.u('a1'));
create function pg_temp.colunas(r jsonb) returns text[] language sql immutable as $$
  select array_agg(c ->> 'id' order by o) from jsonb_array_elements(r -> 'colunas') with ordinality x (c, o);
$$;
create function pg_temp.linhas(r jsonb) returns int language sql immutable as $$
  select jsonb_array_length(r -> 'linhas');
$$;
create function pg_temp.valores(r jsonb, coluna text) returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct l ->> coluna), '{}') from jsonb_array_elements(r -> 'linhas') l;
$$;
create function pg_temp.sem_pessoas(r jsonb) returns boolean language sql stable as $$
  select not pg_temp.tem_chave(r, 'nota') and not pg_temp.tem_chave(r, 'email')
     and not exists (select 1 from unnest(array['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'c1', 'c2', 'c3', 'c4']) s
                     where position(pg_temp.u(s)::text in r::text) > 0);
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));

-- Pontos por equipe e encontro.
select pg_temp.guardar('rp', public.relatorio('pontos', pg_temp.e(), null, null, null)::text);
select is(pg_temp.colunas(pg_temp.lido('rp')::jsonb),
  array['categoria', 'turma', 'equipe', 'encontro', 'presenca', 'participacao', 'avaliacaoObjetiva',
        'entrega', 'apresentacao', 'descontos', 'total', 'pendencias'],
  'R6: colunas do relatório de pontos');
select is(pg_temp.linhas(pg_temp.lido('rp')::jsonb), 20, 'R6: uma linha por equipe ativa e encontro (5 × 4)');
select is((select (l ->> 'total')::numeric from jsonb_array_elements(pg_temp.lido('rp')::jsonb -> 'linhas') l
           where l ->> 'equipe' = 'Equipe A1' and (l ->> 'encontro')::int = 1),
          (app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'total')::numeric,
  'SC-001: total igual a app.pontos_do_encontro');
select is((select count(*)::int from jsonb_array_elements(pg_temp.lido('rp')::jsonb -> 'linhas') l
           where l ->> 'equipe' = 'Equipe C2' and (l ->> 'total')::numeric = 0 and l ->> 'pendencias' <> ''), 4,
  'Edge: equipe sem lançamentos aparece em cada encontro com zeros e pendências');
select ok(pg_temp.sem_pessoas(pg_temp.lido('rp')::jsonb), 'FR-011/FR-011a: sem nota, e-mail nem id de pessoa');
select is(pg_temp.valores(public.relatorio('pontos', pg_temp.e(), 'Cat 2', null, null), 'categoria'), array['Cat 2'],
  'FR-007: filtro de categoria');
select is(pg_temp.linhas(public.relatorio('pontos', pg_temp.e(), null, pg_temp.t('a'), null)), 8,
  'FR-007: filtro de turma');
select is(pg_temp.linhas(public.relatorio('pontos', pg_temp.e(), null, null, pg_temp.en('1'))), 5,
  'FR-007: filtro de encontro');

-- Presença.
select pg_temp.guardar('rpr', public.relatorio('presenca', pg_temp.e(), null, null, null)::text);
select is(pg_temp.colunas(pg_temp.lido('rpr')::jsonb),
  array['categoria', 'turma', 'equipe', 'estudante', 'encontro', 'presente', 'observacao'],
  'R6: colunas do relatório de presença');
select is(pg_temp.linhas(pg_temp.lido('rpr')::jsonb), pg_temp.contar('presencas', 'turma_id in (select id from public.turmas where curso_id in (select id from public.cursos where edicao_id = ''10000000-0000-0000-0009-000000000001''))'),
  'R6: uma linha por presença registrada');
select is((select l ->> 'equipe' from jsonb_array_elements(pg_temp.lido('rpr')::jsonb -> 'linhas') l
           where l ->> 'estudante' = 'Pessoa a3'), 'Equipe A2',
  'U1: quem saiu depois do encontro aparece com a equipe da época');
select is((select l ->> 'equipe' from jsonb_array_elements(pg_temp.lido('rpr')::jsonb -> 'linhas') l
           where l ->> 'estudante' = 'Pessoa a5'), 'Sem equipe', 'U1: sem equipe na data, "Sem equipe"');
select is((select (l ->> 'presente')::boolean from jsonb_array_elements(pg_temp.lido('rpr')::jsonb -> 'linhas') l
           where l ->> 'estudante' = 'Pessoa a4'), false, 'R6: presença como booleano (Sim/Não no CSV)');
select ok(pg_temp.sem_pessoas(pg_temp.lido('rpr')::jsonb), 'FR-011a: estudante só pelo nome');

-- Entregas, ocorrências e revisões.
select pg_temp.guardar('re', public.relatorio('entregas', pg_temp.e(), null, null, null)::text);
select is(pg_temp.colunas(pg_temp.lido('re')::jsonb),
  array['categoria', 'turma', 'equipe', 'desafio', 'encontro', 'versao', 'recebidaEm', 'atrasoMinutos', 'forma', 'avaliada'],
  'R6: colunas do relatório de entregas');
select is(pg_temp.linhas(pg_temp.lido('re')::jsonb), 2, 'R6: uma linha por versão de entrega');
select ok(pg_temp.lido('re')::jsonb -> 'linhas' @> '[{"equipe":"Equipe A1","desafio":"Desafio D0","forma":"Link","avaliada":true}]'
          and pg_temp.lido('re')::jsonb -> 'linhas' @> '[{"equipe":"Equipe A2","desafio":"Desafio D1","avaliada":false}]',
  'R6: forma e situação da avaliação');
select pg_temp.guardar('ro', public.relatorio('ocorrencias', pg_temp.e(), null, null, null)::text);
select is(pg_temp.colunas(pg_temp.lido('ro')::jsonb),
  array['categoria', 'turma', 'equipe', 'encontro', 'tipo', 'estado', 'registradaEm', 'decididaEm', 'apresentacaoDependente'],
  'R6: colunas do relatório de ocorrências');
select ok(pg_temp.lido('ro')::jsonb -> 'linhas' @> '[{"equipe":"Equipe A1","tipo":"Reincidência após orientação registrada","estado":"Registrada"}]',
  'R6: tipo e estado em português');
select ok(position('Fato fictício' in pg_temp.lido('ro')) = 0 and position('Relato' in pg_temp.lido('ro')) = 0,
  'R6: fato e evidência ficam fora do CSV');
select pg_temp.guardar('rr', public.relatorio('revisoes', pg_temp.e(), null, null, null)::text);
select is(pg_temp.colunas(pg_temp.lido('rr')::jsonb),
  array['categoria', 'turma', 'equipe', 'objeto', 'componente', 'encontro', 'estado', 'pedidoEm', 'respondidoEm'],
  'R6: colunas do relatório de revisões');
select ok(pg_temp.lido('rr')::jsonb -> 'linhas' @> '[{"equipe":"Equipe A1","objeto":"Ocorrência","encontro":1,"estado":"Aberto"}]',
  'R6: pedido de revisão com objeto, encontro e estado');
select ok(position('Pedido fictício' in pg_temp.lido('rr')) = 0, 'R6: justificativa fica fora do CSV');
select ok(pg_temp.sem_pessoas(pg_temp.lido('re')::jsonb) and pg_temp.sem_pessoas(pg_temp.lido('ro')::jsonb)
          and pg_temp.sem_pessoas(pg_temp.lido('rr')::jsonb), 'SC-002: nenhum relatório com nota, e-mail ou id de pessoa');
select is(pg_temp.linhas(public.relatorio('ocorrencias', pg_temp.e(), 'Cat 2', null, null)), 0,
  'US4: filtros sem resultado devolvem só as colunas');

-- Regras de entrada.
select throws_ok($$ select public.relatorio('notas', pg_temp.e(), null, null, null) $$, '23514', null,
  'US4: tipo desconhecido é recusado');
select throws_ok($$ select public.relatorio('pontos', pg_temp.e(), null, pg_temp.t('e'), null) $$, '23514', null,
  'US4: turma de outra edição é recusada');
select throws_ok($$ select public.relatorio('pontos', pg_temp.e(), null, null, pg_temp.en('f1')) $$, '23514', null,
  'US4: encontro de outra edição é recusado');

-- Registro da exportação (FR-009, SC-006).
select pg_temp.guardar('n0', pg_temp.contar('exportacoes_relatorio')::text);
select pg_temp.guardar('rf', public.relatorio('presenca', pg_temp.e(), 'Cat 1', pg_temp.t('a'), pg_temp.en('1'))::text);
select is(pg_temp.contar('exportacoes_relatorio'), pg_temp.lido('n0')::int + 1, 'FR-009: cada exportação grava uma linha');
select ok(pg_temp.contar('exportacoes_relatorio',
  format('autor_id = %L and tipo = %L and linhas = %s and filtros = %L::jsonb', pg_temp.u('0a'), 'presenca',
         pg_temp.linhas(pg_temp.lido('rf')::jsonb),
         jsonb_build_object('categoria', 'Cat 1', 'turmaId', pg_temp.t('a'), 'encontroId', pg_temp.en('1')))) = 1,
  'FR-009: autor, tipo, filtros e quantidade de linhas');

-- Aluno e equipe docente (FR-008, FR-013, SC-003).
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.relatorio('pontos', pg_temp.e(), null, null, null) $$, '42501', null,
  'SC-003: aluno é recusado');
select pg_temp.como(pg_temp.u('0b'));
select is(pg_temp.valores(public.relatorio('pontos', pg_temp.e(), null, null, null), 'turma'), array['TA'],
  'FR-008: docente sem filtro recebe só a própria turma');
select is(pg_temp.valores(public.relatorio('presenca', pg_temp.e(), null, null, null), 'turma'), array['TA'],
  'FR-013: presença só da própria turma');
select is(pg_temp.valores(public.relatorio('entregas', pg_temp.e(), null, null, null), 'turma'), array['TA'],
  'FR-013: entregas só da própria turma');
select throws_ok($$ select public.relatorio('pontos', pg_temp.e(), null, pg_temp.t('b'), null) $$, '42501', null,
  'SC-003: docente pedindo turma em que não atua é recusado');
select throws_ok($$ select public.relatorio('revisoes', pg_temp.e(), null, null, null) $$, '42501', null,
  'FR-013: pedidos de revisão não são visíveis à equipe docente (spec 007)');
select is(pg_temp.contar('exportacoes_relatorio', format('autor_id = %L and tipo = %L', pg_temp.u('0b'), 'revisoes')), 0,
  'SC-006: recusa não registra exportação');
select ok((select count(*) > 0 and bool_and(autor_id = pg_temp.u('0b')) from public.exportacoes_relatorio),
  'RLS: docente lê só as próprias exportações');
select pg_temp.como(pg_temp.u('0a'));
select ok((select count(*) from public.exportacoes_relatorio) = pg_temp.contar('exportacoes_relatorio'),
  'RLS: a coordenação lê todas as exportações da edição');

-- Edição encerrada continua exportando (FR-014).
select pg_temp.como(pg_temp.u('0f'));
select is(pg_temp.linhas(public.relatorio('pontos', pg_temp.g(), null, null, null)), 1,
  'FR-014: edição encerrada continua exportando');
reset role;

-- @@secoes

select * from finish();
rollback;
