// Edge Function: importação de alunos por CSV (spec 002, FR-015). Implementada na T097.
import '@supabase/functions-js/edge-runtime.d.ts';
import { withSupabase } from '@supabase/server';

export default {
  fetch: withSupabase({ auth: 'user' }, () =>
    Response.json({ erro: 'Importação ainda não disponível.' }, { status: 501 }),
  ),
};
