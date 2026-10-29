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
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'aluno@exemplo.invalid', 'Bruno Exemplo')
) as u (id, email, nome);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now()
from auth.users u where u.email like '%@exemplo.invalid';

insert into public.edicoes (id, nome, estado, regras, regras_versao, premiacao) values (
  'b0000000-0000-0000-0000-000000000001',
  'Maratona SAEP — edição local de teste (fictícia)',
  'rascunho',
  '{
    "versao": "piloto-2026.0-a-confirmar",
    "quantidadeEncontros": 4,
    "casasDecimais": 2,
    "presenca": {"pontosPorIntegrante": 5, "maximoPorDupla": 10},
    "questoes": {"maximo": 30},
    "provaOficial": {"pontosRealizacao": 5, "notaMinimaBonus": 70, "pontosBonus": 10, "maximoPorDupla": 30},
    "penalidades": {"tetoDescontosPorEncontro": 10}
  }',
  'piloto-2026.0-a-confirmar',
  '[{"posicao":1,"descricao":"Vale gastronômico","detalhes":null},
    {"posicao":2,"descricao":"Voucher para o Arajara Park (aluno e acompanhante)","detalhes":null},
    {"posicao":3,"descricao":"Copo térmico tipo Stanley","detalhes":null}]'
);

insert into public.cursos (id, edicao_id, nome, categoria) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Curso Técnico Exemplo A', 'Categoria A (exemplo)');

insert into public.turmas (id, curso_id, nome, ano_letivo) values
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '3º ano A (fictícia)', 2026);

insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id) values
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'coordenacao', null),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'docente', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'aluno', 'd0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'aluno', 'd0000000-0000-0000-0000-000000000001');
