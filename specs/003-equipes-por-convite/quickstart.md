# Quickstart — validar a spec 003

Pré-requisitos: Node >=22.12, dependências instaladas, Docker e CLI Supabase. Os comandos
abaixo são para banco exclusivamente local (portas 5442x), com dados fictícios descartáveis.
Executar na implementação, após criar os testes e a migration; este guia não afirma execução.

```powershell
supabase start
supabase db reset --local  # recria somente o banco local; migrations + seed fictício
npm run test:db            # pgTAP, inclusive supabase/tests/005_equipes_por_convite.test.sql
npm run verify             # typecheck, lint, Vitest, build
npm run test:e2e           # jornadas em modo demonstração
$env:E2E_SUPABASE_URL = 'http://127.0.0.1:54421'
$env:E2E_SUPABASE_ANON_KEY = '<chave publica local de supabase status>'
npm run test:e2e:supabase
```

## Cenários manuais (seed)

1. Entrar como `elisa@exemplo.invalid` → "Minha equipe" → marcar Fábio → "Enviar convite".
2. Entrar como `fabio@exemplo.invalid` → "Aceitar". Os dois veem "Elisa e Fábio".
3. Elisa define o nome; tentar de novo ⇒ campo não aparece; via API ⇒ recusa.
4. Entrar como `coordenacao@exemplo.invalid` → "Equipes": não há "Formar dupla"; alterar a
   equipe com justificativa e ver o histórico.
5. Entrar como `docente2@exemplo.invalid` (outra turma): a equipe da turma A não aparece.

Trio e concorrência são cobertos pelo pgTAP (a turma A do seed tem número par de alunos).

## Matriz de validação adicional

Usar fixtures locais isoladas para paridade e convites; não modificar o seed para simular dados
reais. Restaurar o estado entre cenários. Consultar [RPCs](contracts/rpc.md) e
[modelo de dados](data-model.md) para invariantes.

| Cenário                                                   | Resultado esperado                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Trio com um aceite; convidado retira                      | Convite inteiro cancelado; outros convites preservados; nenhuma equipe |
| Retirada disputa com último aceite                        | Uma transição vence; sem equipe desfeita ou formação parcial           |
| Dois aceites de convites concorrentes para mesmo aluno    | Uma equipe; conflito claro para a outra tentativa                      |
| Duas formações de trio na turma                           | No máximo um trio                                                      |
| Trio existente, turma passa a ser par                     | Trio preservado e aviso para gestão                                    |
| Desativar integrante                                      | Integrante preservado, convites cancelados e aviso para gestão         |
| Remover integrante de dupla                               | Recusa; substituir ou desfazer continuam disponíveis                   |
| Substituir por aluno em outra equipe                      | Recusa sem alterar equipes                                             |
| Coordenação forma equipe ou renomeia                      | Recusa no servidor                                                     |
| Gestão escolhe primeiro nome                              | Recusa; integrante atual ativo pode escolher                           |
| Docente/mentor da turma renomeia após escolha             | Sucesso com justificativa e histórico                                  |
| Ex-integrante tenta nomear; docente de outra turma altera | Recusa no servidor                                                     |
| Cadastro/ativação concluído junto com formação de trio    | Trio preservado e aviso de trio em turma par (FR-013)                  |
| Repetir aceite após resposta de rede perdida              | Releitura mostra resultado único, sem duplicar equipe                  |

Concorrência requer duas conexões com transações sobrepostas, além do pgTAP sequencial;
registrar evidência das duas respostas e do estado final. Verificar teclado, foco e estados
de erro/vazio/offline em celular, tablet e desktop. Toda escrita direta nas novas tabelas
por `anon` ou `authenticated` deve falhar. Reexecutar jornadas de contas e CSV afetadas.

## Ambiente verificado (T001, 2026-10-30)

- Node v24.21.0; Supabase CLI 2.118.0; Supabase local ativo (containers `*_maratona`, portas
  5442x). Nenhum banco remoto usado.
- Base antes da spec 003: `npm run test:db` com 4 arquivos e 95 testes pgTAP, todos aprovados.
- `src/modules/duplas/domain/equipes.test.ts` já existia (escrito antes da clarificação) e é
  revisado em T008.

## Concorrência com duas conexões reais (T037, executado em 2026-10-30)

Comando: `node scripts/testar-concorrencia-equipes.mjs` (Supabase local iniciado). O script cria
uma edição fictícia isolada com turma ímpar de 7 alunos, abre duas sessões `psql` no container
local com transações sobrepostas (a primeira segura a transação por 1 s; a segunda começa 200 ms
depois e espera o bloqueio da turma) e apaga as fixtures ao final.

| Disputa                                       | Respostas                                           | Resultado                                                 |
| --------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Dois aceites para o mesmo remetente           | sucesso / "Este convite não está mais pendente."    | uma equipe                                                |
| Retirada de aceite × último aceite do trio    | sucesso / "Este convite não está mais pendente."    | convite cancelado (`aceite_retirado`), sem equipe parcial |
| Dois últimos aceites de trio na mesma turma   | sucesso / "Este convite não está mais pendente."    | um trio                                                   |
| Inclusão pelo docente × aceite do mesmo aluno | "Nesta turma não é possível formar trio." / sucesso | aluno em uma equipe                                       |

Invariantes ao final: 0 alunos em duas equipes, 1 trio na turma, 0 equipes com menos de dois
integrantes (`aprovado: true`). Na terceira disputa os dois convites tinham um aluno em comum;
a segunda tentativa foi recusada porque a formação do primeiro trio cancelou o outro convite.

## Portões executados (T040, 2026-10-30)

| Comando                                        | Resultado                                                |
| ---------------------------------------------- | -------------------------------------------------------- |
| `npm run verify`                               | aprovado (typecheck, lint, 414 testes Vitest, build)     |
| `npm run test:db` (após `db reset`)            | 5 arquivos, 268 testes pgTAP aprovados                   |
| `npm run test:e2e:supabase` (após reset)       | 29 aprovados (inclui regressão de contas sem alterações) |
| `node scripts/testar-concorrencia-equipes.mjs` | aprovado (ver tabela acima)                              |
| `npm run test:e2e`                             | 31 aprovados (série e paralelo)                          |

Observação: com o servidor de desenvolvimento frio, uma execução paralela do `test:e2e` teve
8 testes do desktop expirando no primeiro `page.goto` (o Vite recarregou módulos durante a
otimização de dependências); as reexecuções em série e em paralelo passaram integralmente.
