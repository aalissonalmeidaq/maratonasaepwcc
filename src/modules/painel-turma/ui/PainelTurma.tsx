import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { nomeDeExibicao } from '@/modules/duplas';
import { formatarData } from '@/shared/lib/formatacao';
import {
  Card,
  EmptyState,
  ListaPaginada,
  ResponsiveTable,
  StatCard,
  StatusBadge,
} from '@/shared/ui';
import { agruparEncontros, alunosSemEquipe, indicadores } from '../domain/painel';
import type { EncontroDoPainel, PainelTurma as Painel, PontuacaoDoPainel } from '../domain/tipos';

const estiloLink =
  'inline-flex min-h-11 items-center font-semibold text-link underline-offset-4 hover:underline';

const horario = (e: EncontroDoPainel) =>
  e.inicio && e.fim ? `${e.inicio}–${e.fim}` : 'Horário a confirmar';

function ListaEncontros({
  titulo,
  encontros,
}: {
  titulo: 'Agendados' | 'Realizados' | 'Cancelados';
  encontros: EncontroDoPainel[];
}) {
  if (encontros.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-text-secondary">{titulo}</h3>
      <ul aria-label={`Encontros ${titulo.toLowerCase()}`} className="flex flex-col gap-1 text-sm">
        {encontros.map((e) => (
          <li key={e.id}>
            <span className="font-medium">
              {e.numero}. {e.titulo}
            </span>{' '}
            <span className="text-text-secondary">· {formatarData(e.data)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Acima deste total, a lista ganha busca e paginação (spec 005). */
const LIMITE_SEM_BUSCA = 10;

function Lista<T>({
  rotulo,
  itens,
  texto,
  chave,
  className,
  classeDoItem,
  children,
}: {
  rotulo: string;
  itens: T[];
  texto: (item: T) => string;
  chave: (item: T) => string;
  className: string;
  classeDoItem?: string;
  children: (item: T) => ReactNode;
}) {
  if (itens.length > LIMITE_SEM_BUSCA) {
    return (
      <ListaPaginada
        rotulo={rotulo}
        itens={itens}
        texto={texto}
        chave={chave}
        vazio="Nenhum item."
        className={className}
      >
        {(item) => <div className={classeDoItem}>{children(item)}</div>}
      </ListaPaginada>
    );
  }
  return (
    <ul aria-label={rotulo} className={className}>
      {itens.map((item) => (
        <li key={chave(item)} className={classeDoItem}>
          {children(item)}
        </li>
      ))}
    </ul>
  );
}

const pontos = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/**
 * Pontuação da turma (US3). Sem lançamentos reais, só o aviso. Na demonstração, a tabela fictícia
 * com selo; o aluno só a vê com a classificação publicada (FR-005). Nunca notas individuais.
 */
function BlocoPontuacao({
  pontuacao,
  gestao,
}: {
  pontuacao: PontuacaoDoPainel | null;
  gestao: boolean;
}) {
  if (!pontuacao) {
    return (
      <EmptyState
        icone="ranking"
        titulo="Pontuação disponível a partir dos lançamentos de avaliação."
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {pontuacao.ficticia && <StatusBadge estado="a_confirmar" rotulo="Dados fictícios" />}
        <StatusBadge estado={pontuacao.estado} />
      </div>
      {gestao || pontuacao.publicada ? (
        <ResponsiveTable
          legenda="Pontuação das equipes da turma"
          chave={(e) => e.equipeId}
          linhas={pontuacao.equipes}
          vazio="Nenhuma equipe classificada nesta turma."
          colunas={[
            {
              id: 'equipe',
              titulo: 'Equipe',
              texto: (e) => e.nome,
              valor: (e) => (
                <>
                  {e.nome}
                  {e.pendente && (
                    <span className="block text-xs text-amber-800">lançamentos pendentes</span>
                  )}
                </>
              ),
            },
            { id: 'pontos', titulo: 'Pontos', numerica: true, valor: (e) => pontos(e.total) },
            {
              id: 'posicao',
              titulo: 'Posição na categoria',
              valor: (e) => `${e.posicao}º${e.compartilhada ? ' (empate)' : ''}`,
            },
          ]}
        />
      ) : (
        <EmptyState icone="ranking" titulo="Classificação ainda não publicada." />
      )}
    </div>
  );
}

/**
 * Painel de uma turma (spec 004). Somente leitura: indicadores derivados das listas
 * (SC-003), equipes, alunos sem equipe, encontros e o aviso de pontuação (US3).
 */
export function PainelTurma({
  painel,
  hoje,
  linkAlterarEquipes,
  linkConvidar,
}: {
  painel: Painel;
  /** AAAA-MM-DD */
  hoje: string;
  /** Gestão: tela onde as equipes são alteradas (spec 003). */
  linkAlterarEquipes?: string;
  /** Aluno: tela "Minha equipe", para convidar colegas sem equipe. */
  linkConvidar?: string;
}) {
  const gestao = painel.visao === 'gestao';
  const ind = indicadores(painel);
  const semEquipe = alunosSemEquipe(painel);
  const encontros = agruparEncontros(painel.encontros, hoje);
  const idProximo = useId();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard icone="usuarios" rotulo="Alunos ativos" valor={ind.alunosAtivos} />
        <StatCard icone="dupla" acento="ciano" rotulo="Com equipe" valor={ind.comEquipe} />
        <StatCard icone="estudante" acento="amarelo" rotulo="Sem equipe" valor={ind.semEquipe} />
        <StatCard icone="equipe" acento="roxo" rotulo="Equipes" valor={ind.equipes} />
        {gestao && ind.convitesPendentes !== null && (
          <StatCard
            icone="enviar"
            acento="coral"
            rotulo="Convites pendentes"
            valor={ind.convitesPendentes}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          icone="dupla"
          titulo="Equipes"
          acao={
            gestao && linkAlterarEquipes ? (
              <Link to={linkAlterarEquipes} className={estiloLink}>
                Alterar equipes
              </Link>
            ) : undefined
          }
        >
          {painel.equipes.length === 0 ? (
            <EmptyState
              icone="dupla"
              titulo="Nenhuma equipe formada nesta turma."
              descricao="Os alunos formam equipes por convite em “Minha equipe”."
            />
          ) : (
            <Lista
              rotulo="Equipes da turma"
              itens={painel.equipes}
              texto={(d) => `${nomeDeExibicao(d)} ${d.integrantes.map((i) => i.nome).join(' ')}`}
              chave={(d) => d.id}
              className="flex flex-col gap-3"
              classeDoItem="rounded-lg border border-border p-3"
            >
              {(d) => (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{nomeDeExibicao(d)}</h3>
                    <StatusBadge
                      estado="em_andamento"
                      rotulo={d.integrantes.length === 3 ? 'Trio' : 'Dupla'}
                    />
                  </div>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {d.integrantes.map((i) => (
                      <li key={i.estudanteId}>
                        {i.nome}
                        {gestao && i.integranteInativo && (
                          <strong className="text-amber-800"> (integrante inativo)</strong>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Lista>
          )}
        </Card>

        <Card
          icone="estudante"
          titulo="Alunos sem equipe"
          acao={
            !gestao && linkConvidar && semEquipe.length > 0 ? (
              <Link to={linkConvidar} className={estiloLink}>
                Convidar para minha equipe
              </Link>
            ) : undefined
          }
        >
          {painel.alunos.length === 0 ? (
            <EmptyState
              icone="usuarios"
              titulo={
                gestao
                  ? 'Nenhum aluno cadastrado — cadastre em Organização.'
                  : 'Nenhum aluno ativo nesta turma.'
              }
            />
          ) : semEquipe.length === 0 ? (
            <EmptyState icone="correta" titulo="Todos os alunos ativos têm equipe." />
          ) : (
            <Lista
              rotulo="Alunos sem equipe"
              itens={semEquipe}
              texto={(a) => a.nome}
              chave={(a) => a.id}
              className="flex flex-col gap-1"
            >
              {(a) => a.nome}
            </Lista>
          )}
        </Card>

        <Card icone="calendario" titulo="Encontros">
          {painel.encontros.length === 0 ? (
            <EmptyState icone="calendario" titulo="Nenhum encontro cadastrado nesta edição." />
          ) : (
            <div className="flex flex-col gap-4">
              <section aria-labelledby={idProximo} className="rounded-lg bg-surface-muted p-3">
                <h3 id={idProximo} className="text-sm font-semibold">
                  Próximo encontro
                </h3>
                {encontros.proximo ? (
                  <>
                    <p className="mt-1 font-semibold">{encontros.proximo.titulo}</p>
                    <p className="text-sm text-text-secondary">
                      {formatarData(encontros.proximo.data, { weekday: 'long' })} ·{' '}
                      {horario(encontros.proximo)}
                      {encontros.proximo.ambienteNome && ` · ${encontros.proximo.ambienteNome}`}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-text-secondary">Nenhum encontro agendado.</p>
                )}
              </section>
              <ListaEncontros titulo="Agendados" encontros={encontros.agendados} />
              <ListaEncontros titulo="Realizados" encontros={encontros.realizados} />
              <ListaEncontros titulo="Cancelados" encontros={encontros.cancelados} />
            </div>
          )}
        </Card>

        <Card icone="pontuacao" titulo="Pontuação e classificação">
          <BlocoPontuacao pontuacao={painel.pontuacao} gestao={gestao} />
        </Card>
      </div>
    </div>
  );
}
