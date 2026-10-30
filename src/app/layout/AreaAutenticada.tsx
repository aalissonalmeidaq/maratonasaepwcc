import type { Area } from '@/modules/acesso';
import { ProvedorDeDados } from '../dados/repositorios';
import { AppShell } from './AppShell';

/** Dados e navegação das áreas só são carregados após a autorização da rota. */
export default function AreaAutenticada({ area }: { area: Area }) {
  return (
    <ProvedorDeDados>
      <AppShell area={area} />
    </ProvedorDeDados>
  );
}
