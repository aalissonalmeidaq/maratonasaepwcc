/** "1 equipe", "3 equipes". */
export const plural = (n: number, singular: string, varios: string) =>
  `${n} ${n === 1 ? singular : varios}`;
