# ADR 0003 — Versões e compatibilidade

- **Status:** aceita (2026-10-29)
- **Verificação:** `npm view <pacote> version peerDependencies` em 2026-10-29.
- **Decisões:**
  - TypeScript **6.0.x** (não 7.0): `typescript-eslint` 8.72 exige `<6.1`.
  - ESLint **9.39** (não 10): `eslint-plugin-jsx-a11y` 6.10 suporta até ESLint 9.
  - Vite 8, React 19.3, React Router 8 (modo declarativo), Tailwind 4.3 (`@tailwindcss/vite`),
    vite-plugin-pwa 2 (Workbox 7.4), Vitest 5, Playwright 1.64, zod 4, react-hook-form 7.
  - Node ≥ 22.12 (testado em 24.21).
- **Revisar** quando `typescript-eslint` e `jsx-a11y` declararem suporte às versões novas.
