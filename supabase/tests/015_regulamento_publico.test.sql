begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select has_function('public', 'regulamento_publico', array[]::text[], 'FR-003: leitura pública disponível');
select has_function('public', 'definir_regulamento_publico', array['uuid','boolean'], 'FR-005a: publicação por RPC');
-- A ausência da funcionalidade é uma falha de contrato, não um erro de execução da suíte.
create function pg_temp.chamar(sql text) returns jsonb language plpgsql as $$
declare result jsonb;
begin
  if to_regprocedure('public.regulamento_publico()') is null then return null; end if;
  execute sql into result;
  return result;
end;
$$;
insert into auth.users (id,email,raw_user_meta_data,aud,role) values
 ('00000000-0000-0000-0014-000000000001','coord14@exemplo.invalid','{"nome":"Coordenação fictícia"}','authenticated','authenticated'),
 ('00000000-0000-0000-0014-000000000002','outra14@exemplo.invalid','{"nome":"Outra coordenação fictícia"}','authenticated','authenticated');
insert into public.edicoes (id,nome,estado,inicio,fim,regras,regras_versao) values
 ('10000000-0000-0000-0014-000000000001','Edição fictícia pública','ativa','2026-03-01','2026-11-30',
 '{"versao":"teste","quantidadeEncontros":2,"privado":"SEGREDO","presenca":{"pontosPorIntegrante":2,"maximoPorDupla":4,"privado":"SEGREDO"},"entrega":{"criterios":[{"id":"c","rotulo":"Critério fictício","maximo":2,"privado":"SEGREDO"}]}}','teste'),
 ('10000000-0000-0000-0014-000000000002','Rascunho fictício','rascunho',null,null,'{"quantidadeEncontros":2}','teste');
insert into public.atribuicoes (usuario_id,edicao_id,papel) values
 ('00000000-0000-0000-0014-000000000001','10000000-0000-0000-0014-000000000001','coordenacao'),
 ('00000000-0000-0000-0014-000000000002','10000000-0000-0000-0014-000000000002','coordenacao');
insert into public.encontros(edicao_id,numero,titulo,data,orientacoes) values
 ('10000000-0000-0000-0014-000000000001',1,'Encontro fictício','2026-11-04','SEGREDO');
select ok(not (select regulamento_publico from public.edicoes where id='10000000-0000-0000-0014-000000000001'),'edições começam privadas');
set local role anon;
select is(public.regulamento_publico()->'edicoes','[]'::jsonb,'edição não publicada fica fora');
select throws_ok($$select * from public.edicoes$$,'42501',null,'anon não lê edições');
select throws_ok($$select * from public.encontros$$,'42501',null,'anon não lê encontros');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0014-000000000001","role":"authenticated"}',true);
set local role authenticated;
select lives_ok($$select public.definir_regulamento_publico('10000000-0000-0000-0014-000000000001',true)$$,'coordenação publica');
select is(jsonb_array_length(public.regulamento_publico()->'edicoes'),1,'somente a edição ativa publicada');
select is(public.regulamento_publico()->'edicoes'->0->>'unidade','SENAI Juazeiro do Norte','spec 016: a edição publicada informa a unidade');
select ok(public.regulamento_publico()::text not like '%SEGREDO%','projeção exclui dados privados recursivamente');
select ok(not has_column_privilege('authenticated','public.edicoes','regulamento_publico','UPDATE'),'marca sem UPDATE direto');
select throws_ok($$update public.edicoes set regulamento_publico=false where id='10000000-0000-0000-0014-000000000001'$$,'42501',null,'REST não contorna RPC');
reset role;
create temp table antes as select count(*) n from public.auditoria;
set local role authenticated;
select lives_ok($$select public.definir_regulamento_publico('10000000-0000-0000-0014-000000000001',true)$$,'repetição aceita');
select throws_ok($$select public.definir_regulamento_publico('10000000-0000-0000-0014-000000000002',true)$$,'42501',null,'outra edição recusada');
reset role;
select is((select count(*) from public.auditoria),(select n from antes),'repetição não duplica auditoria');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0014-000000000002","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.definir_regulamento_publico('10000000-0000-0000-0014-000000000002',true)$$,'23514',null,'rascunho não publica');
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0014-000000000001","role":"authenticated"}',true);
set local role authenticated;
select lives_ok($$select public.definir_regulamento_publico('10000000-0000-0000-0014-000000000001',false)$$,'coordenação retira');
select is(public.regulamento_publico()->'edicoes','[]'::jsonb,'retirada remove conteúdo');
reset role;
select public.definir_regulamento_publico('10000000-0000-0000-0014-000000000001',true);
update public.edicoes set estado='encerrada' where id='10000000-0000-0000-0014-000000000001';
set local role anon;
select is(public.regulamento_publico()->'edicoes','[]'::jsonb,'encerramento remove a edição mesmo com marca publicada');
reset role;
select * from finish();
rollback;
