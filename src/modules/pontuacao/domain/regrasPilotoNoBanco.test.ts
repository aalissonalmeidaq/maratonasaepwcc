// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REGRAS_PILOTO } from './regras-piloto';

const raiz = new URL('../../../../supabase/', import.meta.url);

/** Primeiro JSON entre aspas simples que começa pela versão do piloto. */
function jsonDoPiloto(sql: string): unknown {
  const m = /'(\{"versao":"piloto-[^']*)'/.exec(sql);
  if (!m?.[1]) throw new Error('JSON das regras do piloto não encontrado.');
  return JSON.parse(m[1]);
}

describe('regras do piloto copiadas no banco (spec 010, T009)', () => {
  it('o seed tem a mesma cópia de REGRAS_PILOTO', () => {
    expect(jsonDoPiloto(readFileSync(new URL('seed.sql', raiz), 'utf8'))).toEqual(REGRAS_PILOTO);
  });

  it('app.regras_piloto() da migration de gestão de edições é a mesma cópia', () => {
    const arquivo = readdirSync(new URL('migrations/', raiz)).find((n) =>
      n.endsWith('_gestao_edicoes.sql'),
    );
    expect(arquivo).toBeDefined();
    const sql = readFileSync(new URL(`migrations/${arquivo}`, raiz), 'utf8');
    expect(jsonDoPiloto(sql.slice(sql.indexOf('create function app.regras_piloto()')))).toEqual(
      REGRAS_PILOTO,
    );
  });
});
