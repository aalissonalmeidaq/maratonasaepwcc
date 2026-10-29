import { useState } from 'react';
import { painelCoordenacao } from '@/modules/demo';
import { maximoDaEdicao } from '@/modules/pontuacao';
import { formatarData } from '@/shared/lib/formatacao';
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  EmConstrucao,
  PageHeader,
  ResponsiveTable,
  StatCard,
  StatusBadge,
} from '@/shared/ui';
import { TabelaRanking } from './aluno';
import { ComDadosDemo } from './comum';

type Painel = ReturnType<typeof painelCoordenacao>;
const carregar = () => painelCoordenacao();

export function CoordenacaoInicioPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader titulo="Visão geral" descricao={p.edicao.nome} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icone="turmas"
              rotulo="Cursos e turmas"
              valor={`${p.indicadores.cursos} / ${p.indicadores.turmas}`}
              complemento="cursos / turmas"
            />
            <StatCard
              icone="dupla"
              acento="ciano"
              rotulo="Duplas"
              valor={p.indicadores.duplas}
              complemento={`${p.indicadores.estudantes} estudantes`}
            />
            <StatCard
              icone="encontros"
              acento="roxo"
              rotulo="Encontros realizados"
              valor={`${p.indicadores.encontrosRealizados} de ${p.indicadores.encontrosTotal}`}
            />
            <StatCard
              icone="pontuacao"
              acento="amarelo"
              rotulo="Pontuação máxima"
              valor={maximoDaEdicao(p.edicao.regras)}
              complemento={`regras ${p.edicao.regras.versao}`}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card titulo="Pendências">
              <ul className="flex flex-col gap-3 text-sm">
                <li className="flex items-center justify-between gap-2">
                  Componentes de avaliação em aberto
                  <StatusBadge estado="pendente" rotulo={String(p.pendencias.avaliacoesEmAberto)} />
                </li>
                <li className="flex items-center justify-between gap-2">
                  Notas oficiais pendentes (estudantes)
                  <StatusBadge
                    estado="pendente"
                    rotulo={String(p.pendencias.notasOficiaisPendentes)}
                  />
                </li>
                <li className="flex items-center justify-between gap-2">
                  Ocorrências em análise
                  <StatusBadge
                    estado="concluido"
                    rotulo={String(p.pendencias.ocorrenciasEmAnalise)}
                  />
                </li>
              </ul>
            </Card>
            <Card titulo="Classificação por categoria" className="lg:col-span-2">
              <ul className="flex flex-col gap-2">
                {p.ranking.map((r) => (
                  <li
                    key={r.categoria}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span className="font-semibold">{r.categoria}</span>
                    <span className="flex items-center gap-2 text-sm">
                      Líder: {r.posicoes[0]?.nome ?? '—'} <StatusBadge estado={r.estado} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function CoordenacaoOrganizacaoPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            titulo="Organização da edição"
            descricao="Cursos, categorias, turmas e docentes responsáveis."
          />
          <Alert tom="info" titulo="Cadastros no Incremento 2">
            Criação e edição de cursos, turmas, estudantes e vínculos serão habilitadas com
            validação e auditoria no servidor.
          </Alert>
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
            <ResponsiveTable
              legenda="Turmas"
              legendaVisivel
              chave={(t) => t.id}
              linhas={p.turmas}
              colunas={[
                { id: 'turma', titulo: 'Turma', valor: (t) => t.nome },
                { id: 'curso', titulo: 'Curso', valor: (t) => t.curso?.nome },
                { id: 'cat', titulo: 'Categoria', valor: (t) => t.curso?.categoria },
                { id: 'duplas', titulo: 'Duplas', numerica: true, valor: (t) => t.duplas },
                { id: 'doc', titulo: 'Docentes e mentoria', valor: (t) => t.docentes.join(', ') },
              ]}
            />
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function CoordenacaoDuplasPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            titulo="Duplas"
            descricao="Composição atual. Alterações exigirão justificativa e ficarão no histórico."
          />
          <div className="rounded-lg border border-border bg-surface p-4">
            <ResponsiveTable
              legenda="Duplas da edição"
              chave={(d) => d.id}
              linhas={p.duplas}
              colunas={[
                { id: 'nome', titulo: 'Dupla', valor: (d) => d.nome },
                { id: 'int', titulo: 'Integrantes', valor: (d) => d.nomesIntegrantes.join(' e ') },
                { id: 'turma', titulo: 'Turma', valor: (d) => d.turma },
              ]}
            />
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function CoordenacaoEncontrosPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            titulo="Encontros"
            descricao="Quantidade, datas e ambientes são configuráveis por edição."
          />
          <div className="rounded-lg border border-border bg-surface p-4">
            <ResponsiveTable
              legenda="Encontros da edição"
              chave={(e) => e.id}
              linhas={p.encontros}
              colunas={[
                { id: 'n', titulo: 'Nº', valor: (e) => e.numero },
                { id: 't', titulo: 'Encontro', valor: (e) => e.titulo },
                {
                  id: 'd',
                  titulo: 'Data',
                  valor: (e) => formatarData(e.data, { weekday: 'short' }),
                },
                { id: 'h', titulo: 'Horário', valor: (e) => e.horario },
                { id: 'a', titulo: 'Ambiente', valor: (e) => e.ambiente },
                {
                  id: 'o',
                  titulo: 'Avaliação objetiva',
                  valor: (e) =>
                    e.avaliacaoObjetiva === 'questoes' ? 'Questões' : 'Prova oficial (registro)',
                },
                {
                  id: 's',
                  titulo: 'Situação',
                  valor: (e) => <StatusBadge estado={e.data < hoje ? 'concluido' : 'agendado'} />,
                },
              ]}
            />
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function CoordenacaoRankingPage() {
  const [confirmando, setConfirmando] = useState(false);
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            titulo="Ranking"
            descricao="Cálculo com as regras da edição; desempate: entrega → questões/prova → presença."
            acoes={
              <Button variante="secundario" onClick={() => setConfirmando(true)}>
                Publicar como provisório
              </Button>
            }
          />
          {p.ranking.map((r) => (
            <Card
              key={r.categoria}
              titulo={r.categoria}
              acao={<StatusBadge estado={r.estado} />}
              className="mb-4"
            >
              <TabelaRanking ranking={r} />
            </Card>
          ))}
          <ConfirmDialog
            aberto={confirmando}
            titulo="Publicação indisponível no modo demonstração"
            descricao="A publicação versionada e auditada do ranking será feita no servidor (Incremento 4). Nada será publicado agora."
            rotuloConfirmar="Entendi"
            onConfirmar={() => setConfirmando(false)}
            onCancelar={() => setConfirmando(false)}
          />
        </>
      )}
    </ComDadosDemo>
  );
}

export function CoordenacaoPremiacaoPage() {
  return (
    <ComDadosDemo carregar={carregar}>
      {(p: Painel) => (
        <>
          <PageHeader
            titulo="Premiação"
            descricao="Configuração da edição — não fixada no código."
          />
          <Alert tom="alerta" titulo="Detalhes a confirmar pela coordenação">
            Valores, quantidade de itens por dupla, validade dos vouchers e condições de entrega
            ainda não foram informados.
          </Alert>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {p.edicao.premiacao.map((item) => (
              <StatCard
                key={item.posicao}
                icone="conquista"
                acento={item.posicao === 1 ? 'amarelo' : item.posicao === 2 ? 'ciano' : 'coral'}
                rotulo={`${item.posicao}º lugar`}
                valor={<span className="text-lg">{item.descricao}</span>}
                complemento={item.detalhes ?? <StatusBadge estado="a_confirmar" />}
              />
            ))}
          </div>
        </>
      )}
    </ComDadosDemo>
  );
}

export function CoordenacaoOcorrenciasPage() {
  return (
    <>
      <PageHeader titulo="Ocorrências e revisões" />
      <EmConstrucao
        modulo="Ocorrências, penalidades e pedidos de revisão"
        incremento="Incremento 4"
      />
    </>
  );
}

export function CoordenacaoComunicadosPage() {
  return (
    <>
      <PageHeader titulo="Comunicados e regulamento" />
      <EmConstrucao modulo="Publicação de comunicados e do regulamento" incremento="Incremento 2" />
    </>
  );
}

export function CoordenacaoRelatoriosPage() {
  return (
    <>
      <PageHeader titulo="Relatórios" />
      <EmConstrucao modulo="Relatórios e exportação CSV" incremento="Incremento 5" />
    </>
  );
}
