-- Testes da spec 013 — encerramento da edição por turma.
begin;
create extension if not exists pgtap with schema extensions;

select no_plan();

-- ---------------------------------------------------------------------------
-- Cenário fictício.
--   E (ativa): curso K ("Categoria K": turmas KA, KB, KC, KD) e curso L ("Categoria L": LA, sem
--   equipes). Uma equipe por turma K. Publicações (inseridas sem gatilhos, como fixtures):
--   KA definitiva; KB provisória; KD definitiva e depois parcial; KC sem publicação; e uma
--   publicação por categoria anterior (sem turma) da "Categoria K".
--   c = coordenação de E, G e H; d = docente de KA.
--   G: encerrada com o registro no formato anterior (categoriasSemRanking). H: encerrada sem registro.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select ('00000000-0000-0000-0014-0000000000' || s)::uuid, 'n' || s || '@exemplo.invalid',
       jsonb_build_object('nome', 'Pessoa ' || s), 'authenticated', 'authenticated'
from (values ('c1'), ('d1')) as v (s);

insert into public.edicoes (id, nome, estado, inicio, fim, regras, regras_versao)
select v.id::uuid, v.nome, 'ativa', '2026-03-01', '2026-12-01', app.regras_piloto(), app.regras_piloto() ->> 'versao'
from (values ('10000000-0000-0000-0014-0000000000e0', 'Edição E'),
             ('10000000-0000-0000-0014-0000000000a0', 'Edição G'),
             ('10000000-0000-0000-0014-0000000000b0', 'Edição H')) as v (id, nome);

insert into public.cursos (id, edicao_id, nome, categoria) values
  ('20000000-0000-0000-0014-0000000000e1', '10000000-0000-0000-0014-0000000000e0', 'Curso K', 'Categoria K'),
  ('20000000-0000-0000-0014-0000000000e2', '10000000-0000-0000-0014-0000000000e0', 'Curso L', 'Categoria L');
insert into public.turmas (id, curso_id, nome) values
  ('30000000-0000-0000-0014-0000000000a0', '20000000-0000-0000-0014-0000000000e1', 'KA'),
  ('30000000-0000-0000-0014-0000000000b0', '20000000-0000-0000-0014-0000000000e1', 'KB'),
  ('30000000-0000-0000-0014-0000000000c0', '20000000-0000-0000-0014-0000000000e1', 'KC'),
  ('30000000-0000-0000-0014-0000000000d0', '20000000-0000-0000-0014-0000000000e1', 'KD'),
  ('30000000-0000-0000-0014-0000000000f0', '20000000-0000-0000-0014-0000000000e2', 'LA');

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select ('00000000-0000-0000-0014-0000000000' || u)::uuid, e::uuid, p::public.papel, t::uuid
from (values ('c1', '10000000-0000-0000-0014-0000000000e0', 'coordenacao', null),
             ('c1', '10000000-0000-0000-0014-0000000000a0', 'coordenacao', null),
             ('c1', '10000000-0000-0000-0014-0000000000b0', 'coordenacao', null),
             ('d1', '10000000-0000-0000-0014-0000000000e0', 'docente', '30000000-0000-0000-0014-0000000000a0'))
  as v (u, e, p, t);

insert into public.duplas (id, edicao_id, turma_id, nome) values
  ('60000000-0000-0000-0014-0000000000a1', '10000000-0000-0000-0014-0000000000e0', '30000000-0000-0000-0014-0000000000a0', 'EA'),
  ('60000000-0000-0000-0014-0000000000b1', '10000000-0000-0000-0014-0000000000e0', '30000000-0000-0000-0014-0000000000b0', 'EB'),
  ('60000000-0000-0000-0014-0000000000c1', '10000000-0000-0000-0014-0000000000e0', '30000000-0000-0000-0014-0000000000c0', 'EC'),
  ('60000000-0000-0000-0014-0000000000d1', '10000000-0000-0000-0014-0000000000e0', '30000000-0000-0000-0014-0000000000d0', 'ED');

set local session_replication_role = replica;
insert into public.publicacoes_ranking (edicao_id, turma_id, categoria, versao, estado, justificativa, regras_versao,
                                        revisao_ate, publicado_por)
select '10000000-0000-0000-0014-0000000000e0', t::uuid, 'Categoria K', v, e::public.estado_ranking,
       case when v > 1 then 'Versão seguinte da turma.' end, 'teste',
       case when e = 'provisorio' then now() + interval '24 hours' end, '00000000-0000-0000-0014-0000000000c1'
from (values ('30000000-0000-0000-0014-0000000000a0', 1, 'definitivo'),
             ('30000000-0000-0000-0014-0000000000b0', 1, 'provisorio'),
             ('30000000-0000-0000-0014-0000000000d0', 1, 'definitivo'),
             ('30000000-0000-0000-0014-0000000000d0', 2, 'parcial'),
             (null, 1, 'parcial')) as x (t, v, e);
set local session_replication_role = origin;

-- Equipe nova em KA depois da definitiva: vale a última publicação da turma (KA continua fechada).
insert into public.duplas (id, edicao_id, turma_id, nome) values
  ('60000000-0000-0000-0014-0000000000a2', '10000000-0000-0000-0014-0000000000e0', '30000000-0000-0000-0014-0000000000a0', 'EA2');

update public.edicoes set estado = 'encerrada', encerrada_em = now() - interval '30 days',
  justificativa_encerramento = 'Encerrada antes da spec 013.',
  pendencias_no_encerramento = '{"ocorrenciasSemDecisao": 1, "revisoesAbertas": 0, "categoriasSemRanking": ["Categoria Z"]}'
where id = '10000000-0000-0000-0014-0000000000a0';
update public.edicoes set estado = 'encerrada', encerrada_em = now() - interval '60 days',
  justificativa_encerramento = 'Encerrada antes da spec 010.', pendencias_no_encerramento = null
where id = '10000000-0000-0000-0014-0000000000b0';

create function pg_temp.u(s text) returns uuid language sql immutable as $$
  select ('00000000-0000-0000-0014-0000000000' || s)::uuid;
$$;
create function pg_temp.ed(s text) returns uuid language sql immutable as $$
  select case s when 'e' then '10000000-0000-0000-0014-0000000000e0'::uuid
                when 'g' then '10000000-0000-0000-0014-0000000000a0'::uuid
                else '10000000-0000-0000-0014-0000000000b0'::uuid end;
$$;
create function pg_temp.como(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.guardar(chave text, valor text) returns text language sql as $$
  select set_config('teste.' || chave, valor, true);
$$;
create function pg_temp.lido(chave text) returns jsonb language sql as $$
  select current_setting('teste.' || chave)::jsonb;
$$;
create function pg_temp.turmas(p jsonb) returns text language sql immutable as $$
  select coalesce(string_agg((t ->> 'turma') || ':' || (t ->> 'estado'), ',' order by ord), '')
  from jsonb_array_elements(p -> 'turmasSemDefinitiva') with ordinality x (t, ord);
$$;
create function pg_temp.edicao(lista jsonb, id uuid) returns jsonb language sql immutable as $$
  select e from jsonb_array_elements(lista) e where (e ->> 'id')::uuid = id;
$$;

-- ===========================================================================
-- US1 — turmas sem ranking definitivo antes de encerrar (T003, FR-001 a FR-007)
-- ===========================================================================
set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('p', public.pendencias_da_edicao(pg_temp.ed('e'))::text);
select pg_temp.como(pg_temp.u('d1'));
select throws_ok(format($f$ select public.pendencias_da_edicao(%L) $f$, pg_temp.ed('e')), '42501', null,
  'FR-007: docente não consulta as pendências');
select throws_ok(format($f$ select public.encerrar_edicao(%L, 'Encerramento sem permissão.') $f$, pg_temp.ed('e')), '42501', null,
  'FR-007: docente não encerra');
reset role;

select is(pg_temp.turmas(pg_temp.lido('p')), 'KB:provisorio,KC:sem_publicacao,KD:parcial',
  'FR-001/SC-001: turmas sem definitiva, com o estado, por categoria e nome');
select ok(not (pg_temp.lido('p') ? 'categoriasSemRanking'), 'FR-003: a lista por categoria sai');
select is((select t ->> 'categoria' from jsonb_array_elements(pg_temp.lido('p') -> 'turmasSemDefinitiva') t where t ->> 'turma' = 'KB'),
  'Categoria K', 'FR-001: com a categoria da turma');
select is((select (t ->> 'turmaId')::uuid from jsonb_array_elements(pg_temp.lido('p') -> 'turmasSemDefinitiva') t where t ->> 'turma' = 'KC'),
  '30000000-0000-0000-0014-0000000000c0'::uuid, 'FR-001: com o id da turma');
select ok(not exists (select 1 from jsonb_array_elements(pg_temp.lido('p') -> 'turmasSemDefinitiva') t where t ->> 'turma' in ('KA', 'LA')),
  'FR-002/SC-002: turma com a definitiva (mesmo com equipe nova) e turma sem equipes ficam fora');
select is(pg_temp.lido('p') - 'turmasSemDefinitiva', '{"ocorrenciasSemDecisao": 0, "revisoesAbertas": 0}'::jsonb,
  'spec 010: contagens de ocorrências e revisões');

set local role authenticated;
select pg_temp.como(pg_temp.u('c1'));
select pg_temp.guardar('enc', public.encerrar_edicao(pg_temp.ed('e'), 'Fim do ciclo com turmas pendentes.')::text);
select pg_temp.guardar('enc2', public.encerrar_edicao(pg_temp.ed('e'), 'Fim do ciclo com turmas pendentes.')::text);
select pg_temp.guardar('lista', public.edicoes_que_coordeno()::text);
reset role;

select ok(pg_temp.lido('enc') ->> 'encerradaEm' is not null, 'FR-004: encerra mesmo com turmas pendentes');
select is(pg_temp.turmas(pg_temp.lido('enc') -> 'pendencias'), 'KB:provisorio,KC:sem_publicacao,KD:parcial',
  'FR-005/SC-003: o registro do encerramento guarda as turmas pendentes');
select is((select pg_temp.turmas(pendencias_no_encerramento) from public.edicoes where id = pg_temp.ed('e')),
  'KB:provisorio,KC:sem_publicacao,KD:parcial', 'FR-005: gravado na edição');
select is(pg_temp.lido('enc2'), pg_temp.lido('enc'), 'reenvio devolve o registro gravado');
select is(pg_temp.turmas(pg_temp.edicao(pg_temp.lido('lista'), pg_temp.ed('e')) -> 'pendenciasNoEncerramento'),
  'KB:provisorio,KC:sem_publicacao,KD:parcial', 'FR-006a: a lista de edições traz o registro do encerramento');
select is(pg_temp.edicao(pg_temp.lido('lista'), pg_temp.ed('g')) -> 'pendenciasNoEncerramento',
  '{"ocorrenciasSemDecisao": 1, "revisoesAbertas": 0, "categoriasSemRanking": ["Categoria Z"]}'::jsonb,
  'FR-006/SC-004: registro anterior como foi gravado');
select is(pg_temp.edicao(pg_temp.lido('lista'), pg_temp.ed('h')) -> 'pendenciasNoEncerramento', 'null'::jsonb,
  'FR-006a: edição sem registro');

select * from finish();
rollback;
