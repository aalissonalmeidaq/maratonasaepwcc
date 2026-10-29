# ADR 0007 — Acesso a dados por repositórios + TanStack Query

- **Status:** aceita (2026-10-29)
- **Decisão:** cada módulo define um contrato de repositório no `domain/` e implementações
  em `data/` (Supabase) e em `modules/demo` (somente leitura, emulando a visibilidade de cada
  perfil). A aplicação escolhe a implementação pelo modo (`src/app/dados/repositorios.tsx`) e
  consome com **@tanstack/react-query 5** (cache em memória, invalidação após gravações).
- **Segurança:** chaves de cache prefixadas pelo ID da pessoa; o cache é limpo ao trocar de
  usuário (laboratórios compartilhados). Nada é persistido em disco.
- **Erros:** `ErroDeDados` converte códigos/constraints do Postgres em mensagens em português
  (`src/shared/dados/erros.ts`). Sucesso só é exibido após a resposta do servidor (`useEnvio`).
