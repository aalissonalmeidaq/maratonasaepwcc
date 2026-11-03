# Contratos RPC: painéis e relatórios

## Regras gerais

- **Execução:** todas as funções são `security definer` e usam `search_path = ''`. Nenhuma pode
  ser executada por `anon`.
- **Códigos de erro**, os mesmos das specs anteriores:
  - `42501`: sem papel ou sem vínculo, com mensagem em português;
  - `23514`: regra violada.
- **Edição encerrada:** todas as funções continuam funcionando (só leitura).
- **Dados expostos:** nenhuma resposta contém a chave `nota` (nota individual da prova).

| Função                                                                                   | Quem chama                     | Retorno               | Regras                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `painel_do_aluno(p_edicao uuid)`                                                         | aluno                          | `PainelDoAluno`       | Só a própria equipe, a categoria dela e os próprios avisos.                                                                                                                                       |
| `painel_da_gestao(p_edicao uuid)`                                                        | docente ou mentor              | `PainelDaGestao`      | Só as turmas em que atua. Quem não é docente nem mentor recebe `42501`.                                                                                                                           |
| `painel_da_coordenacao(p_edicao uuid)`                                                   | coordenação                    | `PainelDaCoordenacao` | Quem não é coordenação recebe `42501`.                                                                                                                                                            |
| `relatorio(p_tipo text, p_edicao uuid, p_categoria text, p_turma uuid, p_encontro uuid)` | coordenação, docente ou mentor | `Relatorio`           | Tipo desconhecido: `23514`. Aluno: `42501`. Docente ou mentor pedindo turma em que não atua: `42501`; sem filtro, recebe só as próprias turmas. Grava `exportacoes_relatorio` na mesma transação. |
