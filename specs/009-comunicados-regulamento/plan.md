# Implementation Plan: Comunicados e regulamento

**Branch**: `009-comunicados-regulamento` | **Date**: 2026-11-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-comunicados-regulamento/spec.md`, com três
esclarecimentos registrados em 2026-11-02.

## Summary

Esta spec implementa o RF06 (Must) no módulo `src/modules/comunicados`, já previsto na
arquitetura (módulo 13).

- **Comunicados:** tabelas `comunicados` e `comunicado_turmas`, estados rascunho → publicado →
  retirado, escrita só por RPC (R1). Coordenação publica para qualquer público; docentes e
  mentores só para as turmas em que atuam, sem aprovação (R2). O público é avaliado na leitura
  (R3).
- **Avisos:** a publicação e cada correção geram avisos pela tabela `avisos` da spec 007; o selo
  "Novo" deriva do aviso não lido, sem tabela de leituras (R4). Publicar, corrigir e retirar são
  idempotentes e travam a linha (R5); correção e retirada exigem justificativa auditada (R6).
- **Regulamento:** o resumo passa a ler `edicoes.regras` por uma função pura
  `resumoDoRegulamento`, sem números fixos na tela (R8).
- **Telas:** comunicados em "Regulamento e avisos" (estudante), página nova "Comunicados"
  (docente/mentor) e "Comunicados e regulamento" (coordenação, hoje "em construção").
  Demonstração com repositório próprio e escritas desabilitadas (R9).

### Decisões dos esclarecimentos refletidas no desenho

| Decisão                                                                          | Requisito      | Onde está no desenho                                          |
| -------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| Coordenação, docentes e mentores publicam; docente/mentor só nas próprias turmas | FR-001, FR-002 | `app.exigir_autoria_comunicado` (R2)                          |
| Sem etapa de aprovação; coordenação vê e corrige tudo                            | FR-003, FR-009 | `comunicados_que_gerencio`, `app.exigir_gestor_do_comunicado` |
| Correção avisa de novo e volta o "Novo"                                          | FR-004         | `corrigir_comunicado` + aviso `comunicado_atualizado` (R4)    |

## Technical Context

- **Language/Version**: TypeScript ~6.0.3 (strict) e SQL do PostgreSQL 17 (PL/pgSQL).
- **Primary Dependencies**: as mesmas das specs anteriores; nenhuma dependência nova.
- **Storage**: Supabase local. Duas tabelas novas (`comunicados`, `comunicado_turmas`) e o
  `check` de `avisos.tipo` ampliado.
- **Testing**:
  - Vitest: `validarComunicado`, `resumoDoRegulamento`, repositório e componentes (axe);
  - pgTAP: `supabase/tests/010_comunicados.test.sql`;
  - Playwright: demonstração em `e2e/jornadas.spec.ts` e `e2e-supabase/comunicados.spec.ts`.
- **Target Platform**: PWA responsiva.
- **Project Type**: aplicação web (monólito modular) com banco Supabase.
- **Performance Goals**: uma chamada por lista; publicação para a edição do piloto (dezenas de
  pessoas) numa transação. Sem metas numéricas presumidas (RNF08).
- **Constraints**:
  - autorização e público só no servidor;
  - texto puro, sem interpretar marcação;
  - nada autenticado em cache; escrita exige conexão;
  - edição encerrada só leitura.
- **Scale/Scope**: uma edição, poucas turmas, dezenas de comunicados.

## Constitution Check

| Princípio           | Atendimento                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| I/IX SDD e rastreio | Spec 009 com três esclarecimentos; tarefas ligadas a US, FR e SC                                                    |
| II TDD              | pgTAP de autoria, público e avisos; testes de domínio e de componentes escritos e vistos falhando antes do código   |
| III Modular         | Módulo `comunicados` com `index.ts`; domínio TS puro; avisos lidos via `@/modules/resultado`                        |
| IV Estrito          | Formatos tipados; sem `any`                                                                                         |
| V Servidor          | RLS nas duas tabelas novas, escrita só por RPC, autoria e público checados no servidor, auditoria com justificativa |
| VI Dados            | Respostas sem e-mail nem ids de pessoas; lembrete para não incluir dados pessoais; nada em cache                    |
| VII Confirmação     | Mensagens de sucesso só após a resposta; escrita bloqueada sem conexão e na demonstração                            |
| VIII A11y           | axe em todos os componentes; selo "Novo" em texto; rótulos e contador de caracteres                                 |
| X Nada inventado    | Regulamento só com valores da edição ("a definir" se faltar); limites de tamanho **[validar]**                      |

Resultado antes e depois do desenho: **aprovado**.

## Project Structure

### Documentation (this feature)

```text
specs/009-comunicados-regulamento/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/rpc.md, contracts/telas.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
supabase/migrations/20261103120000_comunicados.sql
supabase/tests/010_comunicados.test.sql
src/modules/comunicados/
├── index.ts, README.md
├── domain/tipos.ts, domain/validacao.ts, domain/regulamento.ts (+ .test)
├── data/repositorioSupabase.ts (+ .test)
└── ui/ListaComunicados.tsx, GestaoComunicados.tsx, FormComunicado.tsx, ResumoRegulamento.tsx (+ testes)
src/modules/resultado/domain/tipos.ts        (TipoAviso com os tipos novos)
src/modules/organizacao/                     (Edicao expõe `regras`)
src/modules/demo/comunicados.ts (+ .test)
src/app/paginas/comunicados.tsx, aluno.tsx, coordenacao.tsx, rotas.tsx, navegacao.ts, dados/*
e2e/jornadas.spec.ts, e2e-supabase/comunicados.spec.ts
docs/decisoes-e-pendencias.md, docs/requisitos-e-referencias.md, docs/arquitetura.md
```

**Structure Decision**: o módulo `comunicados` reúne comunicados e o resumo do regulamento, como
previsto na arquitetura. As premissas **[validar]** (público por perfil e turma, limites de
tamanho, documento do regulamento ausente) entram em `docs/decisoes-e-pendencias.md`.

## Complexity Tracking

Nenhuma violação a justificar.
