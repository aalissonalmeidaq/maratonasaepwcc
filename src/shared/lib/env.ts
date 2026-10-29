/**
 * Variáveis públicas do navegador. Somente valores com prefixo VITE_ chegam aqui e todos são
 * visíveis a qualquer pessoa: nunca coloque segredos (service_role, senhas, tokens privados).
 */
export type ModoAmbiente = 'supabase' | 'demo' | 'nao-configurado';

export interface Ambiente {
  modo: ModoAmbiente;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

interface VariaveisBrutas {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_DEMO_MODE?: string;
  DEV?: boolean;
}

function papelDoJwt(chave: string): string | undefined {
  const payload = chave.split('.')[1];
  if (!payload) return undefined;
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      role?: unknown;
    };
    return typeof json.role === 'string' ? json.role : undefined;
  } catch {
    return undefined;
  }
}

export function resolverAmbiente(env: VariaveisBrutas): Ambiente {
  const url = env.VITE_SUPABASE_URL?.trim() || undefined;
  const chave = env.VITE_SUPABASE_ANON_KEY?.trim() || undefined;

  if (chave && (papelDoJwt(chave) === 'service_role' || chave.startsWith('sb_secret_'))) {
    throw new Error(
      'Chave service_role/secreta detectada no frontend. Use apenas a chave pública (anon/publishable).',
    );
  }

  if (env.VITE_DEMO_MODE === 'true') return { modo: 'demo' };
  if (url && chave) return { modo: 'supabase', supabaseUrl: url, supabaseAnonKey: chave };
  if (env.DEV) return { modo: 'demo' };
  return { modo: 'nao-configurado' };
}

export const ambiente: Ambiente = resolverAmbiente(import.meta.env);
