/** "1 equipe", "3 equipes". */
export const plural = (n: number, singular: string, varios: string) =>
  `${n} ${n === 1 ? singular : varios}`;

const TRATAMENTOS = /^(prof(a|essora?)?|dr(a)?|sr(a)?)\.?$/i;

/** Primeiro nome para a saudação: sem tratamento ("Profa.") nem complemento após "—". */
export function nomeDeSaudacao(nome: string): string {
  const palavras = (nome.split(/\s+[—–-]\s+/)[0] ?? '').trim().split(/\s+/).filter(Boolean);
  const primeiro = palavras.find((p) => !TRATAMENTOS.test(p)) ?? palavras[0] ?? '';
  return primeiro.replace(/[(),]/g, '');
}
