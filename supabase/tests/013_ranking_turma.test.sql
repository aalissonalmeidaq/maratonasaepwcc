-- Testes da spec 012 — ranking por turma.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício.
--   E (ativa, regras do piloto): curso K ("Categoria K": turmas KA, KB) e curso L
--   ("Categoria L": turma LA, sem equipes).
--   KA: equipes QA1 (a1, a2), QA2 (a3), QA3 (sem integrantes) e QX (inativa).
--   KB: equipes QB1 (b1) e QB2 (sem integrantes). KB fica fora dos dois encontros (sem pendências).
--   Encontros: 1 (há 7 dias, prova oficial) e 2 (daqui a 7 dias, questões).
--   c = coordenação de E; d = docente de KA; dk = docente de KB; m = mentor do curso K.
--   G (encerrada): coordenação cg; curso com turma GA e uma equipe.
--   Publicação por categoria anterior (fixture): "Categoria K", versão 1, parcial, com QA1 e QB1.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0013-0000000000' || s)::uuid, 'k' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('c1'), ('c9'), ('d1'), ('d2'), ('e1'), ('a1'), ('a2'), ('a3'), ('b1')) as v (s);

insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao, premiacao)
select v.id::uuid, v.nome, 'ativa', '2026-03-01', '2026-12-01', app.regras_piloto(),
       app.regras_piloto() ->> 'versao',
       '[{"posicao": 1, "descricao": "Prêmio do 1º", "detalhes": null},
         {"posicao": 2, "descricao": "Prêmio do 2º", "detalhes": null}]'::jsonb
from (values ('10000000-0000-0000-0013-0000000000e0', 'Edição E'),
             ('10000000-0000-0000-0013-0000000000a0', 'Edição G')) as v (id, nome);

insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0013-0000000000e1', '10000000-0000-0000-0013-0000000000e0', 'Curso K', 'Categoria K'),
  ('20000000-0000-0000-0013-0000000000e2', '10000000-0000-0000-0013-0000000000e0', 'Curso L', 'Categoria L'),
  ('20000000-0000-0000-0013-0000000000a1', '10000000-0000-0000-0013-0000000000a0', 'Curso G', 'Categoria G');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0013-0000000000a0', '20000000-0000-0000-0013-0000000000e1', 'KA'),
  ('30000000-0000-0000-0013-0000000000b0', '20000000-0000-0000-0013-0000000000e1', 'KB'),
  ('30000000-0000-0000-0013-0000000000c0', '20000000-0000-0000-0013-0000000000e2', 'LA'),
  ('30000000-0000-0000-0013-0000000000d0', '20000000-0000-0000-0013-0000000000a1', 'GA');

insert into public.encontros (id, edicao_id, numero, titulo, data, inicio, avaliacao_objetiva) values
  ('50000000-0000-0000-0013-000000000001', '10000000-0000-0000-0013-0000000000e0', 1, 'Encontro 1', current_date - 7, '10:00', 'prova_oficial'),
  ('50000000-0000-0000-0013-000000000002', '10000000-0000-0000-0013-0000000000e0', 2, 'Encontro 2', current_date + 7, null, 'questoes');
insert into public.encontros_fora_da_turma (turma_id, encontro_id) values
  ('30000000-0000-0000-0013-0000000000b0', '50000000-0000-0000-0013-000000000001'),
  ('30000000-0000-0000-0013-0000000000b0', '50000000-0000-0000-0013-000000000002');

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id, curso_id)
select ('00000000-0000-0000-0013-0000000000' || u)::uuid, e::uuid, p::public.papel, t::uuid, k::uuid
from (values ('c1', '10000000-0000-0000-0013-0000000000e0', 'coordenacao', null, null),
             ('c9', '10000000-0000-0000-0013-0000000000a0', 'coordenacao', null, null),
             ('d1', '10000000-0000-0000-0013-0000000000e0', 'docente', '30000000-0000-0000-0013-0000000000a0', null),
             ('d2', '10000000-0000-0000-0013-0000000000e0', 'docente', '30000000-0000-0000-0013-0000000000b0', null),
             ('e1', '10000000-0000-0000-0013-0000000000e0', 'mentor', null, '20000000-0000-0000-0013-0000000000e1'),
             ('a1', '10000000-0000-0000-0013-0000000000e0', 'aluno', '30000000-0000-0000-0013-0000000000a0', null),
             ('a2', '10000000-0000-0000-0013-0000000000e0', 'aluno', '30000000-0000-0000-0013-0000000000a0', null),
             ('a3', '10000000-0000-0000-0013-0000000000e0', 'aluno', '30000000-0000-0000-0013-0000000000a0', null),
             ('b1', '10000000-0000-0000-0013-0000000000e0', 'aluno', '30000000-0000-0000-0013-0000000000b0', null))
  as v (u, e, p, t, k);

insert into public.duplas (id, edicao_id, turma_id, nome, ativa) values
  ('60000000-0000-0000-0013-0000000000a1', '10000000-0000-0000-0013-0000000000e0', '30000000-0000-0000-0013-0000000000a0', 'QA1', true),
  ('60000000-0000-0000-0013-0000000000a2', '10000000-0000-0000-0013-0000000000e0', '30000000-0000-0000-0013-0000000000a0', 'QA2', true),
  ('60000000-0000-0000-0013-0000000000a3', '10000000-0000-0000-0013-0000000000e0', '30000000-0000-0000-0013-0000000000a0', 'QA3', true),
  ('60000000-0000-0000-0013-0000000000a9', '10000000-0000-0000-0013-0000000000e0', '30000000-0000-0000-0013-0000000000a0', 'QX', false),
  ('60000000-0000-0000-0013-0000000000b1', '10000000-0000-0000-0013-0000000000e0', '30000000-0000-0000-0013-0000000000b0', 'QB1', true),
  ('60000000-0000-0000-0013-0000000000b2', '10000000-0000-0000-0013-0000000000e0', '30000000-0000-0000-0013-0000000000b0', 'QB2', true),
  ('60000000-0000-0000-0013-0000000000d1', '10000000-0000-0000-0013-0000000000a0', '30000000-0000-0000-0013-0000000000d0', 'QG1', true);
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
select d::uuid, '10000000-0000-0000-0013-0000000000e0', ('00000000-0000-0000-0013-0000000000' || s)::uuid
from (values ('60000000-0000-0000-0013-0000000000a1', 'a1'), ('60000000-0000-0000-0013-0000000000a1', 'a2'),
             ('60000000-0000-0000-0013-0000000000a2', 'a3'), ('60000000-0000-0000-0013-0000000000b1', 'b1')) as v (d, s);

-- Publicação por categoria anterior: inserida sem gatilhos, como estava antes da spec 012.
set local session_replication_role = replica;
insert into public.publicacoes_ranking (id, edicao_id, categoria, versao, estado, justificativa, regras_versao,
                                        revisao_ate, publicado_por)
values ('70000000-0000-0000-0013-0000000000f1', '10000000-0000-0000-0013-0000000000e0', 'Categoria K', 1,
        'provisorio', null, app.regras_piloto() ->> 'versao', now() + interval '24 hours',
        '00000000-0000-0000-0013-0000000000c1');
insert into public.publicacao_posicoes (publicacao_id, dupla_id, nome, posicao, compartilhada, total, entrega,
                                        avaliacao_objetiva, presenca, pendente, detalhe)
values ('70000000-0000-0000-0013-0000000000f1', '60000000-0000-0000-0013-0000000000a1', 'QA1', 1, false, 42, 10, 20, 12, true, '[]'),
       ('70000000-0000-0000-0013-0000000000f1', '60000000-0000-0000-0013-0000000000b1', 'QB1', 2, false, 30, 5, 15, 10, true, '[]');
-- Pedido de revisão aberto sobre a anterior (US4).
insert into public.pedidos_revisao (id, edicao_id, dupla_id, objeto, publicacao_id, componente, justificativa,
                                    chave_envio, autor_id)
values ('80000000-0000-0000-0013-0000000000f1', '10000000-0000-0000-0013-0000000000e0',
        '60000000-0000-0000-0013-0000000000a1', 'publicacao', '70000000-0000-0000-0013-0000000000f1', 'presenca',
        'Pedido anterior à mudança para turma.', gen_random_uuid(), '00000000-0000-0000-0013-0000000000a1');
set local session_replication_role = origin;

update public.edicoes set estado = 'encerrada', justificativa_encerramento = 'Encerrada no teste.'
where id = '10000000-0000-0000-0013-0000000000a0';

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0013-0000000000' || s)::uuid;
$$;
create function pg_temp.e() returns uuid language sql immutable as $$ select '10000000-0000-0000-0013-0000000000e0'::uuid; $$;
create function pg_temp.g() returns uuid language sql immutable as $$ select '10000000-0000-0000-0013-0000000000a0'::uuid; $$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0013-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.q(s text) returns uuid language sql immutable as $$
  select ('60000000-0000-0000-0013-0000000000' || s)::uuid;
$$;
create function pg_temp.anterior() returns uuid language sql immutable as $$
  select '70000000-0000-0000-0013-0000000000f1'::uuid;
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
-- Lote de publicação: `[{turmaId, versaoBase}]` a partir de pares (turma, versão base).
create function pg_temp.lote(variadic pares text[]) returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(jsonb_build_object('turmaId', pg_temp.t(split_part(p, ':', 1)),
                                               'versaoBase', nullif(split_part(p, ':', 2), '')::int)), '[]'::jsonb)
  from unnest(pares) p;
$$;
-- Resultado de uma turma dentro da resposta do lote.
create function pg_temp.da(resposta jsonb, turma text) returns jsonb language sql immutable as $$
  select r from jsonb_array_elements(resposta) r where (r ->> 'turmaId')::uuid = pg_temp.t(turma);
$$;

-- -- @@secoes
-- ===========================================================================
-- Fundação (T003)
-- ===========================================================================
select has_column('public', 'publicacoes_ranking', 'turma_id', 'publicacoes_ranking.turma_id existe');
select has_column('public', 'publicacoes_ranking', 'lote_id', 'publicacoes_ranking.lote_id existe');
select fk_ok('public', 'publicacoes_ranking', 'turma_id', 'public', 'turmas', 'id', 'turma_id referencia turmas');
select has_index('public', 'publicacoes_ranking', 'publicacoes_versao_turma', 'índice único de versão por turma');
select has_index('public', 'publicacoes_ranking', 'publicacoes_versao_categoria', 'índice único de versão por categoria (anteriores)');
select has_index('public', 'publicacoes_ranking', 'publicacoes_turma_idx', 'índice de leitura por turma');
select is((select count(*)::int from pg_constraint where conname = 'publicacoes_versao_unica'), 0,
  'a unicidade antiga por categoria foi substituída');

select throws_ok(format($f$ insert into public.publicacoes_ranking (edicao_id, categoria, versao, estado, regras_versao, publicado_por)
                            values (%L, 'Categoria K', 2, 'parcial', 'x', %L) $f$, pg_temp.e(), pg_temp.u('c1')),
  '23514', null, 'publicação nova sem turma é recusada');
select throws_ok(format($f$ insert into public.publicacoes_ranking (edicao_id, turma_id, categoria, versao, estado, regras_versao, publicado_por)
                            values (%L, %L, 'Categoria G', 1, 'parcial', 'x', %L) $f$, pg_temp.e(), pg_temp.t('d'), pg_temp.u('c1')),
  '23514', null, 'turma de outra edição é recusada');

select is((select (estado, versao, categoria, turma_id)::text from public.publicacoes_ranking where id = pg_temp.anterior()),
  '(provisorio,1,"Categoria K",)', 'a publicação anterior continua como estava (sem turma)');
select is((select string_agg(nome || ':' || posicao || ':' || total, ',' order by posicao)
           from public.publicacao_posicoes where publicacao_id = pg_temp.anterior()),
  'QA1:1:42,QB1:2:30', 'as posições da anterior continuam as originais');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ select public.publicar_ranking(%L, 'Categoria K', 'parcial', null) $f$, pg_temp.e()),
  '23514', 'A publicação por categoria foi substituída pela publicação por turma.',
  'publicar por categoria é recusado');
reset role;

select is((select array_agg(x order by x) from app.equipes_da_turma(pg_temp.t('a')) x),
  array[pg_temp.q('a1'), pg_temp.q('a2'), pg_temp.q('a3')], 'equipes_da_turma: só as ativas da turma');
select is((select array_agg(x) from app.equipes_da_turma(pg_temp.t('c')) x), null, 'turma sem equipes');

select pg_temp.guardar('pka', app.pendencias_do_ranking_da_turma(pg_temp.t('a'))::text);
select is((select array_agg(k order by k) from jsonb_object_keys(pg_temp.lido('pka')::jsonb) k),
  array['componentes', 'ocorrencias', 'revisoes'], 'pendências no formato da spec 007');
select ok((select bool_and(c ->> 'duplaNome' in ('QA1', 'QA2', 'QA3'))
           from jsonb_array_elements(pg_temp.lido('pka')::jsonb -> 'componentes') c),
  'pendências da turma: só equipes da turma');
select ok((select bool_or((c ->> 'encontroNumero')::int = 2)
           from jsonb_array_elements(pg_temp.lido('pka')::jsonb -> 'componentes') c),
  'pendências do ranking incluem encontros futuros (recusa da definitiva)');
select is((select count(*)::int from jsonb_array_elements(pg_temp.lido('pka')::jsonb -> 'revisoes')), 1,
  'pedido aberto (sobre a anterior) entra nas pendências da turma da equipe');
select is(jsonb_array_length(app.pendencias_do_ranking_da_turma(pg_temp.t('b')) -> 'componentes'), 0,
  'turma fora dos encontros: sem componentes pendentes');

select ok((select bool_and((c ->> 'encontroNumero')::int = 1)
           from jsonb_array_elements(app.pendencias_realizadas_da_turma(pg_temp.t('a')) -> 'componentes') c),
  'pendências realizadas: só encontros já realizados');
select is(app.provas_pendentes_da_turma(pg_temp.t('a')), 3, 'prova pendente: integrantes sem resultado (a1, a2, a3)');
select is(app.provas_pendentes_da_turma(pg_temp.t('b')), 0, 'prova pendente: só encontros da turma');
select ok((app.ultima_publicacao_da_turma(pg_temp.t('a'))).id is null, 'sem publicação da turma');

-- ===========================================================================
-- US1 — coordenação publica o ranking de cada turma (T006)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('r1', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('a:'), 'parcial', null)::text);
reset role;
select is((pg_temp.da(pg_temp.lido('r1')::jsonb, 'a') ->> 'publicada')::boolean, true, 'US1: KA publicada como parcial');
select is((pg_temp.da(pg_temp.lido('r1')::jsonb, 'a') ->> 'versao')::int, 1, 'US1: versão 1 da turma');
select is(pg_temp.da(pg_temp.lido('r1')::jsonb, 'a') ->> 'turma', 'KA', 'US1: resposta traz o nome da turma');
select pg_temp.guardar('ka1', (app.ultima_publicacao_da_turma(pg_temp.t('a'))).id::text);
select is((select (turma_id, categoria, estado, versao)::text from public.publicacoes_ranking where id = pg_temp.lido('ka1')::uuid),
  format('(%s,"Categoria K",parcial,1)', pg_temp.t('a')), 'FR-001: publicação da turma com a categoria da turma');
select ok((select lote_id is not null and publicado_por = pg_temp.u('c1') from public.publicacoes_ranking where id = pg_temp.lido('ka1')::uuid),
  'FR-001: lote e autoria registrados');
select is((select string_agg(nome, ',' order by nome) from public.publicacao_posicoes where publicacao_id = pg_temp.lido('ka1')::uuid),
  'QA1,QA2,QA3', 'SC-001/FR-002: só equipes ativas da turma');
select ok((select bool_and(posicao = 1 and compartilhada) from public.publicacao_posicoes where publicacao_id = pg_temp.lido('ka1')::uuid),
  'FR-003: empate persistente gera posição compartilhada');
select ok(exists (select 1 from public.auditoria where tabela = 'publicacoes_ranking' and registro_id = pg_temp.lido('ka1')),
  'FR-001: publicação auditada');
select is(pg_temp.contar('avisos', format('tipo = %L and destinatario_id = %L', 'ranking_publicado', pg_temp.u('a1'))), 1,
  'FR-012a: aluno da turma é avisado');
select is(pg_temp.contar('avisos', format('tipo = %L and destinatario_id = %L', 'ranking_publicado', pg_temp.u('d1'))), 1,
  'FR-012a: docente da turma é avisado');
select is(pg_temp.contar('avisos', format('tipo = %L and destinatario_id = %L', 'ranking_publicado', pg_temp.u('e1'))), 1,
  'FR-012a: mentor do curso da turma é avisado');
select is(pg_temp.contar('avisos', format('tipo = %L and destinatario_id in (%L, %L)', 'ranking_publicado', pg_temp.u('b1'), pg_temp.u('d2'))), 0,
  'FR-012a: pessoas de outra turma não são avisadas');
select ok((select titulo like '%parcial%KA%' from public.avisos where destinatario_id = pg_temp.u('a1') and tipo = 'ranking_publicado'),
  'FR-012a: aviso cita o estado e a turma');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('r2', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('a:1'), 'parcial', null)::text);
select pg_temp.guardar('r3', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('a:'), 'provisorio', 'Base antiga.')::text);
select pg_temp.guardar('r4', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('a:1'), 'provisorio', null)::text);
select pg_temp.guardar('r5', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('a:1', 'b:'), 'definitivo',
  'Fechamento das turmas K.')::text);
select pg_temp.guardar('r6', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('c:'), 'parcial', null)::text);
reset role;
select is((pg_temp.da(pg_temp.lido('r2')::jsonb, 'a') ->> 'versao')::int, 1, 'reenvio idêntico devolve a versão existente');
select is(pg_temp.contar('publicacoes_ranking', format('turma_id = %L', pg_temp.t('a'))), 1, 'reenvio idêntico não grava');
select is(pg_temp.da(pg_temp.lido('r3')::jsonb, 'a') ->> 'motivo',
  'O ranking desta turma mudou desde que você abriu a tela; recarregue.', 'FR-006: versão base desatualizada é recusada');
select is((pg_temp.da(pg_temp.lido('r4')::jsonb, 'a') ->> 'publicada')::boolean, false,
  'FR-005: 2ª versão sem justificativa é recusada');
select ok(pg_temp.da(pg_temp.lido('r4')::jsonb, 'a') ->> 'motivo' is not null, 'FR-005: recusa com o motivo');
select is((pg_temp.da(pg_temp.lido('r5')::jsonb, 'a') ->> 'publicada')::boolean, false,
  'FR-004: definitiva de KA recusada pelas pendências de KA');
select ok(pg_temp.da(pg_temp.lido('r5')::jsonb, 'a') ->> 'motivo' like '%pendências%QA%',
  'FR-004: a recusa lista as pendências da turma');
select is((pg_temp.da(pg_temp.lido('r5')::jsonb, 'b') ->> 'publicada')::boolean, true,
  'SC-004/FR-007a: KB publicada como definitiva no mesmo lote');
select is((select estado::text from public.publicacoes_ranking where turma_id = pg_temp.t('b')), 'definitivo',
  'FR-007a: KB gravada como definitiva');
select is((select justificativa from public.publicacoes_ranking where turma_id = pg_temp.t('b')), 'Fechamento das turmas K.',
  'FR-007a: justificativa única registrada');
select is(pg_temp.contar('publicacoes_ranking', format('turma_id = %L', pg_temp.t('a'))), 1,
  'FR-007a: a turma recusada não ganhou versão');
select is(pg_temp.da(pg_temp.lido('r6')::jsonb, 'c') ->> 'motivo', 'A turma não tem equipes ativas.',
  'turma sem equipes ativas é recusada');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.e(), pg_temp.lote('a:1', 'a:1')),
  '23514', null, 'turma repetida no lote é recusada');
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.e(),
                        (select jsonb_agg(jsonb_build_object('turmaId', gen_random_uuid(), 'versaoBase', null)) from generate_series(1, 101))),
  '23514', null, 'mais de 100 turmas é recusado');
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, '[]', 'parcial', null) $f$, pg_temp.e()),
  '23514', null, 'lote vazio é recusado');
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.e(), pg_temp.lote('d:')),
  '23514', null, 'turma de outra edição é recusada');
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'final', null) $f$, pg_temp.e(), pg_temp.lote('a:1')),
  '23514', null, 'estado desconhecido é recusado');
-- R5: a provisória usa o prazo de revisão das regras vigentes da turma.
select public.gravar_ajustes_turma(pg_temp.t('a'), null,
  jsonb_build_object('prazos', jsonb_set(app.regras_piloto() -> 'prazos', '{revisaoHoras}', '48')),
  'Prazo de revisão maior para KA.');
select pg_temp.guardar('r7', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('a:1'), 'provisorio',
  'Provisória com a prova registrada.')::text);
reset role;
select is((pg_temp.da(pg_temp.lido('r7')::jsonb, 'a') ->> 'versao')::int, 2, 'US1: provisória de KA vira a versão 2');
select ok((select revisao_ate between now() + interval '47 hours' and now() + interval '49 hours'
           from public.publicacoes_ranking where turma_id = pg_temp.t('a') and versao = 2),
  'FR-012/R5: prazo de revisão pelas regras da turma (48 h)');

-- Equipe movida de turma depois de publicada: a versão publicada não muda.
update public.duplas set turma_id = pg_temp.t('b') where id = pg_temp.q('a3');
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('r8', public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('b:1'), 'parcial',
  'Equipe nova na turma KB.')::text);
reset role;
select is((select string_agg(nome, ',' order by nome) from public.publicacao_posicoes where publicacao_id = pg_temp.lido('ka1')::uuid),
  'QA1,QA2,QA3', 'versão publicada de KA não muda com a troca de turma');
select ok(exists (select 1 from public.publicacao_posicoes pp join public.publicacoes_ranking p on p.id = pp.publicacao_id
                  where p.turma_id = pg_temp.t('b') and p.versao = 2 and pp.nome = 'QA3'),
  'a próxima publicação usa a composição atual');
update public.duplas set turma_id = pg_temp.t('a') where id = pg_temp.q('a3');

-- Permissões e edição encerrada.
set local role authenticated;
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.e(), pg_temp.lote('a:2')),
  '42501', null, 'FR-006: docente não publica');
select pg_temp.como(pg_temp.u('e1'));
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.e(), pg_temp.lote('a:2')),
  '42501', null, 'FR-006: mentor não publica');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.e(), pg_temp.lote('a:2')),
  '42501', null, 'FR-006: aluno não publica');
select pg_temp.como(pg_temp.u('c9'));
select throws_ok(format($f$ select public.publicar_ranking_turmas(%L, %L, 'parcial', null) $f$, pg_temp.g(), pg_temp.lote('d:')),
  '23514', null, 'edição encerrada: só leitura');

-- Leituras da coordenação (FR-007).
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('lista', public.ranking_da_edicao(pg_temp.e())::text);
select pg_temp.guardar('pend', public.pendencias_ranking_turma(pg_temp.t('a'))::text);
select pg_temp.guardar('hist', public.historico_publicacoes_turma(pg_temp.t('a'))::text);
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.ranking_da_edicao(%L) $f$, pg_temp.e()), '42501', null, 'lista do ranking: só coordenação');
select throws_ok(format($f$ select public.historico_publicacoes_turma(%L) $f$, pg_temp.t('a')), '42501', null,
  'histórico da turma: só coordenação');
reset role;
select is((select string_agg(x ->> 'turma', ',' order by ord) from jsonb_array_elements(pg_temp.lido('lista')::jsonb) with ordinality t (x, ord)),
  'KA,KB,LA', 'FR-007: lista as turmas da edição por categoria e nome');
select is((select x -> 'ultima' ->> 'estado' from jsonb_array_elements(pg_temp.lido('lista')::jsonb) x where x ->> 'turma' = 'KA'),
  'provisorio', 'FR-007: estado da última publicação');
select is((select x -> 'ultima' from jsonb_array_elements(pg_temp.lido('lista')::jsonb) x where x ->> 'turma' = 'LA'),
  'null'::jsonb, 'FR-007: turma sem publicação');
select is((select (x -> 'pendencias' ->> 'componentes')::int from jsonb_array_elements(pg_temp.lido('lista')::jsonb) x where x ->> 'turma' = 'KA'),
  jsonb_array_length(app.pendencias_realizadas_da_turma(pg_temp.t('a')) -> 'componentes'),
  'FR-007/SC-006: pendências contadas só de encontros realizados');
select ok((select (x -> 'pendencias' ->> 'componentes')::int from jsonb_array_elements(pg_temp.lido('lista')::jsonb) x where x ->> 'turma' = 'KA')
          < jsonb_array_length(pg_temp.lido('pend')::jsonb -> 'componentes'),
  'R4: o encontro futuro fica fora da contagem, mas está nas pendências detalhadas');
select is((select (x ->> 'equipes')::int from jsonb_array_elements(pg_temp.lido('lista')::jsonb) x where x ->> 'turma' = 'KA'), 3,
  'FR-007: número de equipes ativas');
select is((select string_agg((x ->> 'versao') || ':' || (x ->> 'estado'), ',' order by ord)
           from jsonb_array_elements(pg_temp.lido('hist')::jsonb) with ordinality t (x, ord)),
  '2:provisorio,1:parcial', 'FR-005: histórico da turma, mais recente primeiro');
select is((pg_temp.lido('hist')::jsonb -> 0 ->> 'justificativa'), 'Provisória com a prova registrada.',
  'FR-005: histórico com a justificativa');

-- ===========================================================================
-- US2 — aluno vê o ranking da própria turma (T013, FR-008 a FR-011, FR-014)
-- Estado: KA na versão 2 (provisória, revisão por 48 h); KB na versão 2 (parcial).
-- ===========================================================================
create function pg_temp.tem_chave(j jsonb, chave text) returns boolean language sql immutable as $$
  select j::text ~ ('"' || chave || '"\s*:');
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select pg_temp.guardar('ra1', public.ranking_da_turma(pg_temp.t('a'))::text);
select pg_temp.guardar('pa1', public.painel_do_aluno(pg_temp.e())::text);
select pg_temp.guardar('rev', public.pedir_revisao(gen_random_uuid(), 'publicacao', null,
  (app.ultima_publicacao_da_turma(pg_temp.t('a'))).id, 'presenca', null,
  'A equipe discorda da presença registrada.') ->> 'id');
select pg_temp.como(pg_temp.u('b1'));
select throws_ok(format($f$ select public.ranking_da_turma(%L) $f$, pg_temp.t('a')), '42501', null,
  'FR-008/SC-002: aluno de outra turma não vê o ranking da turma');
select throws_ok(format($f$ select public.pedir_revisao(gen_random_uuid(), 'publicacao', null, %L, 'presenca', null,
                            'Pedido sobre turma que não é a minha.') $f$, (app.ultima_publicacao_da_turma(pg_temp.t('a'))).id),
  '23514', 'A publicação não inclui a sua equipe.', 'FR-012: revisão só da publicação da própria turma');
select pg_temp.como(pg_temp.u('d1'));
select pg_temp.guardar('rd1', public.ranking_da_turma(pg_temp.t('a'))::text);
select pg_temp.como(pg_temp.u('e1'));
select pg_temp.guardar('re1', public.ranking_da_turma(pg_temp.t('a'))::text);
select pg_temp.como(pg_temp.u('d2'));
select throws_ok(format($f$ select public.ranking_da_turma(%L) $f$, pg_temp.t('a')), '42501', null,
  'FR-009: docente sem atribuição na turma não vê o ranking');
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('rc1', public.ranking_da_turma(pg_temp.t('a'))::text);
select is(public.ranking_da_turma(pg_temp.t('c')), null, 'FR-011: turma sem publicação devolve nulo');
reset role;

select is(pg_temp.lido('ra1')::jsonb ->> 'turma', 'KA', 'FR-008: o ranking traz a turma');
select is((pg_temp.lido('ra1')::jsonb ->> 'versao')::int, 2, 'FR-008: versão mais recente da turma');
select is(pg_temp.lido('ra1')::jsonb ->> 'estado', 'provisorio', 'FR-008: com o estado');
select is((select string_agg(p ->> 'nome', ',' order by p ->> 'nome') from jsonb_array_elements(pg_temp.lido('ra1')::jsonb -> 'posicoes') p),
  'QA1,QA2,QA3', 'SC-001: só equipes da turma');
select is((select string_agg(p ->> 'nome', ',') from jsonb_array_elements(pg_temp.lido('ra1')::jsonb -> 'posicoes') p where p ? 'detalhe'),
  'QA1', 'FR-008: detalhe só da própria equipe');
select is((select p ->> 'nome' from jsonb_array_elements(pg_temp.lido('ra1')::jsonb -> 'posicoes') p where (p ->> 'minha')::boolean),
  'QA1', 'FR-008: a própria equipe vem marcada');
select ok(not pg_temp.tem_chave(pg_temp.lido('ra1')::jsonb, 'nota') and not pg_temp.tem_chave(pg_temp.lido('ra1')::jsonb, 'email'),
  'FR-010: sem nota individual nem e-mail');
select is((select count(*)::int from jsonb_array_elements(pg_temp.lido('rd1')::jsonb -> 'posicoes') p where p ? 'detalhe'), 3,
  'FR-009: docente da turma vê o detalhe de todas');
select is((select count(*)::int from jsonb_array_elements(pg_temp.lido('re1')::jsonb -> 'posicoes') p where p ? 'detalhe'), 3,
  'FR-009: mentor do curso vê o detalhe de todas');
select is((select count(*)::int from jsonb_array_elements(pg_temp.lido('rc1')::jsonb -> 'posicoes') p where p ? 'detalhe'), 3,
  'FR-009: coordenação vê o detalhe de todas');
select is((pg_temp.lido('pa1')::jsonb -> 'ranking' ->> 'versao')::int, 2, 'FR-014: painel do aluno pela publicação da turma');
select is(pg_temp.lido('pa1')::jsonb -> 'ranking' ->> 'estado', 'provisorio', 'FR-014: painel com o estado da turma');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.lido('pa1')::jsonb -> 'acoes') a where a ->> 'tipo' = 'revisao_publicacao'),
  'FR-012: provisória da turma no prazo vira ação de revisão no painel');
select ok(pg_temp.lido('rev') is not null, 'FR-012: aluno pede revisão sobre a provisória da turma');

-- ===========================================================================
-- US3 — painéis e turma mostram o ranking da turma (T017, FR-013, FR-015, FR-016, SC-006)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('pt', public.painel_da_turma(pg_temp.t('a'))::text);
select pg_temp.guardar('pc', public.painel_da_coordenacao(pg_temp.e())::text);
select pg_temp.guardar('lista3', public.ranking_da_edicao(pg_temp.e())::text);
select pg_temp.guardar('rel', public.relatorio('pontos', pg_temp.e())::text);
select pg_temp.como(pg_temp.u('d1'));
select pg_temp.guardar('reld', public.relatorio('pontos', pg_temp.e())::text);
reset role;

select is(pg_temp.lido('pt')::jsonb -> 'pontuacao' ->> 'estado', 'provisorio',
  'FR-013: painel da turma com a última publicação da turma');
select is((select string_agg(e ->> 'nome', ',' order by e ->> 'nome') from jsonb_array_elements(pg_temp.lido('pt')::jsonb -> 'pontuacao' -> 'equipes') e),
  'QA1,QA2,QA3', 'FR-013: equipes da publicação da turma');
select ok(not (pg_temp.lido('pc')::jsonb ? 'categorias') and pg_temp.lido('pc')::jsonb ? 'turmas',
  'FR-015: painel da coordenação por turma');
select is((select string_agg(x ->> 'turma', ',' order by ord) from jsonb_array_elements(pg_temp.lido('pc')::jsonb -> 'turmas') with ordinality t (x, ord)),
  'KA,KB,LA', 'FR-015: uma linha por turma');
select is((select x ->> 'categoria' from jsonb_array_elements(pg_temp.lido('pc')::jsonb -> 'turmas') x where x ->> 'turma' = 'KA'),
  'Categoria K', 'FR-015: com a categoria da turma');
select is((select x -> 'publicacao' ->> 'estado' from jsonb_array_elements(pg_temp.lido('pc')::jsonb -> 'turmas') x where x ->> 'turma' = 'KA'),
  'provisorio', 'FR-015: última publicação da turma');
select is((select (x ->> 'provasPendentes')::int from jsonb_array_elements(pg_temp.lido('pc')::jsonb -> 'turmas') x where x ->> 'turma' = 'KA'),
  app.provas_pendentes_da_turma(pg_temp.t('a')), 'FR-015: prova pendente da turma');
select is(
  (select jsonb_build_object('c', (x ->> 'componentesPendentes')::int, 'o', (x ->> 'ocorrenciasSemDecisao')::int, 'r', (x ->> 'revisoesAbertas')::int)
   from jsonb_array_elements(pg_temp.lido('pc')::jsonb -> 'turmas') x where x ->> 'turma' = 'KA'),
  (select jsonb_build_object('c', (x -> 'pendencias' ->> 'componentes')::int, 'o', (x -> 'pendencias' ->> 'ocorrencias')::int, 'r', (x -> 'pendencias' ->> 'revisoes')::int)
   from jsonb_array_elements(pg_temp.lido('lista3')::jsonb) x where x ->> 'turma' = 'KA'),
  'SC-006: painel da coordenação e tela de ranking com os mesmos números');
select ok(exists (select 1 from jsonb_array_elements(pg_temp.lido('rel')::jsonb -> 'colunas') c where c ->> 'id' = 'posicaoNaTurma'),
  'FR-016: relatório de pontos com a coluna da posição na turma');
select ok((select bool_and((l ->> 'posicaoNaTurma')::int = 1) from jsonb_array_elements(pg_temp.lido('rel')::jsonb -> 'linhas') l
           where l ->> 'turma' = 'KA'),
  'FR-016: posição da última publicação da turma');
select is((select string_agg(distinct l ->> 'turma', ',') from jsonb_array_elements(pg_temp.lido('reld')::jsonb -> 'linhas') l),
  'KA', 'FR-016: docente exporta só a própria turma');

-- ===========================================================================
-- US4 — histórico por categoria preservado (T022, FR-017, SC-005)
-- Fixture: "Categoria K" versão 1 (provisória, sem turma) e um pedido aberto de QA1 sobre ela.
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('ant', public.publicacoes_anteriores(pg_temp.e())::text);
select pg_temp.guardar('antr', public.ranking_publicado(pg_temp.e(), 'Categoria K')::text);
select pg_temp.guardar('anth', public.historico_publicacoes(pg_temp.e(), 'Categoria K')::text);
select is(public.ranking_publicado(pg_temp.e(), 'Categoria L'), null, 'FR-017: categoria sem publicação anterior');
select lives_ok(format($f$ select public.responder_revisao(%L, 'indeferido', 'Mantido após conferência da lista.') $f$,
                       '80000000-0000-0000-0013-0000000000f1'),
  'FR-017: pedido aberto sobre a anterior é respondido normalmente');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select public.ranking_publicado(%L, 'Categoria K') $f$, pg_temp.e()), '42501', null,
  'FR-017: aluno não lê a publicação anterior');
select throws_ok(format($f$ select public.historico_publicacoes(%L, 'Categoria K') $f$, pg_temp.e()), '42501', null,
  'FR-017: aluno não lê o histórico anterior');
select throws_ok(format($f$ select public.publicacoes_anteriores(%L) $f$, pg_temp.e()), '42501', null,
  'FR-017: aluno não lista as anteriores');
select throws_ok(format($f$ select public.pedir_revisao(gen_random_uuid(), 'publicacao', null, %L, 'entrega', null,
                            'Pedido novo sobre a publicação anterior.') $f$, pg_temp.anterior()),
  '23514', 'Esta publicação por categoria é anterior; peça revisão sobre o ranking da sua turma.',
  'R7: pedido novo sobre a anterior é recusado');
select is((select r ->> 'estado' from jsonb_array_elements(public.pedidos_revisao(pg_temp.e())) r
           where r ->> 'id' = '80000000-0000-0000-0013-0000000000f1'),
  'indeferido', 'FR-017: a equipe vê a resposta do pedido anterior');
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.ranking_publicado(%L, 'Categoria K') $f$, pg_temp.e()), '42501', null,
  'FR-017: docente não lê a publicação anterior');
select pg_temp.como(pg_temp.u('e1'));
select throws_ok(format($f$ select public.ranking_publicado(%L, null) $f$, pg_temp.e()), '42501', null,
  'FR-017: mentor não lê a publicação anterior');
reset role;

select is((select string_agg((x ->> 'categoria') || ':' || (x ->> 'versoes') || ':' || (x -> 'ultima' ->> 'estado'), ',')
           from jsonb_array_elements(pg_temp.lido('ant')::jsonb) x),
  'Categoria K:1:provisorio', 'FR-017: categorias com publicações anteriores');
select is(pg_temp.lido('antr')::jsonb ->> 'turmaId', null, 'FR-017: a anterior não tem turma');
select is((select string_agg((p ->> 'nome') || ':' || (p ->> 'posicao') || ':' || (p ->> 'total'), ',' order by (p ->> 'posicao')::int)
           from jsonb_array_elements(pg_temp.lido('antr')::jsonb -> 'posicoes') p),
  'QA1:1:42,QB1:2:30', 'SC-005: a anterior com os valores originais');
select is(jsonb_array_length(pg_temp.lido('anth')::jsonb), 1, 'SC-005: histórico anterior preservado');

-- ===========================================================================
-- Premiação por turma (T026, FR-018, FR-018a, FR-018b, SC-007)
-- Prêmios da edição: 1º e 2º. KB: definitiva nova com QB1 e QB2 empatadas no 1º (o 2º fica sem equipe).
-- KA: última publicação provisória. LA: sem publicação.
-- ===========================================================================
select has_table('public', 'decisoes_premiacao', 'decisoes_premiacao existe');
select ok((select relrowsecurity from pg_class where oid = 'public.decisoes_premiacao'::regclass), 'RLS em decisoes_premiacao');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('kbd', (public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('b:2'), 'definitivo',
  'Definitiva com empate no primeiro lugar.') -> 0 ->> 'versao'));
reset role;
select is(pg_temp.lido('kbd')::int, 3, 'premiação: KB com nova definitiva (versão 3)');
select pg_temp.guardar('pkb3', (app.ultima_publicacao_da_turma(pg_temp.t('b'))).id::text);
select pg_temp.guardar('pkb1', (select id::text from public.publicacoes_ranking where turma_id = pg_temp.t('b') and versao = 1));
select pg_temp.guardar('pkb2', (select id::text from public.publicacoes_ranking where turma_id = pg_temp.t('b') and versao = 2));

create function pg_temp.prem(resposta jsonb, turma text) returns jsonb language sql immutable as $$
  select x from jsonb_array_elements(resposta) x where (x ->> 'turmaId')::uuid = pg_temp.t(turma);
$$;
create function pg_temp.equipes(item jsonb) returns text language sql immutable as $$
  select coalesce(string_agg(e ->> 'nome', '+' order by e ->> 'nome'), '-') from jsonb_array_elements(item -> 'equipes') e;
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('pc1', public.premiacao_da_edicao(pg_temp.e())::text);
select pg_temp.como(pg_temp.u('d1'));
select pg_temp.guardar('pd1', public.premiacao_da_edicao(pg_temp.e())::text);
select pg_temp.como(pg_temp.u('e1'));
select pg_temp.guardar('pe1', public.premiacao_da_edicao(pg_temp.e())::text);
select pg_temp.como(pg_temp.u('a1'));
select pg_temp.guardar('pa1', public.premiacao_da_edicao(pg_temp.e())::text);
select pg_temp.como(pg_temp.u('b1'));
select pg_temp.guardar('pb1', public.premiacao_da_edicao(pg_temp.e())::text);
reset role;

select is((select string_agg(x ->> 'turma', ',' order by ord) from jsonb_array_elements(pg_temp.lido('pc1')::jsonb) with ordinality t (x, ord)),
  'KA,KB,LA', 'FR-018a: coordenação vê a premiação de todas as turmas');
select is(pg_temp.prem(pg_temp.lido('pc1')::jsonb, 'b') ->> 'situacao', 'empate_a_decidir',
  'FR-018b: empate na posição premiada da definitiva fica a decidir');
select is(pg_temp.equipes(pg_temp.prem(pg_temp.lido('pc1')::jsonb, 'b') -> 'itens' -> 0), 'QB1+QB2',
  'FR-018b: as empatadas aparecem no prêmio da posição');
select is((pg_temp.prem(pg_temp.lido('pc1')::jsonb, 'b') -> 'itens' -> 1 ->> 'semEquipePorEmpate')::boolean, true,
  'FR-018b: o 2º prêmio fica sem equipe por causa do empate no 1º');
select is(pg_temp.prem(pg_temp.lido('pc1')::jsonb, 'a') ->> 'situacao', 'provisorio', 'FR-018: última provisória: provisório');
select is(pg_temp.prem(pg_temp.lido('pc1')::jsonb, 'c') ->> 'situacao', 'a_definir', 'FR-018: sem publicação: a definir');
select is(pg_temp.prem(pg_temp.lido('pc1')::jsonb, 'b') -> 'itens' -> 0 ->> 'descricao', 'Prêmio do 1º',
  'FR-018: prêmios configurados da edição em cada turma');
select is((select string_agg(x ->> 'turma', ',') from jsonb_array_elements(pg_temp.lido('pd1')::jsonb) x), 'KA',
  'FR-018a: docente vê só as próprias turmas');
select is(pg_temp.prem(pg_temp.lido('pd1')::jsonb, 'a') ->> 'situacao', 'provisorio', 'FR-018a: docente vê a provisória');
select is(pg_temp.equipes(pg_temp.prem(pg_temp.lido('pd1')::jsonb, 'a') -> 'itens' -> 0), 'QA1+QA2+QA3',
  'FR-018a: docente vê as equipes provisórias');
select is((select string_agg(x ->> 'turma', ',' order by x ->> 'turma') from jsonb_array_elements(pg_temp.lido('pe1')::jsonb) x), 'KA,KB',
  'FR-018a: mentor vê as turmas do curso');
select is((select string_agg(x ->> 'turma', ',') from jsonb_array_elements(pg_temp.lido('pa1')::jsonb) x), 'KA',
  'FR-018a: aluno vê só a própria turma');
select is(pg_temp.prem(pg_temp.lido('pa1')::jsonb, 'a') ->> 'situacao', 'a_definir', 'FR-018a: aluno não vê a provisória');
select is(pg_temp.equipes(pg_temp.prem(pg_temp.lido('pa1')::jsonb, 'a') -> 'itens' -> 0), '-', 'FR-018a: aluno sem equipes antes da definitiva');
select is(pg_temp.prem(pg_temp.lido('pb1')::jsonb, 'b') ->> 'situacao', 'empate_a_decidir', 'FR-018a: aluno vê a definitiva da turma');

-- Decisão do empate (FR-018b).
set local role authenticated;
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'Prêmio para QB1.', 'Decisão sem permissão.') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('b1')]), '42501', null, 'FR-018b: docente não decide');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'Prêmio para QB1.', 'Decisão sem permissão.') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('b1')]), '42501', null, 'FR-018b: aluno não decide');
select pg_temp.como(pg_temp.u('c1'));
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'Prêmio para QB1.', 'Publicação parcial.') $f$,
                        pg_temp.lido('pkb2'), array[pg_temp.q('b1')]), '23514', null, 'FR-018b: só publicação definitiva');
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'Prêmio para QB1.', 'Versão que não é a última.') $f$,
                        pg_temp.lido('pkb1'), array[pg_temp.q('b1')]), '23514', null, 'FR-018b: só a definitiva mais recente da turma');
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 3, %L, 'Prêmio para QB1.', 'Posição sem prêmio.') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('b1')]), '23514', null, 'FR-018b: só posição premiada');
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 2, %L, 'Prêmio para QB1.', 'Posição sem empate.') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('b1')]), '23514', null, 'FR-018b: só posição com empate');
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'Prêmio para QA1.', 'Equipe fora do empate.') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('a1')]), '23514', null, 'FR-018b: premiadas entre as empatadas');
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, '{}', 'Ninguém.', 'Sem equipes premiadas.') $f$,
                        pg_temp.lido('pkb3')), '23514', null, 'FR-018b: ao menos uma equipe premiada');
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'x', 'Decisão curta demais.') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('b1')]), '23514', null, 'FR-018b: decisão de 3 a 500 caracteres');
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'Prêmio para QB1.', 'curta') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('b1')]), '23514', null, 'FR-018b: justificativa obrigatória');
select throws_ok(format($f$ insert into public.decisoes_premiacao (publicacao_id, posicao, premiadas, decisao, justificativa)
                            values (%L, 1, %L, 'Direto.', 'Escrita direta na tabela.') $f$, pg_temp.lido('pkb3'), array[pg_temp.q('b1')]),
  '42501', null, 'FR-018b: escrita direta recusada');
select pg_temp.guardar('dec', public.decidir_premiacao_empate(pg_temp.lido('pkb3')::uuid, 1, array[pg_temp.q('b1')],
  'Prêmio do 1º para QB1.', 'Critério registrado pela coordenação.')::text);
select throws_ok(format($f$ select public.decidir_premiacao_empate(%L, 1, %L, 'De novo.', 'Segunda decisão do mesmo empate.') $f$,
                        pg_temp.lido('pkb3'), array[pg_temp.q('b2')]), '23514', 'Este empate já foi decidido.',
  'FR-018b: o empate é decidido uma vez');
select pg_temp.guardar('pc2', public.premiacao_da_edicao(pg_temp.e())::text);
reset role;
select ok(pg_temp.lido('dec')::jsonb ? 'id' and pg_temp.lido('dec')::jsonb ? 'decididoEm', 'FR-018b: decisão registrada');
select is(pg_temp.prem(pg_temp.lido('pc2')::jsonb, 'b') ->> 'situacao', 'final', 'FR-018b: decidido o empate, a premiação é final');
select is(pg_temp.equipes(pg_temp.prem(pg_temp.lido('pc2')::jsonb, 'b') -> 'itens' -> 0), 'QB1', 'SC-007: premiada pela decisão');
select is(pg_temp.prem(pg_temp.lido('pc2')::jsonb, 'b') -> 'itens' -> 0 -> 'decisao' ->> 'decisao', 'Prêmio do 1º para QB1.',
  'FR-018b: a decisão aparece no prêmio');
select ok(exists (select 1 from public.auditoria where tabela = 'decisoes_premiacao'), 'FR-018b: decisão auditada');
select throws_ok(format($f$ update public.decisoes_premiacao set decisao = 'Outra.' where publicacao_id = %L $f$, pg_temp.lido('pkb3')),
  '23514', null, 'FR-018b: decisão imutável');
select throws_ok(format($f$ insert into public.decisoes_premiacao (publicacao_id, posicao, premiadas, decisao, justificativa, decidido_por)
                            values (%L, 1, '{}', 'Vazia.', 'Sem equipes premiadas.', %L) $f$, pg_temp.lido('pkb3'), pg_temp.u('c1')),
  '23514', null, 'check: premiadas não vazio');

-- Nova definitiva da turma: a decisão anterior fica no histórico e o empate volta a ser decidido.
update public.duplas set turma_id = pg_temp.t('b') where id = pg_temp.q('a3');
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select public.publicar_ranking_turmas(pg_temp.e(), pg_temp.lote('b:3'), 'definitivo', 'Nova definitiva com outra composição.');
select pg_temp.guardar('pc3', public.premiacao_da_edicao(pg_temp.e())::text);
reset role;
update public.duplas set turma_id = pg_temp.t('a') where id = pg_temp.q('a3');
select is(pg_temp.prem(pg_temp.lido('pc3')::jsonb, 'b') ->> 'situacao', 'empate_a_decidir',
  'nova definitiva: o empate volta a ser decidido');
select is(pg_temp.contar('decisoes_premiacao'), 1, 'nova definitiva: a decisão anterior continua na tabela');

select * from finish();
rollback;
