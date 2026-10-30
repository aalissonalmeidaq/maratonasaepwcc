-- =============================================================================
-- SEED LOCAL — SOMENTE DADOS FICTÍCIOS. Nunca executar em homologação com dados reais
-- nem em produção. Senha de todas as contas: "senha-local-123" (apenas ambiente local).
-- =============================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('senha-local-123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', u.nome), now(), now(),
  '', '', '', ''
from (values
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'coordenacao@exemplo.invalid', 'Coordenação (fictícia)'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'docente@exemplo.invalid', 'Profa. Lúcia Exemplo'),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'aluna@exemplo.invalid', 'Ana Exemplo'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'aluno@exemplo.invalid', 'Bruno Exemplo'),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'carla@exemplo.invalid', 'Carla Exemplo'),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'davi@exemplo.invalid', 'Davi Exemplo'),
  ('a0000000-0000-0000-0000-000000000007'::uuid, 'elisa@exemplo.invalid', 'Elisa Exemplo'),
  ('a0000000-0000-0000-0000-000000000008'::uuid, 'iris@exemplo.invalid', 'Íris Exemplo'),
  ('a0000000-0000-0000-0000-000000000009'::uuid, 'joao@exemplo.invalid', 'João Exemplo'),
  ('a0000000-0000-0000-0000-000000000010'::uuid, 'docente2@exemplo.invalid', 'Prof. Rui Exemplo'),
  ('a0000000-0000-0000-0000-000000000011'::uuid, 'fabio@exemplo.invalid', 'Fábio Exemplo'),
  -- Turma C (ímpar, sem equipes): convites de trio e formação pela equipe docente (spec 003).
  ('a0000000-0000-0000-0000-000000000012'::uuid, 'gabi@exemplo.invalid', 'Gabi Exemplo'),
  ('a0000000-0000-0000-0000-000000000013'::uuid, 'heitor@exemplo.invalid', 'Heitor Exemplo'),
  ('a0000000-0000-0000-0000-000000000014'::uuid, 'lia@exemplo.invalid', 'Lia Exemplo'),
  ('a0000000-0000-0000-0000-000000000015'::uuid, 'mateus@exemplo.invalid', 'Mateus Exemplo'),
  ('a0000000-0000-0000-0000-000000000016'::uuid, 'nina@exemplo.invalid', 'Nina Exemplo')
) as u (id, email, nome);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u where u.email like '%@exemplo.invalid';

-- Regras: cópia de REGRAS_PILOTO (src/modules/pontuacao/domain/regras-piloto.ts).
insert into public.edicoes (id, nome, estado, regras, regras_versao, premiacao) values (
  'b0000000-0000-0000-0000-000000000001',
  'Maratona SAEP — edição local de teste (fictícia)',
  'ativa',
  '{"versao":"piloto-2026.0-a-confirmar","quantidadeEncontros":4,"casasDecimais":2,"presenca":{"pontosPorIntegrante":5,"maximoPorDupla":10},"participacao":{"criterios":[{"id":"envolvimento","rotulo":"Envolvimento nas atividades","maximo":4},{"id":"colaboracao","rotulo":"Colaboração","maximo":3},{"id":"organizacao","rotulo":"Organização e cumprimento das orientações","maximo":3}]},"questoes":{"maximo":30},"entrega":{"criterios":[{"id":"compreensao","rotulo":"Compreensão do problema","maximo":10},{"id":"aplicacao","rotulo":"Aplicação de conhecimentos técnicos","maximo":10},{"id":"qualidade","rotulo":"Qualidade e adequação da solução","maximo":10},{"id":"organizacao","rotulo":"Organização e entrega","maximo":10}],"criterioDeAtraso":"organizacao","faixasDeAtraso":[{"ateMinutos":15,"desconto":2},{"ateMinutos":30,"desconto":5}],"limiteAtrasoMinutos":30},"apresentacao":{"criterios":[{"id":"clareza","rotulo":"Clareza","maximo":3},{"id":"explicacao","rotulo":"Explicação das decisões e etapas","maximo":4},{"id":"respostas","rotulo":"Respostas às perguntas","maximo":3}]},"provaOficial":{"pontosRealizacao":5,"notaMinimaBonus":70,"pontosBonus":10,"maximoPorDupla":30},"penalidades":{"tetoDescontosPorEncontro":10}}',
  'piloto-2026.0-a-confirmar',
  '[{"posicao":1,"descricao":"Vale gastronômico","detalhes":null},
    {"posicao":2,"descricao":"Voucher para o Arajara Park (aluno e acompanhante)","detalhes":null},
    {"posicao":3,"descricao":"Copo térmico tipo Stanley","detalhes":null}]'
);

insert into public.cursos (id, edicao_id, nome, categoria) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Curso Técnico Exemplo A', 'Categoria A (exemplo)'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Curso Técnico Exemplo B', 'Categoria B (exemplo)');

insert into public.turmas (id, curso_id, nome, ano_letivo) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '3º ano A (fictícia)', 2026),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '3º ano B (fictícia)', 2026),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', '3º ano C (fictícia)', 2026);

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id)
select u::uuid, 'b0000000-0000-0000-0000-000000000001', p::public.papel, t::uuid
from (values
  ('a0000000-0000-0000-0000-000000000001', 'coordenacao', null),
  ('a0000000-0000-0000-0000-000000000002', 'docente', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000010', 'docente', 'd0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000010', 'docente', 'd0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000012', 'aluno', 'd0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000013', 'aluno', 'd0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000014', 'aluno', 'd0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000015', 'aluno', 'd0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000016', 'aluno', 'd0000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000003', 'aluno', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', 'aluno', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', 'aluno', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000006', 'aluno', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000007', 'aluno', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000011', 'aluno', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000008', 'aluno', 'd0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000009', 'aluno', 'd0000000-0000-0000-0000-000000000002')
) as v (u, p, t);

insert into public.ambientes (id, edicao_id, nome, observacoes) values
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Laboratório 1 (exemplo)', 'Ambiente fictício'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Auditório (exemplo)', null);

-- Datas relativas ao dia do seed para sempre haver encontros passados e futuros.
insert into public.encontros (edicao_id, numero, titulo, data, inicio, fim, ambiente_id, avaliacao_objetiva, orientacoes, estado) values
  ('b0000000-0000-0000-0000-000000000001', 1, 'Encontro 1 — Abertura e desafio inicial', current_date - 14, '13:30', '17:00', 'e0000000-0000-0000-0000-000000000001', 'questoes', 'Orientação fictícia.', 'realizado'),
  ('b0000000-0000-0000-0000-000000000001', 2, 'Encontro 2 — Desafio prático', current_date - 7, '13:30', '17:00', 'e0000000-0000-0000-0000-000000000001', 'questoes', null, 'realizado'),
  ('b0000000-0000-0000-0000-000000000001', 3, 'Encontro 3 — Prova oficial (registro)', current_date + 7, null, null, null, 'prova_oficial', 'Horário e local a confirmar.', 'agendado'),
  ('b0000000-0000-0000-0000-000000000001', 4, 'Encontro 4 — Projeto final e premiação', current_date + 14, '13:30', '17:00', 'e0000000-0000-0000-0000-000000000002', 'questoes', null, 'agendado');

-- Duplas fictícias (inseridas diretamente: o seed roda como administrador do banco).
insert into public.duplas (id, edicao_id, turma_id, nome) values
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Dupla Órbita'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Dupla Vetor'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Dupla Faísca');

insert into public.dupla_integrantes (dupla_id, edicao_id, estudante_id) values
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009');
