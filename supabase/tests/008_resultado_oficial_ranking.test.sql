-- Testes da spec 007 — prova oficial, ocorrências, pontos oficiais, ranking, revisão e avisos.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício. Edição E (ativa, regras completas do piloto com tipos e prazos):
--   curso "Cat 1": turma TA (a1+a2 = A1, a3+a4 = A2, a5 sem equipe) e turma TB (b1+b2 = B1);
--   curso "Cat 2": turma TC (c1+c2 = C1).
--   0a = coordenação de E; 0b = docente de TA; 0c = mentor de TA; 0d = docente de TB.
--   Encontro 1 (questões) e encontro 4 (prova oficial).
-- Edição F (ativa) com coordenação 0e. Edição G (encerrada) com coordenação 0f, turma TG,
--   equipe G1 (f1+f2) e encontro de prova oficial.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0008-0000000000' || s)::uuid, 'r' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('0c'), ('0d'), ('0e'), ('0f'),
             ('a1'), ('a2'), ('a3'), ('a4'), ('a5'), ('b1'), ('b2'), ('c1'), ('c2'),
             ('f1'), ('f2')) as v (s);

create function pg_temp.regras() returns jsonb language sql immutable as $$
  select '{"versao":"piloto-2026.0-a-confirmar","quantidadeEncontros":4,"casasDecimais":2,"presenca":{"pontosPorIntegrante":5,"maximoPorDupla":10},"participacao":{"criterios":[{"id":"envolvimento","rotulo":"Envolvimento nas atividades","maximo":4},{"id":"colaboracao","rotulo":"Colaboração","maximo":3},{"id":"organizacao","rotulo":"Organização e cumprimento das orientações","maximo":3}]},"questoes":{"maximo":30},"entrega":{"criterios":[{"id":"compreensao","rotulo":"Compreensão do problema","maximo":10},{"id":"aplicacao","rotulo":"Aplicação de conhecimentos técnicos","maximo":10},{"id":"qualidade","rotulo":"Qualidade e adequação da solução","maximo":10},{"id":"organizacao","rotulo":"Organização e entrega","maximo":10}],"criterioDeAtraso":"organizacao","faixasDeAtraso":[{"ateMinutos":15,"desconto":2},{"ateMinutos":30,"desconto":5}],"limiteAtrasoMinutos":30},"apresentacao":{"criterios":[{"id":"clareza","rotulo":"Clareza","maximo":3},{"id":"explicacao","rotulo":"Explicação das decisões e etapas","maximo":4},{"id":"respostas","rotulo":"Respostas às perguntas","maximo":3}]},"provaOficial":{"pontosRealizacao":5,"notaMinimaBonus":70,"pontosBonus":10,"maximoPorDupla":30},"penalidades":{"tetoDescontosPorEncontro":10,"tipos":[{"id":"reincidencia","rotulo":"Reincidência após orientação registrada","pontos":2},{"id":"desrespeito","rotulo":"Desrespeito com responsabilidade da equipe","pontos":5},{"id":"uso_nao_autorizado","rotulo":"Uso não autorizado","pontos":5},{"id":"plagio","rotulo":"Plágio comprovado","zeraEntrega":true}]},"prazos":{"manifestacaoHoras":24,"revisaoHoras":24}}'::jsonb;
$$;

insert into public.edicoes (id, nome, estado, regras, regras_versao)
select id::uuid, nome, est::public.estado_edicao, pg_temp.regras(), 'piloto-2026.0-a-confirmar'
from (values ('10000000-0000-0000-0008-000000000001', 'Edição resultado', 'ativa'),
             ('10000000-0000-0000-0008-000000000002', 'Outra edição', 'ativa'),
             ('10000000-0000-0000-0008-000000000003', 'Edição encerrada', 'ativa')) as v (id, nome, est);
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0008-000000000001', '10000000-0000-0000-0008-000000000001', 'Curso 1', 'Cat 1'),
  ('20000000-0000-0000-0008-000000000002', '10000000-0000-0000-0008-000000000001', 'Curso 2', 'Cat 2'),
  ('20000000-0000-0000-0008-000000000003', '10000000-0000-0000-0008-000000000003', 'Curso G', 'Cat G');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0008-0000000000a0', '20000000-0000-0000-0008-000000000001', 'TA'),
  ('30000000-0000-0000-0008-0000000000b0', '20000000-0000-0000-0008-000000000001', 'TB'),
  ('30000000-0000-0000-0008-0000000000c0', '20000000-0000-0000-0008-000000000002', 'TC'),
  ('30000000-0000-0000-0008-0000000000e0', '20000000-0000-0000-0008-000000000003', 'TG');
insert into public.encontros (id, edicao_id, numero, titulo, data, avaliacao_objetiva) values
  ('50000000-0000-0000-0008-000000000001', '10000000-0000-0000-0008-000000000001', 1, 'Encontro de questões', current_date, 'questoes'),
  ('50000000-0000-0000-0008-000000000004', '10000000-0000-0000-0008-000000000001', 4, 'Encontro da prova', current_date + 7, 'prova_oficial'),
  ('50000000-0000-0000-0008-0000000000f1', '10000000-0000-0000-0008-000000000003', 1, 'Prova da edição G', current_date, 'prova_oficial');

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0008-0000000000' || s)::uuid;
$$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0008-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.d(s text) returns uuid language sql immutable as $$
  select ('40000000-0000-0000-0008-0000000000' || s)::uuid;
$$;
create function pg_temp.en(n text) returns uuid language sql immutable as $$
  select ('50000000-0000-0000-0008-0000000000' || lpad(n, 2, '0'))::uuid;
$$;
create function pg_temp.e() returns uuid language sql immutable as $$
  select '10000000-0000-0000-0008-000000000001'::uuid;
$$;
create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.guardar(chave text, valor text) returns text language sql as $$
  select set_config('teste.' || chave, valor, true);
$$;
create function pg_temp.g(chave text) returns text language sql as $$
  select current_setting('teste.' || chave);
$$;
-- Leituras e ajustes sem RLS (estado do banco e relógio simulado dos prazos).
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
create function pg_temp.auditada_com(p_tabela text, p_autor uuid, p_justificativa text) returns boolean
language sql security definer as $$
  select exists (select 1 from public.auditoria a where a.tabela = p_tabela and a.autor_id = p_autor
                 and a.justificativa = p_justificativa and a.antes is not null);
$$;
create function pg_temp.auditorias(p_tabela text, p_autor uuid) returns int language sql security definer as $$
  select count(*)::int from public.auditoria a where a.tabela = p_tabela and a.autor_id = p_autor;
$$;
-- Verdadeiro se o JSON contém, em qualquer nível, uma chave com o nome dado.
create function pg_temp.tem_chave(j jsonb, chave text) returns boolean language sql immutable as $$
  select j::text ~ ('"' || chave || '"\s*:');
$$;

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select pg_temp.u(u), pg_temp.e(), p::public.papel,
       case when t is null then null else pg_temp.t(t) end
from (values ('0a', 'coordenacao', null), ('0b', 'docente', 'a'),
             ('0d', 'docente', 'b'),
             ('a1', 'aluno', 'a'), ('a2', 'aluno', 'a'), ('a3', 'aluno', 'a'), ('a4', 'aluno', 'a'),
             ('a5', 'aluno', 'a'), ('b1', 'aluno', 'b'), ('b2', 'aluno', 'b'),
             ('c1', 'aluno', 'c'), ('c2', 'aluno', 'c')) as v (u, p, t);
-- Spec 010: mentor é vinculado ao curso. Para manter as asserções por turma desta spec, o
-- vínculo ao curso fica inativo e só a linha derivada da turma do mentor fica ativa (fixture).
select set_config('app.sincronizando_mentores', 'on', true);
insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id, ativo)
select pg_temp.u('0c'), pg_temp.e(), 'mentor', curso_id, false from public.turmas where id = pg_temp.t('a');
update public.atribuicoes set ativo = true
where usuario_id = pg_temp.u('0c') and papel = 'mentor' and turma_id = pg_temp.t('a');
select set_config('app.sincronizando_mentores', '', true);
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  (pg_temp.u('0e'), '10000000-0000-0000-0008-000000000002', 'coordenacao', null),
  (pg_temp.u('0f'), '10000000-0000-0000-0008-000000000003', 'coordenacao', null),
  (pg_temp.u('f1'), '10000000-0000-0000-0008-000000000003', 'aluno', pg_temp.t('e')),
  (pg_temp.u('f2'), '10000000-0000-0000-0008-000000000003', 'aluno', pg_temp.t('e'));

insert into public.duplas (id, edicao_id, turma_id, nome) values
  (pg_temp.d('a1'), pg_temp.e(), pg_temp.t('a'), 'Equipe A1'),
  (pg_temp.d('a2'), pg_temp.e(), pg_temp.t('a'), 'Equipe A2'),
  (pg_temp.d('b1'), pg_temp.e(), pg_temp.t('b'), 'Equipe B1'),
  (pg_temp.d('c1'), pg_temp.e(), pg_temp.t('c'), 'Equipe C1'),
  (pg_temp.d('f1'), '10000000-0000-0000-0008-000000000003', pg_temp.t('e'), 'Equipe G1');
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
select pg_temp.d(d), pg_temp.e(), pg_temp.u(u)
from (values ('a1', 'a1'), ('a1', 'a2'), ('a2', 'a3'), ('a2', 'a4'), ('b1', 'b1'), ('b1', 'b2'),
             ('c1', 'c1'), ('c1', 'c2')) as v (d, u);
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id) values
  (pg_temp.d('f1'), '10000000-0000-0000-0008-000000000003', pg_temp.u('f1')),
  (pg_temp.d('f1'), '10000000-0000-0000-0008-000000000003', pg_temp.u('f2'));
update public.edicoes set estado = 'encerrada' where id = '10000000-0000-0000-0008-000000000003';

-- ===========================================================================
-- Fundação — tabelas, RLS, privilégios, auditoria, bucket e regras (T008)
-- ===========================================================================
select has_table('public', t, 'Fundação: tabela ' || t || ' existe')
from unnest(array['resultados_prova', 'ocorrencias', 'manifestacoes', 'excecoes_prazo',
                  'publicacoes_ranking', 'publicacao_posicoes', 'pedidos_revisao', 'avisos']) as t;
select ok(
  (select count(*) = 8 and bool_and(c.relrowsecurity) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any (array['resultados_prova', 'ocorrencias',
     'manifestacoes', 'excecoes_prazo', 'publicacoes_ranking', 'publicacao_posicoes',
     'pedidos_revisao', 'avisos'])),
  'Fundação: RLS habilitada nas 8 tabelas novas');
select ok(
  coalesce((select bool_and(
    not has_table_privilege('authenticated', 'public.' || t, 'insert')
    and not has_table_privilege('authenticated', 'public.' || t, 'update')
    and not has_table_privilege('authenticated', 'public.' || t, 'delete')
    and not has_table_privilege('anon', 'public.' || t, 'select'))
   from unnest(array['resultados_prova', 'ocorrencias', 'manifestacoes', 'excecoes_prazo',
     'publicacoes_ranking', 'publicacao_posicoes', 'pedidos_revisao', 'avisos']) as t
   where to_regclass('public.' || t) is not null), false)
  and to_regclass('public.avisos') is not null,
  'Fundação: sem escrita direta para authenticated e sem acesso para anon');
select has_type('public', t, 'Fundação: tipo ' || t)
from unnest(array['realizacao_prova', 'estado_nota_prova', 'estado_ocorrencia', 'estado_ranking',
                  'objeto_prazo', 'objeto_revisao', 'estado_revisao']) as t;
select enum_has_labels('public', 'estado_ocorrencia',
  array['registrada', 'manifestada', 'confirmada', 'arquivada'], 'FR-007: estados da ocorrência');
select enum_has_labels('public', 'estado_ranking', array['parcial', 'provisorio', 'definitivo'],
  'FR-015: estados do ranking');
select enum_has_labels('public', 'estado_nota_prova', array['pendente', 'confirmada', 'indisponivel'],
  'R4: estados da nota oficial');
select has_column('public', 'auditoria', 'pedido_revisao_id', 'R7: auditoria liga a correção ao pedido');
select is((select public from storage.buckets where id = 'evidencias'), false,
  'R9: bucket evidencias é privado');
select is((select file_size_limit from storage.buckets where id = 'evidencias'), 52428800::bigint,
  'R9: limite de 50 MB por evidência');
select is((select allowed_mime_types from storage.buckets where id = 'evidencias'),
  array['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/png', 'image/jpeg'],
  'R9: tipos aceitos PDF, ZIP, PNG e JPG');

-- R3/I1: completar regras antigas só em edições não encerradas, marcando a versão.
insert into public.edicoes (id, nome, estado, regras, regras_versao) values
  ('10000000-0000-0000-0008-0000000000e1', 'Regras antigas', 'ativa',
   (pg_temp.regras() - 'prazos') #- '{penalidades,tipos}', 'v-antiga'),
  ('10000000-0000-0000-0008-0000000000e2', 'Regras antigas encerrada', 'encerrada',
   (pg_temp.regras() - 'prazos') #- '{penalidades,tipos}', 'v-antiga');
select lives_ok($$ select app.completar_regras_inc4() $$, 'R3: completar regras roda sem erro');
select ok((select regras ? 'prazos' and regras -> 'penalidades' ? 'tipos'
                  and regras -> 'penalidades' ->> 'tetoDescontosPorEncontro' = '10'
           from public.edicoes where id = '10000000-0000-0000-0008-0000000000e1'),
  'R3: edição não encerrada recebe tipos e prazos, mantendo as outras chaves');
select is((select regras_versao from public.edicoes where id = '10000000-0000-0000-0008-0000000000e1'),
  'v-antiga+inc4', 'I1: regras_versao marcada com +inc4');
select ok((select not (regras ? 'prazos') and regras_versao = 'v-antiga'
           from public.edicoes where id = '10000000-0000-0000-0008-0000000000e2'),
  'I1: edição encerrada não muda');
select lives_ok($$ select app.completar_regras_inc4() $$, 'R3: completar de novo não falha');
select is((select regras_versao from public.edicoes where id = '10000000-0000-0000-0008-0000000000e1'),
  'v-antiga+inc4', 'R3: repetir não acumula o sufixo');
delete from public.edicoes where id in ('10000000-0000-0000-0008-0000000000e1',
                                        '10000000-0000-0000-0008-0000000000e2');

-- ===========================================================================
-- Fundação — montagem dos lançamentos oficiais a partir das tabelas (T010)
-- Encontro 1, turma TA: desafios d1 e d2; listas l1 e l2 (encerradas).
--   A1: presença 2/2, participação 10; d1 entrega 40 no prazo + apresentação 10;
--       d2 entrega 32 com 20 min de atraso (organização 8 − 5 → 27) + apresentação não avaliável;
--       l1 2/2 (30) e l2 1/2 (15).  Esperado: 10 + 10 + 22,5 + 33,5 + 5 = 81.
--   A2: sem presença nem participação; d1 entrega com 45 min de atraso e prorrogação (40);
--       d2 sem entrega (0); apresentações 10 e 10; listas sem submissão (0).
--       Esperado: entrega 20, apresentação 10, objetivo 0, total 30, pendência participação.
--   B1 (turma TB, sem atividades): tudo pendente, total 0.
-- ===========================================================================
insert into public.desafios (id, edicao_id, encontro_id, titulo, enunciado, recursos_permitidos,
                             politica_ia, prazo, estado) values
  ('60000000-0000-0000-0008-000000000001', pg_temp.e(), pg_temp.en('1'), 'Desafio d1', 'Enunciado.', '', '', now() - interval '2 days', 'encerrado'),
  ('60000000-0000-0000-0008-000000000002', pg_temp.e(), pg_temp.en('1'), 'Desafio d2', 'Enunciado.', '', '', now() - interval '1 day', 'encerrado');
insert into public.desafio_turmas (desafio_id, turma_id) values
  ('60000000-0000-0000-0008-000000000001', pg_temp.t('a')),
  ('60000000-0000-0000-0008-000000000002', pg_temp.t('a'));
insert into public.entregas (desafio_id, dupla_id, versao, autor_id, protocolo, link, atraso_minutos, chave_envio) values
  ('60000000-0000-0000-0008-000000000001', pg_temp.d('a1'), 1, pg_temp.u('a1'), 'T8-1', 'https://exemplo.invalid/1', 0, gen_random_uuid()),
  ('60000000-0000-0000-0008-000000000002', pg_temp.d('a1'), 1, pg_temp.u('a1'), 'T8-2', 'https://exemplo.invalid/2', 20, gen_random_uuid()),
  ('60000000-0000-0000-0008-000000000001', pg_temp.d('a2'), 1, pg_temp.u('a3'), 'T8-3', 'https://exemplo.invalid/3', 45, gen_random_uuid());
insert into public.prorrogacoes (desafio_id, dupla_id, novo_prazo, justificativa) values
  ('60000000-0000-0000-0008-000000000001', pg_temp.d('a2'), now(), 'Impedimento justificado da equipe.');
insert into public.avaliacoes (desafio_id, dupla_id, notas_entrega, notas_apresentacao, apresentacao_nao_avaliavel) values
  ('60000000-0000-0000-0008-000000000001', pg_temp.d('a1'),
   '{"compreensao":10,"aplicacao":10,"qualidade":10,"organizacao":10}', '{"clareza":3,"explicacao":4,"respostas":3}', false),
  ('60000000-0000-0000-0008-000000000002', pg_temp.d('a1'),
   '{"compreensao":8,"aplicacao":8,"qualidade":8,"organizacao":8}', null, true),
  ('60000000-0000-0000-0008-000000000001', pg_temp.d('a2'),
   '{"compreensao":10,"aplicacao":10,"qualidade":10,"organizacao":10}', '{"clareza":3,"explicacao":4,"respostas":3}', false),
  ('60000000-0000-0000-0008-000000000002', pg_temp.d('a2'),
   null, '{"clareza":3,"explicacao":4,"respostas":3}', false);
insert into public.presencas (encontro_id, estudante_id, turma_id, presente) values
  (pg_temp.en('1'), pg_temp.u('a1'), pg_temp.t('a'), true),
  (pg_temp.en('1'), pg_temp.u('a2'), pg_temp.t('a'), true);
insert into public.participacoes (encontro_id, dupla_id, notas) values
  (pg_temp.en('1'), pg_temp.d('a1'), '{"envolvimento":4,"colaboracao":3,"organizacao":3}');
insert into public.listas_questoes (id, edicao_id, encontro_id, titulo, prazo, estado) values
  ('70000000-0000-0000-0008-000000000001', pg_temp.e(), pg_temp.en('1'), 'Lista l1', now() - interval '1 day', 'publicado'),
  ('70000000-0000-0000-0008-000000000002', pg_temp.e(), pg_temp.en('1'), 'Lista l2', now() - interval '1 day', 'publicado');
insert into public.lista_turmas (lista_id, turma_id) values
  ('70000000-0000-0000-0008-000000000001', pg_temp.t('a')),
  ('70000000-0000-0000-0008-000000000002', pg_temp.t('a'));
insert into public.questoes (lista_id, ordem, enunciado)
select l::uuid, o, 'Questão ' || o
from unnest(array['70000000-0000-0000-0008-000000000001', '70000000-0000-0000-0008-000000000002']) l,
     generate_series(1, 2) o;
insert into public.submissoes_questoes (lista_id, dupla_id, versao_lista, autor_id, chave_envio, respostas, acertos, total) values
  ('70000000-0000-0000-0008-000000000001', pg_temp.d('a1'), 1, pg_temp.u('a1'), gen_random_uuid(), '{}', 2, 2),
  ('70000000-0000-0000-0008-000000000002', pg_temp.d('a1'), 1, pg_temp.u('a1'), gen_random_uuid(), '{}', 1, 2);

select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')),
  '{"presenca":10,"participacao":10,"avaliacaoObjetiva":22.5,"entrega":33.5,"apresentacao":5,"descontos":0,"total":81,"pendencias":[]}'::jsonb,
  'FR-026 (spec 006): média simples por componente entre desafios e listas, com atraso');
select is(app.pontos_do_encontro(pg_temp.d('a2'), pg_temp.en('1')),
  '{"presenca":0,"participacao":0,"avaliacaoObjetiva":0,"entrega":20,"apresentacao":10,"descontos":0,"total":30,"pendencias":["participacao"]}'::jsonb,
  'Montagem: prorrogação dispensa o atraso; desafio sem entrega vale 0; lista sem submissão vale 0');
select is(app.pontos_do_encontro(pg_temp.d('b1'), pg_temp.en('1')),
  '{"presenca":0,"participacao":0,"avaliacaoObjetiva":0,"entrega":0,"apresentacao":0,"descontos":0,"total":0,"pendencias":["participacao","avaliacaoObjetiva","entrega","apresentacao"]}'::jsonb,
  'Montagem: sem registros, componentes pendentes e nenhum ponto inventado');
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('4')) -> 'pendencias',
  '["participacao","avaliacaoObjetiva","entrega","apresentacao"]'::jsonb,
  'Montagem: encontro de prova sem resultados deixa o componente objetivo pendente');
select is(app.totais_da_equipe(pg_temp.d('a1')) -> 'totais',
  '{"total":81,"entrega":33.5,"avaliacaoObjetiva":22.5,"presenca":10,"pendente":true}'::jsonb,
  'acumularEncontros: totais da edição e pendência de qualquer encontro');
select is(jsonb_array_length(app.totais_da_equipe(pg_temp.d('a1')) -> 'encontros'), 2,
  'Totais: detalhe com um item por encontro da edição');
select is(app.calcular_encontro('{"presencas":[],"entrega":{"situacao":"pendente"},"apresentacao":{"situacao":"pendente"},"penalidades":[]}'::jsonb, pg_temp.regras()) ->> 'total',
  '0', 'calcular_encontro: função pura disponível');

-- ===========================================================================
-- Fundação — avisos no aplicativo (T012, FR-026)
-- ===========================================================================
select is(app.avisar(array[pg_temp.u('a1'), pg_temp.u('a2')], 'ocorrencia_registrada',
                     'Nova ocorrência registrada para a sua equipe', '{"teste":true}'), 2,
  'FR-026: um aviso por destinatário');

set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select is((public.meus_avisos() ->> 'naoLidos')::int, 1, 'FR-026: contador de não lidos de quem chama');
select is(jsonb_array_length(public.meus_avisos() -> 'itens'), 1, 'FR-026: lista só os próprios avisos');
select pg_temp.guardar('aviso_a1', public.meus_avisos() -> 'itens' -> 0 ->> 'id');
select pg_temp.como(pg_temp.u('a3'));
select is((public.meus_avisos() ->> 'naoLidos')::int, 0, 'FR-026: outra pessoa não vê o aviso');
select is(public.marcar_avisos_lidos(array[pg_temp.g('aviso_a1')::uuid]), 0,
  'FR-026: não marca aviso alheio');
select is((select count(*)::int from public.avisos), 0, 'RLS: a3 não lê avisos alheios diretamente');
select pg_temp.como(pg_temp.u('a1'));
select is(public.marcar_avisos_lidos(array[pg_temp.g('aviso_a1')::uuid]), 1, 'FR-026: marca o próprio aviso');
select is((public.meus_avisos() ->> 'naoLidos')::int, 0, 'FR-026: contador zera depois da leitura');
select is(public.marcar_avisos_lidos(array[pg_temp.g('aviso_a1')::uuid]), 0, 'FR-024: marcar de novo não muda nada');
select is((select count(*)::int from public.avisos), 1, 'RLS: a1 lê o próprio aviso');
select throws_ok($$ select app.avisar(array[pg_temp.u('a1')], 'ocorrencia_registrada', 'x', '{}') $$,
  '42501', null, 'Segurança: authenticated não cria avisos diretamente');
reset role;

-- ===========================================================================
-- US1 — prova oficial (T017, FR-001 a FR-004, SC-002)
-- ===========================================================================
set local role authenticated;

create function pg_temp.prova(p jsonb) returns int language sql as $$
  select public.registrar_resultados_prova(pg_temp.en('4'), p, null, null);
$$;

-- Quem registra.
select pg_temp.como(pg_temp.u('0b'));
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false}]') $f$, pg_temp.u('a1')),
  '42501', null, 'FR-001: docente não registra a prova oficial');
select pg_temp.como(pg_temp.u('0c'));
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false}]') $f$, pg_temp.u('a1')),
  '42501', null, 'FR-001: mentor não registra a prova oficial');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false}]') $f$, pg_temp.u('a1')),
  '42501', null, 'FR-001: aluno não registra a prova oficial');
select pg_temp.como(pg_temp.u('0e'));
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false}]') $f$, pg_temp.u('a1')),
  '42501', null, 'FR-001: coordenação de outra edição não registra a prova oficial');

select pg_temp.como(pg_temp.u('0a'));
select throws_ok(format($f$ select public.registrar_resultados_prova(pg_temp.en('1'), '[{"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false}]', null, null) $f$, pg_temp.u('a1')),
  '23514', null, 'FR-001: encontro de questões não recebe prova oficial');
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false}]') $f$, pg_temp.u('a5')),
  '23514', null, 'FR-001: estudante sem equipe ativa é recusado');
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"nao_realizou","nota":80,"fonte":"Planilha","escalaConfirmada":true,"autorizacaoConfirmada":true}]') $f$, pg_temp.u('a1')),
  '23514', null, 'FR-001: nota só com realização confirmada');
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"confirmada","nota":80,"escalaConfirmada":true,"autorizacaoConfirmada":true}]') $f$, pg_temp.u('a1')),
  '23514', null, 'FR-001: nota exige a fonte');

-- Registro em lote: A1 com 75 confirmada e realização sem nota; A2 pendente; B1 no limite; C1 sem escala.
select is(pg_temp.prova(format('[
  {"estudanteId":"%s","realizacao":"confirmada","nota":75,"fonte":"Planilha oficial","escalaConfirmada":true,"autorizacaoConfirmada":true},
  {"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false},
  {"estudanteId":"%s","realizacao":"pendente","escalaConfirmada":false,"autorizacaoConfirmada":false},
  {"estudanteId":"%s","realizacao":"nao_realizou","escalaConfirmada":false,"autorizacaoConfirmada":false},
  {"estudanteId":"%s","realizacao":"confirmada","nota":100,"fonte":"Planilha oficial","escalaConfirmada":true,"autorizacaoConfirmada":true},
  {"estudanteId":"%s","realizacao":"confirmada","nota":100,"fonte":"Planilha oficial","escalaConfirmada":true,"autorizacaoConfirmada":true},
  {"estudanteId":"%s","realizacao":"confirmada","nota":90,"fonte":"Planilha oficial","escalaConfirmada":false,"autorizacaoConfirmada":true}]',
  pg_temp.u('a1'), pg_temp.u('a2'), pg_temp.u('a3'), pg_temp.u('a4'), pg_temp.u('b1'), pg_temp.u('b2'), pg_temp.u('c1'))::jsonb),
  7, 'FR-001: coordenação registra a prova em lote');

reset role;
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('4')) ->> 'avaliacaoObjetiva', '20',
  'FR-002: 5 + 10 (nota ≥ 70) + 5 (realização sem nota) = 20');
select ok(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('4')) -> 'pendencias' ? 'avaliacaoObjetiva',
  'FR-002: nota pendente deixa o componente pendente');
select ok(app.pontos_do_encontro(pg_temp.d('a2'), pg_temp.en('4')) -> 'pendencias' ? 'avaliacaoObjetiva',
  'FR-002: realização pendente deixa o componente pendente');
select is(app.pontos_do_encontro(pg_temp.d('b1'), pg_temp.en('4')) ->> 'avaliacaoObjetiva', '30',
  'FR-002: limite de 30 pontos por equipe');
select is(pg_temp.contar('resultados_prova', format('estudante_id = %L and nota_estado = %L', pg_temp.u('c1'), 'pendente')), 1,
  'Caso de borda: nota sem escala confirmada fica pendente, sem conversão');
select ok(app.pontos_do_encontro(pg_temp.d('c1'), pg_temp.en('4')) -> 'pendencias' ? 'avaliacaoObjetiva',
  'Caso de borda: escala não confirmada mantém a pendência');
select ok(not pg_temp.tem_chave(app.totais_da_equipe(pg_temp.d('a1')), 'nota'),
  'SC-002: pontos oficiais não carregam nota individual');

set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
-- Nota indisponível: mantém a realização, sem pendência (R4). Alterar um valor gravado exige justificativa.
select throws_ok(format($f$ select pg_temp.prova('[{"estudanteId":"%s","realizacao":"confirmada","notaIndisponivel":true,"escalaConfirmada":false,"autorizacaoConfirmada":false}]') $f$, pg_temp.u('a2')),
  '23514', null, 'FR-004: correção sem justificativa é recusada');
select is(public.registrar_resultados_prova(pg_temp.en('4'),
  format('[{"estudanteId":"%s","realizacao":"confirmada","notaIndisponivel":true,"escalaConfirmada":false,"autorizacaoConfirmada":false}]', pg_temp.u('a2'))::jsonb,
  'A nota oficial não será fornecida pelo SAEP.', null), 1, 'R4: nota registrada como indisponível, com justificativa');
reset role;
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('4')) ->> 'avaliacaoObjetiva', '20',
  'US1 (teste independente): A1 com 20 pontos de prova');
select ok(not (app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('4')) -> 'pendencias' ? 'avaliacaoObjetiva'),
  'R4: nota indisponível não deixa o componente pendente');

set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok(format($f$ select public.registrar_resultados_prova(pg_temp.en('4'), '[{"estudanteId":"%s","realizacao":"confirmada","nota":80,"fonte":"Planilha oficial","escalaConfirmada":true,"autorizacaoConfirmada":true}]', 'Nota corrigida conforme planilha oficial.', null) $f$, pg_temp.u('a1')),
  'FR-004: correção de nota com justificativa');
reset role;
select ok(pg_temp.auditada_com('resultados_prova', pg_temp.u('0a'), 'Nota corrigida conforme planilha oficial.'),
  'FR-004: a auditoria guarda o valor anterior e a justificativa');
select pg_temp.guardar('aud_prova', pg_temp.auditorias('resultados_prova', pg_temp.u('0a'))::text);
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select is(public.registrar_resultados_prova(pg_temp.en('4'),
  format('[{"estudanteId":"%s","realizacao":"confirmada","nota":80,"fonte":"Planilha oficial","escalaConfirmada":true,"autorizacaoConfirmada":true}]', pg_temp.u('a1'))::jsonb,
  null, null), 0, 'FR-024: repetir os mesmos valores não grava');
reset role;
select is(pg_temp.auditorias('resultados_prova', pg_temp.u('0a'))::text, pg_temp.g('aud_prova'),
  'FR-024: repetição não gera auditoria');

-- Leitura da nota individual: só a coordenação.
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select is((select (r ->> 'nota')::numeric from jsonb_array_elements(public.resultados_prova(pg_temp.en('4'))) r
           where r ->> 'estudanteId' = pg_temp.u('a1')::text), 80::numeric,
  'FR-003: a coordenação lê a nota oficial');
select ok((select count(*) from jsonb_array_elements(public.resultados_prova(pg_temp.en('4'))) r
           where r ->> 'estudanteId' = pg_temp.u('a5')::text) = 0,
  'FR-001: a lista traz só estudantes em equipe');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.resultados_prova(pg_temp.en('4')) $$, '42501', null,
  'FR-003/SC-002: docente não lê a nota individual');
select pg_temp.como(pg_temp.u('0e'));
select throws_ok($$ select public.resultados_prova(pg_temp.en('4')) $$, '42501', null,
  'FR-003/SC-002: coordenação de outra edição não lê a nota individual');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.resultados_prova(pg_temp.en('4')) $$, '42501', null,
  'FR-003/SC-002: aluno não lê a nota individual');
select is((select count(*)::int from public.resultados_prova), 0, 'RLS: aluno não lê a tabela da prova');

-- U1: edição encerrada recusa a escrita e mantém a leitura.
select pg_temp.como(pg_temp.u('0f'));
select throws_ok(format($f$ select public.registrar_resultados_prova('50000000-0000-0000-0008-0000000000f1', '[{"estudanteId":"%s","realizacao":"confirmada","escalaConfirmada":false,"autorizacaoConfirmada":false}]', null, null) $f$, pg_temp.u('f1')),
  '23514', null, 'U1: edição encerrada recusa o registro da prova');
select lives_ok($$ select public.resultados_prova('50000000-0000-0000-0008-0000000000f1') $$,
  'U1: edição encerrada mantém a leitura');
reset role;

-- C2: o estudante que sai da equipe leva o resultado só para a equipe original.
update public.dupla_integrantes set saida_em = now(), motivo_saida = 'Saída fictícia para o teste.'
where dupla_id = pg_temp.d('a1') and estudante_id = pg_temp.u('a2');
insert into public.duplas (id, edicao_id, turma_id, nome) values (pg_temp.d('a3'), pg_temp.e(), pg_temp.t('a'), 'Equipe A3');
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id) values
  (pg_temp.d('a3'), pg_temp.e(), pg_temp.u('a2')), (pg_temp.d('a3'), pg_temp.e(), pg_temp.u('a5'));
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('4')) ->> 'avaliacaoObjetiva', '20',
  'C2: os pontos da prova de quem saiu continuam na equipe original');
select is(app.pontos_do_encontro(pg_temp.d('a3'), pg_temp.en('4')) ->> 'avaliacaoObjetiva', '0',
  'C2: a equipe nova não recebe os pontos da prova feita na equipe anterior');
delete from public.dupla_integrantes where dupla_id = pg_temp.d('a3');
delete from public.duplas where id = pg_temp.d('a3');
update public.dupla_integrantes set saida_em = null, motivo_saida = null
where dupla_id = pg_temp.d('a1') and estudante_id = pg_temp.u('a2');

-- ===========================================================================
-- US2 — ocorrências, manifestação, decisão e penalidades (T021, FR-005 a FR-011)
-- Pontos de partida no encontro 1: A1 = 81 (montagem), A2 = 30, B1 = 0 (tudo pendente).
-- ===========================================================================
create function pg_temp.ocorrencia(p_chave text, p_dupla uuid, p_tipo text, p_desafio uuid default null,
                                   p_fato_chave text default null, p_path text default null) returns text
language sql as $$
  select public.registrar_ocorrencia(p_chave::uuid, pg_temp.en('1'), p_dupla, p_tipo,
           'Fato fictício descrito com detalhes.', 'Relato fictício do docente.', p_desafio, p_fato_chave,
           p_path, case when p_path is null then null else 'evidencia.pdf' end) ->> 'id';
$$;
create function pg_temp.expirar(p_id text) returns void language sql security definer as $$
  update public.ocorrencias set prazo_manifestacao = now() - interval '1 hour' where id = p_id::uuid;
$$;

-- Evidência em arquivo no bucket privado (metadados como o Storage grava).
insert into storage.objects (bucket_id, name, owner_id, metadata) values
  ('evidencias', pg_temp.e() || '/' || pg_temp.d('a1') || '/a0000000-0000-0000-0008-000000000001.pdf',
   pg_temp.u('0b')::text, '{"size": 1024, "mimetype": "application/pdf"}');

set local role authenticated;

-- Registro: docente da turma, com evidência em arquivo.
select pg_temp.como(pg_temp.u('0b'));
select lives_ok($$ select pg_temp.guardar('o1', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000001',
    pg_temp.d('a1'), 'uso_nao_autorizado', null, null,
    pg_temp.e() || '/' || pg_temp.d('a1') || '/a0000000-0000-0000-0008-000000000001.pdf')) $$,
  'FR-005: docente da turma registra ocorrência com evidência em arquivo');
select is(pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000001', pg_temp.d('a1'), 'uso_nao_autorizado', null, null,
    pg_temp.e() || '/' || pg_temp.d('a1') || '/a0000000-0000-0000-0008-000000000001.pdf'),
  pg_temp.g('o1'), 'FR-024: a mesma chave de envio devolve a mesma ocorrência');
reset role;
select is(pg_temp.contar('ocorrencias', format('id = %L', pg_temp.g('o1'))), 1, 'FR-024: repetição não duplica');
select is((select estado::text from public.ocorrencias where id = pg_temp.g('o1')::uuid), 'registrada',
  'FR-007: ocorrência começa registrada');
select ok((select prazo_manifestacao = criado_em + interval '24 hours' from public.ocorrencias where id = pg_temp.g('o1')::uuid),
  'FR-008: prazo de manifestação de 24 h pelas regras da edição');
select is((select jsonb_array_length(integrantes) from public.ocorrencias where id = pg_temp.g('o1')::uuid), 2,
  'Caso de borda: guarda quem compunha a equipe no fato');
select is(pg_temp.contar('avisos', format('tipo = %L and referencia ->> %L = %L', 'ocorrencia_registrada', 'ocorrenciaId', pg_temp.g('o1'))), 2,
  'FR-026: os dois integrantes recebem o aviso');
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'total', '81',
  'FR-007: ocorrência registrada ainda não altera pontos');

set local role authenticated;
select pg_temp.como(pg_temp.u('0c'));
select lives_ok($$ select pg_temp.guardar('o2', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000002', pg_temp.d('a1'), 'reincidencia', null, 'fato-repetido')) $$,
  'FR-005: mentor da turma registra');
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select pg_temp.guardar('o3', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000003', pg_temp.d('a1'), 'desrespeito', null, 'fato-repetido')) $$,
  'FR-005: coordenação registra');
select pg_temp.como(pg_temp.u('0d'));
select throws_ok($$ select pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000009', pg_temp.d('a1'), 'reincidencia') $$,
  '42501', null, 'FR-023: docente de outra turma não registra');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000009', pg_temp.d('a1'), 'reincidencia') $$,
  '42501', null, 'FR-023: aluno não registra ocorrência');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000009', pg_temp.d('a1'), 'inventado') $$,
  '23514', null, 'FR-006: tipo fora das regras da edição é recusado');
select throws_ok($$ select pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000009', pg_temp.d('a2'), 'plagio') $$,
  '23514', null, 'FR-006: plágio exige o desafio');
select throws_ok($$ select pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000009', pg_temp.d('a1'), 'reincidencia', null, null,
    pg_temp.e() || '/' || pg_temp.d('a2') || '/x.pdf') $$,
  '23514', null, 'R9: evidência precisa estar na pasta da equipe e ter sido enviada pelo autor');
select lives_ok($$ select pg_temp.guardar('o4', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000004', pg_temp.d('a2'), 'plagio', '60000000-0000-0000-0008-000000000001')) $$,
  'FR-006: plágio registrado com o desafio da turma');
select pg_temp.como(pg_temp.u('0d'));
select lives_ok($$ select pg_temp.guardar('o6', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000006', pg_temp.d('b1'), 'uso_nao_autorizado')) $$,
  'FR-005: docente de TB registra para a equipe da própria turma');

-- Visibilidade (FR-010).
select pg_temp.como(pg_temp.u('a1'));
select is((select count(*)::int from jsonb_array_elements(public.ocorrencias_visiveis(pg_temp.e(), null))), 3,
  'FR-010: a equipe vê só as próprias ocorrências');
select is((select count(*)::int from public.ocorrencias), 3, 'RLS: leitura direta limitada à própria equipe');
select pg_temp.como(pg_temp.u('a3'));
select is((select array_agg(o ->> 'id') from jsonb_array_elements(public.ocorrencias_visiveis(pg_temp.e(), null)) o),
  array[pg_temp.g('o4')], 'FR-010: outra equipe não vê as ocorrências de A1');
select pg_temp.como(pg_temp.u('0b'));
select is((select count(*)::int from jsonb_array_elements(public.ocorrencias_visiveis(pg_temp.e(), null))), 4,
  'FR-010: a equipe docente vê as ocorrências da turma');
select pg_temp.como(pg_temp.u('0d'));
select is((select count(*)::int from jsonb_array_elements(public.ocorrencias_visiveis(pg_temp.e(), null))), 1,
  'FR-010: docente de TB não vê as ocorrências de TA');
select pg_temp.como(pg_temp.u('0a'));
select is((select count(*)::int from jsonb_array_elements(public.ocorrencias_visiveis(pg_temp.e(), pg_temp.t('a')))), 4,
  'FR-010: a coordenação vê todas e filtra por turma');
select is((select o ->> 'tipoRotulo' from jsonb_array_elements(public.ocorrencias_visiveis(pg_temp.e(), null)) o
           where o ->> 'id' = pg_temp.g('o1')), 'Uso não autorizado', 'FR-006: rótulo do tipo vem das regras');

-- Evidência no Storage: envio pela gestão da turma; download pela equipe e pela gestão.
select pg_temp.como(pg_temp.u('0b'));
select lives_ok(format($f$ insert into storage.objects (bucket_id, name, owner_id) values ('evidencias', %L, %L) $f$,
  pg_temp.e() || '/' || pg_temp.d('a1') || '/b.pdf', pg_temp.u('0b')), 'R9: docente da turma envia evidência');
select pg_temp.como(pg_temp.u('0d'));
select throws_ok(format($f$ insert into storage.objects (bucket_id, name, owner_id) values ('evidencias', %L, %L) $f$,
  pg_temp.e() || '/' || pg_temp.d('a1') || '/c.pdf', pg_temp.u('0d')), '42501', null,
  'R9: docente de outra turma não envia evidência para A1');
select pg_temp.como(pg_temp.u('a1'));
select is((select count(*)::int from storage.objects where bucket_id = 'evidencias'), 2,
  'R9: a equipe baixa as evidências das próprias ocorrências');
select pg_temp.como(pg_temp.u('a3'));
select is((select count(*)::int from storage.objects where bucket_id = 'evidencias'), 0,
  'R9: outra equipe não baixa as evidências de A1');

-- Manifestação (FR-008).
select pg_temp.como(pg_temp.u('a3'));
select throws_ok($$ select public.enviar_manifestacao(pg_temp.g('o1')::uuid, 'Texto de outra equipe.') $$,
  '42501', null, 'FR-008: só integrantes da equipe se manifestam');
select pg_temp.como(pg_temp.u('a1'));
select lives_ok($$ select public.enviar_manifestacao(pg_temp.g('o1')::uuid, 'Usamos a ferramenta com autorização verbal.') $$,
  'FR-008: integrante envia a manifestação dentro do prazo');
select lives_ok($$ select public.enviar_manifestacao(pg_temp.g('o1')::uuid, 'Usamos a ferramenta com autorização verbal.') $$,
  'FR-024: repetir a mesma manifestação não falha');
select pg_temp.como(pg_temp.u('a2'));
select throws_ok($$ select public.enviar_manifestacao(pg_temp.g('o1')::uuid, 'Segunda manifestação da equipe.') $$,
  '23514', null, 'FR-008: uma manifestação por ocorrência');
reset role;
select is((select estado::text from public.ocorrencias where id = pg_temp.g('o1')::uuid), 'manifestada',
  'FR-007: ocorrência passa a manifestada');
select pg_temp.expirar(pg_temp.g('o2'));
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.enviar_manifestacao(pg_temp.g('o2')::uuid, 'Manifestação depois do prazo.') $$,
  '23514', null, 'Caso de borda: manifestação fora do prazo é recusada');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.registrar_excecao_prazo(pg_temp.d('a1'), 'manifestacao', pg_temp.g('o2')::uuid, null,
    now() + interval '2 hours', 'Equipe ausente por motivo justificado.') $$,
  '42501', null, 'FR-021: só a coordenação registra exceção de prazo');
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.registrar_excecao_prazo(pg_temp.d('a1'), 'manifestacao', pg_temp.g('o2')::uuid, null,
    now() + interval '2 hours', 'Equipe ausente por motivo justificado.') $$,
  'FR-021: coordenação registra exceção de prazo com justificativa');
select pg_temp.como(pg_temp.u('a1'));
select lives_ok($$ select public.enviar_manifestacao(pg_temp.g('o2')::uuid, 'Manifestação aceita pela exceção.') $$,
  'FR-021: com exceção, a manifestação é aceita');

-- Decisão (FR-009).
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select public.decidir_ocorrencia(pg_temp.g('o3')::uuid, 'confirmada', 'Fato comprovado pela evidência.', false, null) $$,
  '23514', null, 'FR-009: não decide antes da manifestação ou do fim do prazo');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.decidir_ocorrencia(pg_temp.g('o1')::uuid, 'confirmada', 'Fato comprovado pela evidência.', false, null) $$,
  '42501', null, 'FR-009: docente não decide');
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select public.decidir_ocorrencia(pg_temp.g('o1')::uuid, 'confirmada', 'curta', false, null) $$,
  '23514', null, 'FR-009: decisão exige justificativa');
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o1')::uuid, 'confirmada', 'Fato comprovado pela evidência.', false, null) $$,
  'FR-009: coordenação confirma depois da manifestação');
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o1')::uuid, 'confirmada', 'Fato comprovado pela evidência.', false, null) $$,
  'FR-024: repetir a mesma decisão não falha');
select throws_ok($$ select public.decidir_ocorrencia(pg_temp.g('o1')::uuid, 'arquivada', 'Mudança de entendimento.', false, null) $$,
  '23514', null, 'R7: redecisão exige pedido de revisão');
reset role;
select is(pg_temp.contar('avisos', format('tipo = %L and referencia ->> %L = %L', 'ocorrencia_decidida', 'ocorrenciaId', pg_temp.g('o1'))), 2,
  'FR-026: a equipe é avisada da decisão');
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'descontos', '5',
  'US2 (teste independente): uso não autorizado confirmado desconta 5');
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'total', '76', 'FR-011: total do encontro com o desconto');

-- Mesmo fato uma vez; teto de 10; arquivada não desconta; total não negativo; plágio.
update public.ocorrencias set criado_em = criado_em + interval '1 minute' where id = pg_temp.g('o3')::uuid;
select pg_temp.expirar(pg_temp.g('o3'));
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o2')::uuid, 'confirmada', 'Reincidência comprovada.', false, null) $$,
  'FR-009: decisão depois da manifestação aceita por exceção');
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o3')::uuid, 'confirmada', 'Mesmo fato da reincidência.', false, null) $$,
  'FR-009: decisão depois do fim do prazo, sem manifestação');
reset role;
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'descontos', '7',
  'FR-011: duas ocorrências pelo mesmo fato descontam uma vez (a primeira)');
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select pg_temp.guardar('o5', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000005', pg_temp.d('a1'), 'desrespeito'));
reset role;
select pg_temp.expirar(pg_temp.g('o5'));
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o5')::uuid, 'confirmada', 'Desrespeito comprovado.', false, null) $$,
  'FR-009: terceira ocorrência confirmada');
reset role;
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'descontos', '10',
  'FR-011: descontos gerais limitados a 10 por encontro');
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'total', '71', 'FR-011: total com o teto aplicado');

select pg_temp.expirar(pg_temp.g('o6'));
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o6')::uuid, 'arquivada', 'Fato não comprovado.', false, null) $$,
  'FR-009: coordenação arquiva');
reset role;
select is(app.pontos_do_encontro(pg_temp.d('b1'), pg_temp.en('1')) ->> 'descontos', '0',
  'Caso de borda: ocorrência arquivada não gera desconto');
set local role authenticated;
select pg_temp.como(pg_temp.u('0d'));
select pg_temp.guardar('o7', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000007', pg_temp.d('b1'), 'desrespeito'));
reset role;
select pg_temp.expirar(pg_temp.g('o7'));
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o7')::uuid, 'confirmada', 'Desrespeito comprovado.', false, null) $$,
  'FR-009: confirmação para equipe sem pontos');
reset role;
select is(app.pontos_do_encontro(pg_temp.d('b1'), pg_temp.en('1')) ->> 'total', '0', 'FR-011: o encontro não fica negativo');

select pg_temp.expirar(pg_temp.g('o4'));
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o4')::uuid, 'confirmada', 'Plágio comprovado na entrega.', true, null) $$,
  'FR-006: plágio confirmado com apresentação dependente');
reset role;
select is(app.pontos_do_encontro(pg_temp.d('a2'), pg_temp.en('1')) ->> 'entrega', '0',
  'FR-006: plágio zera a entrega do desafio, antes da média');
select is(app.pontos_do_encontro(pg_temp.d('a2'), pg_temp.en('1')) ->> 'apresentacao', '5',
  'FR-006: apresentação dependente zerada no desafio do plágio');
select is(app.pontos_do_encontro(pg_temp.d('a2'), pg_temp.en('1')) ->> 'descontos', '0',
  'FR-011: plágio fica fora do teto de descontos');

-- U1: edição encerrada.
set local role authenticated;
select pg_temp.como(pg_temp.u('0f'));
select throws_ok($$ select public.registrar_ocorrencia('a0000000-0000-0000-0008-0000000000f1', '50000000-0000-0000-0008-0000000000f1',
    pg_temp.d('f1'), 'reincidencia', 'Fato fictício descrito com detalhes.', 'Relato.', null, null, null, null) $$,
  '23514', null, 'U1: edição encerrada recusa o registro de ocorrência');
select lives_ok($$ select public.ocorrencias_visiveis('10000000-0000-0000-0008-000000000003', null) $$,
  'U1: edição encerrada mantém a leitura');
reset role;

-- ===========================================================================
-- US3 — pontos oficiais lidos do servidor (T027, FR-012 a FR-014, FR-019, FR-019a)
-- A1: encontro 1 = 71 (com descontos) e encontro 4 = 20 (só a prova); total 91, pendente.
-- ===========================================================================
insert into public.duplas (id, edicao_id, turma_id, nome) values
  (pg_temp.d('c2'), pg_temp.e(), pg_temp.t('c'), 'Equipe C2');

set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select is(public.pontos_da_minha_equipe(pg_temp.e()) ->> 'duplaId', pg_temp.d('a1')::text,
  'FR-019: o aluno recebe os pontos da própria equipe');
select is(jsonb_array_length(public.pontos_da_minha_equipe(pg_temp.e()) -> 'encontros'), 2,
  'FR-014: pontos por encontro da edição');
select is(public.pontos_da_minha_equipe(pg_temp.e()) -> 'totais',
  '{"total":91,"entrega":33.5,"avaliacaoObjetiva":42.5,"presenca":10,"pendente":true}'::jsonb,
  'FR-012/FR-014: totais oficiais com a indicação de pendência');
select ok(not pg_temp.tem_chave(public.pontos_da_minha_equipe(pg_temp.e()), 'nota'),
  'SC-002: a prévia do aluno não traz nota individual');
select pg_temp.como(pg_temp.u('a5'));
select is(public.pontos_da_minha_equipe(pg_temp.e()), null, 'FR-019: sem equipe, sem prévia');

select pg_temp.como(pg_temp.u('0b'));
select is(jsonb_array_length(public.pontos_da_turma(pg_temp.t('a'))), 2,
  'FR-019a: docente vê a prévia de todas as equipes da turma');
select ok(not pg_temp.tem_chave(public.pontos_da_turma(pg_temp.t('a')), 'nota'),
  'FR-019a/SC-002: a prévia da turma não traz nota individual');
select pg_temp.como(pg_temp.u('0c'));
select lives_ok($$ select public.pontos_da_turma(pg_temp.t('a')) $$, 'FR-019a: mentor da turma vê a prévia');
select pg_temp.como(pg_temp.u('0d'));
select throws_ok($$ select public.pontos_da_turma(pg_temp.t('a')) $$, '42501', null,
  'SC-003: docente de outra turma não vê a prévia');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.pontos_da_turma(pg_temp.t('a')) $$, '42501', null,
  'SC-003: aluno não vê a prévia da turma');
select pg_temp.como(pg_temp.u('0a'));
select is((select e -> 'totais' from jsonb_array_elements(public.pontos_da_turma(pg_temp.t('c'))) e
           where e ->> 'duplaId' = pg_temp.d('c2')::text),
  '{"total":0,"entrega":0,"avaliacaoObjetiva":0,"presenca":0,"pendente":true}'::jsonb,
  'Caso de borda: equipe sem lançamentos tem total 0 e pendente');

-- Correção de um lançamento muda os pontos na leitura seguinte (cenário 4 da US3).
select lives_ok(format($f$ select public.registrar_presencas(pg_temp.en('1'), pg_temp.t('a'),
    '[{"estudanteId":"%s","presente":false}]', 'Saiu antes do início da atividade.') $f$, pg_temp.u('a2')),
  'US3: coordenação corrige a presença com justificativa');
select pg_temp.como(pg_temp.u('a1'));
select is((public.pontos_da_minha_equipe(pg_temp.e()) -> 'totais' ->> 'total'), '86',
  'US3: a prévia reflete a correção (presença 10 → 5)');
reset role;

-- ===========================================================================
-- US4 — publicação do ranking (T031, FR-015 a FR-019, SC-005). Desde a spec 012 a publicação é
-- por turma: TA (A1 86, A2 5); TC (C1, C2 sem lançamentos). A recusa de uma turma do lote vira
-- exceção aqui, para manter as asserções da spec 007.
-- ===========================================================================
create function pg_temp.publicar(p_estado text, p_justificativa text default null, p_turma text default 'a')
returns jsonb language plpgsql as $$
declare
  v_resposta jsonb;
  v_base int := (select max(versao) from public.publicacoes_ranking where turma_id = pg_temp.t(p_turma));
begin
  v_resposta := public.publicar_ranking_turmas(pg_temp.e(),
    jsonb_build_array(jsonb_build_object('turmaId', pg_temp.t(p_turma), 'versaoBase', v_base)), p_estado, p_justificativa) -> 0;
  if not (v_resposta ->> 'publicada')::boolean then
    raise exception '%', v_resposta ->> 'motivo' using errcode = '23514';
  end if;
  return jsonb_build_object('versao', v_resposta -> 'versao',
    'id', (select id from public.publicacoes_ranking
           where turma_id = pg_temp.t(p_turma) and versao = (v_resposta ->> 'versao')::int));
end;
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select pg_temp.publicar('parcial') $$, '42501', null, 'SC-003: docente não publica');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select pg_temp.publicar('parcial') $$, '42501', null, 'SC-003: aluno não publica');
select pg_temp.como(pg_temp.u('0e'));
select throws_ok($$ select pg_temp.publicar('parcial') $$, '42501', null, 'SC-003: coordenação de outra edição não publica');

select pg_temp.como(pg_temp.u('0a'));
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.e(),
                        jsonb_build_array(jsonb_build_object('turmaId', pg_temp.t('e'), 'versaoBase', null))), '23514', null,
  'FR-015: a turma precisa ser da edição');
select pg_temp.guardar('v1', pg_temp.publicar('parcial') ->> 'id');
reset role;
select is((select versao from public.publicacoes_ranking where id = pg_temp.g('v1')::uuid), 1, 'FR-015: primeira versão');
select ok((select revisao_ate is null and estado = 'parcial' and regras_versao = 'piloto-2026.0-a-confirmar'
           from public.publicacoes_ranking where id = pg_temp.g('v1')::uuid),
  'FR-015/FR-020: parcial guarda a versão das regras e não abre prazo de revisão');
select is((select array_agg(dupla_id::text || ':' || posicao order by posicao)
           from public.publicacao_posicoes where publicacao_id = pg_temp.g('v1')::uuid),
  array[pg_temp.d('a1') || ':1', pg_temp.d('a2') || ':2'],
  'FR-015/FR-016: posições congeladas por total (só equipes da turma)');
select ok((select not bool_or(pg_temp.tem_chave(detalhe, 'nota')) from public.publicacao_posicoes
           where publicacao_id = pg_temp.g('v1')::uuid), 'SC-002: posições congeladas sem nota individual');

set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select is(pg_temp.publicar('parcial') ->> 'id', pg_temp.g('v1'), 'FR-024: repetir a mesma publicação devolve a versão existente');
select throws_ok($$ select pg_temp.publicar('provisorio') $$, '23514', null,
  'FR-018: a segunda versão exige justificativa');
select throws_like($$ select pg_temp.publicar('definitivo', 'Fechamento da edição.') $$, '%pendência%',
  'FR-017/SC-005: definitivo recusado com a lista de pendências');
select ok(jsonb_array_length(public.pendencias_ranking_turma(pg_temp.t('a')) -> 'componentes') > 0,
  'FR-017: pendências de componentes listadas');
select pg_temp.guardar('o8', pg_temp.ocorrencia('a0000000-0000-0000-0008-000000000008', pg_temp.d('a1'), 'reincidencia'));
select is(jsonb_array_length(public.pendencias_ranking_turma(pg_temp.t('a')) -> 'ocorrencias'), 1,
  'FR-017: ocorrência não decidida listada nas pendências');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.pendencias_ranking_turma(pg_temp.t('a')) $$, '42501', null,
  'SC-003: pendências só para a coordenação');

select pg_temp.como(pg_temp.u('0a'));
select pg_temp.guardar('v2', pg_temp.publicar('provisorio', 'Prova oficial registrada para a categoria.') ->> 'id');
reset role;
select ok((select versao = 2 and revisao_ate = publicado_em + interval '24 hours' and justificativa is not null
           from public.publicacoes_ranking where id = pg_temp.g('v2')::uuid),
  'FR-018/FR-020: provisória é a versão 2, com justificativa e prazo de revisão de 24 h');
select is(pg_temp.contar('publicacoes_ranking', format('turma_id = %L', pg_temp.t('a'))), 2,
  'FR-018: a versão anterior continua no histórico');
select throws_ok(format($f$ update public.publicacoes_ranking set estado = 'definitivo' where id = %L $f$, pg_temp.g('v2')),
  '23514', null, 'FR-015: versão publicada é imutável (atualização)');
select throws_ok(format($f$ delete from public.publicacao_posicoes where publicacao_id = %L $f$, pg_temp.g('v1')),
  '23514', null, 'FR-015: versão publicada é imutável (remoção)');
select ok(pg_temp.contar('avisos', format('tipo = %L and destinatario_id = %L', 'ranking_publicado', pg_temp.u('a1'))) >= 1
          and pg_temp.contar('avisos', format('tipo = %L and destinatario_id = %L', 'ranking_publicado', pg_temp.u('0b'))) >= 1
          and pg_temp.contar('avisos', format('tipo = %L and destinatario_id in (%L, %L)', 'ranking_publicado', pg_temp.u('0d'), pg_temp.u('c1'))) = 0,
  'FR-026 (spec 012, FR-012a): alunos e equipe docente da turma são avisados; outras turmas não');

-- Leitura por perfil (FR-019, FR-019a).
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select is(public.ranking_da_turma(pg_temp.t('a')) ->> 'versao', '2', 'FR-019: aluno vê a versão mais recente');
select throws_ok($$ select public.ranking_da_turma(pg_temp.t('c')) $$, '42501', null,
  'FR-019 (spec 012, FR-008): aluno vê só a própria turma');
select is((select count(*)::int from jsonb_array_elements(public.ranking_da_turma(pg_temp.t('a')) -> 'posicoes') p
           where p ? 'detalhe'), 1, 'FR-019: detalhe só da própria equipe');
select is((select p ->> 'duplaId' from jsonb_array_elements(public.ranking_da_turma(pg_temp.t('a')) -> 'posicoes') p
           where (p ->> 'minha')::boolean), pg_temp.d('a1')::text, 'FR-019: a própria equipe vem marcada');
select ok(not pg_temp.tem_chave(public.ranking_da_turma(pg_temp.t('a')), 'nota'), 'SC-002: ranking sem nota individual');
select is((select count(*)::int from public.publicacoes_ranking), 0, 'RLS: aluno não lê as publicações diretamente');
select pg_temp.como(pg_temp.u('c1'));
select is(public.ranking_da_turma(pg_temp.t('c')), null, 'FR-019: sem publicação na turma, nada a mostrar');
select pg_temp.como(pg_temp.u('0b'));
select is((select count(*)::int from jsonb_array_elements(public.ranking_da_turma(pg_temp.t('a')) -> 'posicoes') p
           where p ? 'detalhe'), 2, 'FR-019a: docente vê o detalhe das equipes da própria turma');
select throws_ok($$ select public.ranking_da_turma(pg_temp.t('c')) $$, '42501', null,
  'SC-003: docente não vê o ranking de outras turmas');
select throws_ok($$ select public.historico_publicacoes_turma(pg_temp.t('a')) $$, '42501', null,
  'SC-003: histórico só para a coordenação');
select pg_temp.como(pg_temp.u('0e'));
select throws_ok($$ select public.ranking_da_turma(pg_temp.t('a')) $$, '42501', null,
  'SC-003: quem não participa da edição não vê o ranking');
select pg_temp.como(pg_temp.u('0a'));
select is((select count(*)::int from jsonb_array_elements(public.ranking_da_turma(pg_temp.t('a')) -> 'posicoes') p
           where p ? 'detalhe'), 2, 'FR-019: coordenação vê o detalhe de todas');
select is(jsonb_array_length(public.historico_publicacoes_turma(pg_temp.t('a'))), 2, 'FR-018: histórico de versões');
select is(public.painel_da_turma(pg_temp.t('a')) -> 'pontuacao' ->> 'estado', 'provisorio',
  'US4: o painel da turma mostra a última publicação');

-- FR-022: corrigir um lançamento depois de publicar não muda a versão publicada.
select lives_ok(format($f$ select public.registrar_presencas(pg_temp.en('1'), pg_temp.t('a'),
    '[{"estudanteId":"%s","presente":true}]', 'Presença confirmada pela lista assinada.') $f$, pg_temp.u('a2')),
  'FR-022: correção depois da publicação');
select pg_temp.como(pg_temp.u('a1'));
select is(public.pontos_da_minha_equipe(pg_temp.e()) -> 'totais' ->> 'total', '91', 'FR-022: a prévia muda');
select is((select p ->> 'total' from jsonb_array_elements(public.ranking_da_turma(pg_temp.t('a')) -> 'posicoes') p
           where (p ->> 'minha')::boolean), '86', 'FR-022: o ranking publicado só muda numa nova publicação');

-- C3: equipe sem lançamentos aparece com total 0 e pendente.
select pg_temp.como(pg_temp.u('0a'));
select pg_temp.guardar('vc2', pg_temp.publicar('parcial', null, 'c') ->> 'id');
reset role;
select ok((select total = 0 and pendente from public.publicacao_posicoes
           where publicacao_id = pg_temp.g('vc2')::uuid and dupla_id = pg_temp.d('c2')),
  'C3: equipe sem lançamentos na publicação com total 0 e pendente');

-- U1: edição encerrada recusa a publicação e mantém a leitura.
set local role authenticated;
select pg_temp.como(pg_temp.u('0f'));
select throws_ok(format($f$ select public.publicar_ranking_turmas('10000000-0000-0000-0008-000000000003', %L, 'parcial', null) $f$,
                        jsonb_build_array(jsonb_build_object('turmaId', pg_temp.t('e'), 'versaoBase', null))),
  '23514', null, 'U1: edição encerrada recusa a publicação');
select lives_ok($$ select public.ranking_da_turma(pg_temp.t('e')) $$,
  'U1: edição encerrada mantém a leitura do ranking');
reset role;

-- ===========================================================================
-- US5 — pedidos de revisão e correções ligadas (T037, FR-020 a FR-022, SC-006)
-- v2 = publicação provisória de "Cat 1" (revisão até +24 h); v1 parcial; o1 e o2 decididas (A1).
-- ===========================================================================
create function pg_temp.pedir(p_chave text, p_objeto text, p_alvo text, p_componente text default null,
                              p_encontro uuid default null) returns text language sql as $$
  select public.pedir_revisao(p_chave::uuid, p_objeto,
           case when p_objeto = 'ocorrencia' then p_alvo::uuid end,
           case when p_objeto = 'publicacao' then p_alvo::uuid end,
           p_componente, p_encontro, 'A equipe discorda deste ponto pelos motivos expostos.') ->> 'id';
$$;
-- Ajuste do relógio dos prazos só no banco de teste (a publicação é imutável para a aplicação).
create function pg_temp.revisao_ate(p_publicacao text, p_quando timestamptz) returns void
language plpgsql security definer as $$
begin
  set local session_replication_role = replica;
  update public.publicacoes_ranking set revisao_ate = p_quando where id = p_publicacao::uuid;
  set local session_replication_role = origin;
end;
$$;
create function pg_temp.ligadas(p_pedido text) returns int language sql security definer as $$
  select count(*)::int from public.auditoria where pedido_revisao_id = p_pedido::uuid;
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select lives_ok($$ select pg_temp.guardar('r1', pg_temp.pedir('b0000000-0000-0000-0008-000000000001', 'ocorrencia', pg_temp.g('o1'))) $$,
  'FR-020: integrante pede revisão da decisão de ocorrência dentro de 24 h');
select is(pg_temp.pedir('b0000000-0000-0000-0008-000000000001', 'ocorrencia', pg_temp.g('o1')), pg_temp.g('r1'),
  'FR-024: a mesma chave devolve o pedido original');
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000009', 'ocorrencia', pg_temp.g('o1')) $$,
  '23514', null, 'FR-020: um pedido aberto por objeto');
select lives_ok($$ select pg_temp.guardar('r2', pg_temp.pedir('b0000000-0000-0000-0008-000000000002', 'publicacao', pg_temp.g('v2'), 'presenca', pg_temp.en('1'))) $$,
  'FR-020: pedido sobre componente da publicação provisória');
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000009', 'publicacao', pg_temp.g('v1'), 'presenca') $$,
  '23514', null, 'FR-020: publicação parcial não abre prazo de revisão');
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000009', 'publicacao', pg_temp.g('v2')) $$,
  '23514', null, 'FR-020: pedido sobre publicação indica o componente');
select pg_temp.como(pg_temp.u('a3'));
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000009', 'ocorrencia', pg_temp.g('o1')) $$,
  '42501', null, 'SC-003: outra equipe não pede revisão da ocorrência de A1');
select lives_ok($$ select pg_temp.guardar('r4', pg_temp.pedir('b0000000-0000-0000-0008-000000000004', 'publicacao', pg_temp.g('v2'), 'entrega')) $$,
  'FR-020: A2 pede revisão da própria entrega na publicação provisória');
select pg_temp.como(pg_temp.u('c1'));
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000009', 'publicacao', pg_temp.g('v2'), 'entrega') $$,
  '23514', null, 'FR-020: publicação que não inclui a equipe');
reset role;
select ok(pg_temp.contar('avisos', format('tipo = %L and destinatario_id = %L', 'revisao_pedida', pg_temp.u('0a'))) >= 2,
  'FR-026: a coordenação é avisada dos pedidos');
select ok(jsonb_array_length(app.pendencias_do_ranking_da_turma(pg_temp.t('a')) -> 'revisoes') >= 2,
  'FR-017: pedido aberto entra nas pendências do definitivo');

-- Prazo vencido e exceção de prazo (SC-006).
update public.ocorrencias set decidido_em = now() - interval '25 hours' where id = pg_temp.g('o2')::uuid;
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000003', 'ocorrencia', pg_temp.g('o2')) $$,
  '23514', null, 'SC-006: pedido 25 h depois da decisão é recusado');
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.registrar_excecao_prazo(pg_temp.d('a1'), 'revisao', pg_temp.g('o2')::uuid, null,
    now() + interval '2 hours', 'Equipe sem acesso ao sistema no prazo.') $$,
  'FR-021: exceção de prazo de revisão da decisão');
select pg_temp.como(pg_temp.u('a1'));
select lives_ok($$ select pg_temp.guardar('r3', pg_temp.pedir('b0000000-0000-0000-0008-000000000003', 'ocorrencia', pg_temp.g('o2'))) $$,
  'SC-006: com exceção registrada, o pedido é aceito');
reset role;
select pg_temp.revisao_ate(pg_temp.g('v2'), now() - interval '1 hour');
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000005', 'publicacao', pg_temp.g('v2'), 'entrega') $$,
  '23514', null, 'SC-006: pedido sobre a publicação depois do prazo é recusado');
select pg_temp.como(pg_temp.u('0a'));
select lives_ok($$ select public.registrar_excecao_prazo(pg_temp.d('a1'), 'revisao', null, pg_temp.g('v2')::uuid,
    now() + interval '2 hours', 'Prazo reaberto por indisponibilidade.') $$,
  'FR-021: exceção de prazo de revisão da publicação');
select pg_temp.como(pg_temp.u('a1'));
select lives_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000005', 'publicacao', pg_temp.g('v2'), 'entrega') $$,
  'SC-006: com exceção, o pedido sobre a publicação é aceito');
reset role;
select pg_temp.revisao_ate(pg_temp.g('v2'), now() + interval '24 hours');

-- Correções de origem ligadas ao pedido (FR-022, R7).
set local role authenticated;
select pg_temp.como(pg_temp.u('0a'));
select lives_ok(format($f$ select public.registrar_presencas(pg_temp.en('1'), pg_temp.t('a'),
    '[{"estudanteId":"%s","presente":false}]', 'Correção pedida na revisão da presença.', %L) $f$, pg_temp.u('a2'), pg_temp.g('r2')),
  'R7: presença corrigida a partir do pedido');
select lives_ok(format($f$ select public.registrar_participacao(pg_temp.en('1'), pg_temp.d('a1'),
    '{"envolvimento":3,"colaboracao":3,"organizacao":3}', 'Correção pedida na revisão.', %L) $f$, pg_temp.g('r2')),
  'R7: participação corrigida a partir do pedido');
select lives_ok(format($f$ select public.registrar_avaliacao('60000000-0000-0000-0008-000000000001', pg_temp.d('a1'),
    '{"compreensao":9,"aplicacao":10,"qualidade":10,"organizacao":10}', '{"clareza":3,"explicacao":4,"respostas":3}',
    false, 'Feedback revisto.', 'Correção pedida na revisão.', %L) $f$, pg_temp.g('r2')),
  'R7: avaliação corrigida a partir do pedido');
select lives_ok(format($f$ select public.registrar_resultados_prova(pg_temp.en('4'),
    '[{"estudanteId":"%s","realizacao":"confirmada","nota":85,"fonte":"Planilha oficial","escalaConfirmada":true,"autorizacaoConfirmada":true}]',
    'Correção pedida na revisão.', %L) $f$, pg_temp.u('a1'), pg_temp.g('r2')),
  'R7: prova corrigida a partir do pedido');
select lives_ok($$ select public.decidir_ocorrencia(pg_temp.g('o1')::uuid, 'arquivada', 'Revisão acolheu a manifestação da equipe.', false, pg_temp.g('r1')::uuid) $$,
  'R7: redecisão da ocorrência ligada ao pedido');
select throws_ok(format($f$ select public.registrar_participacao(pg_temp.en('1'), pg_temp.d('a1'),
    '{"envolvimento":2,"colaboracao":3,"organizacao":3}', 'Correção com pedido de outra equipe.', %L) $f$, pg_temp.g('r4')),
  '23514', null, 'R7: pedido de outra equipe não liga a correção');
select throws_ok($$ select public.decidir_ocorrencia(pg_temp.g('o5')::uuid, 'arquivada', 'Redecisão com pedido de outra ocorrência.', false, pg_temp.g('r3')::uuid) $$,
  '23514', null, 'R7: redecisão exige o pedido sobre a própria ocorrência');
select throws_ok($$ select public.decidir_ocorrencia(pg_temp.g('o5')::uuid, 'arquivada', 'Redecisão com pedido sobre a publicação.', false, pg_temp.g('r2')::uuid) $$,
  '23514', null, 'R7: pedido sobre a publicação não redecide ocorrência');
reset role;
select ok(pg_temp.ligadas(pg_temp.g('r2')) >= 4, 'FR-022: as correções ficam ligadas ao pedido na auditoria');
select ok(pg_temp.ligadas(pg_temp.g('r1')) >= 1, 'FR-022: a redecisão fica ligada ao pedido');
select is(app.pontos_do_encontro(pg_temp.d('a1'), pg_temp.en('1')) ->> 'descontos', '7',
  'FR-022: arquivar a ocorrência na revisão recalcula os descontos');

-- Resposta da coordenação.
set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.responder_revisao(pg_temp.g('r2')::uuid, 'deferido', 'Presença corrigida.') $$,
  '42501', null, 'FR-021: só a coordenação responde');
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select public.responder_revisao(pg_temp.g('r2')::uuid, 'deferido', 'curta') $$,
  '23514', null, 'FR-021: resposta exige justificativa');
select lives_ok($$ select public.responder_revisao(pg_temp.g('r2')::uuid, 'deferido', 'Presença corrigida conforme a lista.') $$,
  'FR-021: coordenação defere com justificativa');
select lives_ok($$ select public.responder_revisao(pg_temp.g('r2')::uuid, 'deferido', 'Presença corrigida conforme a lista.') $$,
  'FR-024: repetir a mesma resposta não falha');
select throws_ok($$ select public.responder_revisao(pg_temp.g('r2')::uuid, 'indeferido', 'Mudança de resposta.') $$,
  '23514', null, 'FR-021: pedido já respondido não muda');
select throws_ok(format($f$ select public.registrar_participacao(pg_temp.en('1'), pg_temp.d('a1'),
    '{"envolvimento":4,"colaboracao":3,"organizacao":3}', 'Correção com pedido fechado.', %L) $f$, pg_temp.g('r2')),
  '23514', null, 'R7: pedido respondido não liga novas correções');
select lives_ok($$ select public.responder_revisao(pg_temp.g('r1')::uuid, 'deferido', 'Ocorrência arquivada na revisão.') $$,
  'FR-021: defere a revisão da ocorrência');
reset role;
select ok(pg_temp.contar('avisos', format('tipo = %L and destinatario_id = %L', 'revisao_respondida', pg_temp.u('a1'))) >= 2,
  'FR-026: a equipe é avisada da resposta');

-- Leitura dos pedidos.
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select ok((select bool_and(p ->> 'duplaId' = pg_temp.d('a1')::text) from jsonb_array_elements(public.pedidos_revisao(pg_temp.e())) p),
  'SC-003: a equipe vê só os próprios pedidos');
select ok((select jsonb_array_length(p -> 'correcoes') >= 4 from jsonb_array_elements(public.pedidos_revisao(pg_temp.e())) p
           where p ->> 'id' = pg_temp.g('r2')), 'FR-022: o pedido lista as correções ligadas');
select is((select count(*)::int from public.pedidos_revisao), 4, 'RLS: a equipe lê os próprios pedidos');
select pg_temp.como(pg_temp.u('a3'));
select is((select array_agg(p ->> 'id') from jsonb_array_elements(public.pedidos_revisao(pg_temp.e())) p),
  array[pg_temp.g('r4')], 'SC-003: outra equipe vê só o próprio pedido');
select pg_temp.como(pg_temp.u('0a'));
select is(jsonb_array_length(public.pedidos_revisao(pg_temp.e())), 5, 'FR-021: a coordenação vê todos os pedidos');

-- U2: nova versão provisória com pedido aberto.
select pg_temp.guardar('v3', pg_temp.publicar('provisorio', 'Correções da revisão aplicadas.') ->> 'id');
reset role;
select is((select estado::text from public.pedidos_revisao where id = pg_temp.g('r4')::uuid), 'aberto',
  'U2: pedido sobre a versão anterior continua aberto');
set local role authenticated;
select pg_temp.como(pg_temp.u('a3'));
select lives_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-000000000006', 'publicacao', pg_temp.g('v3'), 'presenca') $$,
  'U2: a nova versão provisória abre prazo próprio');

-- U1: edição encerrada recusa o pedido e mantém a leitura.
reset role;
-- Spec 010: a edição encerrada recusa escrita; a fixture reabre só durante a gravação.
update public.edicoes set estado = 'ativa' where id = '10000000-0000-0000-0008-000000000003';
insert into public.ocorrencias (id, edicao_id, encontro_id, dupla_id, tipo, fato, fato_chave, evidencia, estado,
                                prazo_manifestacao, justificativa_decisao, decidido_em, chave_envio, autor_id)
values ('c0000000-0000-0000-0008-0000000000f1', '10000000-0000-0000-0008-000000000003',
        '50000000-0000-0000-0008-0000000000f1', pg_temp.d('f1'), 'reincidencia', 'Fato fictício descrito com detalhes.',
        'f', 'Relato.', 'confirmada', now(), 'Decisão fictícia registrada.', now(), gen_random_uuid(), pg_temp.u('0f'));
update public.edicoes set estado = 'encerrada' where id = '10000000-0000-0000-0008-000000000003';
set local role authenticated;
select pg_temp.como(pg_temp.u('f1'));
select throws_ok($$ select pg_temp.pedir('b0000000-0000-0000-0008-0000000000f1', 'ocorrencia', 'c0000000-0000-0000-0008-0000000000f1') $$,
  '23514', null, 'U1: edição encerrada recusa o pedido de revisão');
select lives_ok($$ select public.pedidos_revisao('10000000-0000-0000-0008-000000000003') $$,
  'U1: edição encerrada mantém a leitura dos pedidos');
reset role;

-- @@secoes

select * from finish();
rollback;
