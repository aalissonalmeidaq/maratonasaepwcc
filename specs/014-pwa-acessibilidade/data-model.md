# Modelo de dados: PWA, regulamento público offline e acessibilidade

## `public.edicoes` (coluna nova)

| Campo                 | Tipo      | Regra                                                               |
| --------------------- | --------- | ------------------------------------------------------------------- |
| `regulamento_publico` | `boolean` | `not null default false`; muda só por `definir_regulamento_publico` |

- Só muda com a edição `ativa`; rascunho e encerrada recusam (`23514`). Encerrar não altera a
  marca: a edição sai da página pública pelo filtro `estado = 'ativa'`.
- Auditoria: o gatilho `auditoria_edicoes` registra o `update` (quem, quando, antes e depois).
- Sem tabela nova; RLS de `edicoes` inalterada (`anon` sem acesso à tabela).

## Regulamento público (resposta de `regulamento_publico()`)

```text
RegulamentoPublico
├── geradoEm: timestamptz (instante da resposta)
└── edicoes[]: por inicio, nome
    ├── id, nome, inicio, fim
    ├── regras (projeção pública das regras vigentes), regrasVersao
    └── encontros[]: por numero
        └── numero, titulo, data, inicio, fim, estado (agendado | realizado | cancelado)
```

Campos proibidos (FR-002): ambiente, orientações, avaliação objetiva, turmas, cursos, pessoas,
equipes, notas, pontuações, ocorrências, comunicados e premiação.

## Cópia local (navegador)

| Chave                                              | Valor                                                   |
| -------------------------------------------------- | ------------------------------------------------------- |
| `maratona:regulamento-publico:v1:<modo>:<projeto>` | `{ salvoEm: string ISO, conteudo: RegulamentoPublico }` |

- Gravação tentada após cada resposta pública válida; só é confirmada quando o armazenamento
  aceita a escrita. Falha não impede a leitura online (FR-006a).
- Lida e validada quando offline ou com falha de rede.
- Inválida ou ausente: tratada como "sem cópia". Não é apagada em "Sair" (conteúdo público).

## Tipos no front (`@/modules/publico`)

```text
EncontroPublico    { numero; titulo; data; inicio | null; fim | null; estado }
EdicaoPublica      { id; nome; inicio | null; fim | null; regras: unknown; regrasVersao; encontros }
RegulamentoPublico { geradoEm; edicoes: EdicaoPublica[] }
LeituraDoRegulamento =
  | { origem: 'servidor'; conteudo; persistencia: 'salva'; salvoEm }
  | { origem: 'servidor'; conteudo; persistencia: 'falhou' }
  | { origem: 'copia'; salvoEm; conteudo }
  | { origem: 'sem-copia' }
RepositorioPublico { regulamentoPublico(): Promise<RegulamentoPublico> }

EdicaoGerida.regulamentoPublico: boolean                                     (organizacao)
RepositorioOrganizacao.definirRegulamentoPublico(id, publico): Promise<{ regulamentoPublico }>
```

`persistencia` descreve a gravação local, separada do sucesso da consulta pública. `salvoEm`
da resposta atual só é exposto após gravação bem-sucedida. Em `persistencia: 'falhou'`, a tela
renderiza `conteudo` e o aviso FR-006a, sem anunciar que a resposta atual está salva.
Uma cópia anterior ainda válida mantém sua própria data; nunca recebe a data da tentativa falha.

## Invariantes adicionais da revisão

- `regras` contém somente a projeção pública do resumo; não é o JSON integral. A seleção de
  chaves é recursiva, inclusive critérios e faixas. Nada de ajustes por turma ou metadados livres.
- Edições ordenadas por início crescente, nulos no fim, depois nome e id como desempate;
  encontros por número. Datas sem horário não ganham fuso artificial; salvoEm/geradoEm são
  instantes ISO exibidos em pt-BR.
- Chave local efetiva: `maratona:regulamento-publico:v1:<modo>:<projeto>`; separa demonstração,
  produção e projetos distintos. Não contém identificador pessoal.
- Cada sucesso substitui a cópia inteira, inclusive `edicoes: []`. Invalidade de schema,
  quota ou armazenamento bloqueado não impedem renderização online.
- Estado da publicação: não publicada → publicada → não publicada, somente enquanto ativa.
  Encerrar é terminal e torna a publicação invisível por filtro, mesmo com a marca verdadeira.
- A alteração da marca é transacional e serializada com o encerramento pela linha da edição;
  chamadas repetidas não duplicam auditoria. Nenhum outro caminho de escrita altera a marca.
- Cópia pública permanece ao sair; consultas autenticadas ficam somente em memória e são
  limpas na troca de sessão. Autenticação existente não é conteúdo de negócio offline.
