/** Dados fictícios, exclusivos dos testes da spec 014. */
export const regulamentoPublicoFixture = {
  geradoEm: '2026-11-04T12:00:00.000Z',
  edicoes: [
    {
      id: '10000000-0000-0000-0014-000000000001',
      nome: 'Edição fictícia',
      inicio: '2026-03-01',
      fim: null,
      regrasVersao: 'teste',
      regras: { versao: 'teste', presenca: { pontosPorIntegrante: 2, maximoPorDupla: 4 } },
      encontros: [
        {
          numero: 1,
          titulo: 'Encontro fictício',
          data: '2026-11-04',
          inicio: null,
          fim: null,
          estado: 'cancelado' as const,
        },
      ],
    },
  ],
};
