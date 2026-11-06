-- Testes da spec 019 — transferência de conta entre unidades.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0019-0000000000' || s)::uuid;
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
create function pg_temp.ui() returns uuid language sql stable security definer as $$
  select id from public.unidades where nome = 'SENAI Juazeiro do Norte';
$$;
create function pg_temp.ub() returns uuid language sql stable security definer as $$
  select id from public.unidades where nome = 'Unidade B';
$$;
create function pg_temp.uc() returns uuid language sql stable security definer as $$
  select id from public.unidades where nome = 'Unidade C';
$$;
-- 'aceita' ou o código do erro da chamada, feita como a pessoa informada.
create function pg_temp.chamar(p_usuario uuid, p_chamada text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute p_chamada;
    execute 'reset role';
    return 'aceita';
  exception when others then
    execute 'reset role';
    return sqlstate;
  end;
end;
$$;
-- Mensagem do erro da chamada (ou null se aceita).
create function pg_temp.mensagem(p_usuario uuid, p_chamada text) returns text language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute p_chamada;
    execute 'reset role';
    return null;
  exception when others then
    execute 'reset role';
    return sqlstate || ': ' || sqlerrm;
  end;
end;
$$;
create function pg_temp.visto_como(p_usuario uuid, p_consulta text) returns bigint language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    execute p_consulta into n;
  exception when others then
    execute 'reset role';
    return -1;
  end;
  execute 'reset role';
  return n;
end;
$$;

-- ===========================================================================
-- Cenário fictício. Unidade inicial (I) com a equipe; depois B e C.
--   f1, f2 gestão (I); c1, c2 coordenação da Edição I (ativa); d1, d2 docentes; 11 mentora (curso);
--   a1 analista; 21 estudante; e1 coordenadora única da Edição Antiga (encerrada); fa master;
--   b1 gestão da B (destino). Sufixos de uuid em hexadecimal.
-- ===========================================================================
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select pg_temp.u(s), 'p' || s || '@exemplo.invalid', jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('a1'), ('c1'), ('c2'), ('d1'), ('d2'), ('e1'), ('f1'), ('f2'), ('11'), ('21')) v (s);
insert into public.unidades (id, nome) values
  ('10000000-0000-0000-0019-0000000000b0', 'Unidade B'),
  ('10000000-0000-0000-0019-0000000000c0', 'Unidade C');
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (pg_temp.u('fa'), 'master19@exemplo.invalid', '{"nome": "Master Teste", "master": true}', 'authenticated', 'authenticated');
insert into public.masters (usuario_id) values (pg_temp.u('fa'));
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values (pg_temp.u('b1'), 'pb1@exemplo.invalid',
        jsonb_build_object('nome', 'Pessoa b1', 'unidade_id', '10000000-0000-0000-0019-0000000000b0'), 'authenticated', 'authenticated');

insert into public.funcoes_unidade (usuario_id, funcao) values
  (pg_temp.u('f1'), 'gestao'), (pg_temp.u('f2'), 'gestao'), (pg_temp.u('b1'), 'gestao'),
  (pg_temp.u('c1'), 'coordenacao'), (pg_temp.u('c2'), 'coordenacao'), (pg_temp.u('e1'), 'coordenacao'),
  (pg_temp.u('d1'), 'docente'), (pg_temp.u('d2'), 'docente'), (pg_temp.u('11'), 'mentor'), (pg_temp.u('a1'), 'analista');

insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao, unidade_id) values
  ('20000000-0000-0000-0019-0000000000a0', 'Edição I', 'ativa', '2026-03-01', '2026-12-01', app.regras_piloto(), 'x', pg_temp.ui()),
  ('20000000-0000-0000-0019-0000000000a1', 'Edição Antiga', 'ativa', '2025-03-01', '2025-12-01', app.regras_piloto(), 'x', pg_temp.ui());
insert into public.cursos (id, edicao_id, nome, categoria) values
  ('40000000-0000-0000-0019-0000000000a0', '20000000-0000-0000-0019-0000000000a0', 'Curso I', 'Cat I');
insert into public.turmas (id, curso_id, nome) values
  ('50000000-0000-0000-0019-0000000000a0', '40000000-0000-0000-0019-0000000000a0', 'Turma I1'),
  ('50000000-0000-0000-0019-0000000000a1', '40000000-0000-0000-0019-0000000000a0', 'Turma I2');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id, curso_id) values
  (pg_temp.u('c1'), '20000000-0000-0000-0019-0000000000a0', 'coordenacao', null, null),
  (pg_temp.u('c2'), '20000000-0000-0000-0019-0000000000a0', 'coordenacao', null, null),
  (pg_temp.u('e1'), '20000000-0000-0000-0019-0000000000a1', 'coordenacao', null, null),
  (pg_temp.u('d1'), '20000000-0000-0000-0019-0000000000a0', 'docente', '50000000-0000-0000-0019-0000000000a0', null),
  (pg_temp.u('d2'), '20000000-0000-0000-0019-0000000000a0', 'docente', '50000000-0000-0000-0019-0000000000a1', null),
  (pg_temp.u('21'), '20000000-0000-0000-0019-0000000000a0', 'aluno', '50000000-0000-0000-0019-0000000000a0', null),
  (pg_temp.u('11'), '20000000-0000-0000-0019-0000000000a0', 'mentor', null, '40000000-0000-0000-0019-0000000000a0');
-- A edição antiga termina com e1 como única coordenação (histórico).
update public.edicoes set estado = 'encerrada', encerrada_em = now(), justificativa_encerramento = 'Fim do ciclo de teste.'
where id = '20000000-0000-0000-0019-0000000000a1';

-- ===========================================================================
-- Estrutura (T002)
-- ===========================================================================
select has_table('public', 'transferencias_de_conta', 'tabela de transferências');
select ok((select relrowsecurity from pg_class where oid = 'public.transferencias_de_conta'::regclass), 'RLS na tabela de transferências');
select ok(not has_table_privilege(r, 'public.transferencias_de_conta', p), format('%s sem %s em transferencias_de_conta', r, p))
from unnest(array['anon', 'authenticated']) r, unnest(array['select', 'insert', 'update', 'delete']) p;
select throws_ok(format($f$ update public.perfis set unidade_id = %L where id = %L $f$, pg_temp.ub(), pg_temp.u('d1')),
  '23514', 'A unidade da conta não muda.', 'a unidade da conta não muda por update direto');
select is((select unidade_id from public.perfis where id = pg_temp.u('d1')), pg_temp.ui(), 'a conta segue na unidade de origem');

-- ===========================================================================
-- US1 — o master transfere uma conta de equipe (T004)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('fa'));
select pg_temp.guardar('equipe_i', public.equipe_de_unidade_da_rede(pg_temp.ui())::text);
reset role;
select is((select string_agg(e ->> 'usuarioId', ',' order by e ->> 'usuarioId') from jsonb_array_elements(pg_temp.lido('equipe_i')::jsonb) e),
  (select string_agg(pg_temp.u(s)::text, ',' order by pg_temp.u(s)::text) from unnest(array['a1', 'c1', 'c2', 'd1', 'd2', 'e1', 'f1', 'f2', '11']) s),
  'a equipe da unidade lista só contas de equipe (sem estudante, sem master, sem outra unidade)');
select is((select string_agg(k, ',' order by k) from jsonb_object_keys(pg_temp.lido('equipe_i')::jsonb -> 0) k),
  'ativo,email,funcoes,nome,situacaoAcesso,usuarioId', 'contrato: chaves de cada conta da equipe');
select is(pg_temp.chamar(pg_temp.u(who), format('select public.equipe_de_unidade_da_rede(%L)', pg_temp.ui())), '42501',
  who || ': não-master não lista a equipe da rede')
from unnest(array['f1', 'c1', 'd1', 'a1', '21']) who;

select pg_temp.guardar('fn_antes', (select count(*) from public.funcoes_unidade)::text);
select pg_temp.guardar('at_antes', (select count(*) from public.atribuicoes)::text);
select pg_temp.guardar('ed_antes', (select count(*) from public.edicoes where unidade_id = pg_temp.ui())::text);
select pg_temp.guardar('chave1', gen_random_uuid()::text);

set local role authenticated;
select pg_temp.como(pg_temp.u('fa'));
select lives_ok(format($f$ select public.transferir_conta(%L, %L, %L, %L, 'Mudança de unidade da docente.') $f$,
  pg_temp.lido('chave1'), pg_temp.u('d1'), pg_temp.ui(), pg_temp.ub()), 'o master transfere a docente d1 da I para a B');
reset role;
select is((select unidade_id from public.perfis where id = pg_temp.u('d1')), pg_temp.ub(), 'a conta pertence à unidade de destino');
select is((select count(*)::int from public.funcoes_unidade where usuario_id = pg_temp.u('d1') and ativa), 0, 'nenhuma função ativa no destino');
select is((select count(*)::int from public.atribuicoes where usuario_id = pg_temp.u('d1') and ativo), 0, 'nenhum vínculo ativo');
select is((select count(*) from public.funcoes_unidade)::text, pg_temp.lido('fn_antes'), 'nenhuma função foi apagada');
select is((select count(*) from public.atribuicoes)::text, pg_temp.lido('at_antes'), 'nenhum vínculo foi apagado');
select is(pg_temp.visto_como(pg_temp.u('d1'), format('select count(*) from public.%I', t)), 0::bigint, 'd1 não lê ' || t)
from unnest(array['edicoes', 'cursos', 'turmas', 'cadastro_cursos']) t;
select is(pg_temp.chamar(pg_temp.u('d1'), format('select public.painel_da_coordenacao(%L)', '20000000-0000-0000-0019-0000000000a0')), '42501',
  'd1 não abre painel da origem');

-- A gestão do destino vê a conta sem funções e define as funções pelo fluxo existente.
set local role authenticated;
select pg_temp.como(pg_temp.u('b1'));
select pg_temp.guardar('equipe_b', public.equipe_da_unidade()::text);
reset role;
select is((select e -> 'funcoes' from jsonb_array_elements(pg_temp.lido('equipe_b')::jsonb) e where e ->> 'usuarioId' = pg_temp.u('d1')::text),
  '[]'::jsonb, 'a gestão do destino vê a conta sem funções');
select is(pg_temp.chamar(pg_temp.u('b1'), format($q$ select public.definir_funcoes(%L, array['docente']::public.funcao_unidade[], 'Docente da Unidade B.') $q$, pg_temp.u('d1'))),
  'aceita', 'a gestão do destino atribui a função de docente');
select ok(exists (select 1 from public.funcoes_unidade where usuario_id = pg_temp.u('d1') and funcao = 'docente' and ativa),
  'd1 tem a função de docente na B');
select is((select count(*) from public.edicoes where unidade_id = pg_temp.ui())::text, pg_temp.lido('ed_antes'),
  'as edições da origem seguem como estavam');
select is(pg_temp.visto_como(pg_temp.u('f1'), 'select count(*) from public.edicoes'), (select count(*) from public.edicoes where unidade_id = pg_temp.ui()),
  'a gestão da origem lê o histórico como antes');

-- Mentora com vínculos derivados e coordenadora única de edição encerrada também são transferíveis.
select pg_temp.guardar('mentora_antes', (select count(*) from public.atribuicoes where usuario_id = pg_temp.u('11'))::text);
select ok((select count(*) from public.atribuicoes where usuario_id = pg_temp.u('11') and origem_id is not null) >= 2,
  'a mentora tem vínculos derivados nas duas turmas');
select is(pg_temp.chamar(pg_temp.u('fa'), format($q$ select public.transferir_conta(gen_random_uuid(), %L, %L, %L, 'Mentoria passa para a unidade B.') $q$,
  pg_temp.u('11'), pg_temp.ui(), pg_temp.ub())), 'aceita', 'a mentora é transferida');
select is((select count(*)::int from public.atribuicoes where usuario_id = pg_temp.u('11') and ativo), 0, 'nenhum vínculo ativo, derivado ou não');
select is((select count(*) from public.atribuicoes where usuario_id = pg_temp.u('11'))::text, pg_temp.lido('mentora_antes'), 'nenhum vínculo da mentora foi apagado');
select is(pg_temp.chamar(pg_temp.u('fa'), format($q$ select public.transferir_conta(gen_random_uuid(), %L, %L, %L, 'Coordenação antiga passa para a C.') $q$,
  pg_temp.u('e1'), pg_temp.ui(), pg_temp.uc())), 'aceita', 'a coordenadora única de edição encerrada é transferida');
select is((select unidade_id from public.perfis where id = pg_temp.u('e1')), pg_temp.uc(), 'e1 pertence à C');
select is((select count(*)::int from public.atribuicoes where usuario_id = pg_temp.u('e1') and ativo), 0, 'o vínculo da edição encerrada virou histórico');


select * from finish();
rollback;
