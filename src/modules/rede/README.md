# Módulo: Rede (unidades, master e gestão da unidade)

**Responsabilidade:** telas e regras de quem gere a rede e as unidades (spec 016): o master
cadastra unidades, contas de gestão e outros masters; a gestão da unidade cadastra a equipe
(coordenação, docentes, mentores, analistas) e as edições da unidade.

**Situação:** spec 016 (`specs/016-unidades-e-master/`).

- `domain/`: tipos e validação (TS puro).
- `data/`: repositório Supabase (RPCs de `contracts/rpc.md`) e chamada à Edge Function
  `contas-da-rede` para criar contas por convite.
- `ui/`: Unidades, Masters, Equipe da unidade e Edições da unidade.
- `index.ts`: API pública. Outros módulos importam só por `@/modules/rede`.

Permissão e isolamento são verificados no servidor. Master e gestão não leem dados de estudantes.

**Transferência de conta (spec 019):** o master lista a equipe de uma unidade
(`equipeDaUnidadeDaRede`) e transfere uma conta para outra unidade (`transferirConta`, componente
`TransferirConta`). A regra e as recusas moram no servidor (`transferir_conta`); a tela só mostra a
mensagem do servidor.
