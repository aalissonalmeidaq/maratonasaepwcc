-- =============================================================================
-- Spec 015 — premissas em validação. Catálogo da instalação com as premissas que o sistema
-- adotou sem decisão da unidade e as respostas da coordenação ("Confirmada" ou "Precisa mudar"),
-- só de inserção e auditadas. Leitura e escrita só por RPC; responder não muda regras.
-- =============================================================================

create type public.decisao_premissa as enum ('confirmada', 'precisa_mudar');

-- Catálogo (R1): vem da versão do sistema; premissa resolvida recebe `resolvida_por`, nunca é apagada.
create table public.premissas (
  codigo text primary key check (codigo ~ '^P[0-9]{2,3}$'),
  tema text not null check (tema in ('Identidade visual', 'Pontuação', 'Equipes e atividades',
                                     'Acesso e edições', 'Comunicados e relatórios', 'Operação')),
  ordem int not null,
  pergunta text not null check (char_length(pergunta) between 10 and 300),
  premissa_em_uso text not null check (char_length(premissa_em_uso) between 10 and 500),
  onde_afeta text not null check (char_length(onde_afeta) between 10 and 500),
  opcoes text[] not null default '{}',
  referencia text not null,
  resolvida_por text
);
comment on table public.premissas is 'Premissas em validação (spec 015). Escrita só por migration; leitura por RPC.';

-- Respostas (R2): só de inserção; a situação é a da mais recente.
create table public.respostas_premissas (
  id uuid primary key default gen_random_uuid(),
  premissa text not null references public.premissas (codigo),
  decisao public.decisao_premissa not null,
  justificativa text not null check (char_length(btrim(justificativa)) between 10 and 2000),
  autor_id uuid not null references public.perfis (id),
  autor_nome text not null,
  registrado_em timestamptz not null default clock_timestamp()
);
create index respostas_premissas_premissa_idx on public.respostas_premissas (premissa, registrado_em);
comment on table public.respostas_premissas is 'Respostas às premissas (spec 015). Só inserção, por RPC.';

-- R3: RLS ligada e nenhuma política nem grant; tudo passa pelas RPCs security definer.
alter table public.premissas enable row level security;
alter table public.respostas_premissas enable row level security;
revoke all on public.premissas, public.respostas_premissas from anon, authenticated;

create function app.recusar_alteracao_de_resposta()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Respostas às premissas não são alteradas nem apagadas.' using errcode = '42501';
end;
$$;
create trigger respostas_premissas_imutaveis before update or delete on public.respostas_premissas
  for each row execute function app.recusar_alteracao_de_resposta();
create trigger auditoria_respostas_premissas after insert on public.respostas_premissas
  for each row execute function app.registrar_auditoria();

-- Catálogo inicial (Apêndice A da spec 015; mesmo texto de src/modules/demo/premissas.ts).
insert into public.premissas (codigo, tema, ordem, pergunta, premissa_em_uso, onde_afeta, opcoes, referencia) values
  ('P01', 'Identidade visual', 1,
   'Qual versão dos arquivos da marca é a aprovada?',
   'O sistema usa os SVGs de docs/referencias/; a versão anterior em VETORIZADAS CLAUDE/ (prefixo saep-) não é usada.',
   'Logotipo na tela de entrada, no menu, no regulamento público e nos ícones do aplicativo.',
   array['Usar os arquivos de docs/referencias/', 'Usar os arquivos de VETORIZADAS CLAUDE/'], 'docs/decisoes-e-pendencias.md §1'),
  ('P02', 'Identidade visual', 2,
   'Os 117 ícones redesenhados a partir das pranchas estão fiéis à identidade visual?',
   'Ícones redesenhados à mão a partir das pranchas (não por rastreio automático), mais o ícone "Salvar" criado no mesmo estilo.',
   'Todos os ícones do menu, dos cartões e dos botões (galeria em docs/icones/galeria.html).',
   '{}', 'docs/decisoes-e-pendencias.md §1 e §2.1'),
  ('P03', 'Identidade visual', 3,
   'As cores da interface devem seguir os tokens atuais ou a paleta da prancha?',
   'A interface usa os tokens (azul-marinho #062457, amarelo #FFB820, borda #DCE5EF); a prancha mostra #0B2D6B, #FFC02E e #E6EBF2.',
   'Todas as cores da interface; os padrões gráficos já usam a paleta da prancha.',
   array['Manter os tokens atuais', 'Migrar os tokens para a paleta da prancha'], 'docs/decisoes-e-pendencias.md §2 e §2.1'),
  ('P04', 'Identidade visual', 4,
   'A seta da marca deve ser coral ou laranja?',
   'A seta fica em coral #FC4B55, como nos SVGs oficiais; o texto de referência citava laranja.',
   'Logotipo em todas as telas e nos ícones do aplicativo.',
   array['Coral, como nos SVGs oficiais', 'Laranja'], 'docs/decisoes-e-pendencias.md §2'),
  ('P05', 'Identidade visual', 5,
   'A largura do menu lateral está adequada à identidade visual?',
   'Menu lateral com 17,5rem no computador, 16rem no celular e 18rem no tablet, para caber ícone, título e seta sem cortar.',
   'Menu de todas as áreas internas.',
   '{}', 'docs/decisoes-e-pendencias.md §2 e §6.9'),
  ('P06', 'Identidade visual', 6,
   'Os padrões gráficos recriados em SVG estão fiéis à prancha 08?',
   'Padrões recriados em SVG a partir da prancha (galeria em docs/padroes/galeria.html).',
   'Faixas e fundos decorativos da entrada, do menu e dos destaques.',
   '{}', 'docs/decisoes-e-pendencias.md §2.1'),
  ('P07', 'Identidade visual', 7,
   'Os ícones do aplicativo instalado estão aprovados?',
   'Ícones do aplicativo gerados a partir do símbolo da marca, com fundo branco no ícone adaptável (Android).',
   'Ícone na tela inicial do celular e do computador após instalar o aplicativo.',
   '{}', 'docs/decisoes-e-pendencias.md §5'),
  ('P08', 'Identidade visual', 8,
   'A fonte Montserrat, hospedada com o aplicativo, tem a confirmação institucional?',
   'Montserrat (licença SIL OFL) servida junto com o aplicativo, sem depender de serviço externo.',
   'Todos os textos do sistema.',
   '{}', 'docs/decisoes-e-pendencias.md §1'),
  ('P09', 'Pontuação', 1,
   'Como as notas fracionárias devem ser arredondadas?',
   'Duas casas decimais, meio para cima, só no resultado de cada componente e no total; sem arredondamento intermediário.',
   'Cálculo de todos os componentes, total do encontro e ranking.',
   '{}', 'docs/decisoes-e-pendencias.md §3; PRD §10'),
  ('P10', 'Pontuação', 2,
   'O teto de 10 pontos de descontos vale para quais penalidades?',
   'O teto vale para os descontos gerais de ocorrências; zerar a entrega por plágio não entra no teto.',
   'Decisão de ocorrências e pontuação do encontro.',
   '{}', 'docs/decisoes-e-pendencias.md §3'),
  ('P11', 'Pontuação', 3,
   'Entrega com prorrogação ou impedimento registrado deve ter desconto de atraso?',
   'Com prorrogação ou impedimento registrado, não há desconto de atraso.',
   'Pontuação da entrega (critério organização).',
   '{}', 'docs/decisoes-e-pendencias.md §3'),
  ('P12', 'Pontuação', 4,
   'O que fazer com penalidades repetidas pelo mesmo fato?',
   'Vale a primeira registrada; as demais são ignoradas e a tela informa quais foram.',
   'Ocorrências e pontuação do encontro.',
   '{}', 'docs/decisoes-e-pendencias.md §3'),
  ('P13', 'Pontuação', 5,
   'Quais são os valores, a quantidade, a validade e a forma de entrega da premiação?',
   'Os itens de premiação são registrados como configuração da edição; valores, quantidade, validade e entrega estão a definir.',
   'Tela de premiação da coordenação.',
   '{}', 'docs/decisoes-e-pendencias.md §3'),
  ('P14', 'Pontuação', 6,
   'Quando o encontro tem vários desafios ou listas, como somar a nota do componente?',
   'O componente é a média simples dos itens do encontro (o PRD não define a agregação).',
   'Pontuação de questões e de entrega em encontros com mais de um item.',
   '{}', 'docs/decisoes-e-pendencias.md §6.4'),
  ('P15', 'Pontuação', 7,
   'Em equipe de três estudantes, como fica a pontuação de presença?',
   'A presença dos três é limitada ao máximo por equipe das regras (10 no piloto).',
   'Pontuação de presença dos trios.',
   '{}', 'docs/decisoes-e-pendencias.md §6.4'),
  ('P16', 'Pontuação', 8,
   'As penalidades e os prazos de 24 horas estão de acordo com o regulamento?',
   'Penalidades e prazos de manifestação e de revisão (24 h) com os valores do PRD, aplicados às edições não encerradas.',
   'Ocorrências, manifestação e pedidos de revisão.',
   '{}', 'docs/decisoes-e-pendencias.md §6.5'),
  ('P17', 'Pontuação', 9,
   'Como tratar nota da prova oficial que não está na escala de 0 a 100?',
   'Nota sem escala 0–100 e sem autorização confirmadas fica pendente; o sistema não converte escalas.',
   'Registro da prova oficial e resultado da equipe.',
   '{}', 'docs/decisoes-e-pendencias.md §6.5'),
  ('P18', 'Pontuação', 10,
   'Os limites de proteção das regras da edição estão adequados?',
   'Até 20 critérios por rubrica, nomes com até 80 caracteres, de 0 a 4 casas decimais e de 1 a 20 encontros.',
   'Tela de regras da edição e das turmas.',
   '{}', 'docs/decisoes-e-pendencias.md §6.9'),
  ('P19', 'Pontuação', 11,
   'A pontuação máxima da turma está correta para encontros com avaliação objetiva diferente?',
   'A pontuação máxima soma, nos encontros da turma, os componentes pelas regras de cada encontro (questões ou prova oficial).',
   'Regulamento da turma e painéis de progresso.',
   '{}', 'docs/decisoes-e-pendencias.md §6.9'),
  ('P20', 'Equipes e atividades', 1,
   'Que limite de atraso mostrar num desafio que vale para várias turmas?',
   'A lista mostra o maior limite entre as turmas do desafio; o envio de cada equipe usa o da própria turma.',
   'Lista de desafios encerrados e envio das entregas.',
   '{}', 'docs/decisoes-e-pendencias.md §6.9'),
  ('P21', 'Equipes e atividades', 2,
   'Qual o tamanho mínimo da justificativa para substituir integrante ou desfazer equipe?',
   'Justificativa com pelo menos 10 caracteres.',
   'Gestão das equipes pela coordenação, docentes e mentores.',
   '{}', 'docs/decisoes-e-pendencias.md §6'),
  ('P22', 'Equipes e atividades', 3,
   'Os convites para formar equipe devem expirar ou ter limite por estudante?',
   'Convites não expiram e não há limite de convites por estudante.',
   'Formação das equipes pelos estudantes.',
   '{}', 'docs/decisoes-e-pendencias.md §6.2'),
  ('P23', 'Equipes e atividades', 4,
   'Os nomes de equipe precisam de moderação?',
   'Sem moderação; docente ou mentor da turma pode renomear com justificativa.',
   'Nome das equipes nas telas e no ranking.',
   '{}', 'docs/decisoes-e-pendencias.md §6.2'),
  ('P24', 'Equipes e atividades', 5,
   'Quem pode registrar prorrogação ou impedimento de entrega?',
   'Docente ou mentor da turma, ou a coordenação.',
   'Entregas e descontos de atraso.',
   '{}', 'docs/decisoes-e-pendencias.md §6.4'),
  ('P25', 'Acesso e edições', 1,
   'O cadastro permanente de cursos e turmas e a instalação de uma só unidade atendem à unidade?',
   'Cursos e turmas são da unidade; correções chegam sozinhas às edições em preparação e, na edição ativa, por "Atualizar a partir do cadastro". Uma instalação atende uma unidade.',
   'Cadastro de cursos e turmas e gestão das edições.',
   '{}', 'docs/decisoes-e-pendencias.md §6.8'),
  ('P26', 'Acesso e edições', 2,
   'A busca de pessoas da coordenação deve alcançar qualquer conta da instalação?',
   'A busca traz só contas que participam ou participaram de edições que a pessoa coordena, sem e-mail.',
   'Vínculo de estudantes e docentes às turmas.',
   '{}', 'docs/decisoes-e-pendencias.md §6.8'),
  ('P27', 'Acesso e edições', 3,
   'O mentor vinculado a um curso deve atuar em todas as turmas dele?',
   'O mentor é vinculado ao curso e atua em todas as turmas do curso; vínculo direto de mentor a turma é recusado.',
   'Permissões de mentores nas turmas.',
   '{}', 'docs/decisoes-e-pendencias.md §6.8'),
  ('P28', 'Acesso e edições', 4,
   'Uma edição encerrada pode ser reaberta?',
   'Edição encerrada não é reaberta; os dados dela só podem ser lidos.',
   'Encerramento da edição e todas as telas da edição encerrada.',
   '{}', 'docs/decisoes-e-pendencias.md §6.8'),
  ('P29', 'Comunicados e relatórios', 1,
   'Os comunicados precisam de público por equipe ou por pessoa?',
   'O público é por perfil (todos, estudantes ou equipe docente), opcionalmente limitado a turmas; não há público por equipe ou por pessoa.',
   'Publicação de comunicados.',
   '{}', 'docs/decisoes-e-pendencias.md §6.7'),
  ('P30', 'Comunicados e relatórios', 2,
   'Os limites de tamanho dos comunicados estão adequados?',
   'Título de 1 a 200 caracteres e texto de 1 a 5.000, sem formatação.',
   'Publicação de comunicados.',
   '{}', 'docs/decisoes-e-pendencias.md §6.7'),
  ('P31', 'Comunicados e relatórios', 3,
   'Quantos itens as listas devem mostrar por página?',
   'Listas com busca mostram 10 itens por página.',
   'Listas de estudantes, equipes, entregas e demais listas com busca.',
   '{}', 'docs/decisoes-e-pendencias.md §6.1'),
  ('P32', 'Operação', 1,
   'Qual provedor e qual remetente vão enviar os e-mails de convite e recuperação de senha?',
   'Os e-mails de convite e de recuperação de senha dependem do provedor e do remetente da unidade, ainda não definidos.',
   'Criação de contas, primeiro acesso e "Esqueci minha senha".',
   '{}', 'docs/decisoes-e-pendencias.md §5; docs/operacao-e-homologacao.md; docs/adr/0009-convites-de-acesso.md');

-- =============================================================================
-- Leitura (US1, R3): coordenação de qualquer edição (inclusive encerrada) lê e responde; docentes
-- e mentores com vínculo ativo só leem. Nunca devolve id nem e-mail de quem respondeu.
-- =============================================================================
create function app.atua_como_docente_em_alguma()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = (select auth.uid()) and a.papel in ('docente', 'mentor') and a.ativo
  );
$$;
revoke all on function app.atua_como_docente_em_alguma() from public, anon;

create function app.resposta_json(r public.respostas_premissas)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', r.id, 'decisao', r.decisao, 'justificativa', r.justificativa,
                            'autorNome', r.autor_nome, 'registradoEm', r.registrado_em);
$$;
revoke all on function app.resposta_json(public.respostas_premissas) from public, anon, authenticated;

create function public.premissas_em_validacao()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_coordena boolean := app.e_coordenacao_em_alguma();
begin
  if not v_coordena and not app.atua_como_docente_em_alguma() then
    raise exception 'Somente coordenação, docentes e mentores consultam as premissas.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'podeResponder', v_coordena,
    'premissas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'codigo', p.codigo, 'tema', p.tema, 'ordem', p.ordem, 'pergunta', p.pergunta,
               'premissaEmUso', p.premissa_em_uso, 'ondeAfeta', p.onde_afeta, 'opcoes', to_jsonb(p.opcoes),
               'referencia', p.referencia, 'resolvidaPor', p.resolvida_por,
               'situacao', coalesce(h.atual ->> 'decisao', 'aguardando'),
               'atual', h.atual, 'historico', h.historico)
             order by p.resolvida_por is not null,
                      array_position(array['Pontuação', 'Equipes e atividades', 'Acesso e edições',
                                           'Comunicados e relatórios', 'Identidade visual', 'Operação'], p.tema),
                      p.ordem, p.codigo)
      from public.premissas p
      cross join lateral (
        select coalesce(jsonb_agg(app.resposta_json(r) order by r.registrado_em, r.id), '[]'::jsonb) as historico,
               (select app.resposta_json(u) from public.respostas_premissas u where u.premissa = p.codigo
                order by u.registrado_em desc, u.id desc limit 1) as atual
        from public.respostas_premissas r where r.premissa = p.codigo
      ) h), '[]'::jsonb));
end;
$$;
revoke all on function public.premissas_em_validacao() from public, anon;
grant execute on function public.premissas_em_validacao() to authenticated;

-- =============================================================================
-- Resposta (US2, R4): só a coordenação; justificativa de 10 a 2.000 caracteres; a resposta-base
-- (a atual quando a tela carregou) evita registrar sobre uma situação que já mudou.
-- =============================================================================
create function public.responder_premissa(p_codigo text, p_decisao public.decisao_premissa,
                                          p_justificativa text, p_resposta_base uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_justificativa text := btrim(coalesce(p_justificativa, ''));
  v_atual uuid;
  v_nova public.respostas_premissas;
begin
  if not app.e_coordenacao_em_alguma() then
    raise exception 'Somente a coordenação registra respostas às premissas.' using errcode = '42501';
  end if;
  -- Trava a premissa: respostas simultâneas à mesma premissa ficam em fila (R4).
  perform 1 from public.premissas where codigo = p_codigo and resolvida_por is null for update;
  if not found then
    raise exception 'Premissa não encontrada ou já resolvida.' using errcode = '23514';
  end if;
  if p_decisao is null then
    raise exception 'Escolha "Confirmada" ou "Precisa mudar".' using errcode = '23514';
  end if;
  if char_length(v_justificativa) not between 10 and 2000 then
    raise exception 'Justifique com 10 a 2.000 caracteres.' using errcode = '23514';
  end if;
  select id into v_atual from public.respostas_premissas where premissa = p_codigo
  order by registrado_em desc, id desc limit 1;
  if v_atual is distinct from p_resposta_base then
    raise exception 'Esta premissa foi respondida por outra pessoa. Veja a resposta atual antes de registrar.'
      using errcode = '40001';
  end if;
  perform set_config('app.justificativa', v_justificativa, true);
  insert into public.respostas_premissas (premissa, decisao, justificativa, autor_id, autor_nome)
  select p_codigo, p_decisao, v_justificativa, p.id, p.nome from public.perfis p where p.id = (select auth.uid())
  returning * into v_nova;
  return app.resposta_json(v_nova);
end;
$$;
revoke all on function public.responder_premissa(text, public.decisao_premissa, text, uuid) from public, anon;
grant execute on function public.responder_premissa(text, public.decisao_premissa, text, uuid) to authenticated;
