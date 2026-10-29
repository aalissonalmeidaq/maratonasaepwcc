# Research — Spec 001

| Decisão                | Escolha                                                  | Alternativas         | Motivo                                                                                                 |
| ---------------------- | -------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| Gerenciador de pacotes | npm 12                                                   | pnpm (ausente), yarn | Vem com o Node; pnpm exigiria alterar a instalação global (corepack) nas máquinas da unidade. ADR 0002 |
| TypeScript             | 6.0.x                                                    | 7.0 (mais recente)   | `typescript-eslint` 8.72 exige TS < 6.1                                                                |
| ESLint                 | 9.39                                                     | 10.x                 | `eslint-plugin-jsx-a11y` 6.10 suporta até ESLint 9                                                     |
| Roteamento             | React Router 8 (modo declarativo)                        | TanStack Router      | Estável, conhecido, rotas aninhadas e proteção simples                                                 |
| Formulários            | react-hook-form + zod 4                                  | Formik               | Leve, tipado, validação compartilhável                                                                 |
| Estilo                 | Tailwind 4 com `@theme` alimentado pelos tokens oficiais | CSS Modules          | Tokens do Design System viram utilitários                                                              |
| PWA                    | vite-plugin-pwa 2 (Workbox 7), `registerType: prompt`    | SW manual            | Atualização segura sob controle da pessoa usuária                                                      |
| Ícones                 | lucide-react via componente `Icon` (provisório)          | PNG das pranchas     | Pranchas não são vetoriais (Design System §8)                                                          |
| Fonte                  | Montserrat via @fontsource (OFL, auto-hospedada)         | Google Fonts CDN     | Funciona offline e evita rastreio de terceiros                                                         |
| Testes RLS             | pgTAP com `supabase test db`                             | testes JS com chaves | Executa dentro do banco local, sem service_role no código                                              |

Compatibilidade verificada por `npm view <pacote> peerDependencies` em 2026-10-29.
