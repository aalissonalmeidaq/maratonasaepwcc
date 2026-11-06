# ADR 0013 — Multiunidade: unidades, master e funções na unidade

- **Status:** aceita (2026-11-05)
- **Contexto:** a instalação atendia uma só unidade (premissa P25). O usuário pediu um perfil
  master que cadastre unidades (tenants) e a gestão de cada uma; a gestão cria a equipe da unidade.
- **Decisão:**
  - Mesmo banco para todas as unidades. Tabelas novas `unidades`, `masters` e `funcoes_unidade`;
    `perfis`, `edicoes` e `cadastro_cursos` ganham `unidade_id`. Uma conta pertence a uma única
    unidade e pode acumular funções nela (gestão, coordenação, docente, mentor, analista); o
    master não tem unidade.
  - `atribuicoes` (papel por edição) não muda: a função diz quem a pessoa é na unidade; a
    atribuição diz o que ela faz em cada edição. Atribuição de coordenação, docente ou mentor
    exige a função correspondente; nenhuma atribuição cruza unidades (gatilhos).
  - Isolamento: como nenhum vínculo cruza unidades, as políticas por edição já separam os dados;
    os auxiliares centrais de permissão passam a exigir unidade ativa, o que bloqueia toda a
    unidade desativada. O cadastro permanente filtra pela unidade.
  - Primeiro master só por `app.promover_master` (administração do banco); depois, masters
    convidam masters. Contas de master, gestão e equipe nascem pela Edge Function
    `contas-da-rede` (chave secreta só no servidor, convite da ADR 0009).
  - Salvaguarda: o padrão `app.unidade_inicial()` só existe enquanto houver uma unidade; com duas
    ou mais, gravar sem unidade é recusado.
- **Consequências:** master e gestão não leem dados de estudantes; dados existentes migram para
  "SENAI Juazeiro do Norte"; P25 resolvida pela spec 016.
- **Atualização (spec 019 — transferência de conta):** a regra "uma unidade por conta" continua
  valendo; mudar a unidade de uma conta de equipe passa a ser uma operação do master
  (`transferir_conta`), o único caminho que altera `perfis.unidade_id` (a trava só cede dentro da RPC,
  por um marcador de transação). Funções e vínculos da origem ficam inativos e preservados; a conta
  chega ao destino sem funções, e a gestão do destino as define. Cada transferência vira um registro
  imutável (`transferencias_de_conta`) e entra na auditoria. Estudantes e masters não são
  transferidos.
