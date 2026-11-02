-- =============================================================================
-- Spec 007 — resultado oficial: prova oficial, ocorrências com manifestação e decisão, cálculo
-- oficial dos pontos no servidor (paridade com o núcleo TS, ADR 0011), publicação versionada e
-- imutável do ranking por categoria, pedidos de revisão e avisos no aplicativo.
-- Escrita só por RPC transacional, idempotente e auditada; regras vêm de `edicoes.regras`.
-- =============================================================================

create type public.realizacao_prova as enum ('confirmada', 'pendente', 'nao_realizou');
create type public.estado_nota_prova as enum ('pendente', 'confirmada', 'indisponivel');
create type public.estado_ocorrencia as enum ('registrada', 'manifestada', 'confirmada', 'arquivada');
create type public.estado_ranking as enum ('parcial', 'provisorio', 'definitivo');
create type public.objeto_prazo as enum ('manifestacao', 'revisao');
create type public.objeto_revisao as enum ('ocorrencia', 'publicacao');
create type public.estado_revisao as enum ('aberto', 'deferido', 'indeferido');

-- ---------------------------------------------------------------------------
-- Prova oficial (US1)
-- ---------------------------------------------------------------------------
create table public.resultados_prova (
  encontro_id uuid not null references public.encontros (id) on delete cascade,
  estudante_id uuid not null references public.perfis (id) on delete restrict,
  -- Equipe no momento do registro: continua valendo se o estudante sair depois.
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  realizacao public.realizacao_prova not null,
  nota numeric check (nota between 0 and 100),
  nota_estado public.estado_nota_prova not null default 'pendente',
  fonte text check (char_length(fonte) <= 300),
  escala_confirmada boolean not null default false,
  autorizacao_confirmada boolean not null default false,
  autor_id uuid references public.perfis (id) default auth.uid(),
  registrado_em timestamptz not null default now(),
  primary key (encontro_id, estudante_id),
  constraint resultados_nota_so_com_realizacao check (nota is null or realizacao = 'confirmada'),
  constraint resultados_fonte_com_nota check (nota is null or char_length(btrim(fonte)) >= 1),
  constraint resultados_nota_confirmada check (
    nota_estado <> 'confirmada' or (nota is not null and escala_confirmada and autorizacao_confirmada))
);
create index resultados_prova_dupla_idx on public.resultados_prova (dupla_id, encontro_id);

-- ---------------------------------------------------------------------------
-- Ocorrências, manifestações e exceções de prazo (US2)
-- ---------------------------------------------------------------------------
create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  encontro_id uuid not null references public.encontros (id) on delete restrict,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  desafio_id uuid references public.desafios (id) on delete restrict,
  tipo text not null check (char_length(tipo) between 1 and 60),
  fato text not null check (char_length(btrim(fato)) between 10 and 4000),
  fato_chave text not null check (char_length(fato_chave) between 1 and 200),
  evidencia text not null check (char_length(btrim(evidencia)) between 1 and 4000),
  evidencia_path text unique,
  evidencia_nome text check (char_length(evidencia_nome) <= 255),
  integrantes jsonb not null default '[]'::jsonb check (jsonb_typeof(integrantes) = 'array'),
  estado public.estado_ocorrencia not null default 'registrada',
  prazo_manifestacao timestamptz not null,
  justificativa_decisao text check (char_length(btrim(justificativa_decisao)) between 10 and 2000),
  apresentacao_dependente boolean not null default false,
  decidido_por uuid references public.perfis (id),
  decidido_em timestamptz,
  chave_envio uuid not null unique,
  autor_id uuid not null references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  constraint ocorrencias_decisao_completa check (
    (estado in ('confirmada', 'arquivada')) = (decidido_em is not null and justificativa_decisao is not null))
);
create index ocorrencias_dupla_encontro_idx on public.ocorrencias (dupla_id, encontro_id);
create index ocorrencias_edicao_estado_idx on public.ocorrencias (edicao_id, estado);

create table public.manifestacoes (
  ocorrencia_id uuid primary key references public.ocorrencias (id) on delete cascade,
  autor_id uuid not null references public.perfis (id) default auth.uid(),
  texto text not null check (char_length(btrim(texto)) between 10 and 4000),
  enviada_em timestamptz not null default now()
);

create table public.excecoes_prazo (
  id uuid primary key default gen_random_uuid(),
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  objeto public.objeto_prazo not null,
  ocorrencia_id uuid references public.ocorrencias (id) on delete cascade,
  publicacao_id uuid,
  novo_prazo timestamptz not null,
  justificativa text not null check (char_length(btrim(justificativa)) between 10 and 1000),
  autor_id uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  constraint excecoes_um_alvo check ((ocorrencia_id is null) <> (publicacao_id is null)),
  constraint excecoes_manifestacao_de_ocorrencia check (objeto <> 'manifestacao' or ocorrencia_id is not null)
);
create index excecoes_dupla_idx on public.excecoes_prazo (dupla_id, objeto, criado_em desc);

-- ---------------------------------------------------------------------------
-- Publicação do ranking (US4) — versões imutáveis
-- ---------------------------------------------------------------------------
create table public.publicacoes_ranking (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  categoria text not null check (char_length(btrim(categoria)) between 1 and 120),
  versao integer not null check (versao >= 1),
  estado public.estado_ranking not null,
  justificativa text check (char_length(btrim(justificativa)) between 10 and 2000),
  regras_versao text not null,
  revisao_ate timestamptz,
  publicado_por uuid not null references public.perfis (id) default auth.uid(),
  publicado_em timestamptz not null default now(),
  constraint publicacoes_versao_unica unique (edicao_id, categoria, versao),
  constraint publicacoes_justificativa check (versao = 1 or justificativa is not null),
  constraint publicacoes_revisao_so_provisorio check ((estado = 'provisorio') = (revisao_ate is not null))
);

alter table public.excecoes_prazo add constraint excecoes_publicacao_fk
  foreign key (publicacao_id) references public.publicacoes_ranking (id) on delete cascade;

create table public.publicacao_posicoes (
  publicacao_id uuid not null references public.publicacoes_ranking (id) on delete cascade,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  nome text not null,
  posicao integer not null check (posicao >= 1),
  compartilhada boolean not null,
  total numeric not null,
  entrega numeric not null,
  avaliacao_objetiva numeric not null,
  presenca numeric not null,
  pendente boolean not null,
  detalhe jsonb not null check (jsonb_typeof(detalhe) = 'array'),
  primary key (publicacao_id, dupla_id)
);

-- ---------------------------------------------------------------------------
-- Pedidos de revisão (US5)
-- ---------------------------------------------------------------------------
create table public.pedidos_revisao (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  dupla_id uuid not null references public.duplas (id) on delete restrict,
  objeto public.objeto_revisao not null,
  ocorrencia_id uuid references public.ocorrencias (id) on delete cascade,
  publicacao_id uuid references public.publicacoes_ranking (id) on delete cascade,
  componente text check (componente in ('presenca', 'participacao', 'avaliacaoObjetiva', 'entrega', 'apresentacao')),
  encontro_id uuid references public.encontros (id) on delete restrict,
  justificativa text not null check (char_length(btrim(justificativa)) between 10 and 2000),
  estado public.estado_revisao not null default 'aberto',
  resposta text check (char_length(btrim(resposta)) between 10 and 2000),
  respondido_por uuid references public.perfis (id),
  respondido_em timestamptz,
  chave_envio uuid not null unique,
  autor_id uuid not null references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  constraint pedidos_um_alvo check (
    (objeto = 'ocorrencia' and ocorrencia_id is not null and publicacao_id is null)
    or (objeto = 'publicacao' and publicacao_id is not null and ocorrencia_id is null and componente is not null)),
  constraint pedidos_resposta_completa check ((estado = 'aberto') = (respondido_em is null)
    and (estado = 'aberto' or resposta is not null))
);
create unique index pedidos_um_aberto_por_objeto on public.pedidos_revisao (
  dupla_id, objeto, coalesce(ocorrencia_id, publicacao_id), coalesce(componente, ''),
  coalesce(encontro_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where estado = 'aberto';
create index pedidos_edicao_estado_idx on public.pedidos_revisao (edicao_id, estado);

-- ---------------------------------------------------------------------------
-- Avisos no aplicativo (FR-026)
-- ---------------------------------------------------------------------------
create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  destinatario_id uuid not null references public.perfis (id) on delete cascade,
  tipo text not null check (tipo in ('ocorrencia_registrada', 'ocorrencia_decidida',
    'ranking_publicado', 'revisao_pedida', 'revisao_respondida')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  referencia jsonb not null default '{}'::jsonb check (jsonb_typeof(referencia) = 'object'),
  criado_em timestamptz not null default now(),
  lido_em timestamptz
);
create index avisos_destinatario_idx on public.avisos (destinatario_id, criado_em desc);

-- ---------------------------------------------------------------------------
-- Auditoria: correção ligada a um pedido de revisão (R7)
-- ---------------------------------------------------------------------------
alter table public.auditoria add column pedido_revisao_id uuid;
create index auditoria_pedido_idx on public.auditoria (pedido_revisao_id) where pedido_revisao_id is not null;

create or replace function app.registrar_auditoria()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  insert into public.auditoria (acao, tabela, registro_id, antes, depois, justificativa, pedido_revisao_id)
  values (
    tg_op,
    tg_table_name,
    coalesce(v_depois ->> 'id', v_antes ->> 'id'),
    v_antes,
    v_depois,
    nullif(current_setting('app.justificativa', true), ''),
    nullif(current_setting('app.pedido_revisao', true), '')::uuid
  );
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos, privilégios e RLS
-- ---------------------------------------------------------------------------
create function app.impedir_alteracao_publicada()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Uma versão publicada do ranking não pode ser alterada nem removida.'
    using errcode = '23514';
end;
$$;
create trigger publicacoes_imutaveis before update or delete on public.publicacoes_ranking
  for each row execute function app.impedir_alteracao_publicada();
create trigger posicoes_imutaveis before update or delete on public.publicacao_posicoes
  for each row execute function app.impedir_alteracao_publicada();

do $$
declare t text;
begin
  foreach t in array array['resultados_prova', 'ocorrencias', 'manifestacoes', 'excecoes_prazo',
    'publicacoes_ranking', 'publicacao_posicoes', 'pedidos_revisao', 'avisos']
  loop
    execute format('create trigger auditoria_%1$s after insert or update or delete on public.%1$I
                    for each row execute function app.registrar_auditoria()', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%I from authenticated', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: evidências de ocorrência (bucket privado, R9)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 52428800,
        array['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Regras: tipos de ocorrência e prazos do piloto (R3). Só edições não encerradas recebem as
-- chaves que faltam; a versão ganha o sufixo `+inc4` e a auditoria de `edicoes` guarda o antes.
-- ---------------------------------------------------------------------------
create function app.completar_regras_inc4()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.edicoes e
  set regras = case when e.regras ? 'prazos' then e.regras
                    else e.regras || '{"prazos":{"manifestacaoHoras":24,"revisaoHoras":24}}'::jsonb end
             || case when e.regras -> 'penalidades' ? 'tipos' then '{}'::jsonb
                     else jsonb_build_object('penalidades', coalesce(e.regras -> 'penalidades', '{}'::jsonb)
                       || '{"tipos":[{"id":"reincidencia","rotulo":"Reincidência após orientação registrada","pontos":2},{"id":"desrespeito","rotulo":"Desrespeito com responsabilidade da equipe","pontos":5},{"id":"uso_nao_autorizado","rotulo":"Uso não autorizado","pontos":5},{"id":"plagio","rotulo":"Plágio comprovado","zeraEntrega":true}]}'::jsonb) end,
      regras_versao = e.regras_versao || '+inc4'
  where e.estado <> 'encerrada'
    and (not (e.regras ? 'prazos') or not coalesce(e.regras -> 'penalidades' ? 'tipos', false));
end;
$$;
revoke all on function app.completar_regras_inc4() from public, anon, authenticated;
select app.completar_regras_inc4();

-- ===========================================================================
-- Cálculo oficial (RF14, FR-012, FR-013). Espelha `src/modules/pontuacao/domain/calculo.ts` e
-- `ranking.ts`; os esperados são os mesmos de `casos-contrato.json` e `casos-ranking.json`
-- (scripts/testar-paridade-calculo.mjs). Qualquer mudança aqui exige a mesma mudança no TS.
-- ===========================================================================

-- Arredonda meio para cima com as casas da edição (numeric é exato; valores não negativos).
create function app.arredondar(p_valor numeric, p_casas int)
returns numeric language sql immutable set search_path = '' as $$
  select trim_scale(round(p_valor, p_casas));
$$;

create function app.pontuar_questoes(p_acertos int, p_total int, p_regras jsonb)
returns numeric language plpgsql immutable set search_path = '' as $$
begin
  if p_total is null or p_total <= 0 then
    raise exception 'O total de questões deve ser um inteiro maior que zero.' using errcode = '23514';
  end if;
  if p_acertos is null or p_acertos < 0 or p_acertos > p_total then
    raise exception 'Os acertos devem estar entre 0 e o total de questões.' using errcode = '23514';
  end if;
  return app.arredondar(p_acertos * (p_regras -> 'questoes' ->> 'maximo')::numeric / p_total,
                        (p_regras ->> 'casasDecimais')::int);
end;
$$;

-- { desconto, naoRealizada } conforme as faixas de atraso das regras.
create function app.desconto_por_atraso(p_minutos numeric, p_regras jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_faixa jsonb;
begin
  if p_minutos is null or p_minutos < 0 then
    raise exception 'O atraso não pode ser negativo.' using errcode = '23514';
  end if;
  if p_minutos = 0 then
    return '{"desconto":0,"naoRealizada":false}';
  end if;
  if p_minutos > (p_regras -> 'entrega' ->> 'limiteAtrasoMinutos')::numeric then
    return '{"desconto":0,"naoRealizada":true}';
  end if;
  select f into v_faixa from jsonb_array_elements(p_regras -> 'entrega' -> 'faixasDeAtraso')
    with ordinality as x (f, i)
  where p_minutos <= (f ->> 'ateMinutos')::numeric order by i limit 1;
  return jsonb_build_object('desconto', coalesce((v_faixa ->> 'desconto')::numeric, 0), 'naoRealizada', false);
end;
$$;

-- { pontos, pendente } da prova oficial (realização confirmada + bônus por nota confirmada).
create function app.pontuar_prova_oficial(p_resultados jsonb, p_regras jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  p jsonb := p_regras -> 'provaOficial';
  r jsonb;
  v_pontos numeric := 0;
  v_pendente boolean := false;
begin
  for r in select * from jsonb_array_elements(coalesce(p_resultados, '[]'::jsonb)) loop
    if r ->> 'realizacao' = 'pendente' then v_pendente := true; end if;
    continue when r ->> 'realizacao' is distinct from 'confirmada';
    v_pontos := v_pontos + (p ->> 'pontosRealizacao')::numeric;
    if r -> 'nota' ->> 'estado' = 'pendente' then
      v_pendente := true;
    elsif r -> 'nota' ->> 'estado' = 'confirmada'
          and (r -> 'nota' ->> 'valor')::numeric >= (p ->> 'notaMinimaBonus')::numeric then
      v_pontos := v_pontos + (p ->> 'pontosBonus')::numeric;
    end if;
  end loop;
  return jsonb_build_object('pontos', least(v_pontos, (p ->> 'maximoPorDupla')::numeric), 'pendente', v_pendente);
end;
$$;

-- Desconto das penalidades: uma vez por fato (a primeira), limitado ao teto do encontro.
create function app.consolidar_penalidades(p_penalidades jsonb, p_regras jsonb)
returns numeric language plpgsql immutable set search_path = '' as $$
declare
  pen jsonb;
  v_fatos text[] := '{}';
  v_soma numeric := 0;
begin
  for pen in select * from jsonb_array_elements(coalesce(p_penalidades, '[]'::jsonb)) loop
    if (pen ->> 'pontos')::numeric < 0 then
      raise exception 'Os pontos de uma penalidade não podem ser negativos.' using errcode = '23514';
    end if;
    continue when (pen ->> 'fatoId') = any (v_fatos);
    v_fatos := v_fatos || (pen ->> 'fatoId');
    v_soma := v_soma + (pen ->> 'pontos')::numeric;
  end loop;
  return least(v_soma, (p_regras -> 'penalidades' ->> 'tetoDescontosPorEncontro')::numeric);
end;
$$;

-- Pontos da entrega (nulo = pendente).
create function app.pontuar_entrega(p_entrega jsonb, p_regras jsonb)
returns numeric language plpgsql immutable set search_path = '' as $$
declare
  v_bruto numeric;
  v_atraso jsonb;
  v_nota_atraso numeric;
begin
  if p_entrega ->> 'situacao' = 'pendente' then return null; end if;
  if p_entrega ->> 'situacao' = 'nao_entregue' or coalesce((p_entrega ->> 'plagioComprovado')::boolean, false) then
    return 0;
  end if;
  v_bruto := app.validar_notas(p_entrega -> 'notas', p_regras -> 'entrega' -> 'criterios');
  v_atraso := case when coalesce((p_entrega ->> 'excecaoAutorizada')::boolean, false)
                   then '{"desconto":0,"naoRealizada":false}'::jsonb
                   else app.desconto_por_atraso((p_entrega ->> 'atrasoMinutos')::numeric, p_regras) end;
  if (v_atraso ->> 'naoRealizada')::boolean then return 0; end if;
  v_nota_atraso := coalesce((p_entrega -> 'notas' ->> (p_regras -> 'entrega' ->> 'criterioDeAtraso'))::numeric, 0);
  return v_bruto - least((v_atraso ->> 'desconto')::numeric, v_nota_atraso);
end;
$$;

-- `calcularEncontro`: lançamentos (formato `LancamentosDoEncontro`) → `PontuacaoDoEncontro`.
create function app.calcular_encontro(p_lancamentos jsonb, p_regras jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  l jsonb := p_lancamentos;
  v_pend text[] := '{}';
  v_presenca numeric;
  v_participacao numeric := 0;
  v_objetiva numeric := 0;
  v_prova jsonb;
  v_entrega numeric;
  v_apresentacao numeric := 0;
  v_descontos numeric;
begin
  v_presenca := least(
    (select count(*) from jsonb_array_elements(coalesce(l -> 'presencas', '[]'::jsonb)) p
     where (p ->> 'presente')::boolean) * (p_regras -> 'presenca' ->> 'pontosPorIntegrante')::numeric,
    (p_regras -> 'presenca' ->> 'maximoPorDupla')::numeric);

  if l -> 'participacao' is not null and jsonb_typeof(l -> 'participacao') = 'object' then
    v_participacao := app.validar_notas(l -> 'participacao', p_regras -> 'participacao' -> 'criterios');
  else
    v_pend := v_pend || 'participacao'::text;
  end if;

  if l -> 'avaliacaoObjetiva' is null or jsonb_typeof(l -> 'avaliacaoObjetiva') <> 'object' then
    v_pend := v_pend || 'avaliacaoObjetiva'::text;
  elsif l -> 'avaliacaoObjetiva' ->> 'tipo' = 'questoes' then
    v_objetiva := app.pontuar_questoes((l -> 'avaliacaoObjetiva' ->> 'acertos')::int,
                                       (l -> 'avaliacaoObjetiva' ->> 'total')::int, p_regras);
  else
    v_prova := app.pontuar_prova_oficial(l -> 'avaliacaoObjetiva' -> 'resultados', p_regras);
    v_objetiva := (v_prova ->> 'pontos')::numeric;
    if (v_prova ->> 'pendente')::boolean then v_pend := v_pend || 'avaliacaoObjetiva'::text; end if;
  end if;

  v_entrega := app.pontuar_entrega(l -> 'entrega', p_regras);
  if v_entrega is null then v_pend := v_pend || 'entrega'::text; end if;

  if l -> 'apresentacao' ->> 'situacao' = 'pendente' then
    v_pend := v_pend || 'apresentacao'::text;
  elsif l -> 'apresentacao' ->> 'situacao' = 'avaliada' then
    v_apresentacao := app.validar_notas(l -> 'apresentacao' -> 'notas', p_regras -> 'apresentacao' -> 'criterios');
  end if;

  v_descontos := app.consolidar_penalidades(l -> 'penalidades', p_regras);
  return jsonb_build_object(
    'presenca', trim_scale(v_presenca),
    'participacao', trim_scale(v_participacao),
    'avaliacaoObjetiva', trim_scale(v_objetiva),
    'entrega', trim_scale(coalesce(v_entrega, 0)),
    'apresentacao', trim_scale(v_apresentacao),
    'descontos', trim_scale(v_descontos),
    'total', app.arredondar(greatest(0, v_presenca + v_participacao + v_objetiva + coalesce(v_entrega, 0)
                                        + v_apresentacao - v_descontos), (p_regras ->> 'casasDecimais')::int),
    'pendencias', to_jsonb(v_pend));
end;
$$;

-- `classificar`: total → entrega → componente objetivo → presença; empate persistente compartilha a
-- posição; o nome (pt-BR) só ordena dentro do empate.
create function app.classificar(p_equipes jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  with e as (
    select x ->> 'duplaId' as dupla, x ->> 'nome' as nome, x -> 'totais' as totais,
           (x -> 'totais' ->> 'total')::numeric as total,
           (x -> 'totais' ->> 'entrega')::numeric as entrega,
           (x -> 'totais' ->> 'avaliacaoObjetiva')::numeric as objetiva,
           (x -> 'totais' ->> 'presenca')::numeric as presenca
    from jsonb_array_elements(coalesce(p_equipes, '[]'::jsonb)) x
  ), r as (
    select e.*,
           rank() over (order by total desc, entrega desc, objetiva desc, presenca desc) as posicao,
           count(*) over (partition by total, entrega, objetiva, presenca) > 1 as compartilhada
    from e
  )
  select coalesce(jsonb_agg(jsonb_build_object('duplaId', dupla, 'nome', nome, 'posicao', posicao,
                                               'compartilhada', compartilhada, 'totais', totais)
                            order by total desc, entrega desc, objetiva desc, presenca desc,
                                     nome collate "pt-BR-x-icu"), '[]'::jsonb)
  from r;
$$;

-- ---------------------------------------------------------------------------
-- Montagem dos lançamentos oficiais a partir das tabelas (espelha `calcularParcial` da spec 006,
-- com a prova oficial e as ocorrências confirmadas). Campo extra `objetivaMedia`: média das
-- listas de questões do encontro, aplicada por `app.pontos_do_encontro`.
-- ---------------------------------------------------------------------------
create function app.zeros(p_criterios jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(c ->> 'id', 0), '{}'::jsonb) from jsonb_array_elements(p_criterios) c;
$$;

create function app.media_por_criterio(p_lista jsonb, p_criterios jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(c ->> 'id',
           (select trim_scale(avg(coalesce((n ->> (c ->> 'id'))::numeric, 0)))
            from jsonb_array_elements(p_lista) n)), '{}'::jsonb)
  from jsonb_array_elements(p_criterios) c;
$$;

create function app.lancamentos_oficiais(p_dupla uuid, p_encontro uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_edicao uuid;
  v_turma uuid;
  v_regras jsonb;
  v_tipo public.avaliacao_objetiva;
  v_casas int;
  v_res jsonb;
  v_desafios jsonb;
  v_listas jsonb;
  v_media numeric;
begin
  select d.edicao_id, d.turma_id into v_edicao, v_turma from public.duplas d where d.id = p_dupla;
  select en.avaliacao_objetiva into v_tipo from public.encontros en where en.id = p_encontro;
  v_regras := app.regras_da_edicao(v_edicao);
  v_casas := (v_regras ->> 'casasDecimais')::int;

  v_res := jsonb_build_object(
    'presencas', coalesce((
      select jsonb_agg(jsonb_build_object('estudanteId', p.estudante_id, 'presente', p.presente))
      from public.presencas p
      join public.dupla_integrantes i on i.estudante_id = p.estudante_id and i.dupla_id = p_dupla
                                     and i.saida_em is null
      where p.encontro_id = p_encontro), '[]'::jsonb),
    -- Ocorrências confirmadas com desconto geral, na ordem do registro (FR-011).
    'penalidades', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'fatoId', o.fato_chave, 'pontos', (t ->> 'pontos')::numeric)
                       order by o.criado_em, o.id)
      from public.ocorrencias o
      join jsonb_array_elements(v_regras -> 'penalidades' -> 'tipos') t on t ->> 'id' = o.tipo and t ? 'pontos'
      where o.dupla_id = p_dupla and o.encontro_id = p_encontro and o.estado = 'confirmada'), '[]'::jsonb));

  if exists (select 1 from public.participacoes pa where pa.encontro_id = p_encontro and pa.dupla_id = p_dupla) then
    v_res := v_res || jsonb_build_object('participacao', (
      select pa.notas from public.participacoes pa where pa.encontro_id = p_encontro and pa.dupla_id = p_dupla));
  end if;

  -- Componente objetivo. Prova oficial: os resultados gravados para a equipe (mesmo de quem saiu
  -- depois) e, como pendentes, os integrantes atuais ainda sem resultado neste encontro.
  if v_tipo = 'prova_oficial' then
    select jsonb_agg(x order by x ->> 'estudanteId') into v_listas from (
      select jsonb_build_object('estudanteId', r.estudante_id, 'realizacao', r.realizacao,
               'nota', case when r.nota_estado = 'confirmada'
                            then jsonb_build_object('estado', 'confirmada', 'valor', r.nota)
                            else jsonb_build_object('estado', r.nota_estado) end) as x
      from public.resultados_prova r where r.encontro_id = p_encontro and r.dupla_id = p_dupla
      union all
      select jsonb_build_object('estudanteId', i.estudante_id, 'realizacao', 'pendente',
                                'nota', '{"estado":"pendente"}'::jsonb)
      from public.dupla_integrantes i
      where i.dupla_id = p_dupla and i.saida_em is null
        and not exists (select 1 from public.resultados_prova r
                        where r.encontro_id = p_encontro and r.estudante_id = i.estudante_id)) t;
    if v_listas is not null then
      v_res := v_res || jsonb_build_object('avaliacaoObjetiva',
                          jsonb_build_object('tipo', 'prova_oficial', 'resultados', v_listas));
    end if;
    v_listas := null;
  elsif v_tipo = 'questoes' then
    select jsonb_agg(jsonb_build_object(
             'encerrada', app.lista_encerrada(l.id),
             'acertos', (select s.acertos from public.submissoes_questoes s
                         where s.lista_id = l.id and s.dupla_id = p_dupla),
             'total', (select count(*) from public.questoes q where q.lista_id = l.id)))
      into v_listas
    from public.listas_questoes l join public.lista_turmas lt on lt.lista_id = l.id and lt.turma_id = v_turma
    where l.encontro_id = p_encontro and l.estado <> 'rascunho';
    if v_listas is not null and not exists (
         select 1 from jsonb_array_elements(v_listas) x where not (x ->> 'encerrada')::boolean) then
      select app.arredondar(avg(case when x ->> 'acertos' is null then 0
                                     else app.pontuar_questoes((x ->> 'acertos')::int, (x ->> 'total')::int, v_regras) end),
                            v_casas)
        into v_media from jsonb_array_elements(v_listas) x;
      v_res := v_res || jsonb_build_object('objetivaMedia', v_media);
    end if;
  end if;

  -- Entrega e apresentação: média dos desafios do encontro, todos avaliados.
  select jsonb_agg(jsonb_build_object(
           'avaliacao', app.avaliacao_json(d.id, p_dupla),
           'temEntrega', exists (select 1 from public.entregas e where e.desafio_id = d.id and e.dupla_id = p_dupla),
           'atrasoMinutos', coalesce((select e.atraso_minutos from public.entregas e
                                      where e.desafio_id = d.id and e.dupla_id = p_dupla
                                      order by e.versao desc limit 1), 0),
           'prorrogada', exists (select 1 from public.prorrogacoes pr where pr.desafio_id = d.id and pr.dupla_id = p_dupla),
           -- Plágio confirmado zera a entrega do desafio (e a apresentação, se dependente), fora do teto.
           'plagio', exists (select 1 from public.ocorrencias o
                             join jsonb_array_elements(v_regras -> 'penalidades' -> 'tipos') t
                               on t ->> 'id' = o.tipo and coalesce((t ->> 'zeraEntrega')::boolean, false)
                             where o.dupla_id = p_dupla and o.desafio_id = d.id and o.estado = 'confirmada'),
           'apresentacaoDependente', exists (select 1 from public.ocorrencias o
                             join jsonb_array_elements(v_regras -> 'penalidades' -> 'tipos') t
                               on t ->> 'id' = o.tipo and coalesce((t ->> 'zeraEntrega')::boolean, false)
                             where o.dupla_id = p_dupla and o.desafio_id = d.id and o.estado = 'confirmada'
                               and o.apresentacao_dependente))
         order by d.prazo, d.id)
    into v_desafios
  from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = v_turma
  where d.encontro_id = p_encontro and d.estado <> 'rascunho';

  if v_desafios is null or exists (select 1 from jsonb_array_elements(v_desafios) x where x -> 'avaliacao' is null
                                                                                      or x -> 'avaliacao' = 'null'::jsonb) then
    v_res := v_res || '{"entrega":{"situacao":"pendente"},"apresentacao":{"situacao":"pendente"}}'::jsonb;
  else
    v_res := v_res || jsonb_build_object('entrega',
      case when not exists (select 1 from jsonb_array_elements(v_desafios) x where (x ->> 'temEntrega')::boolean)
           then '{"situacao":"nao_entregue"}'::jsonb
           else jsonb_build_object('situacao', 'avaliada', 'atrasoMinutos', 0, 'notas',
             app.media_por_criterio((
               select jsonb_agg(app.entrega_com_desconto(x, v_regras)) from jsonb_array_elements(v_desafios) x),
               v_regras -> 'entrega' -> 'criterios')) end);
    v_res := v_res || jsonb_build_object('apresentacao',
      case when not exists (select 1 from jsonb_array_elements(v_desafios) x where not app.apresentacao_zerada(x))
           then '{"situacao":"nao_avaliavel","justificativa":"Apresentação não avaliável."}'::jsonb
           else jsonb_build_object('situacao', 'avaliada', 'notas',
             app.media_por_criterio((
               select jsonb_agg(case when app.apresentacao_zerada(x) then app.zeros(v_regras -> 'apresentacao' -> 'criterios')
                                     else x -> 'avaliacao' -> 'notasApresentacao' end)
               from jsonb_array_elements(v_desafios) x),
               v_regras -> 'apresentacao' -> 'criterios')) end);
  end if;
  return v_res;
end;
$$;

-- Notas de entrega do desafio já com o desconto de atraso no critério das regras (spec 006, FR-013).
create function app.entrega_com_desconto(p_desafio jsonb, p_regras jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  v_notas jsonb := p_desafio -> 'avaliacao' -> 'notasEntrega';
  v_atraso jsonb;
  v_criterio text := p_regras -> 'entrega' ->> 'criterioDeAtraso';
  v_nota numeric;
begin
  if not (p_desafio ->> 'temEntrega')::boolean or v_notas is null or v_notas = 'null'::jsonb
     or coalesce((p_desafio ->> 'plagio')::boolean, false) then
    return app.zeros(p_regras -> 'entrega' -> 'criterios');
  end if;
  v_atraso := case when (p_desafio ->> 'prorrogada')::boolean then '{"desconto":0,"naoRealizada":false}'::jsonb
                   else app.desconto_por_atraso((p_desafio ->> 'atrasoMinutos')::numeric, p_regras) end;
  if (v_atraso ->> 'naoRealizada')::boolean then
    return app.zeros(p_regras -> 'entrega' -> 'criterios');
  end if;
  v_nota := coalesce((v_notas ->> v_criterio)::numeric, 0);
  return v_notas || jsonb_build_object(v_criterio, v_nota - least((v_atraso ->> 'desconto')::numeric, v_nota));
end;
$$;

-- Apresentação que vale zero: não avaliável, sem notas ou zerada por plágio dependente.
create function app.apresentacao_zerada(p_desafio jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce((p_desafio -> 'avaliacao' ->> 'apresentacaoNaoAvaliavel')::boolean, false)
      or p_desafio -> 'avaliacao' -> 'notasApresentacao' is null
      or p_desafio -> 'avaliacao' -> 'notasApresentacao' = 'null'::jsonb
      or (coalesce((p_desafio ->> 'plagio')::boolean, false)
          and coalesce((p_desafio ->> 'apresentacaoDependente')::boolean, false));
$$;

-- Pontos oficiais do encontro: cálculo puro + média das listas (como `calcularParcial`).
create function app.pontos_do_encontro(p_dupla uuid, p_encontro uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_regras jsonb := app.regras_da_edicao((select edicao_id from public.duplas where id = p_dupla));
  v_lanc jsonb := app.lancamentos_oficiais(p_dupla, p_encontro);
  v_base jsonb := app.calcular_encontro(v_lanc - 'objetivaMedia', v_regras);
  v_media numeric := (v_lanc ->> 'objetivaMedia')::numeric;
  v_bruto numeric;
begin
  if v_media is null then return v_base; end if;
  v_bruto := (v_base ->> 'presenca')::numeric + (v_base ->> 'participacao')::numeric + v_media
           + (v_base ->> 'entrega')::numeric + (v_base ->> 'apresentacao')::numeric;
  return v_base || jsonb_build_object(
    'avaliacaoObjetiva', v_media,
    'total', app.arredondar(greatest(0, v_bruto - (v_base ->> 'descontos')::numeric), (v_regras ->> 'casasDecimais')::int),
    'pendencias', coalesce((select jsonb_agg(p) from jsonb_array_elements(v_base -> 'pendencias') p
                            where p <> '"avaliacaoObjetiva"'::jsonb), '[]'::jsonb));
end;
$$;

-- `acumularEncontros` + detalhe por encontro da edição (2 casas, como `ranking.ts`).
create function app.totais_da_equipe(p_dupla uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with enc as (
    select en.id, en.numero, en.titulo, app.pontos_do_encontro(p_dupla, en.id) as p
    from public.encontros en
    where en.edicao_id = (select edicao_id from public.duplas where id = p_dupla)
  )
  select jsonb_build_object(
    'totais', jsonb_build_object(
      'total', coalesce(app.arredondar(sum((p ->> 'total')::numeric), 2), 0),
      'entrega', coalesce(app.arredondar(sum((p ->> 'entrega')::numeric), 2), 0),
      'avaliacaoObjetiva', coalesce(app.arredondar(sum((p ->> 'avaliacaoObjetiva')::numeric), 2), 0),
      'presenca', coalesce(app.arredondar(sum((p ->> 'presenca')::numeric), 2), 0),
      'pendente', coalesce(bool_or(jsonb_array_length(p -> 'pendencias') > 0), false)),
    'encontros', coalesce(jsonb_agg(jsonb_build_object('encontroId', id, 'numero', numero, 'titulo', titulo,
                                                       'pontuacao', p) order by numero), '[]'::jsonb))
  from enc;
$$;

-- ===========================================================================
-- Avisos no aplicativo (FR-026) e prazos efetivos
-- ===========================================================================
create policy avisos_ler on public.avisos for select to authenticated
  using (destinatario_id = (select auth.uid()));

-- Cria um aviso por destinatário; chamada só pelas RPCs, na mesma transação da operação.
create function app.avisar(p_destinatarios uuid[], p_tipo text, p_titulo text, p_referencia jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.avisos (destinatario_id, tipo, titulo, referencia)
  select distinct d, p_tipo, p_titulo, coalesce(p_referencia, '{}'::jsonb)
  from unnest(p_destinatarios) d where d is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function app.avisar(uuid[], text, text, jsonb) from public, anon, authenticated;

create function public.meus_avisos(p_limite int default 50)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'naoLidos', (select count(*) from public.avisos a
                 where a.destinatario_id = (select auth.uid()) and a.lido_em is null),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'tipo', a.tipo, 'titulo', a.titulo,
                                          'referencia', a.referencia, 'criadoEm', a.criado_em,
                                          'lidoEm', a.lido_em) order by a.criado_em desc, a.id)
      from (select * from public.avisos a where a.destinatario_id = (select auth.uid())
            order by a.criado_em desc, a.id limit greatest(1, least(coalesce(p_limite, 50), 200))) a), '[]'::jsonb));
$$;

create function public.marcar_avisos_lidos(p_ids uuid[])
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.avisos set lido_em = now()
  where id = any (coalesce(p_ids, '{}')) and destinatario_id = (select auth.uid()) and lido_em is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Prazo de manifestação: o registrado na ocorrência ou a exceção mais recente da coordenação.
create function app.prazo_manifestacao_efetivo(p_ocorrencia uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select x.novo_prazo from public.excecoes_prazo x
     where x.ocorrencia_id = p_ocorrencia and x.objeto = 'manifestacao'
     order by x.criado_em desc, x.id limit 1),
    (select o.prazo_manifestacao from public.ocorrencias o where o.id = p_ocorrencia));
$$;

-- Prazo de revisão: decisão + revisaoHoras (ocorrência) ou `revisao_ate` (publicação provisória),
-- salvo exceção mais recente para a equipe e o objeto.
create function app.prazo_revisao_efetivo(p_dupla uuid, p_ocorrencia uuid, p_publicacao uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select x.novo_prazo from public.excecoes_prazo x
     where x.dupla_id = p_dupla and x.objeto = 'revisao'
       and (x.ocorrencia_id = p_ocorrencia or x.publicacao_id = p_publicacao)
     order by x.criado_em desc, x.id limit 1),
    case when p_ocorrencia is not null then
      (select o.decidido_em + make_interval(hours => (app.regras_da_edicao(o.edicao_id) -> 'prazos' ->> 'revisaoHoras')::int)
       from public.ocorrencias o where o.id = p_ocorrencia)
    else (select p.revisao_ate from public.publicacoes_ranking p where p.id = p_publicacao) end);
$$;

revoke all on function public.meus_avisos(int), public.marcar_avisos_lidos(uuid[]) from public, anon;
grant execute on function public.meus_avisos(int), public.marcar_avisos_lidos(uuid[]) to authenticated;

-- ===========================================================================
-- Helpers comuns das RPCs desta spec
-- ===========================================================================
-- U1: edição encerrada aceita só leitura.
create function app.exigir_edicao_em_andamento(p_edicao uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.edicoes where id = p_edicao and estado = 'encerrada') then
    raise exception 'A edição está encerrada; os resultados não podem mais ser alterados.'
      using errcode = '23514';
  end if;
end;
$$;

create function app.exigir_coordenacao_da_edicao(p_edicao uuid, p_mensagem text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_edicao is null or not app.e_coordenacao(p_edicao) then
    raise exception '%', p_mensagem using errcode = '42501';
  end if;
end;
$$;

-- R7: liga as gravações desta transação a um pedido de revisão aberto da mesma equipe.
create function app.vincular_pedido(p_pedido uuid, p_dupla uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.pedidos_revisao;
begin
  if p_pedido is null then return; end if;
  select * into v from public.pedidos_revisao where id = p_pedido;
  if not found or v.estado <> 'aberto' then
    raise exception 'O pedido de revisão informado não está aberto.' using errcode = '23514';
  end if;
  if p_dupla is not null and v.dupla_id <> p_dupla then
    raise exception 'O pedido de revisão informado é de outra equipe.' using errcode = '23514';
  end if;
  if not app.e_coordenacao(v.edicao_id) then
    raise exception 'Só a coordenação corrige registros a partir de um pedido de revisão.' using errcode = '42501';
  end if;
  perform set_config('app.pedido_revisao', p_pedido::text, true);
end;
$$;

-- ===========================================================================
-- US1 — prova oficial (FR-001 a FR-004)
-- ===========================================================================
create policy resultados_prova_ler on public.resultados_prova for select to authenticated
  using (app.e_coordenacao((select edicao_id from public.encontros where id = encontro_id)));

create function public.registrar_resultados_prova(p_encontro uuid, p_resultados jsonb,
                                                  p_justificativa text default null, p_pedido uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid;
  v_tipo public.avaliacao_objetiva;
  r jsonb;
  v_estudante uuid;
  v_atual public.resultados_prova;
  v_dupla uuid;
  v_realizacao public.realizacao_prova;
  v_nota numeric;
  v_estado public.estado_nota_prova;
  v_fonte text;
  v_escala boolean;
  v_autoriza boolean;
  v_gravadas int := 0;
  v_justificou boolean := false;
begin
  select en.edicao_id, en.avaliacao_objetiva into v_edicao, v_tipo from public.encontros en where en.id = p_encontro;
  if v_edicao is null then
    raise exception 'Encontro não encontrado.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_da_edicao(v_edicao, 'Só a coordenação da edição registra a prova oficial.');
  perform app.exigir_edicao_em_andamento(v_edicao);
  if v_tipo <> 'prova_oficial' then
    raise exception 'Este encontro não tem prova oficial.' using errcode = '23514';
  end if;
  if p_resultados is null or jsonb_typeof(p_resultados) <> 'array' then
    raise exception 'Informe os resultados da prova.' using errcode = '23514';
  end if;

  for r in select * from jsonb_array_elements(p_resultados) loop
    v_estudante := (r ->> 'estudanteId')::uuid;
    v_realizacao := (r ->> 'realizacao')::public.realizacao_prova;
    v_nota := nullif(r ->> 'nota', '')::numeric;
    v_fonte := nullif(btrim(coalesce(r ->> 'fonte', '')), '');
    v_escala := coalesce((r ->> 'escalaConfirmada')::boolean, false);
    v_autoriza := coalesce((r ->> 'autorizacaoConfirmada')::boolean, false);
    if v_nota is not null and v_realizacao <> 'confirmada' then
      raise exception 'A nota só pode ser registrada para quem realizou a prova.' using errcode = '23514';
    end if;
    if v_nota is not null and (v_nota < 0 or v_nota > 100) then
      raise exception 'A nota oficial deve estar entre 0 e 100.' using errcode = '23514';
    end if;
    if v_nota is not null and v_fonte is null then
      raise exception 'Informe a fonte da nota oficial.' using errcode = '23514';
    end if;
    -- R4: confirmada só com nota, escala e autorização verificadas; nenhuma conversão de escala.
    v_estado := case
      when coalesce((r ->> 'notaIndisponivel')::boolean, false) and v_realizacao = 'confirmada' then 'indisponivel'
      when v_nota is not null and v_escala and v_autoriza then 'confirmada'
      else 'pendente' end;
    if v_estado = 'indisponivel' then v_nota := null; end if;

    select * into v_atual from public.resultados_prova
    where encontro_id = p_encontro and estudante_id = v_estudante for update;
    if found then
      continue when v_atual.realizacao = v_realizacao and v_atual.nota is not distinct from v_nota
        and v_atual.nota_estado = v_estado and v_atual.fonte is not distinct from v_fonte
        and v_atual.escala_confirmada = v_escala and v_atual.autorizacao_confirmada = v_autoriza;
      if not v_justificou then
        perform app.registrar_justificativa(p_justificativa);
        perform app.vincular_pedido(p_pedido, v_atual.dupla_id);
        v_justificou := true;
      end if;
      update public.resultados_prova
      set realizacao = v_realizacao, nota = v_nota, nota_estado = v_estado, fonte = v_fonte,
          escala_confirmada = v_escala, autorizacao_confirmada = v_autoriza,
          autor_id = auth.uid(), registrado_em = now()
      where encontro_id = p_encontro and estudante_id = v_estudante;
    else
      v_dupla := app.equipe_ativa_do_aluno(v_edicao, v_estudante);
      if v_dupla is null then
        raise exception 'O estudante não está numa equipe ativa desta edição.' using errcode = '23514';
      end if;
      insert into public.resultados_prova (encontro_id, estudante_id, dupla_id, realizacao, nota, nota_estado,
                                           fonte, escala_confirmada, autorizacao_confirmada)
      values (p_encontro, v_estudante, v_dupla, v_realizacao, v_nota, v_estado, v_fonte, v_escala, v_autoriza);
    end if;
    v_gravadas := v_gravadas + 1;
  end loop;
  return v_gravadas;
end;
$$;

-- Lista da coordenação: estudantes em equipe ativa da edição, com o resultado (a única leitura
-- que traz a nota individual, FR-003).
create function public.resultados_prova(p_encontro uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_edicao uuid := (select edicao_id from public.encontros where id = p_encontro);
begin
  perform app.exigir_coordenacao_da_edicao(v_edicao, 'Só a coordenação da edição consulta as notas da prova oficial.');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'estudanteId', x.estudante_id, 'estudanteNome', pe.nome,
             'duplaId', d.id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'),
             'turmaId', t.id, 'turmaNome', t.nome,
             'realizacao', r.realizacao, 'nota', r.nota, 'notaEstado', r.nota_estado, 'fonte', r.fonte,
             'escalaConfirmada', coalesce(r.escala_confirmada, false),
             'autorizacaoConfirmada', coalesce(r.autorizacao_confirmada, false),
             'registradoEm', r.registrado_em)
           order by t.nome, d.nome, pe.nome)
    from (
      select r2.estudante_id, r2.dupla_id from public.resultados_prova r2 where r2.encontro_id = p_encontro
      union
      select i.estudante_id, i.dupla_id from public.dupla_integrantes i
      join public.duplas d2 on d2.id = i.dupla_id and d2.ativa
      where i.edicao_id = v_edicao and i.saida_em is null
        and not exists (select 1 from public.resultados_prova r3
                        where r3.encontro_id = p_encontro and r3.estudante_id = i.estudante_id)
    ) x
    join public.perfis pe on pe.id = x.estudante_id
    join public.duplas d on d.id = x.dupla_id
    join public.turmas t on t.id = d.turma_id
    left join public.resultados_prova r on r.encontro_id = p_encontro and r.estudante_id = x.estudante_id), '[]'::jsonb);
end;
$$;

revoke all on function public.registrar_resultados_prova(uuid, jsonb, text, uuid), public.resultados_prova(uuid)
  from public, anon;
grant execute on function public.registrar_resultados_prova(uuid, jsonb, text, uuid), public.resultados_prova(uuid)
  to authenticated;

-- ===========================================================================
-- US2 — ocorrências, manifestação, decisão e exceções de prazo (FR-005 a FR-011, FR-021)
-- ===========================================================================
-- Integrantes atuais da equipe.
create function app.integrantes_atuais(p_dupla uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(i.estudante_id order by i.estudante_id), '{}')
  from public.dupla_integrantes i where i.dupla_id = p_dupla and i.saida_em is null;
$$;

-- FR-010: a própria equipe (atual ou do fato), a equipe docente da turma e a coordenação.
create function app.pode_ver_ocorrencia(p_ocorrencia uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
    where o.id = p_ocorrencia
      and (app.e_gestao_da_turma(d.turma_id)
           or (select auth.uid()) = any (app.integrantes_atuais(o.dupla_id))
           or o.integrantes @> jsonb_build_array(jsonb_build_object('estudanteId', (select auth.uid()))))
  );
$$;

create policy ocorrencias_ler on public.ocorrencias for select to authenticated
  using (app.pode_ver_ocorrencia(id));
create policy manifestacoes_ler on public.manifestacoes for select to authenticated
  using (app.pode_ver_ocorrencia(ocorrencia_id));
create policy excecoes_ler on public.excecoes_prazo for select to authenticated
  using (app.e_coordenacao(app.edicao_da_turma(app.turma_da_dupla(dupla_id)))
         or (select auth.uid()) = any (app.integrantes_atuais(dupla_id)));

-- Storage: `{edicao}/{dupla}/{chave}.ext`. Envio pela gestão da turma da equipe; download por
-- quem pode ver as ocorrências da equipe.
create function app.dupla_do_caminho_de_evidencia(p_nome text)
returns uuid language sql immutable set search_path = '' as $$
  select split_part(p_nome, '/', 2)::uuid where p_nome ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[^/]+$';
$$;
create function app.pode_enviar_evidencia(p_nome text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.duplas d
                 where d.id = app.dupla_do_caminho_de_evidencia(p_nome)
                   and d.edicao_id::text = split_part(p_nome, '/', 1)
                   and app.e_gestao_da_turma(d.turma_id));
$$;
create function app.pode_ver_evidencia(p_nome text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.duplas d
                 where d.id = app.dupla_do_caminho_de_evidencia(p_nome)
                   and (app.e_gestao_da_turma(d.turma_id)
                        or (select auth.uid()) = any (app.integrantes_atuais(d.id))));
$$;
create policy evidencias_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and app.pode_enviar_evidencia(name));
create policy evidencias_baixar on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and app.pode_ver_evidencia(name));

create function public.registrar_ocorrencia(p_chave uuid, p_encontro uuid, p_dupla uuid, p_tipo text,
  p_fato text, p_evidencia text, p_desafio uuid default null, p_fato_chave text default null,
  p_evidencia_path text default null, p_evidencia_nome text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_existente public.ocorrencias;
  v_dupla public.duplas;
  v_regras jsonb;
  v_tipo jsonb;
  v_id uuid := gen_random_uuid();
  v_meta jsonb;
  v_prazo timestamptz;
begin
  select * into v_existente from public.ocorrencias where chave_envio = p_chave;
  if found then
    if v_existente.autor_id <> v_uid then
      raise exception 'Chave de envio já utilizada.' using errcode = '23514';
    end if;
    return jsonb_build_object('id', v_existente.id,
                              'prazoManifestacao', app.prazo_manifestacao_efetivo(v_existente.id));
  end if;

  select * into v_dupla from public.duplas where id = p_dupla;
  if not found then
    raise exception 'Equipe não encontrada.' using errcode = 'P0002';
  end if;
  if not app.e_gestao_da_turma(v_dupla.turma_id) then
    raise exception 'Só a equipe docente da turma ou a coordenação registra ocorrências desta equipe.'
      using errcode = '42501';
  end if;
  perform app.exigir_edicao_em_andamento(v_dupla.edicao_id);
  if not exists (select 1 from public.encontros where id = p_encontro and edicao_id = v_dupla.edicao_id) then
    raise exception 'O encontro não pertence à edição da equipe.' using errcode = '23514';
  end if;
  v_regras := app.regras_da_edicao(v_dupla.edicao_id);
  select t into v_tipo from jsonb_array_elements(v_regras -> 'penalidades' -> 'tipos') t where t ->> 'id' = p_tipo;
  if v_tipo is null then
    raise exception 'Tipo de ocorrência fora das regras da edição.' using errcode = '23514';
  end if;
  if coalesce((v_tipo ->> 'zeraEntrega')::boolean, false) and p_desafio is null then
    raise exception 'Informe o desafio da entrega afetada.' using errcode = '23514';
  end if;
  if p_desafio is not null and not exists (
       select 1 from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id
       where d.id = p_desafio and dt.turma_id = v_dupla.turma_id and d.edicao_id = v_dupla.edicao_id) then
    raise exception 'O desafio não pertence à turma da equipe.' using errcode = '23514';
  end if;
  if p_evidencia_path is not null then
    select o.metadata into v_meta from storage.objects o
    where o.bucket_id = 'evidencias' and o.name = p_evidencia_path and o.owner_id = v_uid::text
      and o.name like v_dupla.edicao_id::text || '/' || p_dupla::text || '/%';
    if not found then
      raise exception 'Evidência não encontrada. Envie o arquivo novamente.' using errcode = '23514';
    end if;
    if coalesce((v_meta ->> 'size')::bigint, 0) > 52428800 then
      raise exception 'A evidência passa do limite de 50 MB.' using errcode = '23514';
    end if;
    if coalesce(v_meta ->> 'mimetype', '') <> all (array['application/pdf', 'application/zip',
         'application/x-zip-compressed', 'image/png', 'image/jpeg']) then
      raise exception 'Tipo de arquivo não aceito: envie PDF, ZIP, PNG ou JPG.' using errcode = '23514';
    end if;
  end if;

  v_prazo := now() + make_interval(hours => (v_regras -> 'prazos' ->> 'manifestacaoHoras')::int);
  insert into public.ocorrencias (id, edicao_id, encontro_id, dupla_id, desafio_id, tipo, fato, fato_chave,
                                  evidencia, evidencia_path, evidencia_nome, integrantes, prazo_manifestacao,
                                  chave_envio)
  values (v_id, v_dupla.edicao_id, p_encontro, p_dupla, p_desafio, p_tipo, btrim(p_fato),
          coalesce(nullif(btrim(coalesce(p_fato_chave, '')), ''), v_id::text), btrim(p_evidencia),
          p_evidencia_path, p_evidencia_nome,
          coalesce((select jsonb_agg(jsonb_build_object('estudanteId', i.estudante_id, 'nome', pe.nome) order by pe.nome)
                    from public.dupla_integrantes i join public.perfis pe on pe.id = i.estudante_id
                    where i.dupla_id = p_dupla and i.saida_em is null), '[]'::jsonb),
          v_prazo, p_chave);
  perform app.avisar(app.integrantes_atuais(p_dupla), 'ocorrencia_registrada',
                     'Nova ocorrência registrada para a sua equipe', jsonb_build_object('ocorrenciaId', v_id));
  return jsonb_build_object('id', v_id, 'prazoManifestacao', v_prazo);
end;
$$;

create function public.enviar_manifestacao(p_ocorrencia uuid, p_texto text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_o public.ocorrencias;
  v_m public.manifestacoes;
begin
  select * into v_o from public.ocorrencias where id = p_ocorrencia for update;
  if not found then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;
  if not (v_uid = any (app.integrantes_atuais(v_o.dupla_id))) then
    raise exception 'Só integrantes da equipe se manifestam sobre a ocorrência.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_em_andamento(v_o.edicao_id);
  select * into v_m from public.manifestacoes where ocorrencia_id = p_ocorrencia;
  if found then
    if v_m.autor_id = v_uid and v_m.texto = btrim(p_texto) then
      return jsonb_build_object('enviadaEm', v_m.enviada_em);
    end if;
    raise exception 'A equipe já enviou a manifestação desta ocorrência.' using errcode = '23514';
  end if;
  if v_o.estado <> 'registrada' then
    raise exception 'A ocorrência já foi decidida.' using errcode = '23514';
  end if;
  if now() > app.prazo_manifestacao_efetivo(p_ocorrencia) then
    raise exception 'O prazo de manifestação terminou.' using errcode = '23514';
  end if;
  insert into public.manifestacoes (ocorrencia_id, texto) values (p_ocorrencia, btrim(p_texto))
  returning * into v_m;
  update public.ocorrencias set estado = 'manifestada' where id = p_ocorrencia;
  return jsonb_build_object('enviadaEm', v_m.enviada_em);
end;
$$;

create function public.decidir_ocorrencia(p_ocorrencia uuid, p_resultado text, p_justificativa text,
  p_apresentacao_dependente boolean default false, p_pedido uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_o public.ocorrencias;
  v_resultado public.estado_ocorrencia;
  v_dependente boolean;
  v_zera boolean;
begin
  select * into v_o from public.ocorrencias where id = p_ocorrencia for update;
  if not found then
    raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_da_edicao(v_o.edicao_id, 'Só a coordenação decide ocorrências.');
  perform app.exigir_edicao_em_andamento(v_o.edicao_id);
  if p_resultado not in ('confirmada', 'arquivada') then
    raise exception 'A decisão deve confirmar ou arquivar a ocorrência.' using errcode = '23514';
  end if;
  v_resultado := p_resultado::public.estado_ocorrencia;
  v_zera := exists (select 1 from jsonb_array_elements(app.regras_da_edicao(v_o.edicao_id) -> 'penalidades' -> 'tipos') t
                    where t ->> 'id' = v_o.tipo and coalesce((t ->> 'zeraEntrega')::boolean, false));
  v_dependente := v_zera and coalesce(p_apresentacao_dependente, false);

  if v_o.estado in ('confirmada', 'arquivada') then
    if v_o.estado = v_resultado and v_o.justificativa_decisao = btrim(coalesce(p_justificativa, ''))
       and v_o.apresentacao_dependente = v_dependente then
      return;
    end if;
    if p_pedido is null then
      raise exception 'Para alterar uma decisão, informe o pedido de revisão da equipe.' using errcode = '23514';
    end if;
    perform app.vincular_pedido(p_pedido, v_o.dupla_id);
  elsif v_o.estado = 'registrada' and now() <= app.prazo_manifestacao_efetivo(p_ocorrencia) then
    raise exception 'O prazo de manifestação da equipe ainda está aberto.' using errcode = '23514';
  end if;

  perform app.registrar_justificativa(p_justificativa);
  update public.ocorrencias
  set estado = v_resultado, justificativa_decisao = btrim(p_justificativa),
      apresentacao_dependente = v_dependente, decidido_por = auth.uid(), decidido_em = now()
  where id = p_ocorrencia;
  perform app.avisar(app.integrantes_atuais(v_o.dupla_id), 'ocorrencia_decidida',
                     case when v_resultado = 'confirmada' then 'Ocorrência da sua equipe confirmada'
                          else 'Ocorrência da sua equipe arquivada' end,
                     jsonb_build_object('ocorrenciaId', p_ocorrencia));
end;
$$;

create function public.registrar_excecao_prazo(p_dupla uuid, p_objeto text, p_ocorrencia uuid,
  p_publicacao uuid, p_novo_prazo timestamptz, p_justificativa text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid := (select edicao_id from public.duplas where id = p_dupla);
  v_id uuid;
begin
  if v_edicao is null then
    raise exception 'Equipe não encontrada.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_da_edicao(v_edicao, 'Só a coordenação registra exceção de prazo.');
  perform app.exigir_edicao_em_andamento(v_edicao);
  if p_objeto not in ('manifestacao', 'revisao') then
    raise exception 'Objeto de prazo desconhecido.' using errcode = '23514';
  end if;
  if (p_ocorrencia is null) = (p_publicacao is null) then
    raise exception 'Informe a ocorrência ou a publicação da exceção.' using errcode = '23514';
  end if;
  if p_objeto = 'manifestacao' and p_ocorrencia is null then
    raise exception 'A exceção de manifestação é de uma ocorrência.' using errcode = '23514';
  end if;
  if p_ocorrencia is not null and not exists (select 1 from public.ocorrencias where id = p_ocorrencia and dupla_id = p_dupla) then
    raise exception 'A ocorrência não é desta equipe.' using errcode = '23514';
  end if;
  if p_publicacao is not null and not exists (select 1 from public.publicacao_posicoes
                                              where publicacao_id = p_publicacao and dupla_id = p_dupla) then
    raise exception 'A publicação não inclui esta equipe.' using errcode = '23514';
  end if;
  if p_novo_prazo is null or p_novo_prazo <= now() then
    raise exception 'O novo prazo precisa ser futuro.' using errcode = '23514';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  insert into public.excecoes_prazo (dupla_id, objeto, ocorrencia_id, publicacao_id, novo_prazo, justificativa)
  values (p_dupla, p_objeto::public.objeto_prazo, p_ocorrencia, p_publicacao, p_novo_prazo, btrim(p_justificativa))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.ocorrencias_visiveis(p_edicao uuid, p_turma uuid default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'edicaoId', o.edicao_id, 'encontroId', o.encontro_id, 'encontroNumero', en.numero,
           'duplaId', o.dupla_id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'), 'turmaId', d.turma_id,
           'desafioId', o.desafio_id, 'tipo', o.tipo,
           'tipoRotulo', coalesce((select t ->> 'rotulo' from jsonb_array_elements(app.regras_da_edicao(o.edicao_id) -> 'penalidades' -> 'tipos') t
                                   where t ->> 'id' = o.tipo), o.tipo),
           'fato', o.fato, 'evidencia', o.evidencia, 'evidenciaPath', o.evidencia_path,
           'evidenciaNome', o.evidencia_nome, 'estado', o.estado,
           'prazoManifestacao', app.prazo_manifestacao_efetivo(o.id), 'criadoEm', o.criado_em,
           'autorNome', (select nome from public.perfis where id = o.autor_id),
           'manifestacao', (select jsonb_build_object('texto', m.texto, 'enviadaEm', m.enviada_em,
                                                      'autorNome', (select nome from public.perfis where id = m.autor_id))
                            from public.manifestacoes m where m.ocorrencia_id = o.id),
           'decisao', case when o.decidido_em is not null then jsonb_build_object(
                        'justificativa', o.justificativa_decisao, 'apresentacaoDependente', o.apresentacao_dependente,
                        'decididoEm', o.decidido_em,
                        'decididoPorNome', (select nome from public.perfis where id = o.decidido_por)) end,
           'prazoRevisao', case when o.decidido_em is not null then app.prazo_revisao_efetivo(o.dupla_id, o.id, null) end)
         order by o.criado_em desc, o.id), '[]'::jsonb)
  from public.ocorrencias o
  join public.duplas d on d.id = o.dupla_id
  join public.encontros en on en.id = o.encontro_id
  where o.edicao_id = p_edicao and (p_turma is null or d.turma_id = p_turma) and app.pode_ver_ocorrencia(o.id);
$$;

revoke all on function public.registrar_ocorrencia(uuid, uuid, uuid, text, text, text, uuid, text, text, text),
  public.enviar_manifestacao(uuid, text), public.decidir_ocorrencia(uuid, text, text, boolean, uuid),
  public.registrar_excecao_prazo(uuid, text, uuid, uuid, timestamptz, text),
  public.ocorrencias_visiveis(uuid, uuid) from public, anon;
grant execute on function public.registrar_ocorrencia(uuid, uuid, uuid, text, text, text, uuid, text, text, text),
  public.enviar_manifestacao(uuid, text), public.decidir_ocorrencia(uuid, text, text, boolean, uuid),
  public.registrar_excecao_prazo(uuid, text, uuid, uuid, timestamptz, text),
  public.ocorrencias_visiveis(uuid, uuid) to authenticated;

-- ===========================================================================
-- US3 — leitura dos pontos oficiais por perfil (FR-012, FR-014, FR-019, FR-019a)
-- ===========================================================================
create function app.pontos_da_equipe_json(p_dupla uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('duplaId', d.id, 'nome', coalesce(d.nome, 'Equipe sem nome')) || app.totais_da_equipe(d.id)
  from public.duplas d where d.id = p_dupla;
$$;

-- Prévia da própria equipe (aluno); nulo sem equipe ativa.
create function public.pontos_da_minha_equipe(p_edicao uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select app.pontos_da_equipe_json(app.equipe_ativa_do_aluno(p_edicao, (select auth.uid())));
$$;

-- Prévia das equipes ativas da turma (equipe docente da turma e coordenação), sem nota individual.
create function public.pontos_da_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.e_gestao_da_turma(p_turma) then
    raise exception 'Só a equipe docente da turma ou a coordenação vê a prévia das equipes.'
      using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(app.pontos_da_equipe_json(d.id) order by d.nome, d.id)
    from public.duplas d where d.turma_id = p_turma and d.ativa), '[]'::jsonb);
end;
$$;

revoke all on function public.pontos_da_minha_equipe(uuid), public.pontos_da_turma(uuid) from public, anon;
grant execute on function public.pontos_da_minha_equipe(uuid), public.pontos_da_turma(uuid) to authenticated;

-- ===========================================================================
-- US4 — publicação versionada do ranking por categoria (FR-015 a FR-019)
-- ===========================================================================
create function app.categoria_da_turma(p_turma uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.categoria from public.turmas t join public.cursos c on c.id = t.curso_id where t.id = p_turma;
$$;

create function app.equipes_da_categoria(p_edicao uuid, p_categoria text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select d.id from public.duplas d
  join public.turmas t on t.id = d.turma_id
  join public.cursos c on c.id = t.curso_id
  where c.edicao_id = p_edicao and c.categoria = p_categoria and d.ativa;
$$;

-- O que impede a publicação definitiva da categoria (FR-017).
create function app.pendencias_da_categoria(p_edicao uuid, p_categoria text)
returns jsonb language sql stable security definer set search_path = '' as $$
  with eq as (select id from app.equipes_da_categoria(p_edicao, p_categoria) as id)
  select jsonb_build_object(
    'componentes', coalesce((
      select jsonb_agg(jsonb_build_object('duplaId', d.id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'),
                                          'encontroNumero', (en ->> 'numero')::int, 'componente', c)
                       order by d.nome, (en ->> 'numero')::int, c)
      from eq join public.duplas d on d.id = eq.id,
           jsonb_array_elements(app.totais_da_equipe(d.id) -> 'encontros') en,
           jsonb_array_elements_text(en -> 'pontuacao' -> 'pendencias') c), '[]'::jsonb),
    'ocorrencias', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'),
                                          'estado', o.estado) order by o.criado_em)
      from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
      where o.dupla_id in (select id from eq) and o.estado in ('registrada', 'manifestada')), '[]'::jsonb),
    'revisoes', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'))
                       order by r.criado_em)
      from public.pedidos_revisao r join public.duplas d on d.id = r.dupla_id
      where r.dupla_id in (select id from eq) and r.estado = 'aberto'), '[]'::jsonb));
$$;

create function public.pendencias_da_categoria(p_edicao uuid, p_categoria text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'Só a coordenação consulta as pendências da categoria.');
  return app.pendencias_da_categoria(p_edicao, p_categoria);
end;
$$;

create function public.publicar_ranking(p_edicao uuid, p_categoria text, p_estado text,
                                        p_justificativa text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_estado public.estado_ranking;
  v_regras jsonb;
  v_equipes jsonb;
  v_posicoes jsonb;
  v_ultima public.publicacoes_ranking;
  v_pend jsonb;
  v_lista text;
  v_id uuid := gen_random_uuid();
  v_versao int;
  v_revisao timestamptz;
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'Só a coordenação da edição publica o ranking.');
  perform app.exigir_edicao_em_andamento(p_edicao);
  if p_estado not in ('parcial', 'provisorio', 'definitivo') then
    raise exception 'Estado do ranking desconhecido.' using errcode = '23514';
  end if;
  v_estado := p_estado::public.estado_ranking;
  if not exists (select 1 from public.cursos where edicao_id = p_edicao and categoria = p_categoria) then
    raise exception 'Categoria inexistente nesta edição.' using errcode = '23514';
  end if;
  -- Uma publicação por vez na categoria: versões sem corrida (R6).
  perform pg_advisory_xact_lock(hashtext(p_edicao::text || '/' || p_categoria));

  if v_estado = 'definitivo' then
    v_pend := app.pendencias_da_categoria(p_edicao, p_categoria);
    if jsonb_array_length(v_pend -> 'componentes') + jsonb_array_length(v_pend -> 'ocorrencias')
       + jsonb_array_length(v_pend -> 'revisoes') > 0 then
      select string_agg(x, '; ') into v_lista from (
        select (c ->> 'duplaNome') || ' — encontro ' || (c ->> 'encontroNumero') || ': ' ||
               case c ->> 'componente' when 'participacao' then 'participação'
                                       when 'avaliacaoObjetiva' then 'questões/prova oficial'
                                       when 'entrega' then 'entrega' else 'apresentação' end as x
        from jsonb_array_elements(v_pend -> 'componentes') c
        union all
        select (o ->> 'duplaNome') || ' — ocorrência sem decisão' from jsonb_array_elements(v_pend -> 'ocorrencias') o
        union all
        select (r ->> 'duplaNome') || ' — revisão aberta' from jsonb_array_elements(v_pend -> 'revisoes') r
        limit 20) t;
      raise exception 'A publicação definitiva foi recusada por pendências: %.', v_lista using errcode = '23514';
    end if;
  end if;

  v_regras := app.regras_da_edicao(p_edicao);
  select coalesce(jsonb_agg(
           jsonb_build_object('duplaId', d.id, 'nome', coalesce(d.nome, 'Equipe sem nome')) || app.totais_da_equipe(d.id)),
           '[]'::jsonb)
    into v_equipes
  from public.duplas d where d.id in (select app.equipes_da_categoria(p_edicao, p_categoria));
  -- `classificar` devolve só os campos do ranking; o detalhe por encontro volta pela equipe.
  select coalesce(jsonb_agg(p || jsonb_build_object('encontros',
           (select e -> 'encontros' from jsonb_array_elements(v_equipes) e where e ->> 'duplaId' = p ->> 'duplaId'))
           order by ord), '[]'::jsonb)
    into v_posicoes
  from jsonb_array_elements(app.classificar(v_equipes)) with ordinality as x (p, ord);

  select * into v_ultima from public.publicacoes_ranking
  where edicao_id = p_edicao and categoria = p_categoria order by versao desc limit 1;
  if found and v_ultima.estado = v_estado and (
       select coalesce(jsonb_agg(jsonb_build_object('duplaId', pp.dupla_id, 'posicao', pp.posicao,
                                                    'compartilhada', pp.compartilhada, 'total', pp.total,
                                                    'pendente', pp.pendente, 'detalhe', pp.detalhe)
                                 order by pp.posicao, pp.dupla_id), '[]'::jsonb)
       from public.publicacao_posicoes pp where pp.publicacao_id = v_ultima.id)
     = (select coalesce(jsonb_agg(jsonb_build_object('duplaId', (p ->> 'duplaId')::uuid, 'posicao', (p ->> 'posicao')::int,
                                                     'compartilhada', (p ->> 'compartilhada')::boolean,
                                                     'total', (p -> 'totais' -> 'total'), 'pendente', (p -> 'totais' -> 'pendente'),
                                                     'detalhe', p -> 'encontros')
                                  order by (p ->> 'posicao')::int, (p ->> 'duplaId')::uuid), '[]'::jsonb)
        from jsonb_array_elements(v_posicoes) p) then
    return jsonb_build_object('id', v_ultima.id, 'versao', v_ultima.versao, 'estado', v_ultima.estado,
                              'publicadoEm', v_ultima.publicado_em, 'revisaoAte', v_ultima.revisao_ate);
  end if;

  v_versao := coalesce(v_ultima.versao, 0) + 1;
  if v_versao > 1 then
    perform app.registrar_justificativa(p_justificativa);
  end if;
  v_revisao := case when v_estado = 'provisorio'
                    then now() + make_interval(hours => (v_regras -> 'prazos' ->> 'revisaoHoras')::int) end;
  insert into public.publicacoes_ranking (id, edicao_id, categoria, versao, estado, justificativa, regras_versao, revisao_ate)
  values (v_id, p_edicao, p_categoria, v_versao, v_estado,
          case when v_versao > 1 then btrim(p_justificativa) else nullif(btrim(coalesce(p_justificativa, '')), '') end,
          (select regras_versao from public.edicoes where id = p_edicao), v_revisao);
  insert into public.publicacao_posicoes (publicacao_id, dupla_id, nome, posicao, compartilhada, total, entrega,
                                          avaliacao_objetiva, presenca, pendente, detalhe)
  select v_id, (p ->> 'duplaId')::uuid, p ->> 'nome', (p ->> 'posicao')::int, (p ->> 'compartilhada')::boolean,
         (p -> 'totais' ->> 'total')::numeric, (p -> 'totais' ->> 'entrega')::numeric,
         (p -> 'totais' ->> 'avaliacaoObjetiva')::numeric, (p -> 'totais' ->> 'presenca')::numeric,
         (p -> 'totais' ->> 'pendente')::boolean, p -> 'encontros'
  from jsonb_array_elements(v_posicoes) p;

  perform app.avisar(array(
      select a.usuario_id from public.atribuicoes a
      join public.turmas t on t.id = a.turma_id join public.cursos c on c.id = t.curso_id
      where c.edicao_id = p_edicao and c.categoria = p_categoria and a.ativo
        and a.papel in ('aluno', 'docente', 'mentor')),
    'ranking_publicado',
    'Ranking ' || case v_estado when 'parcial' then 'parcial' when 'provisorio' then 'provisório' else 'definitivo' end
      || ' publicado — ' || p_categoria,
    jsonb_build_object('publicacaoId', v_id, 'categoria', p_categoria));
  return jsonb_build_object('id', v_id, 'versao', v_versao, 'estado', v_estado,
                            'publicadoEm', now(), 'revisaoAte', v_revisao);
end;
$$;

-- Leitura por perfil: aluno só a própria categoria e o detalhe da própria equipe; equipe docente
-- a categoria das suas turmas e o detalhe delas; coordenação qualquer categoria (FR-019, FR-019a).
create function public.ranking_publicado(p_edicao uuid, p_categoria text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_coord boolean := app.e_coordenacao(p_edicao);
  v_minha uuid := app.equipe_ativa_do_aluno(p_edicao, v_uid);
  v_turmas uuid[];
  v_categoria text;
  v_pub public.publicacoes_ranking;
begin
  select coalesce(array_agg(a.turma_id), '{}') into v_turmas from public.atribuicoes a
  where a.usuario_id = v_uid and a.edicao_id = p_edicao and a.ativo and a.papel in ('docente', 'mentor');
  if v_coord then
    v_categoria := p_categoria;
  elsif v_minha is not null then
    v_categoria := app.categoria_da_turma(app.turma_da_dupla(v_minha));
  elsif cardinality(v_turmas) > 0 then
    if p_categoria is not null and not exists (select 1 from unnest(v_turmas) t where app.categoria_da_turma(t) = p_categoria) then
      raise exception 'Você não acompanha turmas desta categoria.' using errcode = '42501';
    end if;
    v_categoria := coalesce(p_categoria, (select app.categoria_da_turma(t) from unnest(v_turmas) t limit 1));
  elsif app.participa_da_edicao(p_edicao) then
    return null;
  else
    raise exception 'Você não participa desta edição.' using errcode = '42501';
  end if;
  if v_categoria is null then return null; end if;

  select * into v_pub from public.publicacoes_ranking
  where edicao_id = p_edicao and categoria = v_categoria order by versao desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_pub.id, 'categoria', v_pub.categoria, 'versao', v_pub.versao, 'estado', v_pub.estado,
    'publicadoEm', v_pub.publicado_em, 'revisaoAte', v_pub.revisao_ate,
    'posicoes', coalesce((
      select jsonb_agg(jsonb_build_object('duplaId', pp.dupla_id, 'nome', pp.nome, 'posicao', pp.posicao,
                                          'compartilhada', pp.compartilhada, 'total', pp.total,
                                          'pendente', pp.pendente, 'minha', pp.dupla_id = v_minha)
                       || case when pp.dupla_id = v_minha or v_coord
                                    or (select d.turma_id from public.duplas d where d.id = pp.dupla_id) = any (v_turmas)
                               then jsonb_build_object('detalhe', pp.detalhe) else '{}'::jsonb end
                       order by pp.posicao, pp.nome)
      from public.publicacao_posicoes pp where pp.publicacao_id = v_pub.id), '[]'::jsonb));
end;
$$;

create function public.historico_publicacoes(p_edicao uuid, p_categoria text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_da_edicao(p_edicao, 'Só a coordenação consulta o histórico de publicações.');
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'versao', p.versao, 'estado', p.estado,
                                        'publicadoEm', p.publicado_em, 'justificativa', p.justificativa,
                                        'revisaoAte', p.revisao_ate,
                                        'publicadoPorNome', (select nome from public.perfis where id = p.publicado_por))
                     order by p.versao desc)
    from public.publicacoes_ranking p where p.edicao_id = p_edicao and p.categoria = p_categoria), '[]'::jsonb);
end;
$$;

create policy publicacoes_ler on public.publicacoes_ranking for select to authenticated
  using (app.e_coordenacao(edicao_id));
create policy posicoes_ler on public.publicacao_posicoes for select to authenticated
  using (app.e_coordenacao((select edicao_id from public.publicacoes_ranking where id = publicacao_id)));

revoke all on function public.pendencias_da_categoria(uuid, text), public.publicar_ranking(uuid, text, text, text),
  public.ranking_publicado(uuid, text), public.historico_publicacoes(uuid, text) from public, anon;
grant execute on function public.pendencias_da_categoria(uuid, text), public.publicar_ranking(uuid, text, text, text),
  public.ranking_publicado(uuid, text), public.historico_publicacoes(uuid, text) to authenticated;

-- Painel da turma (spec 004): o bloco de pontuação passa a mostrar a última publicação.
create or replace function public.painel_da_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_edicao uuid := app.edicao_da_turma(p_turma);
  v_gestao boolean;
begin
  if v_edicao is null then
    raise exception 'Turma não encontrada.' using errcode = 'P0002';
  end if;
  v_gestao := app.e_coordenacao(v_edicao) or app.atua_na_turma(p_turma);
  if not (v_gestao or app.e_aluno_ativo(p_turma, auth.uid())) then
    raise exception 'Você não tem acesso a esta turma.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'visao', case when v_gestao then 'gestao' else 'aluno' end,
    'turma', (
      select jsonb_build_object('id', t.id, 'nome', t.nome, 'anoLetivo', t.ano_letivo,
                                'cursoNome', c.nome, 'categoria', c.categoria, 'edicaoId', c.edicao_id)
      from public.turmas t join public.cursos c on c.id = t.curso_id
      where t.id = p_turma),
    -- FR-003: dos colegas, só nome e se já têm equipe.
    'alunos', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome,
                                          'temEquipe', app.tem_equipe_ativa(v_edicao, p.id))
                       order by p.nome, p.id)
      from public.atribuicoes a join public.perfis p on p.id = a.usuario_id
      where a.turma_id = p_turma and a.papel = 'aluno' and a.ativo), '[]'::jsonb),
    'equipes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'nome', d.nome,
               'integrantes', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'estudanteId', i.estudante_id, 'nome', p.nome,
                          'integranteInativo',
                            v_gestao and not app.e_aluno_ativo(p_turma, i.estudante_id))
                        order by p.nome, i.estudante_id)
                 from public.dupla_integrantes i join public.perfis p on p.id = i.estudante_id
                 where i.dupla_id = d.id and i.saida_em is null), '[]'::jsonb))
             order by d.nome nulls last, d.id)
      from public.duplas d
      where d.turma_id = p_turma and d.ativa), '[]'::jsonb),
    'convitesPendentes', case when v_gestao then (
      select count(*)::integer from public.convites_equipe c
      where c.turma_id = p_turma and c.situacao = 'pendente') end,
    -- Spec 007: a última publicação do ranking da categoria, só com as equipes desta turma.
    'pontuacao', (
      select jsonb_build_object('ficticia', false, 'estado', p.estado, 'publicada', true,
        'equipes', coalesce((
          select jsonb_agg(jsonb_build_object('equipeId', pp.dupla_id, 'nome', pp.nome, 'total', pp.total,
                                              'posicao', pp.posicao, 'compartilhada', pp.compartilhada,
                                              'pendente', pp.pendente) order by pp.posicao, pp.nome)
          from public.publicacao_posicoes pp join public.duplas d on d.id = pp.dupla_id
          where pp.publicacao_id = p.id and d.turma_id = p_turma), '[]'::jsonb))
      from public.publicacoes_ranking p
      where p.edicao_id = v_edicao and p.categoria = app.categoria_da_turma(p_turma)
      order by p.versao desc limit 1),
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'numero', e.numero, 'titulo', e.titulo, 'data', e.data,
               'inicio', to_char(e.inicio, 'HH24:MI'), 'fim', to_char(e.fim, 'HH24:MI'),
               'estado', e.estado, 'ambienteNome', a.nome)
             order by e.data, e.numero)
      from public.encontros e left join public.ambientes a on a.id = e.ambiente_id
      where e.edicao_id = v_edicao), '[]'::jsonb)
  );
end;
$$;


-- ===========================================================================
-- US5 — pedidos de revisão (FR-020 a FR-022)
-- ===========================================================================
create policy pedidos_ler on public.pedidos_revisao for select to authenticated
  using (app.e_coordenacao(edicao_id) or (select auth.uid()) = any (app.integrantes_atuais(dupla_id)));

create function public.pedir_revisao(p_chave uuid, p_objeto text, p_ocorrencia uuid, p_publicacao uuid,
  p_componente text, p_encontro uuid, p_justificativa text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_existente public.pedidos_revisao;
  v_edicao uuid;
  v_dupla uuid;
  v_o public.ocorrencias;
  v_p public.publicacoes_ranking;
  v_prazo timestamptz;
  v_id uuid;
  v_criado timestamptz;
begin
  select * into v_existente from public.pedidos_revisao where chave_envio = p_chave;
  if found then
    if v_existente.autor_id <> v_uid then
      raise exception 'Chave de envio já utilizada.' using errcode = '23514';
    end if;
    return jsonb_build_object('id', v_existente.id, 'criadoEm', v_existente.criado_em);
  end if;
  if p_justificativa is null or char_length(btrim(p_justificativa)) not between 10 and 2000 then
    raise exception 'Explique o pedido com 10 a 2000 caracteres.' using errcode = '23514';
  end if;

  if p_objeto = 'ocorrencia' then
    select * into v_o from public.ocorrencias where id = p_ocorrencia;
    if not found then
      raise exception 'Ocorrência não encontrada.' using errcode = 'P0002';
    end if;
    v_edicao := v_o.edicao_id;
    v_dupla := app.equipe_ativa_do_aluno(v_edicao, v_uid);
    if v_dupla is distinct from v_o.dupla_id then
      raise exception 'Só a equipe da ocorrência pede revisão da decisão.' using errcode = '42501';
    end if;
    perform app.exigir_edicao_em_andamento(v_edicao);
    if v_o.estado not in ('confirmada', 'arquivada') then
      raise exception 'A ocorrência ainda não foi decidida.' using errcode = '23514';
    end if;
    v_prazo := app.prazo_revisao_efetivo(v_dupla, p_ocorrencia, null);
  elsif p_objeto = 'publicacao' then
    select * into v_p from public.publicacoes_ranking where id = p_publicacao;
    if not found then
      raise exception 'Publicação não encontrada.' using errcode = 'P0002';
    end if;
    v_edicao := v_p.edicao_id;
    v_dupla := app.equipe_ativa_do_aluno(v_edicao, v_uid);
    if v_dupla is null then
      raise exception 'Só integrantes de equipe pedem revisão dos pontos.' using errcode = '42501';
    end if;
    perform app.exigir_edicao_em_andamento(v_edicao);
    if v_p.estado <> 'provisorio' then
      raise exception 'Só a publicação provisória abre prazo de revisão dos pontos.' using errcode = '23514';
    end if;
    if not exists (select 1 from public.publicacao_posicoes where publicacao_id = p_publicacao and dupla_id = v_dupla) then
      raise exception 'A publicação não inclui a sua equipe.' using errcode = '23514';
    end if;
    if p_componente is null or p_componente not in ('presenca', 'participacao', 'avaliacaoObjetiva', 'entrega', 'apresentacao') then
      raise exception 'Indique o componente dos pontos a revisar.' using errcode = '23514';
    end if;
    if p_encontro is not null and not exists (select 1 from public.encontros where id = p_encontro and edicao_id = v_edicao) then
      raise exception 'O encontro não pertence à edição.' using errcode = '23514';
    end if;
    v_prazo := app.prazo_revisao_efetivo(v_dupla, null, p_publicacao);
  else
    raise exception 'Objeto de revisão desconhecido.' using errcode = '23514';
  end if;

  if v_prazo is null or now() > v_prazo then
    raise exception 'O prazo para pedir revisão terminou.' using errcode = '23514';
  end if;
  if exists (select 1 from public.pedidos_revisao r
             where r.dupla_id = v_dupla and r.estado = 'aberto' and r.objeto = p_objeto::public.objeto_revisao
               and coalesce(r.ocorrencia_id, r.publicacao_id) = coalesce(p_ocorrencia, p_publicacao)
               and coalesce(r.componente, '') = coalesce(case when p_objeto = 'publicacao' then p_componente end, '')
               and r.encontro_id is not distinct from case when p_objeto = 'publicacao' then p_encontro end) then
    raise exception 'Já existe um pedido aberto da equipe para este ponto.' using errcode = '23514';
  end if;

  insert into public.pedidos_revisao (edicao_id, dupla_id, objeto, ocorrencia_id, publicacao_id, componente,
                                      encontro_id, justificativa, chave_envio)
  values (v_edicao, v_dupla, p_objeto::public.objeto_revisao,
          case when p_objeto = 'ocorrencia' then p_ocorrencia end,
          case when p_objeto = 'publicacao' then p_publicacao end,
          case when p_objeto = 'publicacao' then p_componente end,
          case when p_objeto = 'publicacao' then p_encontro end,
          btrim(p_justificativa), p_chave)
  returning id, criado_em into v_id, v_criado;
  perform app.avisar(array(select a.usuario_id from public.atribuicoes a
                           where a.edicao_id = v_edicao and a.papel = 'coordenacao' and a.ativo),
                     'revisao_pedida', 'Novo pedido de revisão de uma equipe', jsonb_build_object('pedidoId', v_id));
  return jsonb_build_object('id', v_id, 'criadoEm', v_criado);
end;
$$;

create function public.responder_revisao(p_pedido uuid, p_resposta text, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v public.pedidos_revisao;
begin
  select * into v from public.pedidos_revisao where id = p_pedido for update;
  if not found then
    raise exception 'Pedido de revisão não encontrado.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_da_edicao(v.edicao_id, 'Só a coordenação responde pedidos de revisão.');
  perform app.exigir_edicao_em_andamento(v.edicao_id);
  if p_resposta not in ('deferido', 'indeferido') then
    raise exception 'A resposta deve deferir ou indeferir o pedido.' using errcode = '23514';
  end if;
  if v.estado <> 'aberto' then
    if v.estado = p_resposta::public.estado_revisao and v.resposta = btrim(coalesce(p_justificativa, '')) then
      return;
    end if;
    raise exception 'O pedido já foi respondido.' using errcode = '23514';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  update public.pedidos_revisao
  set estado = p_resposta::public.estado_revisao, resposta = btrim(p_justificativa),
      respondido_por = auth.uid(), respondido_em = now()
  where id = p_pedido;
  perform app.avisar(app.integrantes_atuais(v.dupla_id), 'revisao_respondida',
                     case when p_resposta = 'deferido' then 'Pedido de revisão deferido'
                          else 'Pedido de revisão indeferido' end,
                     jsonb_build_object('pedidoId', p_pedido));
end;
$$;

create function public.pedidos_revisao(p_edicao uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'duplaId', r.dupla_id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'),
           'objeto', r.objeto, 'ocorrenciaId', r.ocorrencia_id, 'publicacaoId', r.publicacao_id,
           'publicacaoVersao', (select p.versao from public.publicacoes_ranking p where p.id = r.publicacao_id),
           'componente', r.componente, 'encontroId', r.encontro_id,
           'encontroNumero', (select en.numero from public.encontros en where en.id = r.encontro_id),
           'justificativa', r.justificativa, 'estado', r.estado, 'resposta', r.resposta,
           'respondidoEm', r.respondido_em, 'criadoEm', r.criado_em,
           'autorNome', (select nome from public.perfis where id = r.autor_id),
           'correcoes', coalesce((select jsonb_agg(jsonb_build_object('tabela', a.tabela, 'ocorridoEm', a.ocorrido_em,
                                                                      'justificativa', a.justificativa) order by a.ocorrido_em, a.id)
                                  from public.auditoria a where a.pedido_revisao_id = r.id), '[]'::jsonb))
         order by r.criado_em desc, r.id), '[]'::jsonb)
  from public.pedidos_revisao r join public.duplas d on d.id = r.dupla_id
  where r.edicao_id = p_edicao
    and (app.e_coordenacao(p_edicao) or (select auth.uid()) = any (app.integrantes_atuais(r.dupla_id)));
$$;

-- R7: presença é registrada por turma; o pedido precisa ser de uma equipe da turma.
create function app.vincular_pedido_da_turma(p_pedido uuid, p_turma uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_pedido is null then return; end if;
  if not exists (select 1 from public.pedidos_revisao r join public.duplas d on d.id = r.dupla_id
                 where r.id = p_pedido and d.turma_id = p_turma) then
    raise exception 'O pedido de revisão informado é de outra turma.' using errcode = '23514';
  end if;
  perform app.vincular_pedido(p_pedido, null);
end;
$$;

revoke all on function public.pedir_revisao(uuid, text, uuid, uuid, text, uuid, text),
  public.responder_revisao(uuid, text, text), public.pedidos_revisao(uuid) from public, anon;
grant execute on function public.pedir_revisao(uuid, text, uuid, uuid, text, uuid, text),
  public.responder_revisao(uuid, text, text), public.pedidos_revisao(uuid) to authenticated;

-- R7: correções da spec 006 ligadas ao pedido de revisão. Mesma semântica; só ganham
-- `p_pedido`, que liga as linhas de auditoria desta transação ao pedido aberto.
drop function public.registrar_presencas(uuid, uuid, jsonb, text);
create function public.registrar_presencas(
  p_encontro uuid, p_turma uuid, p_registros jsonb, p_justificativa text, p_pedido uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_so_coordenacao boolean := app.exigir_registro_na_turma(p_turma);
  v_registro record;
  v_novos integer := 0;
  v_alterados integer := 0;
begin
  perform app.exigir_encontro_da_turma(p_encontro, p_turma);
  if jsonb_typeof(p_registros) is distinct from 'array' then
    raise exception 'Informe a lista de presenças.' using errcode = '23514';
  end if;

  create temporary table if not exists pg_temp.presencas_lote (
    estudante_id uuid primary key, presente boolean not null, observacao text, situacao text
  ) on commit drop;
  truncate pg_temp.presencas_lote;
  insert into pg_temp.presencas_lote (estudante_id, presente, observacao)
  select (r ->> 'estudanteId')::uuid, (r ->> 'presente')::boolean, nullif(btrim(r ->> 'observacao'), '')
  from jsonb_array_elements(p_registros) r;

  if exists (select 1 from pg_temp.presencas_lote l where not app.e_aluno_ativo(p_turma, l.estudante_id)) then
    raise exception 'Há alunos que não pertencem a esta turma.' using errcode = '23514';
  end if;
  if exists (select 1 from pg_temp.presencas_lote where char_length(observacao) > 300) then
    raise exception 'A observação tem no máximo 300 caracteres.' using errcode = '23514';
  end if;

  update pg_temp.presencas_lote l set situacao = case
    when x.estudante_id is null then 'novo'
    when x.presente = l.presente and x.observacao is not distinct from l.observacao then 'igual'
    else 'alterado' end
  from pg_temp.presencas_lote l2
  left join public.presencas x on x.encontro_id = p_encontro and x.estudante_id = l2.estudante_id
  where l2.estudante_id = l.estudante_id;

  select count(*) filter (where situacao = 'novo'), count(*) filter (where situacao = 'alterado')
  into v_novos, v_alterados from pg_temp.presencas_lote;
  if v_so_coordenacao and v_novos > 0 then
    raise exception 'A coordenação só corrige registros existentes.' using errcode = '42501';
  end if;
  if v_alterados > 0 then
    perform app.registrar_justificativa(p_justificativa);
    perform app.vincular_pedido_da_turma(p_pedido, p_turma);
  end if;

  for v_registro in select * from pg_temp.presencas_lote where situacao in ('novo', 'alterado') loop
    insert into public.presencas (encontro_id, estudante_id, turma_id, presente, observacao)
    values (p_encontro, v_registro.estudante_id, p_turma, v_registro.presente, v_registro.observacao)
    on conflict (encontro_id, estudante_id) do update
      set presente = excluded.presente, observacao = excluded.observacao,
          autor_id = auth.uid(), registrado_em = now();
  end loop;
  return v_novos + v_alterados;
end;
$$;

drop function public.registrar_participacao(uuid, uuid, jsonb, text);
create function public.registrar_participacao(
  p_encontro uuid, p_dupla uuid, p_notas jsonb, p_justificativa text, p_pedido uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid := app.turma_da_dupla(p_dupla);
  v_so_coordenacao boolean;
  v_atual jsonb;
begin
  if v_turma is null then
    raise exception 'Equipe não encontrada.' using errcode = 'P0002';
  end if;
  v_so_coordenacao := app.exigir_registro_na_turma(v_turma);
  perform app.exigir_encontro_da_turma(p_encontro, v_turma);
  perform app.validar_notas(p_notas,
    app.regras_da_edicao(app.edicao_da_turma(v_turma)) -> 'participacao' -> 'criterios');

  select notas into v_atual from public.participacoes where encontro_id = p_encontro and dupla_id = p_dupla
  for update;
  if found then
    if v_atual = p_notas then
      return;
    end if;
    perform app.registrar_justificativa(p_justificativa);
    perform app.vincular_pedido(p_pedido, p_dupla);
    update public.participacoes set notas = p_notas, autor_id = auth.uid(), registrado_em = now()
    where encontro_id = p_encontro and dupla_id = p_dupla;
  else
    if v_so_coordenacao then
      raise exception 'A coordenação só corrige registros existentes.' using errcode = '42501';
    end if;
    insert into public.participacoes (encontro_id, dupla_id, notas) values (p_encontro, p_dupla, p_notas);
  end if;
end;
$$;

drop function public.registrar_avaliacao(uuid, uuid, jsonb, jsonb, boolean, text, text);
create function public.registrar_avaliacao(
  p_desafio uuid, p_dupla uuid, p_notas_entrega jsonb, p_notas_apresentacao jsonb,
  p_apresentacao_nao_avaliavel boolean, p_feedback text, p_justificativa text, p_pedido uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_turma uuid := app.turma_da_dupla(p_dupla);
  v_so_coordenacao boolean;
  v_regras jsonb;
  v_entrega uuid;
  v_feedback text := nullif(btrim(p_feedback), '');
  v_atual public.avaliacoes%rowtype;
begin
  if v_turma is null or not app.desafio_publicado_na_turma(p_desafio, v_turma) then
    raise exception 'Equipe ou desafio não encontrado.' using errcode = 'P0002';
  end if;
  v_so_coordenacao := app.exigir_registro_na_turma(v_turma);
  v_regras := app.regras_da_edicao(app.edicao_da_turma(v_turma));
  select id into v_entrega from public.entregas
  where desafio_id = p_desafio and dupla_id = p_dupla order by versao desc limit 1;

  if v_entrega is null then
    if p_notas_entrega is not null then
      raise exception 'A equipe não tem entrega: a prática fica zerada.' using errcode = '23514';
    end if;
  else
    perform app.validar_notas(p_notas_entrega, v_regras -> 'entrega' -> 'criterios');
    if v_feedback is null then
      raise exception 'Escreva o feedback da entrega.' using errcode = '23514';
    end if;
  end if;
  if char_length(v_feedback) > 4000 then
    raise exception 'O feedback tem no máximo 4000 caracteres.' using errcode = '23514';
  end if;
  if coalesce(p_apresentacao_nao_avaliavel, false) then
    if p_notas_apresentacao is not null then
      raise exception 'Apresentação não avaliável não recebe notas.' using errcode = '23514';
    end if;
  else
    perform app.validar_notas(p_notas_apresentacao, v_regras -> 'apresentacao' -> 'criterios');
  end if;

  select * into v_atual from public.avaliacoes where desafio_id = p_desafio and dupla_id = p_dupla for update;
  if found then
    if v_atual.entrega_id is not distinct from v_entrega
       and v_atual.notas_entrega is not distinct from p_notas_entrega
       and v_atual.notas_apresentacao is not distinct from p_notas_apresentacao
       and v_atual.apresentacao_nao_avaliavel = coalesce(p_apresentacao_nao_avaliavel, false)
       and v_atual.feedback is not distinct from v_feedback then
      return;
    end if;
    perform app.registrar_justificativa(p_justificativa);
    perform app.vincular_pedido(p_pedido, p_dupla);
    update public.avaliacoes set entrega_id = v_entrega, notas_entrega = p_notas_entrega,
      notas_apresentacao = p_notas_apresentacao,
      apresentacao_nao_avaliavel = coalesce(p_apresentacao_nao_avaliavel, false),
      feedback = v_feedback, autor_id = auth.uid(), registrado_em = now()
    where desafio_id = p_desafio and dupla_id = p_dupla;
  else
    if v_so_coordenacao then
      raise exception 'A coordenação só corrige registros existentes.' using errcode = '42501';
    end if;
    insert into public.avaliacoes (desafio_id, dupla_id, entrega_id, notas_entrega, notas_apresentacao,
                                   apresentacao_nao_avaliavel, feedback)
    values (p_desafio, p_dupla, v_entrega, p_notas_entrega, p_notas_apresentacao,
            coalesce(p_apresentacao_nao_avaliavel, false), v_feedback);
  end if;
end;
$$;

revoke all on function public.registrar_presencas(uuid, uuid, jsonb, text, uuid),
  public.registrar_participacao(uuid, uuid, jsonb, text, uuid),
  public.registrar_avaliacao(uuid, uuid, jsonb, jsonb, boolean, text, text, uuid)
  from public, anon;
grant execute on function public.registrar_presencas(uuid, uuid, jsonb, text, uuid),
  public.registrar_participacao(uuid, uuid, jsonb, text, uuid),
  public.registrar_avaliacao(uuid, uuid, jsonb, jsonb, boolean, text, text, uuid)
  to authenticated;
