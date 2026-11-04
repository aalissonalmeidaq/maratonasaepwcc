/**
 * Teste de concorrência da publicação do ranking por turma (specs 007 e 012, FR-006) com DUAS
 * conexões reais ao banco do Supabase LOCAL (container `supabase_db_maratona`).
 *
 * A coordenação publica a mesma turma duas vezes ao mesmo tempo, as duas sobre a mesma versão
 * (nenhuma publicação ainda): a primeira transação segura a trava da turma por 1 s; a segunda
 * começa logo depois e precisa esperar. Esperado: uma versão (1) e uma recusa com "recarregue",
 * sem número de versão repetido. Apaga as fixtures fictícias ao final.
 *
 * Uso: `node scripts/testar-concorrencia-publicacao.mjs` (Supabase local iniciado).
 */
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

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

// Regras do piloto: as mesmas do seed (cópia de REGRAS_PILOTO).
const seed = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
const regras = /'(\{"versao":"piloto[^']+)'/.exec(seed)?.[1];
if (!regras) throw new Error('Regras do piloto não encontradas no seed.');

const edicao = randomUUID();
const curso = randomUUID();
const turma = randomUUID();
const dupla = randomUUID();
const coord = randomUUID();
const CATEGORIA = 'Categoria fictícia de concorrência';

function publicar(estado, segurarMs) {
  return `
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${coord}', 'role', 'authenticated')::text, true);
select public.publicar_ranking_turmas('${edicao}', '[{"turmaId": "${turma}", "versaoBase": null}]', '${estado}',
  'Publicação simultânea do teste de concorrência.') -> 0;
select pg_sleep(${segurarMs / 1000});
commit;`;
}

async function preparar() {
  const r = await psql(`
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role)
values ('${coord}', 'concp-${coord}@exemplo.invalid', '{"nome": "Coordenação fictícia"}', 'authenticated', 'authenticated');
insert into public.edicoes (id, nome, estado, regras, regras_versao)
values ('${edicao}', 'Concorrência da publicação (fictícia)', 'ativa', '${regras}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values ('${curso}', '${edicao}', 'Curso', '${CATEGORIA}');
insert into public.turmas (id, curso_id, nome) values ('${turma}', '${curso}', 'Turma');
insert into public.atribuicoes (usuario_id, edicao_id, papel) values ('${coord}', '${edicao}', 'coordenacao');
insert into public.duplas (id, edicao_id, turma_id, nome) values ('${dupla}', '${edicao}', '${turma}', 'Equipe');
commit;`);
  if (!ok(r)) throw new Error(`Falha ao preparar fixtures: ${r.erro}`);
}

async function limpar() {
  // Publicações são imutáveis: a limpeza desliga os gatilhos só nesta sessão de manutenção.
  await psql(`
begin;
set local session_replication_role = replica;
delete from public.avisos where referencia ->> 'turmaId' = '${turma}';
delete from public.publicacao_posicoes where publicacao_id in (select id from public.publicacoes_ranking where edicao_id = '${edicao}');
delete from public.publicacoes_ranking where edicao_id = '${edicao}';
delete from public.duplas where id = '${dupla}';
delete from public.atribuicoes where edicao_id = '${edicao}';
delete from public.turmas where id = '${turma}';
delete from public.cursos where id = '${curso}';
delete from public.edicoes where id = '${edicao}';
delete from auth.users where email like 'concp-%@exemplo.invalid';
commit;`);
}

try {
  await limpar();
  await preparar();
  const primeira = psql(publicar('provisorio', 1000));
  await esperar(200);
  const segunda = psql(publicar('parcial', 0));
  const respostas = await Promise.all([primeira, segunda]);
  const versoes = (
    await psql(
      `select string_agg(versao::text, ',' order by versao) from public.publicacoes_ranking where edicao_id = '${edicao}';`,
    )
  ).saida;
  // A saída traz também as linhas de `set_config` e `pg_sleep`: vale a do resultado da turma.
  const resultado = (r) =>
    r.saida
      .split(String.fromCharCode(10))
      .filter((l) => l.includes('"publicada"'))
      .map((l) => JSON.parse(l))[0] ?? null;
  const turmas = respostas.map((r) => (ok(r) ? resultado(r) : null));
  const publicadas = turmas.filter((t) => t?.publicada).length;
  const recusa = turmas.find((t) => t && !t.publicada)?.motivo ?? null;
  const aprovado =
    respostas.every(ok) && versoes === '1' && publicadas === 1 && /recarregue/.test(recusa ?? '');
  console.log(
    JSON.stringify({ respostas: respostas.map(resumo), versoes, recusa, aprovado }, null, 2),
  );
  process.exitCode = aprovado ? 0 : 1;
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await limpar();
}
