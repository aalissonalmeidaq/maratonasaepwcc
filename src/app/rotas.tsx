import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import {
  EsqueciSenhaPage,
  PrimeiroAcessoPage,
  RedefinirSenhaPage,
  RedirecionarParaPainel,
  RotaProtegida,
} from '@/modules/auth';
import { LimiteCarregamento } from './layout/LimiteCarregamento';
import { AguardandoPermissaoPage, EntradaPage, NaoEncontradaPage } from './paginas/comum';

const AppShell = lazy(() => import('./layout/AreaAutenticada'));
const AlunoInicioPage = lazy(() =>
  import('./paginas/aluno').then((modulo) => ({ default: modulo.AlunoInicioPage })),
);
const AlunoDesafiosPage = lazy(() =>
  import('./paginas/atividades').then((modulo) => ({ default: modulo.AlunoDesafiosPage })),
);
const AlunoPontuacaoPage = lazy(() =>
  import('./paginas/atividades').then((modulo) => ({ default: modulo.AlunoPontuacaoPage })),
);
const AlunoRankingPage = lazy(() =>
  import('./paginas/aluno').then((modulo) => ({ default: modulo.AlunoRankingPage })),
);
const AlunoRegulamentoPage = lazy(() =>
  import('./paginas/aluno').then((modulo) => ({ default: modulo.AlunoRegulamentoPage })),
);
const CoordenacaoInicioPage = lazy(() =>
  import('./paginas/coordenacao').then((modulo) => ({ default: modulo.CoordenacaoInicioPage })),
);
const CoordenacaoRankingPage = lazy(() =>
  import('./paginas/coordenacao').then((modulo) => ({ default: modulo.CoordenacaoRankingPage })),
);
const CoordenacaoOcorrenciasPage = lazy(() =>
  import('./paginas/coordenacao').then((modulo) => ({
    default: modulo.CoordenacaoOcorrenciasPage,
  })),
);
const CoordenacaoComunicadosPage = lazy(() =>
  import('./paginas/coordenacao').then((modulo) => ({
    default: modulo.CoordenacaoComunicadosPage,
  })),
);
const CoordenacaoPremiacaoPage = lazy(() =>
  import('./paginas/coordenacao').then((modulo) => ({ default: modulo.CoordenacaoPremiacaoPage })),
);
const CoordenacaoRelatoriosPage = lazy(() =>
  import('./paginas/coordenacao').then((modulo) => ({ default: modulo.CoordenacaoRelatoriosPage })),
);
const DocenteInicioPage = lazy(() =>
  import('./paginas/docente').then((modulo) => ({ default: modulo.DocenteInicioPage })),
);
const DocenteAvaliacoesPage = lazy(() =>
  import('./paginas/atividades').then((modulo) => ({ default: modulo.DocenteAvaliacoesPage })),
);
const CoordenacaoAvaliacoesPage = lazy(() =>
  import('./paginas/atividades').then((modulo) => ({ default: modulo.CoordenacaoAvaliacoesPage })),
);
const DocentePresencaPage = lazy(() =>
  import('./paginas/atividades').then((modulo) => ({ default: modulo.DocentePresencaPage })),
);
const CoordenacaoPresencaPage = lazy(() =>
  import('./paginas/atividades').then((modulo) => ({ default: modulo.CoordenacaoPresencaPage })),
);
const DocenteOcorrenciasPage = lazy(() =>
  import('./paginas/docente').then((modulo) => ({ default: modulo.DocenteOcorrenciasPage })),
);
const AlunoDuplaPage = lazy(() =>
  import('./paginas/organizacao').then((modulo) => ({ default: modulo.AlunoDuplaPage })),
);
const EncontrosLeituraPage = lazy(() =>
  import('./paginas/organizacao').then((modulo) => ({ default: modulo.EncontrosLeituraPage })),
);
const AlunoTurmaPage = lazy(() =>
  import('./paginas/painelTurma').then((modulo) => ({ default: modulo.AlunoTurmaPage })),
);
const DocentePainelTurmaPage = lazy(() =>
  import('./paginas/painelTurma').then((modulo) => ({ default: modulo.DocentePainelTurmaPage })),
);
const CoordenacaoPainelTurmaPage = lazy(() =>
  import('./paginas/painelTurma').then((modulo) => ({
    default: modulo.CoordenacaoPainelTurmaPage,
  })),
);
const DocenteAtividadesPage = lazy(() =>
  import('./paginas/atividades').then((modulo) => ({ default: modulo.DocenteAtividadesPage })),
);
const DocenteTurmasPage = lazy(() =>
  import('./paginas/organizacao').then((modulo) => ({ default: modulo.DocenteTurmasPage })),
);
const CoordenacaoOrganizacaoPage = lazy(() =>
  import('./paginas/organizacao').then((modulo) => ({
    default: modulo.CoordenacaoOrganizacaoPage,
  })),
);
const CoordenacaoDuplasPage = lazy(() =>
  import('./paginas/organizacao').then((modulo) => ({ default: modulo.CoordenacaoDuplasPage })),
);
const CoordenacaoEncontrosPage = lazy(() =>
  import('./paginas/organizacao').then((modulo) => ({ default: modulo.CoordenacaoEncontrosPage })),
);

export function AppRotas() {
  return (
    <LimiteCarregamento>
      <Suspense
        fallback={
          <div role="status" className="p-6 text-text-secondary">
            Carregando sua área…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<RedirecionarParaPainel />} />
          <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />
          <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
          <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
          <Route path="/entrar" element={<EntradaPage />} />
          <Route path="/aguardando-permissao" element={<AguardandoPermissaoPage />} />

          <Route element={<RotaProtegida area="aluno" />}>
            <Route path="/aluno" element={<AppShell area="aluno" />}>
              <Route index element={<AlunoInicioPage />} />
              <Route path="dupla" element={<AlunoDuplaPage />} />
              <Route path="turma" element={<AlunoTurmaPage />} />
              <Route path="encontros" element={<EncontrosLeituraPage />} />
              <Route path="desafios" element={<AlunoDesafiosPage />} />
              <Route path="pontuacao" element={<AlunoPontuacaoPage />} />
              <Route path="ranking" element={<AlunoRankingPage />} />
              <Route path="regulamento" element={<AlunoRegulamentoPage />} />
            </Route>
          </Route>

          <Route element={<RotaProtegida area="docente" />}>
            <Route path="/docente" element={<AppShell area="docente" />}>
              <Route index element={<DocenteInicioPage />} />
              <Route path="turmas" element={<DocenteTurmasPage />} />
              <Route path="turmas/:turmaId" element={<DocentePainelTurmaPage />} />
              <Route path="atividades" element={<DocenteAtividadesPage />} />
              <Route path="encontros" element={<EncontrosLeituraPage />} />
              <Route path="presenca" element={<DocentePresencaPage />} />
              <Route path="avaliacoes" element={<DocenteAvaliacoesPage />} />
              <Route path="ocorrencias" element={<DocenteOcorrenciasPage />} />
            </Route>
          </Route>

          <Route element={<RotaProtegida area="coordenacao" />}>
            <Route path="/coordenacao" element={<AppShell area="coordenacao" />}>
              <Route index element={<CoordenacaoInicioPage />} />
              <Route path="organizacao" element={<CoordenacaoOrganizacaoPage />} />
              <Route path="turmas/:turmaId" element={<CoordenacaoPainelTurmaPage />} />
              <Route path="duplas" element={<CoordenacaoDuplasPage />} />
              <Route path="encontros" element={<CoordenacaoEncontrosPage />} />
              <Route path="presenca" element={<CoordenacaoPresencaPage />} />
              <Route path="avaliacoes" element={<CoordenacaoAvaliacoesPage />} />
              <Route path="ranking" element={<CoordenacaoRankingPage />} />
              <Route path="ocorrencias" element={<CoordenacaoOcorrenciasPage />} />
              <Route path="comunicados" element={<CoordenacaoComunicadosPage />} />
              <Route path="premiacao" element={<CoordenacaoPremiacaoPage />} />
              <Route path="relatorios" element={<CoordenacaoRelatoriosPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NaoEncontradaPage />} />
        </Routes>
      </Suspense>
    </LimiteCarregamento>
  );
}
