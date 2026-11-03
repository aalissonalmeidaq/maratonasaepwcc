/**
 * Teste de concorrência das regras (spec 011, T030, FR-003) com DUAS conexões reais ao banco do
 * Supabase LOCAL (container `supabase_db_maratona`).
 *
 * 1. Duas `gravar_regras` sobre a mesma versão carregada → uma versão nova e uma recusa.
 * 2. `gravar_ajustes_turma` da coordenação e do mentor sobre o mesmo ajuste → um ajuste e uma
 *    recusa.
 * A primeira transação de cada par segura a trava por 1 s; a segunda espera e encontra a base
 * mudada. Apaga as fixtures fictícias ao final.
 *
 * Uso: `node scripts/testar-concorrencia-regras.mjs` (Supabase local iniciado).
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

const edicao = randomUUID();
const curso = randomUUID();
const turma = randomUUID();
const coord = randomUUID();
const mentor = randomUUID();
const RECUSA = 'As regras mudaram desde que você abriu a tela; recarregue.';

const emTransacao = (usuario, comando, segurarMs) => `
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${usuario}', 'role', 'authenticated')::text, true);
${comando}
select pg_sleep(${segurarMs / 1000});
commit;`;

async function par([u1, c1], [u2, c2]) {
  const p1 = psql(emTransacao(u1, c1, 1000));
  await esperar(200);
  const p2 = psql(emTransacao(u2, c2, 0));
  return Promise.all([p1, p2]);
}

async function preparar() {
  const r = await psql(`
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role) values
  ('${coord}', 'concr-${coord}@exemplo.invalid', '{"nome": "Coordenação fictícia"}', 'authenticated', 'authenticated'),
  ('${mentor}', 'concr-${mentor}@exemplo.invalid', '{"nome": "Mentor fictício"}', 'authenticated', 'authenticated');
insert into public.edicoes (id, nome, estado, regras, regras_versao)
values ('${edicao}', 'Concorrência das regras (fictícia)', 'ativa', app.regras_piloto(), app.regras_piloto() ->> 'versao');
insert into public.cursos (id, edicao_id, nome, categoria) values ('${curso}', '${edicao}', 'Curso fictício', 'Cat');
insert into public.turmas (id, curso_id, nome) values ('${turma}', '${curso}', 'Turma fictícia');
insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id) values
  ('${coord}', '${edicao}', 'coordenacao', null),
  ('${mentor}', '${edicao}', 'mentor', '${curso}');
commit;`);
  if (!ok(r)) throw new Error(`Falha ao preparar fixtures: ${r.erro}`);
}

async function limpar() {
  await psql(`
begin;
set local session_replication_role = replica;
delete from public.ajustes_regras_turma where turma_id = '${turma}';
delete from public.versoes_regras where edicao_id = '${edicao}';
delete from public.atribuicoes where edicao_id = '${edicao}';
delete from public.turmas where id = '${turma}';
delete from public.cursos where id = '${curso}';
delete from public.edicoes where id = '${edicao}';
delete from auth.users where email like 'concr-%@exemplo.invalid';
commit;`);
}

const gravarRegras = (rotulo) =>
  `select public.gravar_regras('${edicao}', app.regras_piloto() ->> 'versao', '${rotulo}',
     jsonb_set(app.regras_piloto(), '{questoes,maximo}', '25'), 'Gravação simultânea do teste.');`;
const gravarAjuste = (grupo) =>
  `select public.gravar_ajustes_turma('${turma}', null,
     jsonb_build_object('${grupo}', app.regras_piloto() -> '${grupo}'), 'Ajuste simultâneo do teste.');`;

try {
  await limpar();
  await preparar();

  const regras = await par(
    [coord, gravarRegras('concorrente-1')],
    [coord, gravarRegras('concorrente-2')],
  );
  const versoes = await numero(
    `select count(*) from public.versoes_regras where edicao_id = '${edicao}';`,
  );

  const ajustes = await par(
    [coord, gravarAjuste('penalidades')],
    [mentor, gravarAjuste('apresentacao')],
  );
  const linhas = await numero(
    `select count(*) from public.ajustes_regras_turma where turma_id = '${turma}';`,
  );

  const umaRecusa = (rs) => rs.filter(ok).length === 1 && rs.some((r) => r.erro.includes(RECUSA));
  const aprovado = umaRecusa(regras) && versoes === 2 && umaRecusa(ajustes) && linhas === 1;
  console.log(
    JSON.stringify(
      {
        regras: regras.map(resumo),
        versoes,
        ajustes: ajustes.map(resumo),
        ajustesGravados: linhas,
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
