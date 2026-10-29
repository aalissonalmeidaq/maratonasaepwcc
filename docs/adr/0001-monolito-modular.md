# ADR 0001 — Monólito modular com Supabase

- **Status:** aceita (2026-10-29)
- **Contexto:** equipe pequena, piloto com regras ainda em validação, exigência de segurança no servidor.
- **Decisão:** um repositório e uma SPA Vite/React; módulos de negócio em `src/modules/<m>` com
  `domain/` puro, `data/`, `ui/` e `index.ts` público; Supabase (Auth, Postgres+RLS, Storage) como
  ambiente confiável. Limites verificados pelo ESLint (`no-restricted-imports`).
- **Consequências:** implantação simples; regras críticas precisam existir também no banco
  (RPC/SQL) para serem confiáveis; microsserviços exigem emenda à constituição.
