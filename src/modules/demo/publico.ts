import { regulamentoPublicoSchema, type RepositorioPublico } from '@/modules/publico';
import { edicao, encontros } from './dados';
/** Projeção fictícia explícita; não reutiliza os repositórios autenticados. */
export const repositorioPublicoDemo: RepositorioPublico = {
  async regulamentoPublico() {
    return regulamentoPublicoSchema.parse({
      geradoEm: new Date().toISOString(),
      edicoes: [
        {
          id: edicao.id,
          nome: edicao.nome,
          inicio: '2026-03-02',
          fim: '2026-11-27',
          regras: edicao.regras,
          regrasVersao: edicao.regras.versao,
          encontros: encontros.map((e, i) => {
            const h = /(\d{2})h(\d{2})–(\d{2})h(\d{2})/.exec(e.horario);
            return {
              numero: e.numero,
              titulo: e.titulo,
              data: e.data,
              inicio: h ? `${h[1]}:${h[2]}` : null,
              fim: h ? `${h[3]}:${h[4]}` : null,
              estado: i === 0 ? 'realizado' : i === 3 ? 'cancelado' : 'agendado',
            };
          }),
        },
      ],
    });
  },
};
