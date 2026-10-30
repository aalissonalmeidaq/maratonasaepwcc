/**
 * Regras puras de equipes por convite (spec 003), usadas para orientar as telas.
 * A autoridade é o servidor (RPCs de convite), que repete estas regras.
 */
import type { Colega, ConviteEquipe, IntegranteAtual } from './tipos';

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

/** Nome próprio da equipe ou, enquanto ela não escolhe, os primeiros nomes dos integrantes. */
export function nomeDeExibicao(equipe: { nome: string | null; integrantes: IntegranteAtual[] }) {
  if (equipe.nome) return equipe.nome;
  const nomes = equipe.integrantes.map((i) => primeiroNome(i.nome));
  if (nomes.length === 0) return 'Equipe sem integrantes';
  if (nomes.length === 1) return nomes[0] as string;
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/** Nome próprio da equipe: 2 a 80 caracteres úteis (FR-008). */
export function validarNomeEquipe(nome: string): string | null {
  const tamanho = nome.trim().length;
  return tamanho >= 2 && tamanho <= 80 ? null : 'Informe um nome de 2 a 80 caracteres.';
}

/** Trio só em turma com número ímpar de alunos ativos e sem trio formado. */
export function turmaPermiteTrio(alunosAtivos: number, temTrio: boolean) {
  return alunosAtivos % 2 === 1 && !temTrio;
}

export function validarConvite(dados: {
  remetenteId: string;
  convidados: string[];
  colegas: Colega[];
  permiteTrio: boolean;
}): string | null {
  const { remetenteId, convidados, colegas, permiteTrio } = dados;
  if (convidados.length === 0) return 'Escolha um colega para convidar.';
  if (convidados.length > 2) return 'Escolha no máximo dois colegas.';
  if (convidados.length === 2 && !permiteTrio)
    return 'Nesta turma só é possível formar dupla: escolha um colega.';
  if (new Set(convidados).size !== convidados.length) return 'Escolha colegas diferentes.';
  for (const id of convidados) {
    if (id === remetenteId) return 'Você não pode convidar a si mesmo.';
    const colega = colegas.find((c) => c.id === id);
    if (!colega) return 'Convide apenas colegas da sua turma.';
    if (colega.temEquipe) return `${colega.nome} já está em uma equipe.`;
  }
  return null;
}

/** Convites recebidos que ainda esperam a resposta da pessoa (FR-016). */
export function convitesRecebidosPendentes(convites: ConviteEquipe[], pessoaId: string) {
  return convites.filter(
    (c) =>
      !c.souRemetente &&
      c.situacao === 'pendente' &&
      c.convidados.some((x) => x.id === pessoaId && x.resposta === 'pendente'),
  );
}
