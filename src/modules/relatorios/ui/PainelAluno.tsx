import type { ReactNode } from 'react';
import { formatarData, formatarDataHora, formatarPontos } from '@/shared/lib/formatacao';
import { BannerDestaque, Card, StatusBadge } from '@/shared/ui';
import type { PainelDoAluno } from '../domain/tipos';
import {
  FaixaDeIndicadores,
  Indicador,
  IndicadorEncontro,
  LinkDoPainel,
  SeloFicticio,
} from './comum';
import { nomeDeSaudacao } from './texto';

/**
 * Painel inicial do aluno (US1): indicadores da própria equipe com os números do servidor e, abaixo,
 * o que pede resposta. A prévia não é o resultado oficial; a posição é a da última publicação.
 */
export function PainelAluno({
  painel: p,
  nome,
  ficticio = false,
  extra,
}: {
  painel: PainelDoAluno;
  nome: string;
  ficticio?: boolean;
  /** Cartões a mais ao lado das ações (ex.: convites de equipe). */
  extra?: ReactNode;
}) {
  const primeiroNome = nomeDeSaudacao(nome) || nome;
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
      <FaixaDeIndicadores>
        {p.previa && (
          <Indicador
            titulo="Pontos"
            icone="pontuacao"
            valor={`${formatarPontos(p.previa.total)} pontos`}
            link={<LinkDoPainel para="/aluno/pontuacao">Ver pontuação</LinkDoPainel>}
          >
            <StatusBadge estado="parcial" rotulo="Prévia — não oficial" />
            {p.previa.pendente && (
              <p className="mt-1">Há lançamentos pendentes: os pontos podem mudar.</p>
            )}
          </Indicador>
        )}
        {p.equipe && (
          <Indicador
            titulo="Posição na turma"
            icone="ranking"
            acento="amarelo"
            valor={
              p.ranking ? (
                p.ranking.posicao ? (
                  `${p.ranking.posicao}º lugar${p.ranking.compartilhada ? ' (empatada)' : ''}`
                ) : (
                  <span className="text-lg">Equipe fora desta publicação</span>
                )
              ) : (
                <span className="text-lg">Ranking da turma ainda não publicado</span>
              )
            }
            link={<LinkDoPainel para="/aluno/ranking">Ver ranking</LinkDoPainel>}
          >
            {p.ranking && (
              <>
                <StatusBadge estado={p.ranking.estado} />
                <p className="mt-1">
                  Versão {p.ranking.versao}, publicada em {formatarDataHora(p.ranking.publicadoEm)}
                </p>
              </>
            )}
          </Indicador>
        )}
        <IndicadorEncontro
          encontro={p.proximoEncontro}
          link={<LinkDoPainel para="/aluno/encontros">Ver encontros</LinkDoPainel>}
        />
        <Indicador
          titulo="Próximo prazo"
          icone="tarefa"
          acento="ciano"
          valor={
            p.proximoPrazo ? (
              formatarData(p.proximoPrazo.prazo)
            ) : (
              <span className="text-lg">Nenhum prazo aberto.</span>
            )
          }
          link={<LinkDoPainel para="/aluno/desafios">Ver desafios e listas</LinkDoPainel>}
        >
          {p.proximoPrazo && (
            <>
              <p className="font-semibold text-text">{p.proximoPrazo.titulo}</p>
              <p>
                {p.proximoPrazo.tipo === 'lista' ? 'Lista de questões' : 'Desafio'} · até{' '}
                {formatarDataHora(p.proximoPrazo.prazo)}
              </p>
            </>
          )}
        </Indicador>
      </FaixaDeIndicadores>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <Card
          icone="aviso"
          titulo="Ações pendentes"
          acao={
            p.acoes.length > 0 && (
              <StatusBadge estado="pendente" rotulo={`${p.acoes.length} para responder`} />
            )
          }
        >
          {p.acoes.length ? (
            <ul className="flex flex-col divide-y divide-border">
              {p.acoes.map((a) => (
                <li
                  key={`${a.tipo}-${a.titulo}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 py-1"
                >
                  <LinkDoPainel para={a.caminho}>{a.titulo}</LinkDoPainel>
                  <p className="text-sm text-text-secondary">Prazo: {formatarDataHora(a.prazo)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Nenhuma ação pendente.</p>
          )}
        </Card>
        <div className="grid grid-cols-1 gap-4">
          <Card icone="notificacoes" titulo="Avisos">
            <p>
              {p.avisosNaoLidos === 0
                ? 'Nenhum aviso não lido'
                : `${p.avisosNaoLidos} ${p.avisosNaoLidos === 1 ? 'aviso não lido' : 'avisos não lidos'}`}
            </p>
            <LinkDoPainel para="/aluno/avisos">Ver avisos</LinkDoPainel>
          </Card>
          {extra}
        </div>
      </div>
    </>
  );
}
