# Contrato — telas (spec 002, revisão 2026-10-30)

## Rotas públicas novas (fora da área autenticada; sem dados no cache do service worker)

| Rota               | Conteúdo                                                                                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/primeiro-acesso` | Lê o token do fragmento (`#t=...`, não vai para logs do servidor) e pede "Nova senha" e "Confirmar senha". Sucesso só após resposta do servidor; então "Entrar" com e-mail preenchido. Token inválido/vencido: mensagem da função e links para "Esqueci minha senha". |
| `/esqueci-senha`   | Campo "E-mail" e "Enviar link". Resposta sempre igual: "Se o e-mail estiver cadastrado, enviamos um link válido por 1 hora."                                                                                                                                          |
| `/redefinir-senha` | Recebe a sessão de recuperação do Auth; "Nova senha" + "Confirmar senha". Link vencido: orientação para pedir outro.                                                                                                                                                  |

- Entrada (`/entrar`): link "Esqueci minha senha" junto do campo de senha.
- **Coordenação necessária**: `src/app/rotas.tsx` e `src/app/paginas/comum.tsx` estão sendo
  editados por outra sessão; as rotas novas e o link entram combinando com ela.

## Organização (coordenação)

- **Criar conta**: sem o campo "Senha provisória". Sucesso: "Conta criada. Enviamos o convite
  para ana@…" ou, com `conviteEnviado: false`, aviso para reenviar.
- **Pessoas e vínculos**: coluna "Acesso" com `StatusBadge` "Aguardando primeiro acesso" /
  "Acesso ativo" (texto, não só cor) e, nas pendentes, ações "Reenviar convite" e "Corrigir
  e-mail" (formulário na linha → diálogo de confirmação). A busca considera a situação.
- **Importar alunos (CSV)** — dentro de "Turmas" ou como seção própria com atalho:
  1. escolher turma e arquivo (`.csv`, até 500 linhas);
  2. prévia em tabela paginada: válidas e recusadas (linha, motivo), sem gravar nada;
  3. "Importar N alunos" → relatório: criadas (convite enviado ou não), vinculadas, recusadas.
- Modo demonstração: tudo visível, gravações bloqueadas com o aviso existente.
