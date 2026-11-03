import { useAuth } from '@/modules/auth';
import {
  GestaoComunicados,
  ListaComunicados,
  ResumoRegulamento,
  type AcoesComunicado,
} from '@/modules/comunicados';
import type { Edicao } from '@/modules/organizacao';
import { Card, EmptyState, PageHeader } from '@/shared/ui';
import { Consulta } from '../dados/Consulta';
import {
  useBloqueioDeEscrita,
  useComunicadosParaMim,
  useComunicadosQueGerencio,
  useGravar,
  useTurmas,
} from '../dados/consultas';
import { useRepositorios } from '../dados/useRepositorios';
import { ComEdicao } from './ComEdicao';

/** Escritas dos comunicados: cada uma invalida as consultas depois da resposta do servidor. */
function useAcoesComunicado(edicaoId: string): AcoesComunicado {
  const { comunicados: c } = useRepositorios();
  const gravar = useGravar();
  return {
    salvar: (chave, id, entrada) =>
      gravar(() => c.salvarComunicado(chave, id, edicaoId, entrada))(),
    publicar: (id) => gravar(() => c.publicarComunicado(id))(),
    apagar: (id) => gravar(() => c.apagarRascunho(id))(),
    corrigir: (id, titulo, texto, justificativa) =>
      gravar(() => c.corrigirComunicado(id, titulo, texto, justificativa))(),
    retirar: (id, justificativa) => gravar(() => c.retirarComunicado(id, justificativa))(),
  };
}

/** Comunicados que a pessoa recebe (US2); marcar como lido também atualiza o contador de avisos. */
export function ComunicadosRecebidos({ edicao }: { edicao: Edicao }) {
  const { comunicados: c } = useRepositorios();
  const { sessao } = useAuth();
  const gravar = useGravar();
  const bloqueio = useBloqueioDeEscrita();
  return (
    <Consulta consulta={useComunicadosParaMim(edicao.id)}>
      {(lista) => (
        <ListaComunicados
          comunicados={lista}
          onMarcarLido={(id) => gravar(() => c.marcarComunicadoLido(id))()}
          bloqueio={bloqueio}
          ficticio={sessao?.demo}
        />
      )}
    </Consulta>
  );
}

function Gestao({ edicao, perfil }: { edicao: Edicao; perfil: 'coordenacao' | 'docente' }) {
  const acoes = useAcoesComunicado(edicao.id);
  const bloqueio = useBloqueioDeEscrita();
  const turmas = useTurmas(edicao.id);
  const comunicados = useComunicadosQueGerencio(edicao.id);
  return (
    <Consulta consulta={turmas}>
      {(listaTurmas) =>
        perfil === 'docente' && listaTurmas.length === 0 ? (
          <EmptyState
            titulo="Nenhuma turma vinculada ao seu perfil."
            descricao="Docentes e mentores publicam só para as turmas em que atuam."
          />
        ) : (
          <Consulta consulta={comunicados}>
            {(lista) => (
              <GestaoComunicados
                comunicados={lista}
                perfil={perfil}
                turmas={listaTurmas.map((t) => ({ id: t.id, nome: t.nome }))}
                acoes={acoes}
                bloqueio={bloqueio}
              />
            )}
          </Consulta>
        )
      }
    </Consulta>
  );
}

export function CoordenacaoComunicadosPage() {
  return (
    <>
      <PageHeader
        icone="noticia"
        titulo="Comunicados e regulamento"
        descricao="Publique comunicados para estudantes, equipe docente ou todos, por turma ou para a edição inteira."
      />
      <ComEdicao>
        {(edicao) => (
          <div className="grid gap-6">
            <Card icone="noticia" titulo="Comunicados da edição">
              <Gestao edicao={edicao} perfil="coordenacao" />
            </Card>
            <ResumoRegulamento regras={edicao.regras} versao={edicao.regrasVersao} />
          </div>
        )}
      </ComEdicao>
    </>
  );
}

export function DocenteComunicadosPage() {
  return (
    <>
      <PageHeader
        icone="noticia"
        titulo="Comunicados"
        descricao="Comunicados que você recebe e os que escreve para as turmas em que atua."
      />
      <ComEdicao>
        {(edicao) => (
          <div className="grid gap-6">
            <Card icone="noticia" titulo="Recebidos">
              <ComunicadosRecebidos edicao={edicao} />
            </Card>
            <Card icone="noticia" titulo="Escritos por mim">
              <Gestao edicao={edicao} perfil="docente" />
            </Card>
            <ResumoRegulamento regras={edicao.regras} versao={edicao.regrasVersao} />
          </div>
        )}
      </ComEdicao>
    </>
  );
}
