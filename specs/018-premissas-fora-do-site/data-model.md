# Modelo de dados: premissas fora do site

Esta spec **remove** dados; não cria nada no banco.

## Removidos (migration `20261114120000_remover_premissas.sql`)

Ordem de remoção: funções públicas → `app.resposta_json` → tabelas → demais funções auxiliares → tipo.

| Objeto                                                          | Tipo      | Observação                                                              |
| --------------------------------------------------------------- | --------- | ----------------------------------------------------------------------- |
| `public.respostas_premissas`                                    | tabela    | só respostas de teste; gatilhos de imutabilidade e auditoria caem junto |
| `public.premissas`                                              | tabela    | catálogo P01–P32; o conteúdo vai para `docs/premissas.md` antes         |
| `public.decisao_premissa`                                       | tipo enum | só a tabela de respostas o usava                                        |
| `public.premissas_em_validacao()`                               | função    | leitura do catálogo                                                     |
| `public.responder_premissa(text, decisao_premissa, text, uuid)` | função    | registro de resposta                                                    |
| `app.recusar_alteracao_de_resposta()`                           | função    | só o gatilho removido                                                   |
| `app.resposta_json(respostas_premissas)`                        | função    | só a RPC de leitura                                                     |
| `app.atua_como_docente_em_alguma()`                             | função    | só a RPC de leitura                                                     |

## Preservados

- Linhas da auditoria geral que mencionam `respostas_premissas` (trilha histórica; sem chave
  estrangeira).
- Todas as demais tabelas, funções, políticas e tipos.

## Novo (somente documentação)

**Premissa (documento `docs/premissas.md`)** — uma linha por premissa, agrupada por tema:

| Campo           | Regra                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| Código          | `P01`…`P32`, sem lacunas e sem repetição                                                                        |
| Tema            | um de: Pontuação; Equipes e atividades; Acesso e edições; Comunicados e relatórios; Identidade visual; Operação |
| Pergunta        | termina com `?`                                                                                                 |
| Premissa em uso | texto atual do catálogo                                                                                         |
| Onde afeta      | texto atual do catálogo                                                                                         |
| Opções          | lista do catálogo                                                                                               |
| Referência      | documento e seção                                                                                               |
| Resolução       | `spec 016` (P25) ou `decisão do projeto de 06/11/2026` (demais)                                                 |
