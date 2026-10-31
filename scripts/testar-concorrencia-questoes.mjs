/**
 * Teste de concorrência da submissão única de questões (spec 006, T034, SC-007) com DUAS conexões
 * reais ao banco do Supabase LOCAL (container `supabase_db_maratona`).
 *
 * Os dois integrantes da mesma equipe enviam as respostas ao mesmo tempo: a primeira transação
 * segura a lista por 1 s; a segunda começa logo depois e precisa esperar. Esperado: uma submissão
 * aceita, uma recusa clara e exatamente uma linha no banco. Apaga as fixtures fictícias ao final.
 *
 * Uso: `node scripts/testar-concorrencia-questoes.mjs` (Supabase local iniciado).
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const CONTAINER = 'supabase_db_maratona';

function psql(sql) {
  return new Promise((resolve) => {
    const p = spawn('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-At', '-q'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let saida = '';
    let erro = '';
    p.stdout.on('data', (d) => (saida += d));
    p.stderr.on('data', (d) => (erro += d));
    p.on('close', (codigo) => resolve({ codigo, saida: saida.trim(), erro: erro.trim() }));
    p.stdin.end(sql);
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (r) => r.codigo === 0 && !/ERROR/.test(r.erro);
const resumo = (r) => (ok(r) ? 'sucesso' : (r.erro.match(/ERROR:\s+(.*)/)?.[1] ?? r.erro));

const edicao = randomUUID();
const curso = randomUUID();
const turma = randomUUID();
const encontro = randomUUID();
const dupla = randomUUID();
const lista = randomUUID();
const questao = randomUUID();
const alternativa = randomUUID();
const [A, B] = [randomUUID(), randomUUID()];

function comoPessoa(pessoa, chave, segurarMs) {
  return `
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${pessoa}', 'role', 'authenticated')::text, true);
select public.enviar_respostas('${lista}', '${chave}', '{"${questao}": "${alternativa}"}');
select pg_sleep(${segurarMs / 1000});
commit;`;
}

async function preparar() {
  const r = await psql(`
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select id, 'concq-' || id || '@exemplo.invalid', jsonb_build_object('nome', 'Pessoa fictícia'),
       'authenticated', 'authenticated'
from unnest(array['${A}'::uuid, '${B}'::uuid]) as id;
insert into public.edicoes (id, nome, estado, regras, regras_versao)
values ('${edicao}', 'Concorrência de questões (fictícia)', 'ativa', '{"quantidadeEncontros": 4}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values ('${curso}', '${edicao}', 'Curso', 'Cat');
insert into public.turmas (id, curso_id, nome) values ('${turma}', '${curso}', 'Turma');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select id, '${edicao}', 'aluno', '${turma}' from unnest(array['${A}'::uuid, '${B}'::uuid]) as id;
insert into public.duplas (id, edicao_id, turma_id, nome) values ('${dupla}', '${edicao}', '${turma}', 'Equipe');
insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id)
select '${dupla}', '${edicao}', id from unnest(array['${A}'::uuid, '${B}'::uuid]) as id;
insert into public.encontros (id, edicao_id, numero, titulo, data) values ('${encontro}', '${edicao}', 1, 'Encontro', current_date);
insert into public.listas_questoes (id, edicao_id, encontro_id, titulo, prazo, estado)
values ('${lista}', '${edicao}', '${encontro}', 'Lista', now() + interval '1 day', 'publicado');
insert into public.lista_turmas (lista_id, turma_id) values ('${lista}', '${turma}');
insert into public.questoes (id, lista_id, ordem, enunciado) values ('${questao}', '${lista}', 1, 'Questão?');
insert into public.alternativas (id, questao_id, ordem, texto, correta) values
  ('${alternativa}', '${questao}', 1, 'Sim', true), (gen_random_uuid(), '${questao}', 2, 'Não', false);
commit;`);
  if (!ok(r)) throw new Error(`Falha ao preparar fixtures: ${r.erro}`);
}

async function limpar() {
  await psql(`
begin;
delete from public.submissoes_questoes where lista_id = '${lista}';
delete from public.listas_questoes where id = '${lista}';
delete from public.encontros where id = '${encontro}';
delete from public.dupla_integrantes where dupla_id = '${dupla}';
delete from public.duplas where id = '${dupla}';
delete from public.edicoes where id = '${edicao}';
delete from auth.users where email like 'concq-%@exemplo.invalid';
commit;`);
}

try {
  await limpar();
  await preparar();
  const primeira = psql(comoPessoa(A, randomUUID(), 1000));
  await esperar(200);
  const segunda = psql(comoPessoa(B, randomUUID(), 0));
  const respostas = await Promise.all([primeira, segunda]);
  const linhas = Number(
    (await psql(`select count(*) from public.submissoes_questoes where lista_id = '${lista}';`)).saida,
  );
  const aprovado = respostas.filter(ok).length === 1 && linhas === 1;
  console.log(
    JSON.stringify(
      { respostas: respostas.map(resumo), submissoesNoBanco: linhas, aprovado },
      null,
      2,
    ),
  );
  process.exitCode = aprovado ? 0 : 1;
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await limpar();
}
