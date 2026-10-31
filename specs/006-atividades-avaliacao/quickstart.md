# Quickstart: Atividades, entregas, presença e avaliação

## Pré-requisitos

- `npm ci`
- Docker com o Supabase local nas portas 5442x (`npx supabase start`, com Storage habilitado).
- Nunca apontar para banco remoto.

## Validação

1. `npm run verify`
2. `npm run test:db`. O arquivo `007_atividades_avaliacao.test.sql` cobre:
   - RLS das tabelas novas;
   - RPCs;
   - Storage;
   - gabarito protegido;
   - submissão única;
   - acesso cruzado.
3. `node scripts/testar-concorrencia-questoes.mjs`: dois envios simultâneos e só um aceito
   (SC-007).
4. `npm run test:e2e`: demonstração em desktop e Pixel 7.
5. `npx supabase db reset` e depois o E2E real (`e2e-supabase/atividades.spec.ts`).

## Roteiro manual (Supabase local, contas do seed)

1. Docente → "Atividades": criar o desafio do encontro 4 para a turma A, publicar.
2. Aluna da turma A → "Desafios e entregas": enviar um PDF. Conferir que o comprovante só
   aparece com protocolo e horário do servidor.
3. Desligar a rede e enviar de novo. A tela deve mostrar que a entrega não foi recebida.
4. Docente → "Presença": marcar a turma e salvar. Depois registrar a participação de uma equipe.
5. Docente → "Avaliações": avaliar a entrega com feedback. Conferir que a aluna vê as notas e o
   feedback.
6. Docente → "Atividades": criar uma lista de questões e publicar. Duas contas da mesma equipe
   enviam; a segunda deve ser recusada. Antes do prazo, o gabarito não aparece.
7. Aluna → "Pontuação": ver os componentes calculados e os que estão "Aguardando registro".

## Resultados

- 2026-10-30, antes da spec (T001): Supabase local ativo (portas 5442x) com Storage
  (`supabase_storage_maratona`); pgTAP 001–006 verde (299 asserções); `npm run verify` verde na
  `main` após o merge da spec 004 (450 testes).
- Portões finais (T048), 2026-10-30:
  - `npm run verify`: typecheck, lint, 507 testes unitários/componentes e build verdes.
  - `npm run test:db`: 446 asserções pgTAP (007 com 147, cobrindo RLS, RPCs, Storage, gabarito
    protegido, submissão única, idempotência, auditoria e acesso cruzado).
  - `node scripts/testar-concorrencia-questoes.mjs`: aprovado (uma submissão aceita, uma recusada
    com quem enviou e quando; 1 linha no banco). `testar-concorrencia-equipes.mjs` segue aprovado.
  - `npm run test:e2e` (demonstração, desktop e Pixel 7): 41 passaram (1 ignorado: só celular),
    com o servidor aquecido na porta 4173.
  - E2E real após `supabase db reset`: 42 passaram, incluindo upload de PDF no Storage local.
- Divergências do contrato, sem efeito funcional:
  - `entregas_da_equipe` não virou RPC própria: as versões da equipe vêm em
    `atividades_da_turma` (aluno) e `painel_avaliacao` (gestão).
  - `listas_da_gestao` não virou RPC: a gestão lê `listas_questoes`/`questoes`/`alternativas` pela
    RLS (`app.pode_gerir_lista`); o aluno continua sem leitura direta.
  - `registrar_entrega` recebe também `p_arquivo_nome` (nome original exibido no histórico) e
    `atividades_da_turma` devolve `regras` (aviso de atraso sem valores fixos).
