# Módulo: Atividades dos encontros

**Responsabilidade:** desafios com entrega e comprovante do servidor, prorrogação, presença e
participação, avaliação por rubrica com feedback, listas de questões com submissão única e
pontuação parcial da equipe (RF07–RF12, HU02, HU03; spec 006).

- `domain/`: tipos, validações puras (arquivo, link, atraso, situação) e montagem dos
  lançamentos do encontro com média por item (FR-026), usando o cálculo de `@/modules/pontuacao`.
- `data/`: repositório Supabase; entrega em duas etapas (Storage privado `entregas` + RPC) e
  toda escrita por RPC transacional, idempotente e auditada.
- `ui/`: formulários de desafio e lista, envio de entrega, presença, participação, avaliação,
  prorrogação, questões e pontuação do encontro.

Absorve as responsabilidades que estavam previstas em `desafios`, `presenca`, `avaliacao` e
`questoes`.
