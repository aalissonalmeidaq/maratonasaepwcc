/**
 * Gera os padrões gráficos da Maratona SAEP como .svg independentes e uma galeria para revisão.
 * Fonte única: src/shared/ui/padroes/dados.ts. Uso: `npm run padroes`.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GRADIENTES, PADROES, svgDoPadrao, type IdPadrao } from '../src/shared/ui/padroes/dados.ts';

const raiz = resolve(import.meta.dirname, '..');
const pasta = resolve(raiz, 'docs/padroes/svg');
mkdirSync(pasta, { recursive: true });
for (const arquivo of readdirSync(pasta)) rmSync(resolve(pasta, arquivo));

const ids = Object.keys(PADROES) as IdPadrao[];
for (const id of ids) writeFileSync(resolve(pasta, `${id}.svg`), svgDoPadrao(id, id));

const cartao = (id: IdPadrao) => {
  const { rotulo, descricao } = PADROES[id];
  return `<figure><div class="amostra"><img src="svg/${id}.svg" alt=""></div><figcaption><strong>${rotulo}</strong><span>${descricao}</span><code>${id}.svg</code></figcaption></figure>`;
};

const gradiente = (nome: keyof typeof GRADIENTES) =>
  `<figure><div class="amostra" style="background:${GRADIENTES[nome]}"></div><figcaption><strong>Gradiente ${nome}</strong><code>${GRADIENTES[nome]}</code></figcaption></figure>`;

writeFileSync(
  resolve(raiz, 'docs/padroes/galeria.html'),
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Padrões gráficos da Maratona SAEP</title>
<style>
  body { margin: 0; padding: 24px; background: #F7F9FC; color: #0B2D6B; font-family: Montserrat, Arial, sans-serif; }
  h1 { margin: 0 0 4px; } p { margin: 0 0 24px; color: #33465F; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  figure { margin: 0; background: #fff; border: 1px solid #E6EBF2; border-radius: 16px; overflow: hidden; }
  .amostra { position: relative; height: 160px; overflow: hidden; background: #fff; }
  .amostra img { position: absolute; inset: 12px; width: calc(100% - 24px); height: calc(100% - 24px); object-fit: contain; }
  figcaption { display: grid; gap: 4px; padding: 12px 16px; font-size: 13px; }
  figcaption span { color: #33465F; } code { font-size: 11px; color: #66768A; }
</style>
</head>
<body>
<h1>Padrões gráficos da Maratona SAEP</h1>
<p>Recriação vetorial da prancha 08 — versão para validação pela unidade. Gerado por <code>npm run padroes</code>; não edite à mão.</p>
<main>
${ids.map(cartao).join('\n')}
${gradiente('marca')}
${gradiente('suave')}
${gradiente('escuro')}
</main>
</body>
</html>
`,
);

console.log(
  `${ids.length} padrões gerados em docs/padroes/svg e galeria em docs/padroes/galeria.html`,
);
