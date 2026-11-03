/**
 * Teste de concorrência dos comunicados (spec 009, T025, SC-003) com DUAS conexões reais ao banco
 * do Supabase LOCAL (container `supabase_db_maratona`).
 *
 * 1. A coordenação publica o mesmo rascunho duas vezes ao mesmo tempo: a primeira transação segura
 *    a trava do comunicado por 1 s; a segunda espera e encontra o comunicado já publicado.
 *    Esperado: as duas aceitas e um só aviso "comunicado_publicado" por estudante.
 * 2. A mesma correção chega duas vezes ao mesmo tempo (reenvio). Esperado: versão 2 e um só aviso
 *    "comunicado_atualizado" por estudante.
 * Apaga as fixtures fictícias ao final.
 *
 * Uso: `node scripts/testar-concorrencia-comunicados.mjs` (Supabase local iniciado).
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
const coord = randomUUID();
const alunos = [randomUUID(), randomUUID()];
const chave = randomUUID();
/** Id real do comunicado, lido depois do preparo. */
let comunicado = '';

const comoCoordenacao = `set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${coord}', 'role', 'authenticated')::text, true);`;

const emTransacao = (comando, segurarMs) => `
begin;
${comoCoordenacao}
${comando}
select pg_sleep(${segurarMs / 1000});
commit;`;

const contarAvisos = async (tipo) =>
  Number(
    (
      await psql(
        `select count(*) from public.avisos where tipo = '${tipo}' and referencia ->> 'comunicadoId' = '${comunicado}';`,
      )
    ).saida,
  );

async function preparar() {
  const pessoas = [coord, ...alunos]
    .map(
      (id, i) =>
        `('${id}', 'concc-${id}@exemplo.invalid', '{"nome": "Pessoa fictícia ${i}"}', 'authenticated', 'authenticated')`,
    )
    .join(',\n');
  const r = await psql(`
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values ${pessoas};
insert into public.edicoes (id, nome, estado, regras, regras_versao)
values ('${edicao}', 'Concorrência dos comunicados (fictícia)', 'ativa', '{"versao":"teste","quantidadeEncontros":4}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values ('${curso}', '${edicao}', 'Curso', 'Categoria fictícia');
insert into public.turmas (id, curso_id, nome) values ('${turma}', '${curso}', 'Turma');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  ('${coord}', '${edicao}', 'coordenacao', null),
  ('${alunos[0]}', '${edicao}', 'aluno', '${turma}'),
  ('${alunos[1]}', '${edicao}', 'aluno', '${turma}');
${comoCoordenacao}
select public.salvar_comunicado('${chave}', null, '${edicao}', 'Comunicado simultâneo',
  'Texto fictício.', 'estudantes', array['${turma}']::uuid[]);
commit;`);
  if (!ok(r)) throw new Error(`Falha ao preparar fixtures: ${r.erro}`);
  comunicado = (await psql(`select id from public.comunicados where chave_envio = '${chave}';`))
    .saida;
}

async function limpar() {
  await psql(`
begin;
set local session_replication_role = replica;
delete from public.avisos where referencia ->> 'comunicadoId' in
  (select id::text from public.comunicados where edicao_id = '${edicao}');
delete from public.comunicado_turmas where comunicado_id in
  (select id from public.comunicados where edicao_id = '${edicao}');
delete from public.comunicados where edicao_id = '${edicao}';
delete from public.atribuicoes where edicao_id = '${edicao}';
delete from public.turmas where id = '${turma}';
delete from public.cursos where id = '${curso}';
delete from public.edicoes where id = '${edicao}';
delete from auth.users where email like 'concc-%@exemplo.invalid';
commit;`);
}

try {
  await limpar();
  await preparar();

  const publicar = `select public.publicar_comunicado('${comunicado}');`;
  const p1 = psql(emTransacao(publicar, 1000));
  await esperar(200);
  const p2 = psql(emTransacao(publicar, 0));
  const publicacoes = await Promise.all([p1, p2]);
  const avisosPublicacao = await contarAvisos('comunicado_publicado');

  const corrigir = `select public.corrigir_comunicado('${comunicado}', 'Comunicado simultâneo',
    'Texto fictício corrigido.', 'Correção enviada duas vezes no teste.');`;
  const c1 = psql(emTransacao(corrigir, 1000));
  await esperar(200);
  const c2 = psql(emTransacao(corrigir, 0));
  const correcoes = await Promise.all([c1, c2]);
  const avisosCorrecao = await contarAvisos('comunicado_atualizado');
  const versao = (await psql(`select versao from public.comunicados where id = '${comunicado}';`))
    .saida;

  const aprovado =
    [...publicacoes, ...correcoes].every(ok) &&
    avisosPublicacao === alunos.length &&
    avisosCorrecao === alunos.length &&
    versao === '2';
  console.log(
    JSON.stringify(
      {
        publicacoes: publicacoes.map(resumo),
        avisosPublicacao,
        correcoes: correcoes.map(resumo),
        avisosCorrecao,
        versao,
        aprovado,
      },
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
