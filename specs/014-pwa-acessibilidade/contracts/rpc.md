# Contrato: RPCs

## `public.regulamento_publico() → jsonb`

- `security definer`, `stable`, `search_path = ''`; `grant execute` a `anon` e `authenticated`.
- Sem parâmetros; a resposta não depende de quem chama.
- Resposta (FR-001, FR-003):

```json
{
  "geradoEm": "2026-11-04T12:00:00Z",
  "edicoes": [
    {
      "id": "uuid",
      "nome": "Edição 2026",
      "inicio": "2026-03-01",
      "fim": "2026-12-01",
      "regras": {},
      "regrasVersao": "piloto-1",
      "encontros": [
        {
          "numero": 1,
          "titulo": "Abertura",
          "data": "2026-03-10",
          "inicio": "08:00:00",
          "fim": null,
          "estado": "realizado"
        }
      ]
    }
  ]
}
```

- Só edições `estado = 'ativa'` e `regulamento_publico`; sem nenhuma, `"edicoes": []`.
- Chaves exatamente as acima (o teste pgTAP compara o conjunto de chaves de edição e encontro).

## `public.definir_regulamento_publico(p_id uuid, p_publico boolean) → jsonb`

- `security definer`, `search_path = ''`; `grant execute` só a `authenticated`.
- `app.exigir_coordenacao_de(p_id)`: outros perfis recebem `42501`.
- Edição não `ativa`: `23514` "Só edições ativas podem ter o regulamento público.".
- Mesmo valor já gravado: devolve sem `update` (sem linha nova de auditoria).
- Resposta: `{ "regulamentoPublico": true | false }`.

## `public.edicoes_que_coordeno()` (alterada)

- Acrescenta `"regulamentoPublico": boolean` a cada edição. Demais campos como na spec 013.

## Restrições de segurança e consistência

- `regras` do exemplo representa exclusivamente a projeção pública dos campos consumidos pelo
  resumo da spec 009; nunca serializar o JSON integral. Seleção recursiva de campos, sem extras
  em critérios/faixas. Teste de contrato inclui sentinelas privadas aninhadas e valores ausentes.
- Ordenação: início crescente com nulos no fim, nome e id; encontros por número.
- Revogar EXECUTE de PUBLIC nas novas funções e conceder apenas aos papéis previstos. Usar
  nomes de objetos qualificados. Não conceder SELECT anônimo nas tabelas de origem.
- Publicar/retirar exige vínculo ativo de coordenação na edição, não apenas papel global.
  Recusar coordenação de outra edição; recusar `p_publico` nulo como entrada inválida.
- Bloquear a linha da edição, verificar estado e atualizar a marca na mesma transação;
  auditoria existente registra autor/instante/antes/depois. Recusar alteração da marca por
  UPDATE REST ou funções genéricas; testar também esses caminhos de bypass.
- Encerramento concorrente não permite exposição posterior; leitura filtra sempre estado
  ativo no servidor. Reenvio do mesmo valor não faz UPDATE nem gera nova auditoria.
- A página utiliza transporte anônimo separado, mesmo se quem abre estiver autenticado.
