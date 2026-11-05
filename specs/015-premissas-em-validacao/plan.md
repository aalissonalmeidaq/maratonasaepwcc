# Implementation Plan: Premissas em validação

**Branch**: `015-premissas-em-validacao` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-premissas-em-validacao/spec.md`, com as decisões
de 2026-11-05 (tela na coordenação; catálogo e respostas da instalação; docentes e mentores
leem; CSV e impressão).

## Summary

- **Catálogo (R1):** tabela `premissas` preenchida pela migration com P01–P32; retirada por
  `resolvida_por`, nunca apagada.
- **Respostas (R2–R4):** tabela `respostas_premissas` só de inserção, auditada; RPC
  `responder_premissa` só da coordenação, com resposta-base contra concorrência; leitura por
  `premissas_em_validacao` para coordenação, docentes e mentores.
- **Tela (R5–R6):** módulo `@/modules/premissas`; rotas na coordenação e no docente; cartão no
  início da coordenação; CSV com `gerarCsv` e versão para impressão por CSS.
- **Fuso (R7):** quatro funções recriadas com `America/Fortaleza`; CSV no mesmo fuso.
- **Documentação (R9):** marcas em aberto apontam para o catálogo ou viram "resolvido por".

| Decisão                                 | Requisito          | Onde está no desenho                                                  |
| --------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| Catálogo da instalação, fixo por versão | FR-001, FR-002     | `premissas` + migration (R1)                                          |
| Situação, filtros, total                | FR-003             | `PremissasPage` (R5)                                                  |
| Coordenação responde; docentes leem     | FR-004, SC-004     | RPCs com `e_coordenacao_em_alguma`/`atua_como_docente_em_alguma` (R3) |
| CSV e impressão                         | FR-004a            | `gerarCsv`, `@media print` (R6)                                       |
| Indicador no início                     | FR-005             | cartão no início da coordenação (R5)                                  |
| Resposta com justificativa e histórico  | FR-006, FR-007     | `respostas_premissas` (R2)                                            |
| Concorrência                            | FR-008             | `p_resposta_base`, `40001` (R4)                                       |
| Confirmação só após o servidor; offline | FR-009             | `useEnvio`, `useOnline` (padrão existente)                            |
| Auditoria                               | FR-010, SC-002     | gatilho `registrar_auditoria` (R2)                                    |
| "Precisa mudar" não muda o sistema      | FR-011             | nenhuma ligação com regras; aviso na tela                             |
| Limpeza e fuso                          | FR-012–014, SC-003 | migration de fuso (R7), documentação (R9)                             |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: as mesmas; nenhuma dependência nova.
- **Storage**: migration `20261109120000_premissas_em_validacao.sql` (enum, duas tabelas, RLS,
  gatilhos, RPCs, catálogo) e `20261109121000_fuso_fortaleza.sql` (quatro funções recriadas).
- **Testing**: pgTAP `supabase/tests/016_premissas.test.sql` (novo), 009 e 012 ajustados ao
  fuso; Vitest no domínio, repositório, página, cartão, demonstração e CSV (+ axe); E2E de
  demonstração (`e2e/premissas.spec.ts`, telas da spec 014 incluem a nova) e Supabase
  (`e2e-supabase/premissas.spec.ts`).
- **Target Platform**: PWA responsiva. **Project Type**: aplicação web com Supabase.
- **Performance Goals**: 32 premissas e poucas respostas; uma leitura por tela. Sem metas
  presumidas (RNF08).
- **Constraints**: respostas imutáveis; nenhum `select` direto; nada muda regras.
- **Scale/Scope**: duas tabelas, três funções novas, quatro recriadas, um módulo de front.

## Constitution Check

| Princípio           | Atendimento                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 015 com esclarecimentos; tarefas ligadas a FR e SC                                   |
| II TDD              | pgTAP, domínio, repositório e telas vistos falhando antes do código                       |
| III Modular         | Módulo `premissas` com `index.ts`; CSV via `@/modules/relatorios`; domínio em TS puro     |
| IV Estrito          | Tipos do contrato no domínio; respostas pela `verificar`, como os demais repositórios; sem `any`                             |
| V Servidor          | Autorização e validação nas RPCs; tabelas com RLS e sem grants; recusas testadas em pgTAP |
| VI Dados            | Só nome do autor (sem e-mail ou id) nas respostas; estudantes não leem                    |
| VII Confirmação     | Situação muda só após a resposta; offline bloqueado                                       |
| VIII A11y           | axe em componentes e E2E; rótulos, `aria-expanded`, foco no aviso de recusa               |
| X Nada inventado    | Texto do catálogo vem da documentação existente; respostas não alteram regras             |

Resultado antes e depois do desenho: **aprovado**, sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/015-premissas-em-validacao/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/rpc.md, contracts/telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/migrations/20261109120000_premissas_em_validacao.sql
supabase/migrations/20261109121000_fuso_fortaleza.sql
supabase/tests/016_premissas.test.sql; 009_paineis_relatorios.test.sql, 012_regras.test.sql (fuso)
src/modules/premissas/{index.ts, domain/(tipos, validacao, situacao, linhasCsv).ts,
  data/repositorioSupabase.ts, ui/(PremissasPage, CartaoPremissa, FormResposta).tsx} (+ testes)
src/modules/relatorios/domain/csv.ts (fuso; tipo 'premissas' no nome do arquivo)
src/modules/demo/premissas.ts, repositorios.ts (+ teste)
src/app/dados/repositorios.tsx, useRepositorios.ts; src/app/rotas.tsx; src/app/navegacao.ts;
  src/app/paginas/premissas.tsx; src/app/paginas/coordenacao.tsx (cartão)
e2e/premissas.spec.ts; e2e/suporte/telasPrincipais.ts; e2e-supabase/premissas.spec.ts
docs/decisoes-e-pendencias.md; código com comentários [validar] (migrations antigas não são editadas)
```

**Structure Decision**: catálogo e respostas no servidor (fonte única para coordenação e
docentes); o módulo `premissas` só exibe, filtra, exporta e envia respostas.

## Complexity Tracking

Sem violações a justificar.
