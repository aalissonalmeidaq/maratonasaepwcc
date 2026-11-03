import { formatarDataHora, formatarPontos } from '@/shared/lib/formatacao';
import { BannerDestaque, Card, StatusBadge } from '@/shared/ui';
import type { PainelDoAluno } from '../domain/tipos';
import { LinkDoPainel, SeloFicticio, TextoEncontro } from './comum';

/**
 * Painel inicial do aluno (US1): resumo da própria equipe com os números do servidor. A prévia
 * não é o resultado oficial; a posição é a da última publicação da categoria.
 */
export function PainelAluno({
  painel: p,
  nome,
  ficticio = false,
}: {
  painel: PainelDoAluno;
  nome: string;
  ficticio?: boolean;
}) {
  const primeiroNome = nome.split(' ')[0] || nome;
  return (
    <>
      <BannerDestaque
        titulo={`Olá, ${primeiroNome}!`}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            {p.equipe ? `Equipe ${p.equipe.nome}` : 'Cada desafio é uma oportunidade de evoluir.'}
            {ficticio && <SeloFicticio />}
          </span>
        }
      />
      {!p.equipe && (
        <Card icone="dupla" titulo="Sua equipe" className="mb-4">
          <p>Você ainda não tem equipe.</p>
          <p className="text-sm text-text-secondary">
            Convide colegas da sua turma ou aceite um convite para participar da pontuação.
          </p>
          <LinkDoPainel para="/aluno/dupla">Formar equipe</LinkDoPainel>
        </Card>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {p.previa && (
          <Card icone="pontuacao" titulo="Pontos">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-2xl font-bold tabular-nums">
                {formatarPontos(p.previa.total)} pontos
              </p>
              <StatusBadge estado="parcial" rotulo="Prévia — não oficial" />
            </div>
            {p.previa.pendente && (
              <p className="mt-1 text-sm text-text-secondary">
                Há lançamentos pendentes: os pontos podem mudar.
              </p>
            )}
            <LinkDoPainel para="/aluno/pontuacao">Ver pontuação</LinkDoPainel>
          </Card>
        )}
        {p.equipe && (
          <Card icone="ranking" titulo="Posição">
            {p.ranking ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-2xl font-bold tabular-nums">
                    {p.ranking.posicao
                      ? `${p.ranking.posicao}º lugar${p.ranking.compartilhada ? ' (empatada)' : ''}`
                      : 'Equipe fora desta publicação'}
                  </p>
                  <StatusBadge estado={p.ranking.estado} />
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Versão {p.ranking.versao}, publicada em {formatarDataHora(p.ranking.publicadoEm)}
                </p>
              </>
            ) : (
              <p>Ranking ainda não publicado</p>
            )}
            <LinkDoPainel para="/aluno/ranking">Ver ranking</LinkDoPainel>
          </Card>
        )}
        <Card icone="calendario" titulo="Próximo encontro">
          <TextoEncontro encontro={p.proximoEncontro} />
          <LinkDoPainel para="/aluno/encontros">Ver encontros</LinkDoPainel>
        </Card>
        <Card icone="tarefa" titulo="Próximo prazo">
          {p.proximoPrazo ? (
            <>
              <p className="text-lg font-semibold">{p.proximoPrazo.titulo}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {p.proximoPrazo.tipo === 'lista' ? 'Lista de questões' : 'Desafio'} · prazo{' '}
                {formatarDataHora(p.proximoPrazo.prazo)}
              </p>
            </>
          ) : (
            <p>Nenhum prazo aberto.</p>
          )}
          <LinkDoPainel para="/aluno/desafios">Ver desafios e listas</LinkDoPainel>
        </Card>
        <Card icone="tarefa" titulo="Ações pendentes">
          {p.acoes.length ? (
            <ul className="flex flex-col gap-2">
              {p.acoes.map((a) => (
                <li key={`${a.tipo}-${a.titulo}`}>
                  <LinkDoPainel para={a.caminho}>{a.titulo}</LinkDoPainel>
                  <p className="text-sm text-text-secondary">Prazo: {formatarDataHora(a.prazo)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma ação pendente.</p>
          )}
        </Card>
        <Card icone="notificacoes" titulo="Avisos">
          <p>
            {p.avisosNaoLidos === 0
              ? 'Nenhum aviso não lido'
              : `${p.avisosNaoLidos} ${p.avisosNaoLidos === 1 ? 'aviso não lido' : 'avisos não lidos'}`}
          </p>
          <LinkDoPainel para="/aluno/avisos">Ver avisos</LinkDoPainel>
        </Card>
      </div>
    </>
  );
}
