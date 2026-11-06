# Pesquisa: premissas fora do site

## R1 — O que existe no banco (e deve sair)

Inventário feito sobre as migrations `20261109120000` (criação), `20261110120000` (partes 6 e 8:
guarda de conta ativa e permissões) e `20261111/12/13` (resoluções):

| Objeto                                                                         | Origem               | Uso fora das premissas?                            |
| ------------------------------------------------------------------------------ | -------------------- | -------------------------------------------------- |
| tabela `public.premissas`                                                      | 015                  | não                                                |
| tabela `public.respostas_premissas` (gatilhos de imutabilidade e de auditoria) | 015                  | não                                                |
| tipo `public.decisao_premissa`                                                 | 015                  | não                                                |
| função `app.recusar_alteracao_de_resposta()`                                   | 015                  | não (só o gatilho da tabela)                       |
| função `app.resposta_json(respostas_premissas)`                                | 015                  | não                                                |
| função `app.atua_como_docente_em_alguma()`                                     | 015                  | não (busca confirmou: só `premissas_em_validacao`) |
| RPC `public.premissas_em_validacao()`                                          | 015, ajustada em 016 | não                                                |
| RPC `public.responder_premissa(text, decisao_premissa, text, uuid)`            | 015, ajustada em 016 | não                                                |
| política restritiva `conta_ativa` nas duas tabelas                             | 016 (parte 6)        | cai junto com as tabelas                           |

- **Decisão**: uma migration nova `20261114120000_remover_premissas.sql` com `drop ... if exists`,
  na ordem: funções públicas → `app.resposta_json` (tem parâmetro do tipo da tabela e precisa sair antes
  dela) → tabelas (`respostas_premissas` antes de `premissas`; os gatilhos caem junto) → demais
  funções auxiliares → tipo. Sem `cascade` genérico (cada objeto é nomeado), para a
  migration falhar se algo inesperado depender deles.
- **Rationale**: FR-004 e FR-005. Nomear cada objeto evita apagar por acidente algo de outra
  funcionalidade; `if exists` torna idempotente.
- **Alternativas**: `drop ... cascade` — descartado: esconderia dependência inesperada.

## R2 — Auditoria geral e chaves

A auditoria grava `tabela` e `registro_id` como texto (sem chave estrangeira para as tabelas de
negócio). As linhas antigas sobre `respostas_premissas` permanecem na trilha geral; isso é
intencional (a trilha é histórica) e responde ao ponto aberto da spec. Será conferido no teste de
banco (a migration não falha com linhas de auditoria existentes).

## R3 — Preservar o registro das 32 premissas

- **Decisão**: gerar `docs/premissas.md` a partir do catálogo do front (`CATALOGO_PREMISSAS` em
  `src/modules/demo/premissas.ts`, que espelha a migration 015) antes de apagá-lo: tabela por tema com
  código, pergunta, premissa em uso, onde afeta, opções, referência e resolução (P25: spec 016; as
  demais: decisão do projeto de 06/11/2026). Um script descartável (não commitado) lê o catálogo e
  escreve o Markdown; o documento é então formatado e revisado à mão.
- **Rationale**: FR-006 e SC-004 (contagem das 32 × 6 campos). Gerar evita erro de transcrição.
- **Alternativas**: transcrever à mão — descartado (risco de divergência).

## R4 — Navegação e rotas

- **Decisão**: remover os quatro itens de menu e os dois grupos "Sistema" (master e gestão), que
  ficariam vazios; remover as quatro rotas e o lazy import. O curinga `path="*"` já leva a
  `NaoEncontradaPage`; teste novo (E2E de demonstração) prova que as quatro rotas antigas caem nele
  com cada perfil logado.
- **Rationale**: FR-001 e FR-002. Menu sem grupo vazio é a navegação correta.
- **Atenção**: `navegacao.test.ts` hoje afirma o grupo "Sistema" para master e gestão; será
  atualizado primeiro (RED) para exigir a ausência.

## R5 — Resíduos textuais no código

Busca por "premissa" no `src` achou, além do módulo: `nomeDoArquivo('premissas', …)` em
`relatorios/domain/csv.ts` (tipo de arquivo exclusivo), a descrição de `Masters.tsx` ("e respondem
às premissas"), o exemplo "Esta premissa foi respondida…" em `shared/dados/erros` (teste e
comentário do tratamento do erro 40001), e o comentário "em validação como P30" em
`comunicados/domain/validacao.ts`. Decisão: remover o tipo e o texto do master; trocar o exemplo do
erro 40001 por mensagem genérica de conflito; ajustar o comentário de comunicados para citar o
documento de premissas. `tema.css` ("premissas iniciais" do Design System) não tem relação e fica.

## R6 — Testes de banco

- `016_premissas.test.sql` é removido por inteiro (testava só premissas).
- `017_unidades.test.sql` tem uma verificação da P25 (linha 45): removida; e ganha um bloco novo
  provando que as tabelas, as funções e o tipo não existem e que a varredura de RLS/guarda segue
  passando. As varreduras gerais (tabelas com política restritiva; RPCs com guarda) já cobrem tudo
  que sobra.
- Contagem de arquivos pgTAP cai de 17 para 16.

## R7 — Notas nas specs antigas

Uma nota de uma linha no topo de `specs/015-premissas-em-validacao/spec.md` e de
`specs/016-unidades-e-master/spec.md` ("Retirada do site pela spec 018; o registro das premissas
vive em `docs/premissas.md`"), sem reescrever o histórico (FR-010).

## R8 — E2E

- `e2e/premissas.spec.ts` e `e2e-supabase/premissas.spec.ts` são removidos; as rotas deixam de
  ser verificadas em `acessibilidade.spec.ts` e `telasPrincipais.ts`.
- Novo `e2e/premissas-removidas.spec.ts`: para cada perfil (master, gestão, coordenação, docente) a
  rota antiga mostra "não encontrado" e o menu não tem o item.
- No Supabase local: um teste novo em `e2e-supabase` chama as RPCs antigas e espera erro de função
  inexistente (prova no servidor).
