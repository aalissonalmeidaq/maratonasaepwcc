/**
 * Teste de concorrência da gestão de edições (spec 010, T039, SC-004) com DUAS conexões reais ao
 * banco do Supabase LOCAL (container `supabase_db_maratona`).
 *
 * 1. Duas `criar_edicao` com a mesma chave ao mesmo tempo → uma edição.
 * 2. Dois `vincular_turmas` simultâneos da mesma turma do cadastro → uma turma na edição.
 * 3. `vincular_mentor_ao_curso` simultâneo a `vincular_turmas` de outra turma do curso → a linha
 *    derivada do mentor existe nas duas turmas.
 * 4. Dois `ativar_edicao` e dois `encerrar_edicao` simultâneos → uma transição e um registro de
 *    auditoria cada.
 * A primeira transação de cada par segura a trava por 1 s; a segunda espera. Apaga as fixtures
 * fictícias ao final.
 *
 * Uso: `node scripts/testar-concorrencia-edicoes.mjs` (Supabase local iniciado).
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
const numero = async (sql) => Number((await psql(sql)).saida);

const base = randomUUID(); // edição já existente que a coordenação fictícia coordena
const coord = randomUUID();
const mentor = randomUUID();
const chave = randomUUID();
const cursoCad = randomUUID();
const turmas = [randomUUID(), randomUUID()];
let edicao = '';

const comoCoordenacao = `set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${coord}', 'role', 'authenticated')::text, true);`;

const emTransacao = (comando, segurarMs) => `
begin;
${comoCoordenacao}
${comando}
select pg_sleep(${segurarMs / 1000});
commit;`;

async function par(comando) {
  const p1 = psql(emTransacao(comando, 1000));
  await esperar(200);
  const p2 = psql(emTransacao(comando, 0));
  return Promise.all([p1, p2]);
}

async function preparar() {
  const r = await psql(`
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('${coord}', 'conce-${coord}@exemplo.invalid', '{"nome": "Coordenação fictícia"}', 'authenticated', 'authenticated'),
  ('${mentor}', 'conce-${mentor}@exemplo.invalid', '{"nome": "Mentor fictício"}', 'authenticated', 'authenticated');
insert into public.edicoes (id, nome, estado, regras, regras_versao)
values ('${base}', 'Concorrência das edições (fictícia)', 'ativa', '{"versao":"teste","quantidadeEncontros":4}', 'teste');
insert into public.atribuicoes (usuario_id, edicao_id, papel) values ('${coord}', '${base}', 'coordenacao');
insert into public.cadastro_cursos (id, nome, categoria) values ('${cursoCad}', 'Curso concorrência ${cursoCad}', 'Cat');
insert into public.cadastro_turmas (id, cadastro_curso_id, nome) values
  ('${turmas[0]}', '${cursoCad}', 'T1'), ('${turmas[1]}', '${cursoCad}', 'T2');
commit;`);
  if (!ok(r)) throw new Error(`Falha ao preparar fixtures: ${r.erro}`);
}

async function limpar() {
  await psql(`
begin;
set local session_replication_role = replica;
delete from public.atribuicoes where usuario_id in ('${coord}', '${mentor}');
delete from public.turmas where cadastro_turma_id in ('${turmas[0]}', '${turmas[1]}');
delete from public.cursos where cadastro_curso_id = '${cursoCad}';
delete from public.edicoes where id = '${base}' or chave_envio = '${chave}';
delete from public.cadastro_turmas where cadastro_curso_id = '${cursoCad}';
delete from public.cadastro_cursos where id = '${cursoCad}';
delete from auth.users where email like 'conce-%@exemplo.invalid';
commit;`);
}

try {
  await limpar();
  await preparar();

  const criacoes = await par(
    `select public.criar_edicao('${chave}', 'Edição concorrente', '2031-03-01', '2031-11-30', null);`,
  );
  const edicoes = await numero(`select count(*) from public.edicoes where chave_envio = '${chave}';`);
  edicao = (await psql(`select id from public.edicoes where chave_envio = '${chave}';`)).saida;

  const vinculos = await par(`select public.vincular_turmas('${edicao}', array['${turmas[0]}']::uuid[]);`);
  const turmasNaEdicao = await numero(
    `select count(*) from public.turmas where cadastro_turma_id = '${turmas[0]}';`,
  );

  const cursoNaEdicao = (
    await psql(`select id from public.cursos where edicao_id = '${edicao}' and cadastro_curso_id = '${cursoCad}';`)
  ).saida;
  const m1 = psql(emTransacao(`select public.vincular_mentor_ao_curso('${cursoNaEdicao}', '${mentor}');`, 1000));
  await esperar(200);
  const m2 = psql(emTransacao(`select public.vincular_turmas('${edicao}', array['${turmas[1]}']::uuid[]);`, 0));
  const mentorETurma = await Promise.all([m1, m2]);
  const derivadas = await numero(
    `select count(*) from public.atribuicoes where usuario_id = '${mentor}' and turma_id is not null and ativo;`,
  );

  const ativacoes = await par(`select public.ativar_edicao('${edicao}');`);
  const audAtivacao = await numero(
    `select count(*) from public.auditoria where tabela = 'edicoes' and registro_id = '${edicao}'
       and antes ->> 'estado' = 'rascunho' and depois ->> 'estado' = 'ativa';`,
  );
  const encerramentos = await par(`select public.encerrar_edicao('${edicao}', 'Encerramento simultâneo do teste.');`);
  const audEncerramento = await numero(
    `select count(*) from public.auditoria where tabela = 'edicoes' and registro_id = '${edicao}'
       and antes ->> 'estado' = 'ativa' and depois ->> 'estado' = 'encerrada';`,
  );

  const aprovado =
    [...criacoes, ...vinculos, ...mentorETurma, ...ativacoes, ...encerramentos].every(ok) &&
    edicoes === 1 &&
    turmasNaEdicao === 1 &&
    derivadas === 2 &&
    audAtivacao === 1 &&
    audEncerramento === 1;
  console.log(
    JSON.stringify(
      {
        criacoes: criacoes.map(resumo),
        edicoes,
        vinculos: vinculos.map(resumo),
        turmasNaEdicao,
        mentorETurma: mentorETurma.map(resumo),
        derivadas,
        ativacoes: ativacoes.map(resumo),
        audAtivacao,
        encerramentos: encerramentos.map(resumo),
        audEncerramento,
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
