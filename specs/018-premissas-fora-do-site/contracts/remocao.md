# Contrato da remoção

## Interface do aplicativo (depois)

| Antes                                                                                          | Depois                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Rotas `/master/premissas`, `/gestao/premissas`, `/coordenacao/premissas`, `/docente/premissas` | Inexistentes: a página "não encontrado" (curinga) |
| Itens de menu "Premissas em validação" (master, gestão, coordenação, docente)                  | Removidos                                         |
| Grupos de menu "Sistema" (master e gestão)                                                     | Removidos (ficariam vazios)                       |
| Aviso "Premissas aguardando resposta: N" no início do master                                   | Removido                                          |
| Botão "Baixar lista (CSV)" das premissas e tipo de arquivo `premissas`                         | Removidos                                         |

## Interface do servidor (depois)

| Chamada                      | Resultado                                              |
| ---------------------------- | ------------------------------------------------------ |
| `rpc premissas_em_validacao` | erro de função inexistente (HTTP 404, código PGRST202) |
| `rpc responder_premissa`     | erro de função inexistente (HTTP 404, código PGRST202) |

## Documentação (depois)

- `docs/premissas.md`: contém as 32 premissas, cada uma com os seis campos preenchidos.
- `docs/decisoes-e-pendencias.md` e `docs/operacao-e-homologacao.md`: apontam para
  `docs/premissas.md`; mantêm "o que depende da unidade na implantação" (e-mail, premiação,
  conferência visual).

## Invariantes verificáveis

1. Busca por `modules/premissas`, `premissas_em_validacao` e `responder_premissa` fora de
   migrations antigas, de `specs/` e do documento de premissas retorna 0 resultados no código.
2. `select count(*)` nas tabelas removidas falha por inexistência; a varredura de RLS do banco
   continua aprovada.
3. Typecheck, lint, testes de unidade, build, pgTAP e E2E passam.
