/**
 * Gera os ícones da Maratona SAEP como arquivos .svg independentes e uma galeria para revisão.
 * Fonte única: src/shared/ui/icones/dados.ts. Uso: `npm run icones`.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CORES_DE_ACENTO,
  ICONES,
  svgIndependente,
  type IdIcone,
} from '../src/shared/ui/icones/dados.ts';

const raiz = resolve(import.meta.dirname, '..');
const pasta = resolve(raiz, 'docs/icones/svg');
mkdirSync(pasta, { recursive: true });
for (const arquivo of readdirSync(pasta)) rmSync(resolve(pasta, arquivo));

const ids = Object.keys(ICONES) as IdIcone[];
for (const id of ids) writeFileSync(resolve(pasta, `${id}.svg`), svgIndependente(id));

const celula = (id: IdIcone) => {
  const { rotulo, acento } = ICONES[id];
  return `<figure><img src="svg/${id}.svg" width="48" height="48" alt=""><figcaption>${rotulo}<code>${id}</code><span style="--c:${CORES_DE_ACENTO[acento]}">${acento}</span></figcaption></figure>`;
};

writeFileSync(
  resolve(raiz, 'docs/icones/galeria.html'),
  `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ícones da Maratona SAEP</title>
<style>
  body { margin: 0; padding: 24px; background: #F7F9FC; color: #062457; font-family: Montserrat, Arial, sans-serif; }
  h1 { margin: 0 0 4px; } p { margin: 0 0 24px; color: #33465F; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 12px; }
  figure { margin: 0; padding: 16px 8px; background: #fff; border: 1px solid #DCE5EF; border-radius: 14px; text-align: center; }
  figcaption { display: grid; gap: 2px; margin-top: 8px; font-size: 13px; font-weight: 600; }
  code { font-size: 11px; color: #66768A; font-weight: 400; }
  span { font-size: 11px; font-weight: 500; color: #33465F; }
  span::before { content: ''; display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50%; background: var(--c); }
</style>
</head>
<body>
<h1>Ícones da Maratona SAEP</h1>
<p>${ids.length} ícones vetorizados a partir da prancha oficial — versão para validação pela unidade.
Gerado por <code>npm run icones</code>; não edite à mão.</p>
<main>
${ids.map(celula).join('\n')}
</main>
</body>
</html>
`,
);

console.log(
  `${ids.length} ícones gerados em docs/icones/svg e galeria em docs/icones/galeria.html`,
);
