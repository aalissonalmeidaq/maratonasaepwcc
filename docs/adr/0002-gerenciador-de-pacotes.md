# ADR 0002 — npm como gerenciador de pacotes

- **Status:** aceita (2026-10-29)
- **Contexto:** o pedido prefere pnpm se disponível. pnpm não está instalado; habilitá-lo
  (corepack) altera a instalação global do Node nas máquinas da unidade.
- **Decisão:** npm (vem com o Node 24), com `package-lock.json` versionado.
- **Consequências:** zero configuração extra. Migrar para pnpm é simples se a equipe preferir:
  `corepack enable`, `pnpm import`, remover o lock do npm e atualizar o README.
