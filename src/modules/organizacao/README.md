# Módulo: Edições, cursos e turmas

**Responsabilidade:** edições (criar, ativar, encerrar), cadastro permanente de cursos e turmas,
turmas e cursos na edição, vínculos de pessoas (alunos e docentes por turma, mentores por curso,
coordenação) e contas (RF01–RF03).

**Situação:** specs 002 (organização) e 010 (gestão de edições). As regras da edição são copiadas
de uma base na criação; versões e ajustes por turma ficam para a spec 011.

- `domain/`: tipos e validações puras (`validarEdicao`, `edicaoPadrao`, `validarItemDoCadastro`,
  importação CSV).
- `data/`: repositório Supabase (uma RPC por operação de edição, cadastro e vínculo).
- `ui/`: listas e formulários de edição, cadastro, vínculo de turmas, gestão da turma, mentores,
  coordenação, estado da edição e seletor de edição.
- `index.ts`: API pública.
