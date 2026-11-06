# Módulo: Premissas em validação

**Responsabilidade:** catálogo das premissas que o sistema adotou sem decisão da unidade e as
respostas da coordenação ("Confirmada" ou "Precisa mudar"), com histórico (PRD §16).

**Situação:** spec 015 (`specs/015-premissas-em-validacao/`).

- `domain/`: tipos, situação, filtros, validação da resposta e linhas do CSV (TS puro).
- `data/`: repositório Supabase, uma operação por RPC de `contracts/rpc.md`.
- `ui/`: página da lista, cartão da premissa e formulário de resposta.
- `index.ts`: API pública. Outros módulos importam só por `@/modules/premissas`.

O catálogo vem da versão do sistema (migration). Coordenação lê e responde; docentes e mentores só
leem; estudantes não acessam — tudo checado no servidor. Responder não muda regras.
