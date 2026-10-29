import { Route, Routes } from 'react-router';
import { RedirecionarParaPainel, RotaProtegida } from '@/modules/auth';
import { AppShell } from './layout/AppShell';
import * as Aluno from './paginas/aluno';
import { AguardandoPermissaoPage, EntradaPage, NaoEncontradaPage } from './paginas/comum';
import * as Coord from './paginas/coordenacao';
import * as Docente from './paginas/docente';
import * as Org from './paginas/organizacao';

export function AppRotas() {
  return (
    <Routes>
      <Route path="/" element={<RedirecionarParaPainel />} />
      <Route path="/entrar" element={<EntradaPage />} />
      <Route path="/aguardando-permissao" element={<AguardandoPermissaoPage />} />

      <Route element={<RotaProtegida area="aluno" />}>
        <Route path="/aluno" element={<AppShell area="aluno" />}>
          <Route index element={<Aluno.AlunoInicioPage />} />
          <Route path="dupla" element={<Org.AlunoDuplaPage />} />
          <Route path="encontros" element={<Org.EncontrosLeituraPage />} />
          <Route path="desafios" element={<Aluno.AlunoDesafiosPage />} />
          <Route path="pontuacao" element={<Aluno.AlunoPontuacaoPage />} />
          <Route path="ranking" element={<Aluno.AlunoRankingPage />} />
          <Route path="regulamento" element={<Aluno.AlunoRegulamentoPage />} />
        </Route>
      </Route>

      <Route element={<RotaProtegida area="docente" />}>
        <Route path="/docente" element={<AppShell area="docente" />}>
          <Route index element={<Docente.DocenteInicioPage />} />
          <Route path="turmas" element={<Org.DocenteTurmasPage />} />
          <Route path="encontros" element={<Org.EncontrosLeituraPage />} />
          <Route path="presenca" element={<Docente.DocentePresencaPage />} />
          <Route path="avaliacoes" element={<Docente.DocenteAvaliacoesPage />} />
          <Route path="ocorrencias" element={<Docente.DocenteOcorrenciasPage />} />
        </Route>
      </Route>

      <Route element={<RotaProtegida area="coordenacao" />}>
        <Route path="/coordenacao" element={<AppShell area="coordenacao" />}>
          <Route index element={<Coord.CoordenacaoInicioPage />} />
          <Route path="organizacao" element={<Org.CoordenacaoOrganizacaoPage />} />
          <Route path="duplas" element={<Org.CoordenacaoDuplasPage />} />
          <Route path="encontros" element={<Org.CoordenacaoEncontrosPage />} />
          <Route path="ranking" element={<Coord.CoordenacaoRankingPage />} />
          <Route path="ocorrencias" element={<Coord.CoordenacaoOcorrenciasPage />} />
          <Route path="comunicados" element={<Coord.CoordenacaoComunicadosPage />} />
          <Route path="premiacao" element={<Coord.CoordenacaoPremiacaoPage />} />
          <Route path="relatorios" element={<Coord.CoordenacaoRelatoriosPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NaoEncontradaPage />} />
    </Routes>
  );
}
