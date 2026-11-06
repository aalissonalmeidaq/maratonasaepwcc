# Modelo de dados: Premissas em validação

## `public.premissas` (catálogo da instalação)

| Campo             | Tipo     | Regra                                                                                                           |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `codigo`          | `text`   | PK; `^P[0-9]{2,3}$`                                                                                             |
| `tema`            | `text`   | um de: Identidade visual, Pontuação, Equipes e atividades, Acesso e edições, Comunicados e relatórios, Operação |
| `ordem`           | `int`    | ordem de exibição dentro do tema; `not null`                                                                    |
| `pergunta`        | `text`   | 10–300 caracteres                                                                                               |
| `premissa_em_uso` | `text`   | 10–500 caracteres                                                                                               |
| `onde_afeta`      | `text`   | 10–500 caracteres                                                                                               |
| `opcoes`          | `text[]` | `not null default '{}'`                                                                                         |
| `referencia`      | `text`   | documento/spec de origem                                                                                        |
| `resolvida_por`   | `text`   | `null` = em validação; ex.: `'spec 016'` quando retirada                                                        |

- Preenchida pela migration (Apêndice A da spec). Sem escrita por RPC ou REST.
- RLS ligada, sem políticas; sem grants para `anon`/`authenticated`.

## `public.respostas_premissas` (só inserção)

| Campo           | Tipo                    | Regra                              |
| --------------- | ----------------------- | ---------------------------------- |
| `id`            | `uuid`                  | PK, `gen_random_uuid()`            |
| `premissa`      | `text`                  | FK `premissas(codigo)`             |
| `decisao`       | enum `decisao_premissa` | `confirmada` \| `precisa_mudar`    |
| `justificativa` | `text`                  | `btrim` com 10–2.000 caracteres    |
| `autor_id`      | `uuid`                  | FK `perfis(id)`; quem chamou a RPC |
| `autor_nome`    | `text`                  | cópia de `perfis.nome` no registro |
| `registrado_em` | `timestamptz`           | `default now()`                    |

- Situação atual de uma premissa: a resposta com maior `(registrado_em, id)`; sem resposta →
  "Aguardando resposta".
- Imutável: sem `update`/`delete` (sem grants; gatilho recusa por garantia).
- Auditoria: gatilho `auditoria_respostas_premissas` (`app.registrar_auditoria`), justificativa
  em `app.justificativa`.
- RLS ligada, sem políticas; sem grants para `anon`/`authenticated`.

## Situação (derivada)

```text
aguardando ──responder──▶ confirmada | precisa_mudar ──responder──▶ confirmada | precisa_mudar …
premissa com resolvida_por ⇒ fora da lista de pendentes; histórico ainda legível
```

## Tipos no front (`@/modules/premissas`)

```text
Decisao = 'confirmada' | 'precisa_mudar'
Situacao = 'aguardando' | Decisao
Resposta { id; decisao; justificativa; autorNome; registradoEm }
Premissa { codigo; tema; ordem; pergunta; premissaEmUso; ondeAfeta; opcoes: string[];
           referencia; resolvidaPor: string | null; situacao: Situacao;
           atual: Resposta | null; historico: Resposta[] }   // historico: mais antiga primeiro
CatalogoDePremissas { podeResponder: boolean; premissas: Premissa[] }
RepositorioPremissas {
  premissas(): Promise<CatalogoDePremissas>
  responder(e: { codigo; decisao; justificativa; respostaBase: string | null }): Promise<Resposta>
}
```
