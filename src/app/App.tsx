import { BrowserRouter } from 'react-router';
import { AuthProvider, criarAdaptadorDemo, criarAdaptadorSupabase } from '@/modules/auth';
import { contasDemo } from '@/modules/demo';
import { ambiente } from '@/shared/lib/env';
import { obterSupabase } from '@/shared/lib/supabase';
import { AtualizacaoPwa, StatusConexao } from '@/shared/pwa';
import { ProvedorDeDados } from './dados/repositorios';
import { AvisoDemo } from './layout/AvisoDemo';
import { AppRotas } from './rotas';

function criarAuth() {
  if (ambiente.modo === 'demo') {
    const demo = criarAdaptadorDemo(contasDemo);
    return { adaptador: demo, entrarComo: demo.entrarComo };
  }
  if (ambiente.modo === 'supabase') {
    return { adaptador: criarAdaptadorSupabase(obterSupabase()), entrarComo: undefined };
  }
  return { adaptador: null, entrarComo: undefined };
}

const auth = criarAuth();

export function App() {
  return (
    <AuthProvider modo={ambiente.modo} adaptador={auth.adaptador} entrarComo={auth.entrarComo}>
      {ambiente.modo === 'demo' && <AvisoDemo />}
      <StatusConexao />
      <ProvedorDeDados>
        <BrowserRouter>
          <AppRotas />
        </BrowserRouter>
      </ProvedorDeDados>
      <AtualizacaoPwa />
    </AuthProvider>
  );
}
