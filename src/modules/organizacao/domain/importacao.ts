/**
 * Leitura do CSV de alunos para a importação (spec 002, FR-015). Roda no navegador para a
 * prévia; o servidor revalida tudo antes de gravar.
 */

export const LIMITE_DE_LINHAS = 500;

export interface LinhaDeImportacao {
  /** Número da linha no arquivo original (1 = primeira linha, inclusive o cabeçalho). */
  linha: number;
  nome: string;
  email: string;
}

export interface RecusaDeImportacao {
  linha: number;
  conteudo: string;
  motivo: string;
}

export type ResultadoDaLeitura =
  | { ok: true; validas: LinhaDeImportacao[]; recusadas: RecusaDeImportacao[] }
  | { ok: false; erro: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** Conta ocorrências fora de aspas, para escolher o separador pela primeira linha. */
function contarForaDeAspas(linha: string, caractere: string): number {
  let dentro = false;
  let total = 0;
  for (const c of linha) {
    if (c === '"') dentro = !dentro;
    else if (c === caractere && !dentro) total++;
  }
  return total;
}

/** Separa os campos de uma linha respeitando aspas ("" dentro de aspas vira "). */
function separarCampos(linha: string, separador: string): string[] {
  const campos: string[] = [];
  let atual = '';
  let dentro = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (dentro) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') dentro = false;
      else atual += c;
    } else if (c === '"') dentro = true;
    else if (c === separador) {
      campos.push(atual);
      atual = '';
    } else atual += c;
  }
  campos.push(atual);
  return campos.map((c) => c.trim());
}

export function lerCsvDeAlunos(texto: string): ResultadoDaLeitura {
  const linhas = texto
    .replace(/^\uFEFF/, '') // BOM do UTF-8
    .split(/\r?\n/)
    .map((conteudo, i) => ({ numero: i + 1, conteudo: conteudo.trim() }))
    .filter((l) => l.conteudo !== '');
  if (linhas.length === 0) return { ok: false, erro: 'O arquivo não tem nenhum aluno.' };

  const primeira = linhas[0]!.conteudo;
  const separador = contarForaDeAspas(primeira, ';') > contarForaDeAspas(primeira, ',') ? ';' : ',';

  let colunaNome = 0;
  let colunaEmail = 1;
  const cabecalho = separarCampos(primeira, separador).map(normalizar);
  const temCabecalho = cabecalho.includes('nome') && cabecalho.includes('email');
  if (temCabecalho) {
    colunaNome = cabecalho.indexOf('nome');
    colunaEmail = cabecalho.indexOf('email');
  }
  const dados = temCabecalho ? linhas.slice(1) : linhas;
  if (dados.length === 0) return { ok: false, erro: 'O arquivo não tem nenhum aluno.' };
  if (dados.length > LIMITE_DE_LINHAS) {
    return {
      ok: false,
      erro: `O arquivo tem mais de ${LIMITE_DE_LINHAS} alunos. Divida em arquivos menores.`,
    };
  }

  const validas: LinhaDeImportacao[] = [];
  const recusadas: RecusaDeImportacao[] = [];
  const vistos = new Map<string, number>();
  for (const { numero, conteudo } of dados) {
    const campos = separarCampos(conteudo, separador);
    const recusar = (motivo: string) => recusadas.push({ linha: numero, conteudo, motivo });
    if (campos.length < 2) {
      recusar('A linha precisa ter nome e e-mail.');
      continue;
    }
    const nome = (campos[colunaNome] ?? '').replace(/\s+/g, ' ');
    const email = (campos[colunaEmail] ?? '').toLowerCase();
    if (!EMAIL.test(email)) recusar('E-mail inválido.');
    else if (nome.length < 2 || nome.length > 160)
      recusar('O nome deve ter de 2 a 160 caracteres.');
    else if (vistos.has(email)) recusar(`E-mail repetido no arquivo (linha ${vistos.get(email)}).`);
    else {
      vistos.set(email, numero);
      validas.push({ linha: numero, nome, email });
    }
  }
  return { ok: true, validas, recusadas };
}
