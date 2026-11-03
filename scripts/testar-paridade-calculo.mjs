/**
 * Paridade entre o cálculo do núcleo TS e o cálculo oficial do servidor (spec 007, R2, SC-001).
 *
 * Lê os casos de contrato compartilhados (`casos-contrato.json` e `casos-ranking.json`), envia
 * cada um a `app.calcular_encontro` e `app.classificar` no banco do Supabase LOCAL (container
 * `supabase_db_maratona`, como `postgres`) e compara com o esperado — o mesmo esperado que o
 * Vitest confere contra `calcularEncontro` e `classificar`. As regras "piloto" são lidas do
 * arquivo de regras do seed, idêntico a `REGRAS_PILOTO`. Casos com `ajustes` (spec 011: versão nova
 * da edição ou ajuste de turma) usam `regras || ajustes`, a mesma combinação de `app.regras_vigentes`.
 *
 * Uso: `node scripts/testar-paridade-calculo.mjs` (Supabase local iniciado).
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CONTAINER = 'supabase_db_maratona';
const raiz = new URL('../src/modules/pontuacao/domain/', import.meta.url);
const casosEncontro = JSON.parse(readFileSync(new URL('casos-contrato.json', raiz), 'utf8')).casos;
const casosRanking = JSON.parse(readFileSync(new URL('casos-ranking.json', raiz), 'utf8')).casos;

function psql(sql) {
  return new Promise((resolve) => {
    const p = spawn(
      'docker',
      ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-At', '-q', '-v', 'ON_ERROR_STOP=1'],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    let saida = '';
    let erro = '';
    p.stdout.on('data', (d) => (saida += d));
    p.stderr.on('data', (d) => (erro += d));
    p.on('close', (codigo) => resolve({ codigo, saida: saida.trim(), erro: erro.trim() }));
    p.stdin.end(sql);
  });
}

const literal = (v) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;

/** Igualdade estrutural com tolerância numérica de arredondamento (duas casas). */
function iguais(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((x, i) => iguais(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return iguais(ka, kb) && ka.every((k) => iguais(a[k], b[k]));
  }
  return a === b;
}

const regrasPiloto = await psql(
  // Versão inicial (spec 011): a mesma mesmo depois de versões novas gravadas pelos E2E.
  "select v.regras from public.versoes_regras v join public.edicoes e on e.id = v.edicao_id where v.vale_desde = '-infinity' and v.rotulo like 'piloto-2026.0-a-confirmar%' order by e.criado_em limit 1;",
);
if (regrasPiloto.codigo !== 0 || !regrasPiloto.saida) {
  console.error('Não foi possível ler as regras do piloto no seed local:', regrasPiloto.erro);
  process.exit(1);
}
const regras = JSON.parse(regrasPiloto.saida);

const falhas = [];
for (const caso of casosEncontro) {
  const r = await psql(
    `select app.calcular_encontro(${literal(caso.lancamentos)}, ${literal(regras)} || ${literal(caso.ajustes ?? {})});`,
  );
  const obtido = r.codigo === 0 ? JSON.parse(r.saida) : { erro: r.erro };
  if (!iguais(obtido, caso.esperado))
    falhas.push({ caso: caso.nome, esperado: caso.esperado, obtido });
}
for (const caso of casosRanking) {
  const r = await psql(`select app.classificar(${literal(caso.equipes)});`);
  const obtido =
    r.codigo === 0
      ? JSON.parse(r.saida).map(({ duplaId, posicao, compartilhada }) => ({
          duplaId,
          posicao,
          compartilhada,
        }))
      : { erro: r.erro };
  if (!iguais(obtido, caso.esperado))
    falhas.push({ caso: caso.nome, esperado: caso.esperado, obtido });
}

// Spec 010: as regras do piloto usadas na criação de edições são as mesmas do seed.
const piloto = await psql('select app.regras_piloto();');
const regrasDaFuncao = piloto.codigo === 0 ? JSON.parse(piloto.saida) : { erro: piloto.erro };
if (!iguais(regrasDaFuncao, regras))
  falhas.push({
    caso: 'app.regras_piloto() igual às regras do seed',
    esperado: regras,
    obtido: regrasDaFuncao,
  });

const total = casosEncontro.length + casosRanking.length + 1;
console.log(JSON.stringify({ casos: total, divergencias: falhas.length, falhas }, null, 2));
process.exitCode = falhas.length === 0 ? 0 : 1;
