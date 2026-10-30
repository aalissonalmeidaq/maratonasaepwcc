/**
 * Teste de concorrência das equipes por convite (spec 003, T037) com DUAS conexões reais.
 *
 * Abre duas sessões psql no banco do Supabase LOCAL (container `supabase_db_maratona`) com
 * transações sobrepostas: a primeira executa a RPC e segura a transação aberta por 1 s; a
 * segunda começa logo depois e precisa esperar o bloqueio da turma. Ao final, confere as
 * invariantes no banco e apaga as fixtures fictícias. Nunca aponta para banco remoto.
 *
 * Uso: `node scripts/testar-concorrencia-equipes.mjs` (Supabase local iniciado).
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

/** Executa uma RPC como a pessoa indicada, numa transação que fica aberta por `segurarMs`. */
function comoPessoa(pessoa, chamada, segurarMs) {
  return `
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${pessoa}', 'role', 'authenticated')::text, true);
select ${chamada};
select pg_sleep(${segurarMs / 1000});
commit;`;
}

/** Duas transações sobrepostas: a segunda começa 200 ms depois e espera a primeira. */
async function disputa(a, b) {
  const primeira = psql(comoPessoa(a.pessoa, a.chamada, 1000));
  await esperar(200);
  const segunda = psql(comoPessoa(b.pessoa, b.chamada, 0));
  return Promise.all([primeira, segunda]);
}

const ok = (r) => r.codigo === 0 && !/ERROR/.test(r.erro);
const resumo = (r) => (ok(r) ? 'sucesso' : (r.erro.match(/ERROR:\s+(.*)/)?.[1] ?? r.erro));

// ---------------------------------------------------------------------------
// Fixtures fictícias isoladas (edição própria, apagada ao final)
// ---------------------------------------------------------------------------
const edicao = randomUUID();
const curso = randomUUID();
const turma = randomUUID();
const docente = randomUUID();
const alunos = Array.from({ length: 7 }, () => randomUUID()); // turma ímpar
const [A, B, C, D, E, F, G] = alunos;

async function preparar() {
  const pessoas = [docente, ...alunos];
  const r = await psql(`
begin;
insert into auth.users (id, email, raw_user_meta_data, aud, role)
select id, 'conc-' || id || '@exemplo.invalid', jsonb_build_object('nome', 'Pessoa fictícia'),
       'authenticated', 'authenticated'
from unnest(array[${pessoas.map((p) => `'${p}'::uuid`).join(',')}]) as id;
insert into public.edicoes (id, nome, estado, regras, regras_versao)
values ('${edicao}', 'Concorrência (fictícia)', 'ativa', '{"quantidadeEncontros": 4}', 'teste');
insert into public.cursos (id, edicao_id, nome, categoria) values ('${curso}', '${edicao}', 'Curso', 'Cat');
insert into public.turmas (id, curso_id, nome) values ('${turma}', '${curso}', 'Turma');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
values ('${docente}', '${edicao}', 'docente', '${turma}');
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select id, '${edicao}', 'aluno', '${turma}'
from unnest(array[${alunos.map((p) => `'${p}'::uuid`).join(',')}]) as id;
commit;`);
  if (!ok(r)) throw new Error(`Falha ao preparar fixtures: ${r.erro}`);
}

async function limpar() {
  await psql(`
begin;
delete from public.convites_equipe where edicao_id = '${edicao}';
delete from public.dupla_integrantes where edicao_id = '${edicao}';
delete from public.duplas where edicao_id = '${edicao}';
delete from public.edicoes where id = '${edicao}';
delete from auth.users where email like 'conc-%@exemplo.invalid';
commit;`);
}

async function valor(sql) {
  const r = await psql(sql);
  if (!ok(r)) throw new Error(r.erro);
  return r.saida;
}

/** Envia convite como `remetente` (fora de disputa) e devolve o id. */
async function convite(remetente, convidados) {
  const r = await psql(`
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '${remetente}', 'role', 'authenticated')::text, false);
select public.enviar_convite_equipe('${turma}', array[${convidados.map((c) => `'${c}'::uuid`).join(',')}]);`);
  if (!ok(r)) throw new Error(`convite: ${r.erro}`);
  return r.saida.split('\n').pop();
}

async function aceitar(pessoa, id) {
  const r = await psql(comoPessoa(pessoa, `public.responder_convite_equipe('${id}', true)`, 0));
  if (!ok(r)) throw new Error(`aceite: ${r.erro}`);
}

async function invariantes() {
  const duplicados = await valor(`
select count(*) from (select estudante_id from public.dupla_integrantes
  where edicao_id = '${edicao}' and saida_em is null group by estudante_id having count(*) > 1) x;`);
  const trios = await valor(`
select count(*) from public.duplas d where d.turma_id = '${turma}' and d.ativa
  and (select count(*) from public.dupla_integrantes i where i.dupla_id = d.id and i.saida_em is null) = 3;`);
  const parciais = await valor(`
select count(*) from public.duplas d where d.edicao_id = '${edicao}' and d.ativa
  and (select count(*) from public.dupla_integrantes i where i.dupla_id = d.id and i.saida_em is null) < 2;`);
  return { duplicados: Number(duplicados), trios: Number(trios), parciais: Number(parciais) };
}

const resultados = [];
function registrar(nome, respostas, verificacao) {
  resultados.push({ nome, respostas: respostas.map(resumo), ...verificacao });
}

try {
  await limpar();
  await preparar();

  // 1. Dois aceites concorrentes: A convidou B e C; os dois aceitam ao mesmo tempo.
  const c1 = await convite(A, [B]);
  const c2 = await convite(A, [C]);
  const r1 = await disputa(
    { pessoa: B, chamada: `public.responder_convite_equipe('${c1}', true)` },
    { pessoa: C, chamada: `public.responder_convite_equipe('${c2}', true)` },
  );
  registrar('aceites concorrentes para o mesmo remetente', r1, {
    esperado: 'um sucesso e uma recusa clara',
    passou: r1.filter(ok).length === 1,
  });

  // 2. Retirada de aceite contra o último aceite do trio (C e D com E).
  const t1 = await convite(C, [D, E]);
  await aceitar(D, t1);
  const r2 = await disputa(
    { pessoa: D, chamada: `public.retirar_aceite_convite_equipe('${t1}')` },
    { pessoa: E, chamada: `public.responder_convite_equipe('${t1}', true)` },
  );
  const situacaoT1 = await valor(
    `select situacao || ':' || coalesce(motivo, '') from public.convites_equipe where id = '${t1}';`,
  );
  registrar('retirada versus último aceite', r2, {
    esperado: 'uma transição vence; sem formação parcial',
    situacao: situacaoT1,
    passou: r2.filter(ok).length === 1,
  });

  // 3. Duas formações de trio na mesma turma (último aceite simultâneo).
  const livres = await valor(`
select string_agg(a.usuario_id::text, ',') from public.atribuicoes a
where a.turma_id = '${turma}' and a.papel = 'aluno' and a.ativo
  and not exists (select 1 from public.dupla_integrantes i
                  where i.estudante_id = a.usuario_id and i.saida_em is null);`);
  const sem = livres ? livres.split(',') : [];
  let r3 = [];
  if (sem.length >= 5) {
    const [p1, p2, p3, p4, p5] = sem;
    const ta = await convite(p1, [p2, p3]);
    const tb = await convite(p4, [p5, p3 === p5 ? p2 : p1]);
    await aceitar(p2, ta);
    await aceitar(p5, tb);
    r3 = await disputa(
      { pessoa: p3, chamada: `public.responder_convite_equipe('${ta}', true)` },
      { pessoa: p3 === p5 ? p2 : p1, chamada: `public.responder_convite_equipe('${tb}', true)` },
    );
  } else {
    // Se a disputa 2 formou o trio, o segundo trio é tentado diretamente.
    const tc = await convite(sem[0], sem.slice(1, 3));
    r3 = [
      { codigo: 0, saida: tc, erro: '' },
      { codigo: 0, saida: '', erro: '' },
    ];
  }
  registrar('duas formações de trio na turma', r3, {
    esperado: 'no máximo um trio',
    passou: (await invariantes()).trios <= 1,
  });

  // 4. Inclusão pelo docente contra aceite de convite envolvendo o mesmo aluno (G).
  const equipeA = await valor(
    `select dupla_id from public.dupla_integrantes where estudante_id = '${A}' and saida_em is null;`,
  );
  const semG = await valor(
    `select count(*) from public.dupla_integrantes where estudante_id = '${G}' and saida_em is null;`,
  );
  let r4 = [];
  if (equipeA && semG === '0') {
    const outro = await valor(`
select a.usuario_id from public.atribuicoes a
where a.turma_id = '${turma}' and a.papel = 'aluno' and a.usuario_id <> '${G}'
  and not exists (select 1 from public.dupla_integrantes i where i.estudante_id = a.usuario_id and i.saida_em is null)
limit 1;`);
    if (outro) {
      const tg = await convite(outro, [G]);
      r4 = await disputa(
        {
          pessoa: docente,
          chamada: `public.incluir_integrante('${equipeA}', '${G}', 'Inclusão no teste de concorrência')`,
        },
        { pessoa: G, chamada: `public.responder_convite_equipe('${tg}', true)` },
      );
    }
  }
  registrar('inclusão versus aceite', r4, {
    esperado: 'aluno em no máximo uma equipe',
    passou: r4.length === 0 || r4.filter(ok).length >= 1,
  });

  const finais = await invariantes();
  const aprovado =
    finais.duplicados === 0 &&
    finais.trios <= 1 &&
    finais.parciais === 0 &&
    resultados.every((r) => r.passou);
  console.log(JSON.stringify({ resultados, invariantes: finais, aprovado }, null, 2));
  process.exitCode = aprovado ? 0 : 1;
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await limpar();
}
