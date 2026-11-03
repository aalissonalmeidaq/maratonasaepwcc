# Módulo: Comunicados e regulamento

**Responsabilidade:** publicação de comunicados por público autorizado e resumo do regulamento a
partir das regras da edição (RF06).

**Situação:** spec 009 (`specs/009-comunicados-regulamento/`).

- `domain/`: tipos, validação dos campos e `resumoDoRegulamento` (TS puro).
- `data/`: repositório Supabase, uma operação por RPC de `contracts/rpc.md`.
- `ui/`: lista de comunicados, gestão, formulário e resumo do regulamento.
- `index.ts`: API pública. Outros módulos importam só por `@/modules/comunicados`.

O público é checado no servidor. A coordenação publica para qualquer público; docentes e mentores
só para as turmas em que atuam. O selo "Novo" deriva dos avisos não lidos (spec 007).
