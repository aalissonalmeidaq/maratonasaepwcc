# ADR 0004 — Modo demonstração explícito

- **Status:** aceita (2026-10-29)
- **Contexto:** o primeiro ciclo precisa de telas navegáveis para três perfis sem dados reais.
- **Decisão:** adaptador de autenticação de demonstração (`criarAdaptadorDemo`) que apenas escolhe
  uma conta fictícia; dados em `src/modules/demo`. Ativado por `VITE_DEMO_MODE=true` ou em
  `npm run dev` sem Supabase. Faixa "Modo demonstração — dados fictícios, acesso não seguro" em
  todas as telas. Fora do modo demo, as telas não exibem dados fictícios.
- **Consequências:** a demonstração **não é segura** e nunca deve receber dados reais. O envio de
  entregas fica desabilitado na demo (não há servidor para confirmar). Remover o módulo `demo`
  antes da produção (PRD §16).
