-- Testes da spec 006 — atividades, entregas, presença, avaliação, questões e pontuação parcial.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício. Edição E (ativa, regras completas do piloto):
--   turma TA: a1+a2 (equipe A1), a3+a4 (equipe A2), a5 (sem equipe); turma TB: b1+b2 (equipe B1).
--   0a = coordenação de E; 0b = docente de TA; 0c = mentor de TA; 0d = docente de TB.
--   Encontro 1 (questões) e encontro 2 (prova oficial).
-- Edição F com coordenação 0e.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0007-0000000000' || s)::uuid, 'q' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('0a'), ('0b'), ('0c'), ('0d'), ('0e'),
             ('a1'), ('a2'), ('a3'), ('a4'), ('a5'), ('b1'), ('b2')) as v (s);

insert into public.edicoes (id, nome, estado, regras, regras_versao)
select id::uuid, nome, 'ativa',
  '{"versao":"piloto-2026.0-a-confirmar","quantidadeEncontros":4,"casasDecimais":2,"presenca":{"pontosPorIntegrante":5,"maximoPorDupla":10},"participacao":{"criterios":[{"id":"envolvimento","rotulo":"Envolvimento nas atividades","maximo":4},{"id":"colaboracao","rotulo":"Colaboração","maximo":3},{"id":"organizacao","rotulo":"Organização e cumprimento das orientações","maximo":3}]},"questoes":{"maximo":30},"entrega":{"criterios":[{"id":"compreensao","rotulo":"Compreensão do problema","maximo":10},{"id":"aplicacao","rotulo":"Aplicação de conhecimentos técnicos","maximo":10},{"id":"qualidade","rotulo":"Qualidade e adequação da solução","maximo":10},{"id":"organizacao","rotulo":"Organização e entrega","maximo":10}],"criterioDeAtraso":"organizacao","faixasDeAtraso":[{"ateMinutos":15,"desconto":2},{"ateMinutos":30,"desconto":5}],"limiteAtrasoMinutos":30},"apresentacao":{"criterios":[{"id":"clareza","rotulo":"Clareza","maximo":3},{"id":"explicacao","rotulo":"Explicação das decisões e etapas","maximo":4},{"id":"respostas","rotulo":"Respostas às perguntas","maximo":3}]},"provaOficial":{"pontosRealizacao":5,"notaMinimaBonus":70,"pontosBonus":10,"maximoPorDupla":30},"penalidades":{"tetoDescontosPorEncontro":10}}'::jsonb,
  'piloto-2026.0-a-confirmar'
from (values ('10000000-0000-0000-0007-000000000001', 'Edição atividades'),
             ('10000000-0000-0000-0007-000000000002', 'Outra edição')) as v (id, nome);
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0007-000000000001', '10000000-0000-0000-0007-000000000001', 'Curso E', 'Cat E');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0007-0000000000a0', '20000000-0000-0000-0007-000000000001', 'TA'),
  ('30000000-0000-0000-0007-0000000000b0', '20000000-0000-0000-0007-000000000001', 'TB');
insert into public.encontros (id, edicao_id, numero, titulo, data, avaliacao_objetiva) values
  ('50000000-0000-0000-0007-000000000001', '10000000-0000-0000-0007-000000000001', 1, 'Encontro de questões', current_date, 'questoes'),
  ('50000000-0000-0000-0007-000000000002', '10000000-0000-0000-0007-000000000001', 2, 'Encontro da prova', current_date + 7, 'prova_oficial');

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0007-0000000000' || s)::uuid;
$$;
create function pg_temp.t(s text) returns uuid language sql immutable as $$
  select ('30000000-0000-0000-0007-0000000000' || s || '0')::uuid;
$$;
create function pg_temp.d(s text) returns uuid language sql immutable as $$
  select ('40000000-0000-0000-0007-0000000000' || s)::uuid;
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
-- Leituras sem RLS (verificação do estado do banco).
create function pg_temp.contar(tabela text, filtro text default 'true') returns int
language plpgsql security definer as $$
declare n int;
begin
  execute format('select count(*)::int from public.%I where %s', tabela, filtro) into n;
  return n;
end;
$$;
create function pg_temp.auditorias(p_tabela text, p_autor uuid) returns int language sql security definer as $$
  select count(*)::int from public.auditoria a where a.tabela = p_tabela and a.autor_id = p_autor;
$$;

create function pg_temp.auditada_com(p_tabela text, p_autor uuid, p_justificativa text) returns boolean
language sql security definer as $$
  select exists (select 1 from public.auditoria a where a.tabela = p_tabela and a.autor_id = p_autor
                 and a.justificativa = p_justificativa and a.antes is not null);
$$;

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select pg_temp.u(u), '10000000-0000-0000-0007-000000000001', p::public.papel,
       case when t is null then null else pg_temp.t(t) end
from (values ('0a', 'coordenacao', null), ('0b', 'docente', 'a'), ('0c', 'mentor', 'a'),
             ('0d', 'docente', 'b'),
             ('a1', 'aluno', 'a'), ('a2', 'aluno', 'a'), ('a3', 'aluno', 'a'), ('a4', 'aluno', 'a'),
             ('a5', 'aluno', 'a'), ('b1', 'aluno', 'b'), ('b2', 'aluno', 'b')) as v (u, p, t);
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  (pg_temp.u('0e'), '10000000-0000-0000-0007-000000000002', 'coordenacao', null);

insert into public.duplas (id, edicao_id, turma_id, nome) values
  (pg_temp.d('a1'), '10000000-0000-0000-0007-000000000001', pg_temp.t('a'), 'Equipe A1'),
  (pg_temp.d('a2'), '10000000-0000-0000-0007-000000000001', pg_temp.t('a'), 'Equipe A2'),
  (pg_temp.d('b1'), '10000000-0000-0000-0007-000000000001', pg_temp.t('b'), 'Equipe B1');
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
select pg_temp.d(d), '10000000-0000-0000-0007-000000000001', pg_temp.u(u)
from (values ('a1', 'a1'), ('a1', 'a2'), ('a2', 'a3'), ('a2', 'a4'), ('b1', 'b1'), ('b1', 'b2')) as v (d, u);

-- ===========================================================================
-- Fundação — tabelas, RLS, privilégios e bucket (T003)
-- ===========================================================================
select has_table('public', t, 'Fundação: tabela ' || t || ' existe')
from unnest(array['desafios', 'desafio_turmas', 'entregas', 'prorrogacoes', 'presencas',
                  'participacoes', 'avaliacoes', 'listas_questoes', 'lista_turmas', 'questoes',
                  'alternativas', 'submissoes_questoes']) as t;
select ok(
  (select count(*) = 12 and bool_and(c.relrowsecurity) from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any (array['desafios', 'desafio_turmas', 'entregas',
     'prorrogacoes', 'presencas', 'participacoes', 'avaliacoes', 'listas_questoes', 'lista_turmas',
     'questoes', 'alternativas', 'submissoes_questoes'])),
  'Fundação: RLS habilitada nas 12 tabelas novas');
select ok(
  coalesce((select bool_and(
    not has_table_privilege('authenticated', 'public.' || t, 'insert')
    and not has_table_privilege('authenticated', 'public.' || t, 'update')
    and not has_table_privilege('authenticated', 'public.' || t, 'delete')
    and not has_table_privilege('anon', 'public.' || t, 'select'))
   from unnest(array['desafios', 'desafio_turmas', 'entregas', 'prorrogacoes', 'presencas',
     'participacoes', 'avaliacoes', 'listas_questoes', 'lista_turmas', 'questoes',
     'alternativas', 'submissoes_questoes']) as t
   where to_regclass('public.' || t) is not null), false)
  and (select count(*) from unnest(array['desafios']) t where to_regclass('public.' || t) is not null) = 1,
  'Fundação: sem escrita direta para authenticated e sem leitura para anon');
select is((select public from storage.buckets where id = 'entregas'), false,
  'FR-008: bucket entregas é privado');
select is((select file_size_limit from storage.buckets where id = 'entregas'), 52428800::bigint,
  'FR-003: limite de 50 MB por arquivo');
select is((select allowed_mime_types from storage.buckets where id = 'entregas'),
  array['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/png', 'image/jpeg'],
  'FR-003: tipos aceitos PDF, ZIP, PNG e JPG');

-- ===========================================================================
-- US1 — desafios, entregas, prorrogação e Storage (T009)
-- ===========================================================================
-- Arquivos fictícios no Storage (metadados do objeto, como o Storage grava).
create function pg_temp.objeto(nome text, dono text, tamanho bigint, tipo text) returns void
language sql as $$
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('entregas', nome, dono, jsonb_build_object('size', tamanho, 'mimetype', tipo));
$$;

set local role authenticated;

select pg_temp.como(pg_temp.u('0b'));
select lives_ok($$ select pg_temp.guardar('d1', public.salvar_desafio(null,
    '50000000-0000-0000-0007-000000000001', array[pg_temp.t('a')], 'Desafio um', 'Enunciado.',
    'Material das aulas.', 'IA permitida com registro.', now() + interval '1 day', true, true)::text) $$,
  'FR-001: docente da turma cria o desafio');
select ok(pg_temp.auditorias('desafios', pg_temp.u('0b')) >= 1, 'FR-023: criação do desafio auditada com o autor');

select pg_temp.como(pg_temp.u('0c'));
select lives_ok($$ select pg_temp.guardar('dm', public.salvar_desafio(null,
    '50000000-0000-0000-0007-000000000001', array[pg_temp.t('a')], 'Desafio do mentor', 'Enunciado.',
    '', '', now() + interval '1 day', false, true)::text) $$,
  'FR-001: mentor da turma também cria desafio');

select pg_temp.como(pg_temp.u('0d'));
select throws_ok($$ select public.salvar_desafio(null, '50000000-0000-0000-0007-000000000001',
    array[pg_temp.t('a')], 'Intruso', 'x', '', '', now(), true, true) $$,
  '42501', null, 'FR-022: docente de outra turma não cria desafio nela');
select pg_temp.como(pg_temp.u('0a'));
select throws_ok($$ select public.salvar_desafio(null, '50000000-0000-0000-0007-000000000001',
    array[pg_temp.t('a')], 'Coordenação', 'x', '', '', now(), true, true) $$,
  '42501', null, 'R8: a coordenação não cria desafios');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.salvar_desafio(null, '50000000-0000-0000-0007-000000000001',
    array[pg_temp.t('a')], 'Aluno', 'x', '', '', now(), true, true) $$,
  '42501', null, 'FR-022: aluno não cria desafio');

select is(
  (select count(*)::int from jsonb_array_elements(public.atividades_da_turma(pg_temp.t('a')) -> 'desafios')),
  0, 'US1-7: desafio em rascunho não aparece ao aluno');

select pg_temp.como(pg_temp.u('0b'));
select lives_ok($$ select public.publicar_desafio(pg_temp.g('d1')::uuid) $$, 'FR-002: docente publica');
select pg_temp.como(pg_temp.u('0c'));
select lives_ok($$ select public.publicar_desafio(pg_temp.g('dm')::uuid) $$,
  'FR-026: segundo desafio publicado no mesmo encontro e turma');

select pg_temp.como(pg_temp.u('a1'));
select is(
  (select count(*)::int from jsonb_array_elements(public.atividades_da_turma(pg_temp.t('a')) -> 'desafios')),
  2, 'US1: aluno vê os desafios publicados da turma');
select is(public.atividades_da_turma(pg_temp.t('a')) -> 'desafios' -> 0 ->> 'duplaId', pg_temp.d('a1')::text,
  'US1: a resposta indica a equipe do aluno');
select pg_temp.como(pg_temp.u('b1'));
select throws_ok($$ select public.atividades_da_turma(pg_temp.t('a')) $$, '42501', null,
  'SC-004: aluno de outra turma não vê as atividades');

-- Entrega por link, repetição segura e nova versão (FR-004/005)
select pg_temp.como(pg_temp.u('a1'));
select ok(
  (select pg_temp.guardar('p1', public.registrar_entrega(pg_temp.g('d1')::uuid,
     'aaaaaaaa-0000-0000-0000-000000000001', null, null, 'https://exemplo.invalid/trabalho') ->> 'protocolo')) like 'ENT-%',
  'FR-004: entrega por link devolve protocolo do servidor');
select is(public.registrar_entrega(pg_temp.g('d1')::uuid, 'aaaaaaaa-0000-0000-0000-000000000001', null, null,
    'https://exemplo.invalid/trabalho') ->> 'protocolo', pg_temp.g('p1'),
  'Idempotência: mesma chave devolve o mesmo comprovante');
select is(pg_temp.contar('entregas', format('dupla_id = %L', pg_temp.d('a1'))), 1,
  'Idempotência: repetição não cria versão');
select is((public.registrar_entrega(pg_temp.g('d1')::uuid, 'aaaaaaaa-0000-0000-0000-000000000002', null, null,
    'https://exemplo.invalid/v2') ->> 'versao')::int, 2, 'FR-005: novo envio gera a versão 2');
select ok(pg_temp.auditorias('entregas', pg_temp.u('a1')) >= 2, 'FR-023: entregas auditadas com o autor');

-- Entrega por arquivo (FR-003/008)
reset role;
select pg_temp.objeto(pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/ok.pdf', pg_temp.u('a1')::text, 1000, 'application/pdf');
select pg_temp.objeto(pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/grande.pdf', pg_temp.u('a1')::text, 60000000, 'application/pdf');
select pg_temp.objeto(pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/texto.txt', pg_temp.u('a1')::text, 10, 'text/plain');
select pg_temp.objeto(pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/do-colega.pdf', pg_temp.u('a2')::text, 10, 'application/pdf');
select pg_temp.objeto(pg_temp.g('d1') || '/' || pg_temp.d('a2') || '/outra.pdf', pg_temp.u('a3')::text, 10, 'application/pdf');
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select is((public.registrar_entrega(pg_temp.g('d1')::uuid, 'aaaaaaaa-0000-0000-0000-000000000003',
    pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/ok.pdf', 'trabalho.pdf', null) ->> 'versao')::int, 3,
  'FR-003: entrega por arquivo do bucket');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000004', %L, 'g.pdf', null) $f$,
    pg_temp.g('d1'), pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/grande.pdf'),
  '23514', 'O arquivo passa do limite de 50 MB.', 'FR-003: arquivo acima de 50 MB recusado');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000005', %L, 't.txt', null) $f$,
    pg_temp.g('d1'), pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/texto.txt'),
  '23514', 'Tipo de arquivo não aceito: envie PDF, ZIP, PNG ou JPG.', 'FR-003: tipo não aceito recusado');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000006', %L, 'c.pdf', null) $f$,
    pg_temp.g('d1'), pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/do-colega.pdf'),
  '23514', 'Arquivo não encontrado. Envie o arquivo novamente.', 'R1: arquivo enviado por outra pessoa não é registrado');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000007', %L, 'o.pdf', null) $f$,
    pg_temp.g('d1'), pg_temp.g('d1') || '/' || pg_temp.d('a2') || '/outra.pdf'),
  '23514', 'Arquivo não encontrado. Envie o arquivo novamente.', 'R1: arquivo fora da pasta da equipe não é registrado');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000008', null, null, 'ftp://x') $f$, pg_temp.g('d1')),
  '23514', 'Informe um link válido (http ou https).', 'FR-003: link inválido recusado');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000009', null, null, null) $f$, pg_temp.g('d1')),
  '23514', 'Envie um arquivo ou um link.', 'FR-003: envio vazio recusado');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000010', 'x', 'x.pdf', 'https://a.b') $f$, pg_temp.g('dm')),
  '23514', 'Envie um arquivo ou um link, não os dois.', 'FR-003: arquivo e link juntos recusados');
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000011', %L, 'ok.pdf', null) $f$,
    pg_temp.g('dm'), pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/ok.pdf'),
  '23514', 'Este desafio não aceita arquivo.', 'FR-001: forma de entrega respeita o desafio');

select pg_temp.como(pg_temp.u('a5'));
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000012', null, null, 'https://a.b') $f$, pg_temp.g('d1')),
  '23514', 'Você precisa fazer parte de uma equipe para enviar.', 'Edge: aluno sem equipe não envia');
select pg_temp.como(pg_temp.u('b1'));
select throws_ok(format($f$ select public.registrar_entrega(%L, 'aaaaaaaa-0000-0000-0000-000000000013', null, null, 'https://a.b') $f$, pg_temp.g('d1')),
  '42501', null, 'SC-004: aluno de outra turma não envia');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok(format($f$ select public.salvar_desafio(%L, '50000000-0000-0000-0007-000000000001',
    array[%L::uuid], 'Mudou', 'x', '', '', now(), true, true) $f$, pg_temp.g('d1'), pg_temp.t('a')),
  '23514', 'O desafio já tem entregas e não pode ser editado.', 'FR-002: edição recusada depois da entrega');

-- Storage: leitura por equipe e gestão; envio só na pasta da própria equipe (FR-008)
select pg_temp.como(pg_temp.u('a2'));
select ok((select count(*) from storage.objects where bucket_id = 'entregas'
           and name like pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/%') >= 1,
  'FR-008: integrante lê os arquivos da própria equipe');
select pg_temp.como(pg_temp.u('a3'));
select is((select count(*)::int from storage.objects where bucket_id = 'entregas'
           and name like pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/%'), 0,
  'FR-008: outra equipe não lê os arquivos');
select pg_temp.como(pg_temp.u('0b'));
select ok((select count(*) from storage.objects where bucket_id = 'entregas'
           and name like pg_temp.g('d1') || '/' || pg_temp.d('a1') || '/%') >= 1,
  'FR-008: docente da turma lê os arquivos');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ insert into storage.objects (bucket_id, name, owner_id) values ('entregas', %L, %L) $f$,
    pg_temp.g('d1') || '/' || pg_temp.d('a2') || '/invasao.pdf', pg_temp.u('a1')),
  '42501', null, 'FR-008: aluno não grava na pasta de outra equipe');

-- Atraso, tolerância e prorrogação (FR-006/007/027)
select pg_temp.como(pg_temp.u('0b'));
select pg_temp.guardar('d2', public.salvar_desafio(null, '50000000-0000-0000-0007-000000000001',
  array[pg_temp.t('a')], 'Desafio atrasado', 'x', '', '', now() - interval '10 minutes', true, true)::text);
select pg_temp.guardar('d3', public.salvar_desafio(null, '50000000-0000-0000-0007-000000000001',
  array[pg_temp.t('a')], 'Desafio encerrado', 'x', '', '', now() - interval '40 minutes', true, true)::text);
select public.publicar_desafio(pg_temp.g('d2')::uuid);
select public.publicar_desafio(pg_temp.g('d3')::uuid);

select pg_temp.como(pg_temp.u('a3'));
select is(public.registrar_entrega(pg_temp.g('d2')::uuid, 'bbbbbbbb-0000-0000-0000-000000000001', null, null, 'https://a.b')
    - 'protocolo' - 'recebidaEm' - 'versao',
  '{"atrasoMinutos": 10, "descontoPrevisto": 2}'::jsonb, 'FR-006: atraso de 10 min com desconto de 2');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select public.registrar_entrega(%L, 'bbbbbbbb-0000-0000-0000-000000000002', null, null, 'https://a.b') $f$, pg_temp.g('d3')),
  '23514', 'O prazo de entrega terminou e a entrega não é mais aceita.', 'FR-006: acima de 30 min é recusada');

select throws_ok(format($f$ select public.registrar_prorrogacao(%L, %L, now() + interval '1 hour', 'Impedimento justificado.') $f$,
    pg_temp.g('d3'), pg_temp.d('a1')),
  '42501', null, 'FR-007: aluno não registra prorrogação');
select pg_temp.como(pg_temp.u('0c'));
select lives_ok(format($f$ select public.registrar_prorrogacao(%L, %L, now() + interval '1 hour', 'Impedimento justificado.') $f$,
    pg_temp.g('d3'), pg_temp.d('a1')), 'FR-007: mentor registra prorrogação');
select lives_ok(format($f$ select public.registrar_prorrogacao(%L, %L, now() + interval '1 hour', 'Impedimento justificado.') $f$,
    pg_temp.g('d3'), pg_temp.d('a1')), 'Idempotência: prorrogação repetida é aceita');
select is(pg_temp.contar('prorrogacoes', format('desafio_id = %L', pg_temp.g('d3'))), 1,
  'Idempotência: repetição não cria outra prorrogação');
select is(pg_temp.auditorias('prorrogacoes', pg_temp.u('0c')), 1,
  'FR-023: prorrogação auditada uma vez, com o autor');
select pg_temp.como(pg_temp.u('0a'));
select lives_ok(format($f$ select public.registrar_prorrogacao(%L, %L, now() + interval '2 hours', 'Coordenação ajustou o prazo.') $f$,
    pg_temp.g('d3'), pg_temp.d('a2')), 'FR-007: coordenação registra prorrogação');
select pg_temp.como(pg_temp.u('a1'));
select is((public.registrar_entrega(pg_temp.g('d3')::uuid, 'bbbbbbbb-0000-0000-0000-000000000003', null, null, 'https://a.b')
    ->> 'atrasoMinutos')::int, 0, 'FR-027: com prorrogação, envia sem atraso mesmo com o desafio encerrado');

-- Reenvio depois do prazo quando já há entrega no prazo (caso de borda)
reset role;
insert into public.entregas (desafio_id, dupla_id, versao, autor_id, protocolo, recebida_em, link, chave_envio)
values (pg_temp.g('d2')::uuid, pg_temp.d('a1'), 1, pg_temp.u('a1'), 'ENT-TESTE-NOPRAZO',
        now() - interval '20 minutes', 'https://a.b', 'bbbbbbbb-0000-0000-0000-000000000009');
set local role authenticated;
select pg_temp.como(pg_temp.u('a2'));
select throws_ok(format($f$ select public.registrar_entrega(%L, 'bbbbbbbb-0000-0000-0000-000000000004', null, null, 'https://a.b') $f$, pg_temp.g('d2')),
  '23514', 'A equipe já tem entrega no prazo; um novo envio agora seria registrado com atraso.',
  'Edge: reenvio atrasado não substitui entrega no prazo');

-- Encerramento manual (FR-027)
select pg_temp.como(pg_temp.u('0b'));
select lives_ok($$ select public.encerrar_desafio(pg_temp.g('d1')::uuid) $$, 'FR-027: docente encerra antes');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select public.registrar_entrega(%L, 'bbbbbbbb-0000-0000-0000-000000000005', null, null, 'https://a.b') $f$, pg_temp.g('d1')),
  '23514', 'O prazo de entrega terminou e a entrega não é mais aceita.', 'FR-027: desafio encerrado não recebe entrega');
select ok((public.atividades_da_turma(pg_temp.t('a')) -> 'desafios') @> jsonb_build_array(jsonb_build_object('id', pg_temp.g('d1'), 'encerrado', true)),
  'FR-027: leitura indica o desafio encerrado');

reset role;

-- ===========================================================================
-- US2 — presença e participação (T020)
-- ===========================================================================
create function pg_temp.lote(presentes text[], ausentes text[]) returns jsonb language sql as $$
  select coalesce((select jsonb_agg(jsonb_build_object('estudanteId', pg_temp.u(x), 'presente', true))
                   from unnest(presentes) x), '[]'::jsonb)
      || coalesce((select jsonb_agg(jsonb_build_object('estudanteId', pg_temp.u(y), 'presente', false))
                   from unnest(ausentes) y), '[]'::jsonb);
$$;
create function pg_temp.presente(encontro uuid, aluno text) returns boolean language sql security definer as $$
  select presente from public.presencas where encontro_id = encontro and estudante_id = pg_temp.u(aluno);
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select is(public.registrar_presencas('50000000-0000-0000-0007-000000000001', pg_temp.t('a'),
    pg_temp.lote(array['a1', 'a2', 'a3', 'a4'], array['a5']), null), 5,
  'FR-009: docente registra a presença da turma em lote');
select is(pg_temp.presente('50000000-0000-0000-0007-000000000001', 'a5'), false, 'FR-009: ausente gravado');
select is(pg_temp.auditorias('presencas', pg_temp.u('0b')), 5, 'FR-011/023: cada marcação auditada com o autor');
select is(public.registrar_presencas('50000000-0000-0000-0007-000000000001', pg_temp.t('a'),
    pg_temp.lote(array['a1', 'a2', 'a3', 'a4'], array['a5']), null), 0,
  'Idempotência: repetir o mesmo lote não grava nada');
select is(pg_temp.auditorias('presencas', pg_temp.u('0b')), 5, 'Idempotência: repetição não gera auditoria');
select throws_ok($$ select public.registrar_presencas('50000000-0000-0000-0007-000000000001', pg_temp.t('a'),
    pg_temp.lote(array[]::text[], array['a1']), null) $$,
  '23514', 'Informe uma justificativa com pelo menos 10 caracteres.', 'FR-011: alteração exige justificativa');

select pg_temp.como(pg_temp.u('0c'));
select is(public.registrar_presencas('50000000-0000-0000-0007-000000000001', pg_temp.t('a'),
    pg_temp.lote(array[]::text[], array['a1']), 'Aluna saiu antes do início.'), 1,
  'FR-011: mentor corrige com justificativa');
select ok(pg_temp.auditada_com('presencas', pg_temp.u('0c'), 'Aluna saiu antes do início.'),
  'FR-011: valor anterior e justificativa na auditoria');

select pg_temp.como(pg_temp.u('0a'));
select is(public.registrar_presencas('50000000-0000-0000-0007-000000000001', pg_temp.t('a'),
    pg_temp.lote(array['a1'], array[]::text[]), 'Correção da coordenação.'), 1,
  'FR-011: coordenação corrige registro existente');
select throws_ok($$ select public.registrar_presencas('50000000-0000-0000-0007-000000000002', pg_temp.t('a'),
    pg_temp.lote(array['a1'], array[]::text[]), 'Registro pela coordenação.') $$,
  '42501', 'A coordenação só corrige registros existentes.', 'FR-011: coordenação não faz o primeiro registro');

select pg_temp.como(pg_temp.u('0d'));
select throws_ok($$ select public.registrar_presencas('50000000-0000-0000-0007-000000000002', pg_temp.t('a'),
    pg_temp.lote(array['a1'], array[]::text[]), null) $$,
  '42501', null, 'SC-004: docente de outra turma não registra');
select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.registrar_presencas('50000000-0000-0000-0007-000000000002', pg_temp.t('a'),
    pg_temp.lote(array['b1'], array[]::text[]), null) $$,
  '23514', 'Há alunos que não pertencem a esta turma.', 'FR-009: aluno de outra turma no lote é recusado');
select throws_ok(format($f$ select public.registrar_presencas('50000000-0000-0000-0007-000000000002', %L,
    jsonb_build_array(jsonb_build_object('estudanteId', %L, 'presente', true, 'observacao', repeat('x', 301))), null) $f$,
    pg_temp.t('a'), pg_temp.u('a1')),
  '23514', 'A observação tem no máximo 300 caracteres.', 'FR-009: observação limitada a 300 caracteres');
select is(public.registrar_presencas('50000000-0000-0000-0007-000000000002', pg_temp.t('a'),
    jsonb_build_array(jsonb_build_object('estudanteId', pg_temp.u('a2'), 'presente', true, 'observacao', 'Chegou 20 min atrasada.')), null), 1,
  'FR-009: observação opcional não afeta a presença');

-- Participação (FR-010)
select lives_ok(format($f$ select public.registrar_participacao('50000000-0000-0000-0007-000000000001', %L,
    '{"envolvimento": 4, "colaboracao": 3, "organizacao": 2.5}', null) $f$, pg_temp.d('a1')),
  'FR-010: docente registra a participação da equipe');
select throws_ok(format($f$ select public.registrar_participacao('50000000-0000-0000-0007-000000000001', %L,
    '{"envolvimento": 5, "colaboracao": 3, "organizacao": 3}', null) $f$, pg_temp.d('a2')),
  '23514', 'A nota de "Envolvimento nas atividades" deve estar entre 0 e 4.', 'FR-010: limite das regras da edição');
select throws_ok(format($f$ select public.registrar_participacao('50000000-0000-0000-0007-000000000001', %L,
    '{"envolvimento": 1, "colaboracao": 1, "organizacao": 1, "extra": 1}', null) $f$, pg_temp.d('a2')),
  '23514', 'Critério desconhecido: extra.', 'FR-010: critério fora das regras é recusado');
select lives_ok(format($f$ select public.registrar_participacao('50000000-0000-0000-0007-000000000001', %L,
    '{"envolvimento": 4, "colaboracao": 3, "organizacao": 2.5}', null) $f$, pg_temp.d('a1')),
  'Idempotência: participação repetida é aceita sem justificativa');
select is(pg_temp.auditorias('participacoes', pg_temp.u('0b')), 1, 'Idempotência: repetição não gera auditoria');
select throws_ok(format($f$ select public.registrar_participacao('50000000-0000-0000-0007-000000000001', %L,
    '{"envolvimento": 3, "colaboracao": 3, "organizacao": 2.5}', null) $f$, pg_temp.d('a1')),
  '23514', 'Informe uma justificativa com pelo menos 10 caracteres.', 'FR-011: correção da participação exige justificativa');
select pg_temp.como(pg_temp.u('0a'));
select throws_ok(format($f$ select public.registrar_participacao('50000000-0000-0000-0007-000000000001', %L,
    '{"envolvimento": 1, "colaboracao": 1, "organizacao": 1}', 'Primeiro registro.') $f$, pg_temp.d('a2')),
  '42501', 'A coordenação só corrige registros existentes.', 'FR-011: coordenação não registra participação nova');

-- Leitura (FR-022)
select pg_temp.como(pg_temp.u('0b'));
select is(jsonb_array_length(public.presencas_da_turma('50000000-0000-0000-0007-000000000001', pg_temp.t('a')) -> 'alunos'), 5,
  'US2: gestão lê a presença da turma');
select is(public.presencas_da_turma('50000000-0000-0000-0007-000000000001', pg_temp.t('a')) -> 'regras' -> 'participacao' -> 'criterios' -> 0 ->> 'maximo',
  '4', 'U1: as regras da edição chegam à tela da gestão');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok($$ select public.presencas_da_turma('50000000-0000-0000-0007-000000000001', pg_temp.t('a')) $$,
  '42501', null, 'SC-004: aluno não lê a presença da turma');
select is((select count(*)::int from public.presencas where estudante_id in (pg_temp.u('a1'), pg_temp.u('a2'))
           and encontro_id = '50000000-0000-0000-0007-000000000001'), 2,
  'FR-022: aluno lê a própria presença e a do colega de equipe');
select is((select count(*)::int from public.presencas where estudante_id = pg_temp.u('a3')), 0,
  'FR-022: aluno não lê a presença de outra equipe');
reset role;

-- ===========================================================================
-- US3 — avaliação por rubrica e feedback (T026)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select lives_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 9, "aplicacao": 8, "qualidade": 8, "organizacao": 9}',
    '{"clareza": 3, "explicacao": 4, "respostas": 3}', false, 'Bom trabalho, faltou testar.', null) $f$,
    pg_temp.g('d1'), pg_temp.d('a1')),
  'FR-012: docente registra a avaliação da entrega e da apresentação');
select is(pg_temp.auditorias('avaliacoes', pg_temp.u('0b')), 1, 'FR-023: avaliação auditada com o autor');
select lives_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 9, "aplicacao": 8, "qualidade": 8, "organizacao": 9}',
    '{"clareza": 3, "explicacao": 4, "respostas": 3}', false, 'Bom trabalho, faltou testar.', null) $f$,
    pg_temp.g('d1'), pg_temp.d('a1')),
  'Idempotência: repetir a mesma avaliação é aceito sem justificativa');
select is(pg_temp.auditorias('avaliacoes', pg_temp.u('0b')), 1, 'Idempotência: repetição não gera auditoria');
select throws_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 7, "aplicacao": 8, "qualidade": 8, "organizacao": 9}',
    '{"clareza": 3, "explicacao": 4, "respostas": 3}', false, 'Bom trabalho, faltou testar.', null) $f$,
    pg_temp.g('d1'), pg_temp.d('a1')),
  '23514', 'Informe uma justificativa com pelo menos 10 caracteres.', 'FR-015: mudar uma nota exige justificativa');

select pg_temp.como(pg_temp.u('0a'));
select lives_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 10, "aplicacao": 8, "qualidade": 8, "organizacao": 9}',
    '{"clareza": 3, "explicacao": 4, "respostas": 3}', false, 'Bom trabalho, faltou testar.', 'Revisão da coordenação.') $f$,
    pg_temp.g('d1'), pg_temp.d('a1')),
  'FR-015: coordenação corrige com justificativa');
select ok(pg_temp.auditada_com('avaliacoes', pg_temp.u('0a'), 'Revisão da coordenação.'),
  'FR-015/023: correção auditada com valor anterior e justificativa');
select throws_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 5, "aplicacao": 5, "qualidade": 5, "organizacao": 5}',
    '{"clareza": 1, "explicacao": 1, "respostas": 1}', false, 'Avaliação.', 'Registro pela coordenação.') $f$,
    pg_temp.g('d2'), pg_temp.d('a2')),
  '42501', 'A coordenação só corrige registros existentes.', 'FR-011: coordenação não faz a primeira avaliação');

select pg_temp.como(pg_temp.u('0c'));
select throws_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 11, "aplicacao": 5, "qualidade": 5, "organizacao": 5}',
    '{"clareza": 1, "explicacao": 1, "respostas": 1}', false, 'Avaliação.', null) $f$,
    pg_temp.g('d2'), pg_temp.d('a2')),
  '23514', 'A nota de "Compreensão do problema" deve estar entre 0 e 10.', 'FR-012: limite das regras da edição');
select throws_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 5, "aplicacao": 5, "qualidade": 5, "organizacao": 5}',
    '{"clareza": 1, "explicacao": 1, "respostas": 1}', false, '  ', null) $f$,
    pg_temp.g('d2'), pg_temp.d('a2')),
  '23514', 'Escreva o feedback da entrega.', 'FR-012: feedback obrigatório quando há entrega');
select throws_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 5, "aplicacao": 5, "qualidade": 5, "organizacao": 5}', null, true, 'x', null) $f$,
    pg_temp.g('d1'), pg_temp.d('a2')),
  '23514', 'A equipe não tem entrega: a prática fica zerada.', 'FR-014: sem entrega, não há nota de prática');
select lives_ok(format($f$ select public.registrar_avaliacao(%L, %L, null, null, true, null, null) $f$,
    pg_temp.g('d1'), pg_temp.d('a2')),
  'FR-014: sem entrega, apresentação marcada como não avaliável');
select lives_ok(format($f$ select public.registrar_avaliacao(%L, %L,
    '{"compreensao": 7, "aplicacao": 7, "qualidade": 7, "organizacao": 7}',
    '{"clareza": 2, "explicacao": 3, "respostas": 2}', false, 'Entrega com atraso; boa solução.', null) $f$,
    pg_temp.g('d2'), pg_temp.d('a2')),
  'FR-012: mentor avalia a entrega atrasada');

select pg_temp.como(pg_temp.u('0d'));
select throws_ok(format($f$ select public.registrar_avaliacao(%L, %L, null, null, true, null, null) $f$,
    pg_temp.g('d1'), pg_temp.d('a2')),
  '42501', null, 'SC-004: docente de outra turma não avalia');

-- Painel da gestão e visibilidade (FR-015, FR-022)
select pg_temp.como(pg_temp.u('0b'));
select is(jsonb_array_length(public.painel_avaliacao(pg_temp.g('d1')::uuid) -> 'equipes'), 2,
  'US3: painel lista as equipes da turma do desafio');
select is((public.painel_avaliacao(pg_temp.g('d1')::uuid) -> 'equipes' -> 0 -> 'ultimaEntrega' ->> 'versao')::int, 3,
  'US3: painel mostra a última versão da entrega');
select ok(public.painel_avaliacao(pg_temp.g('d1')::uuid) -> 'regras' -> 'entrega' ? 'criterios',
  'U1: o painel traz as regras da edição');
select pg_temp.como(pg_temp.u('a1'));
select throws_ok(format($f$ select public.painel_avaliacao(%L) $f$, pg_temp.g('d1')), '42501', null,
  'SC-004: aluno não abre o painel de avaliação');
select is((select x -> 'avaliacao' ->> 'feedback' from jsonb_array_elements(public.atividades_da_turma(pg_temp.t('a')) -> 'desafios') x
           where x ->> 'id' = pg_temp.g('d1')),
  'Bom trabalho, faltou testar.', 'FR-015: a equipe vê a avaliação e o feedback');
select is((select count(*)::int from public.avaliacoes where dupla_id = pg_temp.d('a2')), 0,
  'FR-022: aluno não lê a avaliação de outra equipe');
reset role;

-- ===========================================================================
-- US4 — listas de questões, gabarito protegido e submissão única (T032)
-- ===========================================================================
create function pg_temp.questoes(n_alternativas int[], corretas int[]) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object(
           'enunciado', 'Questão ' || q, 'justificativa', 'Porque sim ' || q, 'capacidade', 'Cap ' || q,
           'alternativas', (select jsonb_agg(jsonb_build_object('texto', 'Alt ' || a, 'correta', a = corretas[q]) order by a)
                            from generate_series(1, n_alternativas[q]) a)) order by q)
  from generate_series(1, cardinality(n_alternativas)) q;
$$;
create function pg_temp.alternativa(lista uuid, ordem_q int, ordem_a int) returns uuid language sql security definer as $$
  select a.id from public.alternativas a join public.questoes q on q.id = a.questao_id
  where q.lista_id = lista and q.ordem = ordem_q and a.ordem = ordem_a;
$$;
create function pg_temp.questao(lista uuid, ordem_q int) returns uuid language sql security definer as $$
  select id from public.questoes where lista_id = lista and ordem = ordem_q;
$$;
create function pg_temp.acertos(lista uuid, dupla uuid) returns int language sql security definer as $$
  select acertos from public.submissoes_questoes where lista_id = lista and dupla_id = dupla;
$$;

set local role authenticated;
select pg_temp.como(pg_temp.u('0b'));
select lives_ok($$ select pg_temp.guardar('l1', public.salvar_lista(null, '50000000-0000-0000-0007-000000000001',
    array[pg_temp.t('a')], 'Lista um', now() + interval '1 day', pg_temp.questoes(array[3, 2], array[2, 1]))::text) $$,
  'FR-016: docente cria a lista de questões');
select ok(pg_temp.auditorias('listas_questoes', pg_temp.u('0b')) >= 1, 'FR-023: lista auditada com o autor');
select throws_ok($$ select public.salvar_lista(null, '50000000-0000-0000-0007-000000000002', array[pg_temp.t('a')],
    'Lista da prova', now() + interval '1 day', pg_temp.questoes(array[2], array[1])) $$,
  '23514', 'Este encontro usa a prova oficial; não há lista de questões.', 'US4-6: não há lista em encontro de prova oficial');
select throws_ok($$ select public.salvar_lista(null, '50000000-0000-0000-0007-000000000001', array[pg_temp.t('a')],
    'Lista ruim', now() + interval '1 day',
    '[{"enunciado": "Q", "alternativas": [{"texto": "a", "correta": true}, {"texto": "b", "correta": true}]}]') $$,
  '23514', 'Cada questão precisa de exatamente uma alternativa correta.', 'FR-016: uma única alternativa correta');
select throws_ok($$ select public.salvar_lista(null, '50000000-0000-0000-0007-000000000001', array[pg_temp.t('a')],
    'Lista ruim', now() + interval '1 day', '[{"enunciado": "Q", "alternativas": [{"texto": "a", "correta": true}]}]') $$,
  '23514', 'Cada questão precisa de pelo menos duas alternativas.', 'FR-016: pelo menos duas alternativas');
select throws_ok($$ select public.salvar_lista(null, '50000000-0000-0000-0007-000000000001', array[pg_temp.t('a')],
    'Lista vazia', now() + interval '1 day', '[]') $$,
  '23514', 'Inclua pelo menos uma questão.', 'FR-016: lista sem questões é recusada');
select is(public.salvar_lista(pg_temp.g('l1')::uuid, '50000000-0000-0000-0007-000000000001', array[pg_temp.t('a')],
    'Lista um (revisada)', now() + interval '1 day', pg_temp.questoes(array[3, 2], array[2, 1]))::text, pg_temp.g('l1'),
  'FR-019: edição antes da primeira submissão');
select is(pg_temp.contar('listas_questoes', format('id = %L and versao = 2', pg_temp.g('l1'))), 1,
  'FR-019: cada edição gera nova versão');
select lives_ok($$ select public.publicar_lista(pg_temp.g('l1')::uuid) $$, 'FR-016: docente publica a lista');
select pg_temp.como(pg_temp.u('0c'));
select lives_ok($$ select public.publicar_lista(public.salvar_lista(null, '50000000-0000-0000-0007-000000000001',
    array[pg_temp.t('a')], 'Lista dois', now() + interval '1 day', pg_temp.questoes(array[2], array[1]))) $$,
  'FR-026: mentor publica outra lista no mesmo encontro');

-- Gabarito protegido antes do prazo (FR-017, SC-005)
select pg_temp.como(pg_temp.u('a1'));
select ok(position('correta' in public.lista_para_equipe(pg_temp.g('l1')::uuid)::text) = 0
          and position('justificativa' in public.lista_para_equipe(pg_temp.g('l1')::uuid)::text) = 0
          and position('gabarito' in public.lista_para_equipe(pg_temp.g('l1')::uuid)::text) = 0,
  'SC-005: antes do prazo, nem gabarito nem justificativa saem para o aluno');
select is(jsonb_array_length(public.lista_para_equipe(pg_temp.g('l1')::uuid) -> 'questoes'), 2,
  'US4: aluno recebe as questões e alternativas');
select is((select count(*)::int from public.questoes) + (select count(*)::int from public.alternativas), 0,
  'SC-005: leitura direta das tabelas devolve 0 linhas ao aluno');

-- Submissão única com repetição segura (FR-018, SC-007)
select ok((public.enviar_respostas(pg_temp.g('l1')::uuid, 'cccccccc-0000-0000-0000-000000000001',
    jsonb_build_object(pg_temp.questao(pg_temp.g('l1')::uuid, 1), pg_temp.alternativa(pg_temp.g('l1')::uuid, 1, 2),
                       pg_temp.questao(pg_temp.g('l1')::uuid, 2), pg_temp.alternativa(pg_temp.g('l1')::uuid, 2, 2)))
   ->> 'autorNome') = 'Pessoa a1', 'FR-018: integrante envia as respostas da equipe');
select is(pg_temp.acertos(pg_temp.g('l1')::uuid, pg_temp.d('a1')), 1, 'FR-020: acertos calculados no servidor');
select is(pg_temp.auditorias('submissoes_questoes', pg_temp.u('a1')), 1, 'FR-023: submissão auditada com o autor');
select lives_ok($$ select public.enviar_respostas(pg_temp.g('l1')::uuid, 'cccccccc-0000-0000-0000-000000000001',
    jsonb_build_object(pg_temp.questao(pg_temp.g('l1')::uuid, 1), pg_temp.alternativa(pg_temp.g('l1')::uuid, 1, 2),
                       pg_temp.questao(pg_temp.g('l1')::uuid, 2), pg_temp.alternativa(pg_temp.g('l1')::uuid, 2, 2))) $$,
  'Idempotência: repetir a mesma tentativa devolve a confirmação original');
select is(pg_temp.contar('submissoes_questoes', format('lista_id = %L', pg_temp.g('l1'))), 1,
  'Idempotência: repetição não cria outra submissão');
select pg_temp.como(pg_temp.u('a2'));
select throws_like($$ select public.enviar_respostas(pg_temp.g('l1')::uuid, 'cccccccc-0000-0000-0000-000000000002',
    jsonb_build_object(pg_temp.questao(pg_temp.g('l1')::uuid, 1), pg_temp.alternativa(pg_temp.g('l1')::uuid, 1, 1))) $$,
  'A equipe já enviou as respostas%Pessoa a1%', 'FR-018: segunda submissão da equipe é recusada, informando quem enviou');
select ok(public.lista_para_equipe(pg_temp.g('l1')::uuid) -> 'submissao' ->> 'autorNome' = 'Pessoa a1',
  'US4-2: a tela mostra quem enviou');
select pg_temp.como(pg_temp.u('a3'));
select throws_ok($$ select public.enviar_respostas(pg_temp.g('l1')::uuid, 'cccccccc-0000-0000-0000-000000000003',
    jsonb_build_object(pg_temp.questao(pg_temp.g('l1')::uuid, 1), pg_temp.alternativa(pg_temp.g('l1')::uuid, 2, 1))) $$,
  '23514', 'Resposta inválida para esta lista.', 'FR-018: alternativa de outra questão é recusada');
select pg_temp.como(pg_temp.u('a5'));
select throws_ok($$ select public.enviar_respostas(pg_temp.g('l1')::uuid, 'cccccccc-0000-0000-0000-000000000005', '{}') $$,
  '23514', 'Você precisa fazer parte de uma equipe para enviar.', 'Edge: aluno sem equipe não envia');
select pg_temp.como(pg_temp.u('b1'));
select throws_ok($$ select public.lista_para_equipe(pg_temp.g('l1')::uuid) $$, '42501', null,
  'SC-004: aluno de outra turma não vê a lista');

select pg_temp.como(pg_temp.u('0b'));
select throws_ok($$ select public.salvar_lista(pg_temp.g('l1')::uuid, '50000000-0000-0000-0007-000000000001',
    array[pg_temp.t('a')], 'Mudou', now() + interval '1 day', pg_temp.questoes(array[2], array[1])) $$,
  '23514', 'A lista já tem respostas e não pode ser editada.', 'FR-019: edição recusada depois da submissão');

-- Encerramento no prazo (FR-027) e gabarito depois do prazo (FR-017/020)
select pg_temp.guardar('l3', public.salvar_lista(null, '50000000-0000-0000-0007-000000000001', array[pg_temp.t('a')],
  'Lista encerrada', now() - interval '1 minute', pg_temp.questoes(array[2, 2], array[1, 2]))::text);
select public.publicar_lista(pg_temp.g('l3')::uuid);
select pg_temp.como(pg_temp.u('a1'));
select is((public.lista_para_equipe(pg_temp.g('l3')::uuid) ->> 'encerrada')::boolean, true,
  'FR-027: a lista encerra no prazo');
select is(public.lista_para_equipe(pg_temp.g('l3')::uuid) -> 'questoes' -> 0 ->> 'gabarito',
  pg_temp.alternativa(pg_temp.g('l3')::uuid, 1, 1)::text, 'FR-017: depois do prazo, o gabarito aparece');
select is(public.lista_para_equipe(pg_temp.g('l3')::uuid) -> 'questoes' -> 0 ->> 'justificativa', 'Porque sim 1',
  'FR-017: depois do prazo, a justificativa aparece');
select throws_ok($$ select public.enviar_respostas(pg_temp.g('l3')::uuid, 'cccccccc-0000-0000-0000-000000000009', '{}') $$,
  '23514', 'O prazo da lista terminou.', 'FR-027: lista encerrada não recebe respostas');
reset role;

-- ===========================================================================
-- US5 — lançamentos da própria equipe para a pontuação parcial (T041)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('a1'));
select is(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'equipe' ->> 'id',
  pg_temp.d('a1')::text, 'US5: devolve a equipe do aluno');
select ok(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'regras' ? 'questoes',
  'US5: inclui as regras da edição');
select is(jsonb_array_length(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros'), 2,
  'US5: um item por encontro da edição');
select is(
  (select count(*)::int from jsonb_array_elements(
     public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros' -> 0 -> 'presencas')),
  2, 'US5: presenças só dos integrantes da equipe');
select is(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros' -> 0 -> 'participacao' ->> 'envolvimento',
  '4', 'US5: participação da equipe');
select ok(
  (select bool_and(x ? 'avaliacao' and x ? 'temEntrega' and x ? 'atrasoMinutos' and x ? 'prorrogada')
   from jsonb_array_elements(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros' -> 0 -> 'desafios') x),
  'US5: avaliação, entrega e atraso de cada desafio do encontro');
select is(
  (select x ->> 'acertos' from jsonb_array_elements(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros' -> 0 -> 'listas') x
   where x ->> 'listaId' = pg_temp.g('l1')),
  null, 'FR-020: acertos da lista aberta não aparecem antes do prazo');
select is(
  (select (x ->> 'total')::int from jsonb_array_elements(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros' -> 0 -> 'listas') x
   where x ->> 'listaId' = pg_temp.g('l3')),
  2, 'US5: lista encerrada sem submissão informa o total (conta 0)');
select pg_temp.como(pg_temp.u('a5'));
select is(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros', '[]'::jsonb,
  'Edge: aluno sem equipe não recebe lançamentos');
select pg_temp.como(pg_temp.u('b1'));
select is(
  (select count(*)::int from jsonb_array_elements(public.lancamentos_da_minha_equipe('10000000-0000-0000-0007-000000000001') -> 'encontros' -> 0 -> 'desafios')),
  0, 'FR-022: só as atividades da turma do aluno');
reset role;

-- @@secoes

select * from finish();
rollback;
