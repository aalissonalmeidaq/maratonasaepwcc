# Contratos de tela: encerramento da edição por turma

Componente `EstadoDaEdicao` em `src/modules/organizacao/ui`. Passa no axe, funciona a partir de
360 px e é operável por teclado; estados por texto.

## Coordenação — `/coordenacao/edicoes`, edição ativa, "Encerrar edição"

- Lista de pendências (`ListaDePendencias`): ocorrências sem decisão e pedidos de revisão abertos
  (spec 010) e "Turmas sem ranking definitivo", uma linha por turma: "3º ano A (Categoria A):
  Provisório" / "Parcial" / "Sem publicação". Sem turmas pendentes: "Todas as turmas têm o ranking
  definitivo".
- Confirmação com justificativa, como na spec 010; as pendências não impedem.

## Coordenação — edição encerrada

- Aviso com a data e a justificativa (spec 010) e, abaixo, "Pendências registradas no
  encerramento", com a mesma lista no formato gravado: turmas (encerramentos novos) ou
  "Categorias sem ranking publicado: …" (anteriores). Sem registro: "Pendências do encerramento
  não registradas".
