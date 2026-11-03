-- Spec 011 — regras da edição e das turmas.
-- Versões das regras da edição (todas guardadas, com o horário a partir do qual valem), ajustes de
-- regras por turma (só os grupos ajustados), encontros de que cada turma participa e as regras
-- vigentes de cada encontro para cada turma. `edicoes.regras` continua como cópia da vigente.

-- ===========================================================================
-- Fundação (T006)
-- ===========================================================================
create table public.versoes_regras (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  rotulo text not null check (char_length(btrim(rotulo)) between 1 and 60),
  regras jsonb not null check (jsonb_typeof(regras) = 'object'),
  vale_desde timestamptz not null,
  autor_id uuid references public.perfis (id),
  justificativa text check (justificativa is null or char_length(btrim(justificativa)) between 10 and 2000),
  criado_em timestamptz not null default now(),
  constraint versoes_regras_rotulo_unico unique (edicao_id, rotulo),
  constraint versoes_regras_vale_desde_unico unique (edicao_id, vale_desde),
  constraint versoes_regras_justificada check (vale_desde = '-infinity' or justificativa is not null)
);
comment on table public.versoes_regras is 'Versões das regras da edição (spec 011). Escrita só por RPC.';

create trigger auditoria_versoes_regras after insert or update or delete on public.versoes_regras
  for each row execute function app.registrar_auditoria();
-- A versão inicial nasce com a edição (inclusive edição inserida já encerrada); as demais não.
create trigger bloquear_edicao_encerrada before update or delete on public.versoes_regras
  for each row execute function app.bloquear_edicao_encerrada('edicao_id');
create trigger bloquear_edicao_encerrada_insercao before insert on public.versoes_regras
  for each row when (new.vale_desde <> '-infinity')
  execute function app.bloquear_edicao_encerrada('edicao_id');

alter table public.versoes_regras enable row level security;
create policy versoes_regras_ler on public.versoes_regras for select to authenticated
  using (app.participa_da_edicao(edicao_id));
revoke insert, update, delete, truncate on public.versoes_regras from authenticated, anon;
revoke select on public.versoes_regras from anon;

-- Versão inicial: as regras com que a edição nasceu valem para qualquer encontro anterior à
-- primeira mudança. Vale para edições existentes, criadas pelo app, pelo seed ou por fixtures.
insert into public.versoes_regras (edicao_id, rotulo, regras, vale_desde)
select id, regras_versao, regras, '-infinity' from public.edicoes;

create function app.criar_versao_inicial()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.versoes_regras (edicao_id, rotulo, regras, vale_desde)
  values (new.id, new.regras_versao, new.regras, '-infinity');
  return new;
end;
$$;
create trigger criar_versao_inicial after insert on public.edicoes
  for each row execute function app.criar_versao_inicial();

-- Início do encontro: data e horário no fuso da unidade; sem horário, o início do dia (R3).
create function app.inicio_do_encontro(p_encontro uuid)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select (data + coalesce(inicio, time '00:00')) at time zone 'America/Sao_Paulo'
  from public.encontros where id = p_encontro;
$$;

-- Regras vigentes de uma turma num instante (os ajustes da turma entram na US2).
create function app.regras_vigentes(p_turma uuid, p_instante timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select v.regras
  from public.versoes_regras v
  where v.edicao_id = app.edicao_da_turma(p_turma) and v.vale_desde <= p_instante
  order by v.vale_desde desc
  limit 1;
$$;

-- Validação das regras (mesmas regras do domínio TS, research R4). `p_escopo` 'turma' valida só
-- os grupos presentes. Recusa com a primeira mensagem encontrada.
create function app.validar_regras(p_regras jsonb, p_escopo text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare
  v_rubrica text;
  v_criterios jsonb;
  v_item jsonb;
  v_nomes text[];
  v_ids text[];
  v_anterior numeric;
  v_entrega jsonb := p_regras -> 'entrega';
  v_pen jsonb := p_regras -> 'penalidades';
  v_edicao boolean := p_escopo = 'edicao';
  v_num jsonb;
begin
  if jsonb_typeof(p_regras) is distinct from 'object' then
    raise exception 'Regras inválidas.' using errcode = '23514';
  end if;

  foreach v_rubrica in array array['participacao', 'entrega', 'apresentacao'] loop
    if v_edicao or p_regras ? v_rubrica then
      v_criterios := p_regras -> v_rubrica -> 'criterios';
      if jsonb_typeof(v_criterios) is distinct from 'array'
         or jsonb_array_length(v_criterios) not between 1 and 20 then
        raise exception 'Cada rubrica tem de 1 a 20 critérios.' using errcode = '23514';
      end if;
      v_nomes := '{}';
      v_ids := '{}';
      for v_item in select value from jsonb_array_elements(v_criterios) loop
        if char_length(btrim(coalesce(v_item ->> 'rotulo', ''))) not between 1 and 80 then
          raise exception 'Informe um nome de critério de 1 a 80 caracteres.' using errcode = '23514';
        end if;
        if lower(btrim(v_item ->> 'rotulo')) = any (v_nomes) then
          raise exception 'Já existe um critério com esse nome nesta rubrica.' using errcode = '23514';
        end if;
        if coalesce(v_item ->> 'id', '') = '' or (v_item ->> 'id') = any (v_ids) then
          raise exception 'Identificador de critério repetido.' using errcode = '23514';
        end if;
        if jsonb_typeof(v_item -> 'maximo') is distinct from 'number' or (v_item ->> 'maximo')::numeric <= 0 then
          raise exception 'A pontuação máxima precisa ser maior que zero.' using errcode = '23514';
        end if;
        v_nomes := v_nomes || lower(btrim(v_item ->> 'rotulo'));
        v_ids := v_ids || (v_item ->> 'id');
      end loop;
    end if;
  end loop;

  if v_edicao or p_regras ? 'presenca' then
    foreach v_rubrica in array array['pontosPorIntegrante', 'maximoPorDupla'] loop
      v_num := p_regras -> 'presenca' -> v_rubrica;
      if jsonb_typeof(v_num) is distinct from 'number' or v_num::numeric < 0 then
        raise exception 'Os pontos de presença precisam ser maiores ou iguais a zero.' using errcode = '23514';
      end if;
    end loop;
  end if;
  if (v_edicao or p_regras ? 'questoes')
     and (jsonb_typeof(p_regras -> 'questoes' -> 'maximo') is distinct from 'number'
          or (p_regras -> 'questoes' ->> 'maximo')::numeric < 0) then
    raise exception 'O máximo das questões precisa ser maior ou igual a zero.' using errcode = '23514';
  end if;

  if v_edicao or p_regras ? 'entrega' then
    if not exists (select 1 from jsonb_array_elements(v_entrega -> 'criterios') c
                   where c ->> 'id' = v_entrega ->> 'criterioDeAtraso') then
      raise exception 'Escolha outro critério de atraso antes de remover este.' using errcode = '23514';
    end if;
    if jsonb_typeof(v_entrega -> 'limiteAtrasoMinutos') is distinct from 'number'
       or (v_entrega ->> 'limiteAtrasoMinutos')::numeric < 0 then
      raise exception 'O limite de atraso precisa ser maior ou igual a zero.' using errcode = '23514';
    end if;
    v_anterior := 0;
    for v_item in select value from jsonb_array_elements(coalesce(v_entrega -> 'faixasDeAtraso', '[]')) loop
      if (v_item ->> 'ateMinutos')::numeric <= v_anterior or (v_item ->> 'desconto')::numeric < 0
         or (v_item ->> 'ateMinutos')::numeric > (v_entrega ->> 'limiteAtrasoMinutos')::numeric then
        raise exception 'As faixas precisam ter minutos crescentes, descontos não negativos e caber no limite de atraso.'
          using errcode = '23514';
      end if;
      v_anterior := (v_item ->> 'ateMinutos')::numeric;
    end loop;
  end if;

  if v_edicao or p_regras ? 'penalidades' then
    if jsonb_typeof(v_pen -> 'tetoDescontosPorEncontro') is distinct from 'number'
       or (v_pen ->> 'tetoDescontosPorEncontro')::numeric < 0 then
      raise exception 'O teto de descontos precisa ser maior ou igual a zero.' using errcode = '23514';
    end if;
    v_nomes := '{}';
    v_ids := '{}';
    for v_item in select value from jsonb_array_elements(coalesce(v_pen -> 'tipos', '[]')) loop
      if char_length(btrim(coalesce(v_item ->> 'rotulo', ''))) not between 1 and 80
         or lower(btrim(v_item ->> 'rotulo')) = any (v_nomes) then
        raise exception 'Tipo de penalidade: nome de 1 a 80 caracteres, sem repetir.' using errcode = '23514';
      end if;
      if coalesce(v_item ->> 'id', '') = '' or (v_item ->> 'id') = any (v_ids) then
        raise exception 'Identificador de tipo de penalidade repetido.' using errcode = '23514';
      end if;
      if v_item ? 'pontos' and (v_item ->> 'pontos')::numeric < 0 then
        raise exception 'Os pontos da penalidade precisam ser maiores ou iguais a zero.' using errcode = '23514';
      end if;
      v_nomes := v_nomes || lower(btrim(v_item ->> 'rotulo'));
      v_ids := v_ids || (v_item ->> 'id');
    end loop;
  end if;

  if (v_edicao or p_regras ? 'prazos')
     and (coalesce((p_regras -> 'prazos' ->> 'manifestacaoHoras')::numeric, 0) <= 0
          or coalesce((p_regras -> 'prazos' ->> 'revisaoHoras')::numeric, 0) <= 0) then
    raise exception 'Os prazos precisam ser maiores que zero.' using errcode = '23514';
  end if;

  if v_edicao then
    if jsonb_typeof(p_regras -> 'quantidadeEncontros') is distinct from 'number'
       or (p_regras ->> 'quantidadeEncontros')::numeric not between 1 and 20 then
      raise exception 'Informe de 1 a 20 encontros.' using errcode = '23514';
    end if;
    if jsonb_typeof(p_regras -> 'casasDecimais') is distinct from 'number'
       or (p_regras ->> 'casasDecimais')::numeric not between 0 and 4 then
      raise exception 'Informe de 0 a 4 casas decimais.' using errcode = '23514';
    end if;
    if (p_regras -> 'provaOficial') is distinct from (app.regras_piloto() -> 'provaOficial') then
      raise exception 'A prova oficial segue os valores do PRD e não pode ser alterada.' using errcode = '23514';
    end if;
  end if;
end;
$$;

-- Próximo rótulo sugerido: incrementa o último número; sem número no fim, acrescenta ".1".
create function app.sugerir_rotulo(p_rotulo text)
returns text language sql immutable set search_path = '' as $$
  select case when p_rotulo ~ '\d+$'
              then regexp_replace(p_rotulo, '\d+$', '') || ((substring(p_rotulo from '(\d+)$'))::bigint + 1)::text
              else p_rotulo || '.1' end;
$$;

revoke all on function app.criar_versao_inicial(), app.inicio_do_encontro(uuid), app.regras_vigentes(uuid, timestamptz),
  app.validar_regras(jsonb, text), app.sugerir_rotulo(text) from public, anon;

-- ===========================================================================
-- US1 — regras da edição com versões (T009)
-- ===========================================================================
create function public.regras_da_edicao_vigentes(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v public.edicoes%rowtype;
begin
  if not app.participa_da_edicao(p_edicao) then
    raise exception 'Você não participa desta edição.' using errcode = '42501';
  end if;
  select * into v from public.edicoes where id = p_edicao;
  return jsonb_build_object('regras', v.regras, 'rotulo', v.regras_versao,
                            'sugestao', app.sugerir_rotulo(v.regras_versao));
end;
$$;

-- Grava uma versão nova das regras da edição (FR-001–003): concorrência otimista pela versão
-- carregada, validação completa, rótulo único, justificativa auditada; reenvio idêntico não grava.
create function public.gravar_regras(p_edicao uuid, p_versao_base text, p_rotulo text, p_regras jsonb,
                                     p_justificativa text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.edicoes%rowtype;
  v_rotulo text := btrim(coalesce(p_rotulo, ''));
  v_regras jsonb;
  v_vale timestamptz;
begin
  perform app.exigir_coordenacao_de(p_edicao);
  select * into v from public.edicoes where id = p_edicao for update;
  if v.estado = 'encerrada' then
    raise exception 'A edição está encerrada; os dados só podem ser lidos.' using errcode = '23514';
  end if;
  v_regras := jsonb_set(p_regras, '{versao}', to_jsonb(v_rotulo));
  if v.regras_versao = v_rotulo and v.regras = v_regras then
    select vale_desde into v_vale from public.versoes_regras where edicao_id = p_edicao and rotulo = v_rotulo;
    return jsonb_build_object('rotulo', v_rotulo, 'valeDesde', v_vale, 'nova', false);
  end if;
  if p_versao_base is distinct from v.regras_versao then
    raise exception 'As regras mudaram desde que você abriu a tela; recarregue.' using errcode = '23514';
  end if;
  if char_length(v_rotulo) not between 1 and 60 then
    raise exception 'Informe um nome de versão de 1 a 60 caracteres.' using errcode = '23514';
  end if;
  if exists (select 1 from public.versoes_regras where edicao_id = p_edicao and rotulo = v_rotulo) then
    raise exception 'Já existe uma versão com esse nome nesta edição.' using errcode = '23514';
  end if;
  perform app.validar_regras(v_regras, 'edicao');
  if (v_regras ->> 'quantidadeEncontros')::int < (select count(*) from public.encontros where edicao_id = p_edicao) then
    raise exception 'Há mais encontros cadastrados do que a quantidade informada; remova os excedentes antes.'
      using errcode = '23514';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  insert into public.versoes_regras (edicao_id, rotulo, regras, vale_desde, autor_id, justificativa)
  values (p_edicao, v_rotulo, v_regras, clock_timestamp(), (select auth.uid()), btrim(p_justificativa))
  returning vale_desde into v_vale;
  update public.edicoes set regras = v_regras, regras_versao = v_rotulo where id = p_edicao;
  return jsonb_build_object('rotulo', v_rotulo, 'valeDesde', v_vale, 'nova', true);
end;
$$;

revoke all on function public.regras_da_edicao_vigentes(uuid), public.gravar_regras(uuid, text, text, jsonb, text)
  from public, anon;
grant execute on function public.regras_da_edicao_vigentes(uuid), public.gravar_regras(uuid, text, text, jsonb, text)
  to authenticated;
-- As regras do piloto são públicas para quem está autenticado (base de comparação nas telas e testes).
grant execute on function app.regras_piloto() to authenticated;

-- ===========================================================================
-- US2 — regras próprias da turma (T014)
-- ===========================================================================
-- Cada linha é o conjunto completo de grupos ajustados a partir de `vale_desde`; `{}` volta a
-- herdar tudo da edição. O histórico fica guardado (FR-010).
create table public.ajustes_regras_turma (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas (id) on delete cascade,
  grupos jsonb not null check (jsonb_typeof(grupos) = 'object'),
  vale_desde timestamptz not null default clock_timestamp(),
  autor_id uuid not null references public.perfis (id),
  papel_autor text not null check (papel_autor in ('coordenacao', 'mentor')),
  justificativa text not null check (char_length(btrim(justificativa)) between 10 and 2000),
  criado_em timestamptz not null default now(),
  constraint ajustes_regras_turma_vale_desde_unico unique (turma_id, vale_desde)
);
comment on table public.ajustes_regras_turma is 'Ajustes de regras por turma (spec 011). Escrita só por RPC.';

create trigger auditoria_ajustes_regras_turma after insert or update or delete on public.ajustes_regras_turma
  for each row execute function app.registrar_auditoria();
create trigger bloquear_edicao_encerrada before insert or update or delete on public.ajustes_regras_turma
  for each row execute function app.bloquear_edicao_encerrada('turma_id');

alter table public.ajustes_regras_turma enable row level security;
create policy ajustes_regras_turma_ler on public.ajustes_regras_turma for select to authenticated
  using (app.vinculado_a_turma(turma_id) or app.e_coordenacao(app.edicao_da_turma(turma_id)));
revoke insert, update, delete, truncate on public.ajustes_regras_turma from authenticated, anon;
revoke select on public.ajustes_regras_turma from anon;

-- Grupos que quem chama pode ajustar na turma (R2): coordenação, todos os ajustáveis; mentor ativo
-- da turma (vínculo pelo curso), os de avaliação; demais, nenhum.
create function app.pode_ajustar_turma(p_turma uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select case
    when app.e_coordenacao(app.edicao_da_turma(p_turma))
      then array['presenca', 'participacao', 'questoes', 'entrega', 'apresentacao', 'penalidades', 'prazos']
    when exists (select 1 from public.atribuicoes a
                 where a.usuario_id = (select auth.uid()) and a.turma_id = p_turma and a.papel = 'mentor' and a.ativo)
      then array['presenca', 'participacao', 'questoes', 'entrega', 'apresentacao']
    else array[]::text[]
  end;
$$;

-- Regras vigentes de uma turma num instante: versão da edição || grupos do ajuste da turma.
create or replace function app.regras_vigentes(p_turma uuid, p_instante timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
  select (select v.regras
          from public.versoes_regras v
          where v.edicao_id = app.edicao_da_turma(p_turma) and v.vale_desde <= p_instante
          order by v.vale_desde desc
          limit 1)
         || coalesce((select a.grupos
                      from public.ajustes_regras_turma a
                      where a.turma_id = p_turma and a.vale_desde <= p_instante
                      order by a.vale_desde desc
                      limit 1), '{}'::jsonb);
$$;

-- Grava o conjunto de grupos ajustados da turma (FR-004, FR-005, FR-010): concorrência otimista
-- pelo ajuste carregado; conjunto igual ao vigente não grava.
create function public.gravar_ajustes_turma(p_turma uuid, p_ajuste_base uuid, p_grupos jsonb, p_justificativa text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid;
  v_grupos jsonb := coalesce(p_grupos, '{}'::jsonb);
  v_pode text[];
  v_atual public.ajustes_regras_turma%rowtype;
  v_chave text;
  v_id uuid;
  v_vale timestamptz;
begin
  v_edicao := app.travar_turma(p_turma);
  if jsonb_typeof(v_grupos) <> 'object' then
    raise exception 'Ajustes inválidos.' using errcode = '23514';
  end if;
  for v_chave in select jsonb_object_keys(v_grupos) loop
    if v_chave <> all (array['presenca', 'participacao', 'questoes', 'entrega', 'apresentacao', 'penalidades', 'prazos']) then
      raise exception 'Este grupo de regras não pode ser ajustado na turma.' using errcode = '23514';
    end if;
  end loop;
  v_pode := app.pode_ajustar_turma(p_turma);
  if cardinality(v_pode) = 0 then
    raise exception 'Você não pode ajustar as regras desta turma.' using errcode = '42501';
  end if;
  perform app.exigir_edicao_nao_encerrada(v_edicao);
  select * into v_atual from public.ajustes_regras_turma
  where turma_id = p_turma order by vale_desde desc limit 1;
  if coalesce(v_atual.grupos, '{}'::jsonb) = v_grupos then
    return jsonb_build_object('ajusteId', v_atual.id, 'valeDesde', v_atual.vale_desde, 'novo', false);
  end if;
  if p_ajuste_base is distinct from v_atual.id then
    raise exception 'As regras mudaram desde que você abriu a tela; recarregue.' using errcode = '23514';
  end if;
  -- Grupos fora do alcance de quem grava só podem seguir como estão (ex.: o mentor mantém as
  -- penalidades ajustadas pela coordenação).
  if exists (select 1
             from (select jsonb_object_keys(v_grupos) union select jsonb_object_keys(coalesce(v_atual.grupos, '{}'))) k (g)
             where k.g <> all (v_pode) and (v_grupos -> k.g) is distinct from (v_atual.grupos -> k.g)) then
    raise exception 'Penalidades e prazos são definidos pela coordenação.' using errcode = '42501';
  end if;
  perform app.validar_regras(v_grupos, 'turma');
  perform app.registrar_justificativa(p_justificativa);
  insert into public.ajustes_regras_turma (turma_id, grupos, autor_id, papel_autor, justificativa)
  values (p_turma, v_grupos, (select auth.uid()),
          case when app.e_coordenacao(v_edicao) then 'coordenacao' else 'mentor' end, btrim(p_justificativa))
  returning id, vale_desde into v_id, v_vale;
  return jsonb_build_object('ajusteId', v_id, 'valeDesde', v_vale, 'novo', true);
end;
$$;

revoke all on function app.pode_ajustar_turma(uuid) from public, anon;
revoke all on function public.gravar_ajustes_turma(uuid, uuid, jsonb, text) from public, anon;
grant execute on function public.gravar_ajustes_turma(uuid, uuid, jsonb, text) to authenticated;

-- ===========================================================================
-- US4 — cada encontro com as regras do seu início (T018, FR-011, FR-012, research R3 e R9)
-- ===========================================================================
-- Regras de um encontro para uma turma: as vigentes no início do encontro (versão da edição e
-- ajuste da turma). Sem encontro ou sem data, as vigentes agora.
create function app.regras_do_encontro(p_encontro uuid, p_turma uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select app.regras_vigentes(p_turma, coalesce(app.inicio_do_encontro(p_encontro), clock_timestamp()));
$$;
revoke all on function app.regras_do_encontro(uuid, uuid) from public, anon;

-- Funções ligadas a um encontro e a uma turma passam a usar as regras do encontro (mesmas
-- assinaturas; corpos iguais aos anteriores salvo a origem das regras). As leituras para o cálculo
-- parcial devolvem as regras de cada encontro (`regras` no desafio, no encontro ou na equipe).

CREATE OR REPLACE FUNCTION app.lancamentos_oficiais(p_dupla uuid, p_encontro uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_regras := app.regras_do_encontro(p_encontro, v_turma);
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
$function$;

CREATE OR REPLACE FUNCTION app.pontos_do_encontro(p_dupla uuid, p_encontro uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_regras jsonb := app.regras_do_encontro(p_encontro, (select turma_id from public.duplas where id = p_dupla));
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
$function$;

CREATE OR REPLACE FUNCTION app.prazo_revisao_efetivo(p_dupla uuid, p_ocorrencia uuid, p_publicacao uuid)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select x.novo_prazo from public.excecoes_prazo x
     where x.dupla_id = p_dupla and x.objeto = 'revisao'
       and (x.ocorrencia_id = p_ocorrencia or x.publicacao_id = p_publicacao)
     order by x.criado_em desc, x.id limit 1),
    case when p_ocorrencia is not null then
      (select o.decidido_em + make_interval(hours => (app.regras_do_encontro(o.encontro_id, app.turma_da_dupla(o.dupla_id)) -> 'prazos' ->> 'revisaoHoras')::int)
       from public.ocorrencias o where o.id = p_ocorrencia)
    else (select p.revisao_ate from public.publicacoes_ranking p where p.id = p_publicacao) end);
$function$;

CREATE OR REPLACE FUNCTION app.desafio_encerrado(p_desafio uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select d.estado = 'encerrado'
      or now() > d.prazo + make_interval(
           mins => coalesce((select max((app.regras_do_encontro(d.encontro_id, dt.turma_id) -> 'entrega' ->> 'limiteAtrasoMinutos')::int)
                     from public.desafio_turmas dt where dt.desafio_id = d.id),
                    (app.regras_da_edicao(d.edicao_id) -> 'entrega' ->> 'limiteAtrasoMinutos')::int, 0))
  from public.desafios d where d.id = p_desafio;
$function$;

CREATE OR REPLACE FUNCTION app.pendencias_da_turma(p_turma uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with enc as (
    select en.id, en.numero from public.encontros en
    where en.edicao_id = app.edicao_da_turma(p_turma) and app.encontro_realizado(en.id)
  ), eq as (
    select d.id, coalesce(d.nome, 'Equipe sem nome') as nome from public.duplas d
    where d.turma_id = p_turma and d.ativa
  ), itens as (
    -- Presença: estudantes ativos da turma sem registro no encontro (um item por encontro).
    select 'presenca' as tipo, enc.numero, 1 as ordem,
           'Presença não registrada: ' || count(*) || case when count(*) = 1 then ' estudante' else ' estudantes' end as descricao,
           '/docente/presenca' as caminho
    from enc join public.atribuicoes a on a.turma_id = p_turma and a.papel = 'aluno' and a.ativo
    where not exists (select 1 from public.presencas p where p.encontro_id = enc.id and p.estudante_id = a.usuario_id)
    group by enc.numero
    union all
    -- Participação: equipe ativa sem registro no encontro.
    select 'participacao', enc.numero, 2, 'Participação não registrada — ' || eq.nome, '/docente/presenca'
    from enc cross join eq
    where not exists (select 1 from public.participacoes pa where pa.encontro_id = enc.id and pa.dupla_id = eq.id)
    union all
    -- Entrega recebida sem avaliação.
    select 'avaliacao', enc.numero, 3, 'Entrega sem avaliação — ' || eq.nome || ', ' || d.titulo, '/docente/avaliacoes'
    from enc join public.desafios d on d.encontro_id = enc.id
    join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = p_turma
    cross join eq
    where exists (select 1 from public.entregas e where e.desafio_id = d.id and e.dupla_id = eq.id)
      and not exists (select 1 from public.avaliacoes av where av.desafio_id = d.id and av.dupla_id = eq.id)
    union all
    -- Ocorrência da turma aguardando decisão.
    select 'ocorrencia', en.numero, 4,
           'Ocorrência sem decisão — ' || coalesce(d.nome, 'Equipe sem nome') || ' (' ||
           coalesce((select t ->> 'rotulo' from jsonb_array_elements(app.regras_do_encontro(o.encontro_id, app.turma_da_dupla(o.dupla_id)) -> 'penalidades' -> 'tipos') t
                     where t ->> 'id' = o.tipo), o.tipo) || ')',
           '/docente/ocorrencias'
    from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
    join public.encontros en on en.id = o.encontro_id
    where d.turma_id = p_turma and o.estado in ('registrada', 'manifestada')
  )
  select coalesce(jsonb_agg(jsonb_build_object('tipo', tipo, 'encontroNumero', numero, 'descricao', descricao,
                                               'caminho', caminho) order by numero, ordem, descricao), '[]'::jsonb)
  from itens;
$function$;

CREATE OR REPLACE FUNCTION public.ocorrencias_visiveis(p_edicao uuid, p_turma uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'edicaoId', o.edicao_id, 'encontroId', o.encontro_id, 'encontroNumero', en.numero,
           'duplaId', o.dupla_id, 'duplaNome', coalesce(d.nome, 'Equipe sem nome'), 'turmaId', d.turma_id,
           'desafioId', o.desafio_id, 'tipo', o.tipo,
           'tipoRotulo', coalesce((select t ->> 'rotulo' from jsonb_array_elements(app.regras_do_encontro(o.encontro_id, app.turma_da_dupla(o.dupla_id)) -> 'penalidades' -> 'tipos') t
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
$function$;

CREATE OR REPLACE FUNCTION public.relatorio(p_tipo text, p_edicao uuid, p_categoria text DEFAULT NULL::text, p_turma uuid DEFAULT NULL::uuid, p_encontro uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_turmas uuid[] := app.turmas_do_relatorio(p_edicao, p_turma);
  v_colunas jsonb;
  v_linhas jsonb;
begin
  if p_tipo is null or p_tipo not in ('pontos', 'presenca', 'entregas', 'ocorrencias', 'revisoes') then
    raise exception 'Relatório desconhecido.' using errcode = '23514';
  end if;
  -- FR-013: a equipe docente não vê os pedidos de revisão nas telas (spec 007).
  if p_tipo = 'revisoes' and not app.e_coordenacao(p_edicao) then
    raise exception 'Os pedidos de revisão só são exportados pela coordenação.' using errcode = '42501';
  end if;
  if p_encontro is not null and not exists (select 1 from public.encontros where id = p_encontro and edicao_id = p_edicao) then
    raise exception 'O encontro não pertence à edição.' using errcode = '23514';
  end if;
  if p_categoria is not null then
    v_turmas := array(select t from unnest(v_turmas) t where app.categoria_da_turma(t) = p_categoria);
  end if;

  if p_tipo = 'pontos' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"presenca","rotulo":"Presença","tipo":"numero"},{"id":"participacao","rotulo":"Participação","tipo":"numero"},{"id":"avaliacaoObjetiva","rotulo":"Questões/prova oficial","tipo":"numero"},{"id":"entrega","rotulo":"Entrega prática","tipo":"numero"},{"id":"apresentacao","rotulo":"Apresentação","tipo":"numero"},{"id":"descontos","rotulo":"Descontos","tipo":"numero"},{"id":"total","rotulo":"Total","tipo":"numero"},{"id":"pendencias","rotulo":"Pendências","tipo":"texto"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             'encontro', en.numero, 'presenca', pp.p -> 'presenca', 'participacao', pp.p -> 'participacao',
             'avaliacaoObjetiva', pp.p -> 'avaliacaoObjetiva', 'entrega', pp.p -> 'entrega',
             'apresentacao', pp.p -> 'apresentacao', 'descontos', pp.p -> 'descontos', 'total', pp.p -> 'total',
             'pendencias', (select coalesce(string_agg(case x when 'participacao' then 'participação'
                                                             when 'avaliacaoObjetiva' then 'questões/prova oficial'
                                                             when 'entrega' then 'entrega' else 'apresentação' end,
                                                        ', ' order by o), '')
                            from jsonb_array_elements_text(pp.p -> 'pendencias') with ordinality q (x, o)))
           order by c.categoria, t.nome, d.nome, en.numero)
      into v_linhas
    from public.duplas d join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    join public.encontros en on en.edicao_id = p_edicao and (p_encontro is null or en.id = p_encontro)
    cross join lateral (select app.pontos_do_encontro(d.id, en.id) as p) pp
    where d.turma_id = any (v_turmas) and d.ativa;

  elsif p_tipo = 'presenca' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"estudante","rotulo":"Estudante","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"presente","rotulo":"Presente","tipo":"sim_nao"},{"id":"observacao","rotulo":"Observação","tipo":"texto"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome,
             -- Equipe da data do encontro, pelo histórico de integrantes (U1).
             'equipe', coalesce((
               select coalesce(d.nome, 'Equipe sem nome') from public.dupla_integrantes i
               join public.duplas d on d.id = i.dupla_id
               where i.estudante_id = pr.estudante_id and i.edicao_id = p_edicao
                 and i.entrada_em < ((en.data + 1)::timestamp at time zone 'America/Sao_Paulo')
                 and (i.saida_em is null or i.saida_em >= (en.data::timestamp at time zone 'America/Sao_Paulo'))
               order by i.entrada_em desc limit 1), 'Sem equipe'),
             'estudante', pe.nome, 'encontro', en.numero, 'presente', pr.presente, 'observacao', pr.observacao)
           order by c.categoria, t.nome, en.numero, pe.nome)
      into v_linhas
    from public.presencas pr join public.encontros en on en.id = pr.encontro_id
    join public.turmas t on t.id = pr.turma_id join public.cursos c on c.id = t.curso_id
    join public.perfis pe on pe.id = pr.estudante_id
    where pr.turma_id = any (v_turmas) and (p_encontro is null or pr.encontro_id = p_encontro);

  elsif p_tipo = 'entregas' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"desafio","rotulo":"Desafio","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"versao","rotulo":"Versão","tipo":"numero"},{"id":"recebidaEm","rotulo":"Recebida em","tipo":"data_hora"},{"id":"atrasoMinutos","rotulo":"Atraso (minutos)","tipo":"numero"},{"id":"forma","rotulo":"Forma","tipo":"texto"},{"id":"avaliada","rotulo":"Avaliada","tipo":"sim_nao"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             'desafio', de.titulo, 'encontro', en.numero, 'versao', e.versao, 'recebidaEm', e.recebida_em,
             'atrasoMinutos', e.atraso_minutos,
             'forma', case when e.arquivo_path is not null then 'Arquivo' else 'Link' end,
             'avaliada', exists (select 1 from public.avaliacoes av where av.desafio_id = e.desafio_id and av.dupla_id = e.dupla_id))
           order by c.categoria, t.nome, d.nome, en.numero, de.titulo, e.versao)
      into v_linhas
    from public.entregas e join public.duplas d on d.id = e.dupla_id
    join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    join public.desafios de on de.id = e.desafio_id join public.encontros en on en.id = de.encontro_id
    where d.turma_id = any (v_turmas) and (p_encontro is null or de.encontro_id = p_encontro);

  elsif p_tipo = 'ocorrencias' then
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"tipo","rotulo":"Tipo","tipo":"texto"},{"id":"estado","rotulo":"Estado","tipo":"texto"},{"id":"registradaEm","rotulo":"Registrada em","tipo":"data_hora"},{"id":"decididaEm","rotulo":"Decidida em","tipo":"data_hora"},{"id":"apresentacaoDependente","rotulo":"Apresentação dependente","tipo":"sim_nao"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             'encontro', en.numero,
             'tipo', coalesce((select x ->> 'rotulo' from jsonb_array_elements(app.regras_do_encontro(o.encontro_id, app.turma_da_dupla(o.dupla_id)) -> 'penalidades' -> 'tipos') x
                               where x ->> 'id' = o.tipo), o.tipo),
             'estado', case o.estado when 'registrada' then 'Registrada' when 'manifestada' then 'Manifestada'
                                     when 'confirmada' then 'Confirmada' else 'Arquivada' end,
             'registradaEm', o.criado_em, 'decididaEm', o.decidido_em,
             'apresentacaoDependente', o.apresentacao_dependente)
           order by c.categoria, t.nome, d.nome, en.numero, o.criado_em)
      into v_linhas
    from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
    join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    join public.encontros en on en.id = o.encontro_id
    where o.edicao_id = p_edicao and d.turma_id = any (v_turmas) and (p_encontro is null or o.encontro_id = p_encontro);

  else
    v_colunas := '[{"id":"categoria","rotulo":"Categoria","tipo":"texto"},{"id":"turma","rotulo":"Turma","tipo":"texto"},{"id":"equipe","rotulo":"Equipe","tipo":"texto"},{"id":"objeto","rotulo":"Objeto","tipo":"texto"},{"id":"componente","rotulo":"Componente","tipo":"texto"},{"id":"encontro","rotulo":"Encontro","tipo":"numero"},{"id":"estado","rotulo":"Estado","tipo":"texto"},{"id":"pedidoEm","rotulo":"Pedido em","tipo":"data_hora"},{"id":"respondidoEm","rotulo":"Respondido em","tipo":"data_hora"}]';
    select jsonb_agg(jsonb_build_object(
             'categoria', c.categoria, 'turma', t.nome, 'equipe', coalesce(d.nome, 'Equipe sem nome'),
             'objeto', case r.objeto when 'ocorrencia' then 'Ocorrência' else 'Publicação do ranking' end,
             'componente', case r.componente when 'presenca' then 'Presença' when 'participacao' then 'Participação'
                                             when 'avaliacaoObjetiva' then 'Questões/prova oficial'
                                             when 'entrega' then 'Entrega prática' when 'apresentacao' then 'Apresentação' end,
             'encontro', en.numero,
             'estado', case r.estado when 'aberto' then 'Aberto' when 'deferido' then 'Deferido' else 'Indeferido' end,
             'pedidoEm', r.criado_em, 'respondidoEm', r.respondido_em)
           order by c.categoria, t.nome, d.nome, r.criado_em)
      into v_linhas
    from public.pedidos_revisao r join public.duplas d on d.id = r.dupla_id
    join public.turmas t on t.id = d.turma_id join public.cursos c on c.id = t.curso_id
    left join public.ocorrencias o on o.id = r.ocorrencia_id
    left join public.encontros en on en.id = coalesce(r.encontro_id, o.encontro_id)
    where r.edicao_id = p_edicao and d.turma_id = any (v_turmas)
      and (p_encontro is null or coalesce(r.encontro_id, o.encontro_id) = p_encontro);
  end if;

  v_linhas := coalesce(v_linhas, '[]'::jsonb);
  insert into public.exportacoes_relatorio (edicao_id, tipo, filtros, linhas)
  values (p_edicao, p_tipo,
          jsonb_build_object('categoria', p_categoria, 'turmaId', p_turma, 'encontroId', p_encontro),
          jsonb_array_length(v_linhas));
  return jsonb_build_object('colunas', v_colunas, 'linhas', v_linhas);
end;
$function$;

CREATE OR REPLACE FUNCTION public.decidir_ocorrencia(p_ocorrencia uuid, p_resultado text, p_justificativa text, p_apresentacao_dependente boolean DEFAULT false, p_pedido uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_zera := exists (select 1 from jsonb_array_elements(app.regras_do_encontro(v_o.encontro_id, app.turma_da_dupla(v_o.dupla_id)) -> 'penalidades' -> 'tipos') t
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
    -- A redecisão só vale para o pedido sobre esta mesma ocorrência.
    if not exists (select 1 from public.pedidos_revisao r
                   where r.id = p_pedido and r.objeto = 'ocorrencia' and r.ocorrencia_id = p_ocorrencia) then
      raise exception 'O pedido de revisão informado não é sobre esta ocorrência.' using errcode = '23514';
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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_ocorrencia(p_chave uuid, p_encontro uuid, p_dupla uuid, p_tipo text, p_fato text, p_evidencia text, p_desafio uuid DEFAULT NULL::uuid, p_fato_chave text DEFAULT NULL::text, p_evidencia_path text DEFAULT NULL::text, p_evidencia_nome text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_regras := app.regras_do_encontro(p_encontro, v_dupla.turma_id);
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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_avaliacao(p_desafio uuid, p_dupla uuid, p_notas_entrega jsonb, p_notas_apresentacao jsonb, p_apresentacao_nao_avaliavel boolean, p_feedback text, p_justificativa text, p_pedido uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  v_regras := app.regras_do_encontro((select encontro_id from public.desafios where id = p_desafio), v_turma);
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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_participacao(p_encontro uuid, p_dupla uuid, p_notas jsonb, p_justificativa text, p_pedido uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    app.regras_do_encontro(p_encontro, v_turma) -> 'participacao' -> 'criterios');

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
$function$;

CREATE OR REPLACE FUNCTION public.registrar_entrega(p_desafio uuid, p_chave uuid, p_arquivo text, p_arquivo_nome text, p_link text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_desafio public.desafios%rowtype;
  v_dupla uuid;
  v_existente public.entregas%rowtype;
  v_metadados jsonb;
  v_prazo timestamptz;
  v_prorrogada boolean;
  v_regras jsonb;
  v_atraso integer;
  v_desconto numeric;
  v_versao integer;
  v_nova public.entregas%rowtype;
begin
  select * into v_desafio from public.desafios where id = p_desafio;
  if not found or v_desafio.estado = 'rascunho' or not exists (
       select 1 from public.desafio_turmas dt
       where dt.desafio_id = p_desafio and app.e_aluno_ativo(dt.turma_id, v_uid)) then
    raise exception 'Este desafio não é da sua turma.' using errcode = '42501';
  end if;
  v_dupla := app.equipe_ativa_do_aluno(v_desafio.edicao_id, v_uid);
  if v_dupla is null then
    raise exception 'Você precisa fazer parte de uma equipe para enviar.' using errcode = '23514';
  end if;

  -- Serializa os envios da equipe; a repetição da mesma tentativa devolve o comprovante original.
  perform 1 from public.duplas where id = v_dupla for update;
  select * into v_existente from public.entregas
  where desafio_id = p_desafio and dupla_id = v_dupla and chave_envio = p_chave;
  if found then
    return app.comprovante(v_existente);
  end if;

  if p_arquivo is null and nullif(btrim(p_link), '') is null then
    raise exception 'Envie um arquivo ou um link.' using errcode = '23514';
  elsif p_arquivo is not null and nullif(btrim(p_link), '') is not null then
    raise exception 'Envie um arquivo ou um link, não os dois.' using errcode = '23514';
  elsif p_arquivo is not null and not v_desafio.aceita_arquivo then
    raise exception 'Este desafio não aceita arquivo.' using errcode = '23514';
  elsif p_arquivo is null and not v_desafio.aceita_link then
    raise exception 'Este desafio não aceita link.' using errcode = '23514';
  end if;

  if p_arquivo is null then
    if btrim(p_link) !~ '^https?://[^[:space:]]+$' then
      raise exception 'Informe um link válido (http ou https).' using errcode = '23514';
    end if;
  else
    select o.metadata into v_metadados from storage.objects o
    where o.bucket_id = 'entregas' and o.name = p_arquivo and o.owner_id = v_uid::text
      and o.name like p_desafio::text || '/' || v_dupla::text || '/%';
    if not found then
      raise exception 'Arquivo não encontrado. Envie o arquivo novamente.' using errcode = '23514';
    end if;
    if coalesce((v_metadados ->> 'size')::bigint, 0) > 52428800 then
      raise exception 'O arquivo passa do limite de 50 MB.' using errcode = '23514';
    end if;
    if coalesce(v_metadados ->> 'mimetype', '') <> all (array['application/pdf', 'application/zip',
         'application/x-zip-compressed', 'image/png', 'image/jpeg']) then
      raise exception 'Tipo de arquivo não aceito: envie PDF, ZIP, PNG ou JPG.' using errcode = '23514';
    end if;
  end if;

  v_prorrogada := exists (select 1 from public.prorrogacoes where desafio_id = p_desafio and dupla_id = v_dupla);
  v_prazo := app.prazo_efetivo(p_desafio, v_dupla);
  v_regras := app.regras_do_encontro(v_desafio.encontro_id, app.turma_da_dupla(v_dupla)) -> 'entrega';
  v_atraso := greatest(0, ceil(extract(epoch from now() - v_prazo) / 60))::integer;
  if (v_desafio.estado = 'encerrado' and not v_prorrogada)
     or v_atraso > coalesce((v_regras ->> 'limiteAtrasoMinutos')::integer, 0) then
    raise exception 'O prazo de entrega terminou e a entrega não é mais aceita.' using errcode = '23514';
  end if;
  if v_atraso > 0 and exists (select 1 from public.entregas where desafio_id = p_desafio
                              and dupla_id = v_dupla and atraso_minutos = 0) then
    raise exception 'A equipe já tem entrega no prazo; um novo envio agora seria registrado com atraso.'
      using errcode = '23514';
  end if;
  if v_atraso > 0 then
    select (f ->> 'desconto')::numeric into v_desconto
    from jsonb_array_elements(v_regras -> 'faixasDeAtraso') f
    where v_atraso <= (f ->> 'ateMinutos')::integer
    order by (f ->> 'ateMinutos')::integer limit 1;
  end if;

  select coalesce(max(versao), 0) + 1 into v_versao from public.entregas
  where desafio_id = p_desafio and dupla_id = v_dupla;
  insert into public.entregas (desafio_id, dupla_id, versao, autor_id, protocolo, arquivo_path,
                               arquivo_nome, link, atraso_minutos, desconto_previsto, chave_envio)
  values (p_desafio, v_dupla, v_versao, v_uid,
          'ENT-' || to_char(now() at time zone 'America/Fortaleza', 'YYYYMMDD') || '-'
            || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
          p_arquivo, nullif(btrim(p_arquivo_nome), ''), nullif(btrim(p_link), ''),
          v_atraso, coalesce(v_desconto, 0), p_chave)
  returning * into v_nova;
  return app.comprovante(v_nova);
end;
$function$;

CREATE OR REPLACE FUNCTION public.painel_avaliacao(p_desafio uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_desafio public.desafios%rowtype;
  v_coordenacao boolean;
begin
  select * into v_desafio from public.desafios where id = p_desafio;
  if not found then
    raise exception 'Desafio não encontrado.' using errcode = 'P0002';
  end if;
  v_coordenacao := app.e_coordenacao(v_desafio.edicao_id);
  if not (v_coordenacao or exists (select 1 from public.desafio_turmas dt
                                   where dt.desafio_id = p_desafio and app.atua_na_turma(dt.turma_id))) then
    raise exception 'Você não tem acesso a este desafio.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'regras', app.regras_da_edicao(v_desafio.edicao_id),
    'desafio', app.desafio_json(v_desafio),
    'equipes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', d.id, 'nome', d.nome,
               'regras', app.regras_do_encontro(v_desafio.encontro_id, d.turma_id),
               'integrantes', (select coalesce(jsonb_agg(jsonb_build_object('estudanteId', i.estudante_id,
                                        'nome', p.nome) order by p.nome), '[]'::jsonb)
                               from public.dupla_integrantes i join public.perfis p on p.id = i.estudante_id
                               where i.dupla_id = d.id and i.saida_em is null),
               'versoes', app.entregas_json(p_desafio, d.id),
               'ultimaEntrega', app.entregas_json(p_desafio, d.id) -> 0,
               'avaliacao', app.avaliacao_json(p_desafio, d.id),
               'prorrogacao', (select jsonb_build_object('novoPrazo', pr.novo_prazo, 'justificativa', pr.justificativa)
                               from public.prorrogacoes pr where pr.desafio_id = p_desafio and pr.dupla_id = d.id
                               order by pr.criado_em desc limit 1))
             order by d.nome nulls last, d.id)
      from public.duplas d
      join public.desafio_turmas dt on dt.desafio_id = p_desafio and dt.turma_id = d.turma_id
      where d.ativa and (v_coordenacao or app.atua_na_turma(d.turma_id))), '[]'::jsonb));
end;
$function$;

CREATE OR REPLACE FUNCTION public.atividades_da_turma(p_turma uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_aluno boolean := app.e_aluno_ativo(p_turma, auth.uid());
  v_dupla uuid;
begin
  if not (v_aluno or app.e_gestao_da_turma(p_turma)) then
    raise exception 'Você não tem acesso a esta turma.' using errcode = '42501';
  end if;
  if v_aluno then
    v_dupla := app.equipe_ativa_do_aluno(app.edicao_da_turma(p_turma), v_uid);
  end if;
  return jsonb_build_object(
    'regras', app.regras_vigentes(p_turma, clock_timestamp()),
    'desafios', coalesce((
      select jsonb_agg(app.desafio_json(d) || jsonb_build_object(
               'duplaId', v_dupla,
               'regras', app.regras_do_encontro(d.encontro_id, p_turma),
               'prazoEfetivo', case when v_dupla is null then d.prazo else app.prazo_efetivo(d.id, v_dupla) end,
               'encerrado', app.desafio_encerrado(d.id)
                 and not (v_dupla is not null and exists (
                   select 1 from public.prorrogacoes p where p.desafio_id = d.id and p.dupla_id = v_dupla
                     and p.novo_prazo > now())),
               'entregas', case when v_dupla is null then '[]'::jsonb else app.entregas_json(d.id, v_dupla) end,
               'avaliacao', case when v_dupla is null then null else app.avaliacao_json(d.id, v_dupla) end)
             order by d.prazo, d.criado_em)
      from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = p_turma
      where d.estado <> 'rascunho' or not v_aluno), '[]'::jsonb),
    'listas', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'encontroId', l.encontro_id, 'titulo', l.titulo,
               'prazo', l.prazo, 'encerrada', app.lista_encerrada(l.id)) order by l.prazo, l.criado_em)
      from public.listas_questoes l join public.lista_turmas lt on lt.lista_id = l.id and lt.turma_id = p_turma
      where l.estado <> 'rascunho' or not v_aluno), '[]'::jsonb));
end;
$function$;

CREATE OR REPLACE FUNCTION public.presencas_da_turma(p_encontro uuid, p_turma uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not app.e_gestao_da_turma(p_turma) then
    raise exception 'Você não tem acesso a esta turma.' using errcode = '42501';
  end if;
  perform app.exigir_encontro_da_turma(p_encontro, p_turma);
  return jsonb_build_object(
    'regras', app.regras_do_encontro(p_encontro, p_turma),
    'equipes', app.equipes_json(p_turma),
    'alunos', coalesce((
      select jsonb_agg(jsonb_build_object('estudanteId', a.usuario_id, 'nome', p.nome,
               'duplaId', (select i.dupla_id from public.dupla_integrantes i
                           join public.duplas d on d.id = i.dupla_id and d.ativa and d.turma_id = p_turma
                           where i.estudante_id = a.usuario_id and i.saida_em is null limit 1),
               'presente', x.presente, 'observacao', x.observacao) order by p.nome)
      from public.atribuicoes a join public.perfis p on p.id = a.usuario_id
      left join public.presencas x on x.encontro_id = p_encontro and x.estudante_id = a.usuario_id
      where a.turma_id = p_turma and a.papel = 'aluno' and a.ativo), '[]'::jsonb),
    'participacoes', coalesce((
      select jsonb_agg(jsonb_build_object('duplaId', pa.dupla_id, 'notas', pa.notas))
      from public.participacoes pa join public.duplas d on d.id = pa.dupla_id and d.turma_id = p_turma
      where pa.encontro_id = p_encontro), '[]'::jsonb));
end;
$function$;

CREATE OR REPLACE FUNCTION public.lancamentos_da_minha_equipe(p_edicao uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_dupla uuid := app.equipe_ativa_do_aluno(p_edicao, auth.uid());
  v_turma uuid := app.turma_da_dupla(v_dupla);
begin
  if v_dupla is null then
    return jsonb_build_object('regras', app.regras_da_edicao(p_edicao), 'equipe', null,
                              'encontros', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'regras', app.regras_vigentes(v_turma, clock_timestamp()),
    'equipe', (select e from jsonb_array_elements(app.equipes_json(v_turma)) e where e ->> 'id' = v_dupla::text),
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object(
        'encontroId', en.id, 'numero', en.numero, 'titulo', en.titulo,
        'regras', app.regras_do_encontro(en.id, v_turma),
        'avaliacaoObjetiva', en.avaliacao_objetiva,
        'presencas', coalesce((
          select jsonb_agg(jsonb_build_object('estudanteId', p.estudante_id, 'presente', p.presente))
          from public.presencas p
          join public.dupla_integrantes i on i.estudante_id = p.estudante_id and i.dupla_id = v_dupla
                                         and i.saida_em is null
          where p.encontro_id = en.id), '[]'::jsonb),
        'participacao', (select pa.notas from public.participacoes pa
                         where pa.encontro_id = en.id and pa.dupla_id = v_dupla),
        'desafios', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'desafioId', d.id,
                   'avaliacao', app.avaliacao_json(d.id, v_dupla),
                   'temEntrega', exists (select 1 from public.entregas e where e.desafio_id = d.id and e.dupla_id = v_dupla),
                   'atrasoMinutos', coalesce((select e.atraso_minutos from public.entregas e
                                              where e.desafio_id = d.id and e.dupla_id = v_dupla
                                              order by e.versao desc limit 1), 0),
                   'prorrogada', exists (select 1 from public.prorrogacoes pr
                                         where pr.desafio_id = d.id and pr.dupla_id = v_dupla))
                 order by d.prazo)
          from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = v_turma
          where d.encontro_id = en.id and d.estado <> 'rascunho'), '[]'::jsonb),
        'listas', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'listaId', l.id,
                   'encerrada', app.lista_encerrada(l.id),
                   -- FR-020: acertos só depois do prazo.
                   'acertos', case when app.lista_encerrada(l.id) then
                                (select s.acertos from public.submissoes_questoes s
                                 where s.lista_id = l.id and s.dupla_id = v_dupla) end,
                   'total', (select count(*) from public.questoes q where q.lista_id = l.id))
                 order by l.prazo)
          from public.listas_questoes l join public.lista_turmas lt on lt.lista_id = l.id and lt.turma_id = v_turma
          where l.encontro_id = en.id and l.estado <> 'rascunho'), '[]'::jsonb))
        order by en.numero)
      from public.encontros en where en.edicao_id = p_edicao), '[]'::jsonb));
end;
$function$;

-- ===========================================================================
-- US3 — encontros da turma e pontuação máxima (T022, research R6 e R7)
-- ===========================================================================
-- Só as exclusões: sem linha, a turma participa do encontro (inclusive dos criados depois).
create table public.encontros_fora_da_turma (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas (id) on delete cascade,
  encontro_id uuid not null references public.encontros (id) on delete cascade,
  criado_em timestamptz not null default now(),
  constraint encontros_fora_da_turma_unico unique (turma_id, encontro_id)
);
comment on table public.encontros_fora_da_turma is 'Encontros de que a turma não participa (spec 011). Escrita só por RPC.';

create trigger auditoria_encontros_fora_da_turma after insert or update or delete on public.encontros_fora_da_turma
  for each row execute function app.registrar_auditoria();
create trigger bloquear_edicao_encerrada before insert or update or delete on public.encontros_fora_da_turma
  for each row execute function app.bloquear_edicao_encerrada('turma_id');

alter table public.encontros_fora_da_turma enable row level security;
create policy encontros_fora_da_turma_ler on public.encontros_fora_da_turma for select to authenticated
  using (app.vinculado_a_turma(turma_id) or app.e_coordenacao(app.edicao_da_turma(turma_id)));
revoke insert, update, delete, truncate on public.encontros_fora_da_turma from authenticated, anon;
revoke select on public.encontros_fora_da_turma from anon;

create function app.encontro_da_turma(p_encontro uuid, p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.encontros_fora_da_turma x
                     where x.encontro_id = p_encontro and x.turma_id = p_turma);
$$;

-- O que a turma já tem lançado no encontro (impede tirá-lo da turma).
create function app.lancamentos_da_turma_no_encontro(p_encontro uuid, p_turma uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select array_remove(array[
    case when exists (select 1 from public.presencas p where p.encontro_id = p_encontro and p.turma_id = p_turma)
         then 'presenças' end,
    case when exists (select 1 from public.participacoes p join public.duplas d on d.id = p.dupla_id
                      where p.encontro_id = p_encontro and d.turma_id = p_turma)
         then 'participações' end,
    case when exists (select 1 from public.avaliacoes a join public.desafios de on de.id = a.desafio_id
                      join public.duplas d on d.id = a.dupla_id
                      where de.encontro_id = p_encontro and d.turma_id = p_turma)
         then 'avaliações' end,
    case when exists (select 1 from public.submissoes_questoes s join public.listas_questoes l on l.id = s.lista_id
                      join public.duplas d on d.id = s.dupla_id
                      where l.encontro_id = p_encontro and d.turma_id = p_turma)
         then 'respostas de questões' end,
    case when exists (select 1 from public.resultados_prova r
                      where r.encontro_id = p_encontro
                        and (exists (select 1 from public.duplas d where d.id = r.dupla_id and d.turma_id = p_turma)
                             or exists (select 1 from public.atribuicoes a where a.usuario_id = r.estudante_id
                                        and a.turma_id = p_turma and a.papel = 'aluno')))
         then 'resultados da prova oficial' end,
    case when exists (select 1 from public.ocorrencias o join public.duplas d on d.id = o.dupla_id
                      where o.encontro_id = p_encontro and d.turma_id = p_turma)
         then 'ocorrências' end
  ], null);
$$;

-- Define de quais encontros da edição a turma não participa (FR-008).
create function public.definir_encontros_da_turma(p_turma uuid, p_excluidos uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid;
  v_novos uuid[];
  v_encontro uuid;
  v_impede text[];
begin
  v_edicao := app.travar_turma(p_turma);
  perform app.exigir_coordenacao_de(v_edicao);
  perform app.exigir_edicao_nao_encerrada(v_edicao);
  v_novos := array(select distinct x from unnest(coalesce(p_excluidos, '{}'::uuid[])) x where x is not null);
  if exists (select 1 from unnest(v_novos) x
             where not exists (select 1 from public.encontros e where e.id = x and e.edicao_id = v_edicao)) then
    raise exception 'Encontro não encontrado nesta edição.' using errcode = '23514';
  end if;
  for v_encontro in select x from unnest(v_novos) x where app.encontro_da_turma(x, p_turma) loop
    v_impede := app.lancamentos_da_turma_no_encontro(v_encontro, p_turma);
    if cardinality(v_impede) > 0 then
      raise exception 'O encontro % já tem % desta turma e não pode sair.',
        (select numero from public.encontros where id = v_encontro), array_to_string(v_impede, ', ')
        using errcode = '23514';
    end if;
  end loop;
  delete from public.encontros_fora_da_turma where turma_id = p_turma and encontro_id <> all (v_novos);
  insert into public.encontros_fora_da_turma (turma_id, encontro_id)
  select p_turma, x from unnest(v_novos) x
  on conflict on constraint encontros_fora_da_turma_unico do nothing;
end;
$$;

-- Máximo de um encontro (R7): presença + participação + questões ou prova oficial + entrega +
-- apresentação, com as regras do encontro.
create function app.maximo_do_encontro(p_regras jsonb, p_avaliacao_objetiva text)
returns numeric language sql immutable set search_path = '' as $$
  select (p_regras -> 'presenca' ->> 'maximoPorDupla')::numeric
       + coalesce((select sum((c ->> 'maximo')::numeric) from jsonb_array_elements(p_regras -> 'participacao' -> 'criterios') c), 0)
       + case when p_avaliacao_objetiva = 'prova_oficial' then (p_regras -> 'provaOficial' ->> 'maximoPorDupla')::numeric
              else (p_regras -> 'questoes' ->> 'maximo')::numeric end
       + coalesce((select sum((c ->> 'maximo')::numeric) from jsonb_array_elements(p_regras -> 'entrega' -> 'criterios') c), 0)
       + coalesce((select sum((c ->> 'maximo')::numeric) from jsonb_array_elements(p_regras -> 'apresentacao' -> 'criterios') c), 0);
$$;

-- Pontuação máxima da turma: soma dos máximos dos encontros de que ela participa (FR-009).
create function app.maximo_da_turma(p_turma uuid)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(sum(app.maximo_do_encontro(app.regras_do_encontro(e.id, p_turma), e.avaliacao_objetiva::text)), 0)
  from public.encontros e
  where e.edicao_id = app.edicao_da_turma(p_turma) and app.encontro_da_turma(e.id, p_turma);
$$;

revoke all on function app.encontro_da_turma(uuid, uuid), app.lancamentos_da_turma_no_encontro(uuid, uuid),
  app.maximo_do_encontro(jsonb, text), app.maximo_da_turma(uuid) from public, anon;
revoke all on function public.definir_encontros_da_turma(uuid, uuid[]) from public, anon;
grant execute on function public.definir_encontros_da_turma(uuid, uuid[]) to authenticated;

-- Encontros fora da turma saem dos totais, da pontuação, dos lançamentos e do painel da turma, e
-- não recebem lançamentos dela; os pontos trazem a pontuação máxima da turma.

CREATE OR REPLACE FUNCTION app.totais_da_equipe(p_dupla uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with enc as (
    select en.id, en.numero, en.titulo, app.pontos_do_encontro(p_dupla, en.id) as p
    from public.encontros en
    where en.edicao_id = (select edicao_id from public.duplas where id = p_dupla)
      and app.encontro_da_turma(en.id, app.turma_da_dupla(p_dupla))
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
$function$;

CREATE OR REPLACE FUNCTION app.pontos_da_equipe_json(p_dupla uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object('duplaId', d.id, 'nome', coalesce(d.nome, 'Equipe sem nome'),
                            'maximo', app.maximo_da_turma(d.turma_id)) || app.totais_da_equipe(d.id)
  from public.duplas d where d.id = p_dupla;
$function$;

CREATE OR REPLACE FUNCTION app.exigir_encontro_da_turma(p_encontro uuid, p_turma uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not exists (select 1 from public.encontros e
                 where e.id = p_encontro and e.edicao_id = app.edicao_da_turma(p_turma)) then
    raise exception 'Encontro não encontrado nesta edição.' using errcode = 'P0002';
  end if;
  if not app.encontro_da_turma(p_encontro, p_turma) then
    raise exception 'Este encontro não faz parte da turma.' using errcode = '23514';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.lancamentos_da_minha_equipe(p_edicao uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_dupla uuid := app.equipe_ativa_do_aluno(p_edicao, auth.uid());
  v_turma uuid := app.turma_da_dupla(v_dupla);
begin
  if v_dupla is null then
    return jsonb_build_object('regras', app.regras_da_edicao(p_edicao), 'equipe', null,
                              'encontros', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'regras', app.regras_vigentes(v_turma, clock_timestamp()),
    'equipe', (select e from jsonb_array_elements(app.equipes_json(v_turma)) e where e ->> 'id' = v_dupla::text),
    'encontros', coalesce((
      select jsonb_agg(jsonb_build_object(
        'encontroId', en.id, 'numero', en.numero, 'titulo', en.titulo,
        'regras', app.regras_do_encontro(en.id, v_turma),
        'avaliacaoObjetiva', en.avaliacao_objetiva,
        'presencas', coalesce((
          select jsonb_agg(jsonb_build_object('estudanteId', p.estudante_id, 'presente', p.presente))
          from public.presencas p
          join public.dupla_integrantes i on i.estudante_id = p.estudante_id and i.dupla_id = v_dupla
                                         and i.saida_em is null
          where p.encontro_id = en.id), '[]'::jsonb),
        'participacao', (select pa.notas from public.participacoes pa
                         where pa.encontro_id = en.id and pa.dupla_id = v_dupla),
        'desafios', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'desafioId', d.id,
                   'avaliacao', app.avaliacao_json(d.id, v_dupla),
                   'temEntrega', exists (select 1 from public.entregas e where e.desafio_id = d.id and e.dupla_id = v_dupla),
                   'atrasoMinutos', coalesce((select e.atraso_minutos from public.entregas e
                                              where e.desafio_id = d.id and e.dupla_id = v_dupla
                                              order by e.versao desc limit 1), 0),
                   'prorrogada', exists (select 1 from public.prorrogacoes pr
                                         where pr.desafio_id = d.id and pr.dupla_id = v_dupla))
                 order by d.prazo)
          from public.desafios d join public.desafio_turmas dt on dt.desafio_id = d.id and dt.turma_id = v_turma
          where d.encontro_id = en.id and d.estado <> 'rascunho'), '[]'::jsonb),
        'listas', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'listaId', l.id,
                   'encerrada', app.lista_encerrada(l.id),
                   -- FR-020: acertos só depois do prazo.
                   'acertos', case when app.lista_encerrada(l.id) then
                                (select s.acertos from public.submissoes_questoes s
                                 where s.lista_id = l.id and s.dupla_id = v_dupla) end,
                   'total', (select count(*) from public.questoes q where q.lista_id = l.id))
                 order by l.prazo)
          from public.listas_questoes l join public.lista_turmas lt on lt.lista_id = l.id and lt.turma_id = v_turma
          where l.encontro_id = en.id and l.estado <> 'rascunho'), '[]'::jsonb))
        order by en.numero)
      from public.encontros en where en.edicao_id = p_edicao and app.encontro_da_turma(en.id, v_turma)), '[]'::jsonb));
end;
$function$;

CREATE OR REPLACE FUNCTION public.painel_da_turma(p_turma uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      where e.edicao_id = v_edicao and app.encontro_da_turma(e.id, p_turma)), '[]'::jsonb)
  );
end;
$function$;

-- ===========================================================================
-- US5 — ver regras vigentes e histórico (T026, FR-014, FR-015)
-- ===========================================================================
-- Grupos de um ajuste na ordem das telas.
create function app.grupos_do_ajuste(p_grupos jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(g order by o), '[]'::jsonb)
  from unnest(array['presenca', 'participacao', 'questoes', 'entrega', 'apresentacao', 'penalidades', 'prazos'])
       with ordinality as t (g, o)
  where coalesce(p_grupos, '{}'::jsonb) ? g;
$$;

-- Regras vigentes agora para a turma, para quem participa dela ou coordena a edição.
create function public.regras_da_turma(p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_edicao uuid := app.edicao_da_turma(p_turma);
  v_coordena boolean;
  v_ajuste public.ajustes_regras_turma%rowtype;
  v_res jsonb;
begin
  if v_edicao is null then
    raise exception 'Turma não encontrada.' using errcode = 'P0002';
  end if;
  v_coordena := app.e_coordenacao(v_edicao);
  if not (v_coordena or app.vinculado_a_turma(p_turma)) then
    raise exception 'Você não participa desta turma.' using errcode = '42501';
  end if;
  select * into v_ajuste from public.ajustes_regras_turma
  where turma_id = p_turma and vale_desde <= clock_timestamp() order by vale_desde desc limit 1;
  v_res := jsonb_build_object(
    'regras', app.regras_vigentes(p_turma, clock_timestamp()),
    'gruposAjustados', app.grupos_do_ajuste(v_ajuste.grupos),
    'ajusteId', v_ajuste.id,
    'versao', (select regras_versao from public.edicoes where id = v_edicao),
    'maximo', app.maximo_da_turma(p_turma),
    'encontrosExcluidos', coalesce((select jsonb_agg(x.encontro_id order by e.numero)
                                    from public.encontros_fora_da_turma x join public.encontros e on e.id = x.encontro_id
                                    where x.turma_id = p_turma), '[]'::jsonb),
    'podeAjustar', to_jsonb(app.pode_ajustar_turma(p_turma)));
  if v_coordena then
    v_res := v_res || jsonb_build_object('encontrosBloqueados', coalesce((
      select jsonb_agg(jsonb_build_object('encontroId', e.id,
                                          'motivo', 'Já tem ' || array_to_string(l.itens, ', ') || ' desta turma.')
                       order by e.numero)
      from public.encontros e
      cross join lateral (select app.lancamentos_da_turma_no_encontro(e.id, p_turma) as itens) l
      where e.edicao_id = v_edicao and cardinality(l.itens) > 0), '[]'::jsonb));
  end if;
  return v_res;
end;
$$;

-- Histórico das regras (FR-015): versões da edição e, com turma, os ajustes dela; mais recentes
-- primeiro. Coordenação da edição; mentor só da turma em que atua.
create function public.historico_regras(p_edicao uuid, p_turma uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.e_coordenacao(p_edicao)
          or (p_turma is not null and exists (
                select 1 from public.atribuicoes a
                where a.usuario_id = (select auth.uid()) and a.turma_id = p_turma and a.papel = 'mentor' and a.ativo))) then
    raise exception 'Somente a coordenação ou o mentor da turma veem o histórico das regras.' using errcode = '42501';
  end if;
  if p_turma is not null and app.edicao_da_turma(p_turma) is distinct from p_edicao then
    raise exception 'A turma não pertence a esta edição.' using errcode = '23514';
  end if;
  return coalesce((
    select jsonb_agg(i.item order by i.vale_desde desc)
    from (
      select v.vale_desde,
             jsonb_build_object('tipo', 'edicao', 'rotulo', v.rotulo,
                                'valeDesde', case when v.vale_desde = '-infinity' then null else v.vale_desde end,
                                'autor', p.nome, 'papel', case when v.autor_id is null then null else 'coordenacao' end,
                                'justificativa', v.justificativa, 'grupos', '[]'::jsonb) as item
      from public.versoes_regras v left join public.perfis p on p.id = v.autor_id
      where v.edicao_id = p_edicao
      union all
      select a.vale_desde,
             jsonb_build_object('tipo', 'turma', 'rotulo', null, 'valeDesde', a.vale_desde, 'autor', p.nome,
                                'papel', a.papel_autor, 'justificativa', a.justificativa,
                                'grupos', app.grupos_do_ajuste(a.grupos))
      from public.ajustes_regras_turma a left join public.perfis p on p.id = a.autor_id
      where p_turma is not null and a.turma_id = p_turma
    ) i), '[]'::jsonb);
end;
$$;

revoke all on function app.grupos_do_ajuste(jsonb) from public, anon;
revoke all on function public.regras_da_turma(uuid), public.historico_regras(uuid, uuid) from public, anon;
grant execute on function public.regras_da_turma(uuid), public.historico_regras(uuid, uuid) to authenticated;
