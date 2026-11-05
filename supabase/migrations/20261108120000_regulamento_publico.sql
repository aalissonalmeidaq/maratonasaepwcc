-- Spec 014: projeção anônima fechada; nenhuma tabela ganha leitura pública.
alter table public.edicoes add column regulamento_publico boolean not null default false;

-- Forma recursiva fixa: não deixa JSON arbitrário atravessar a fronteira pública.
create function app.projetar_json_publico(p jsonb, forma jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare resultado jsonb; chave text; modelo jsonb;
begin
  if forma = '"numero"'::jsonb then
    return case when jsonb_typeof(p) = 'number' then p else 'null'::jsonb end;
  elsif forma = '"texto"'::jsonb then
    return case when jsonb_typeof(p) = 'string' then p else 'null'::jsonb end;
  elsif jsonb_typeof(forma) = 'array' then
    if jsonb_typeof(p) is distinct from 'array' then return 'null'::jsonb; end if;
    select coalesce(jsonb_agg(app.projetar_json_publico(v, forma->0)), '[]'::jsonb)
      into resultado from jsonb_array_elements(p) v;
    return resultado;
  end if;
  if jsonb_typeof(p) is distinct from 'object' then return 'null'::jsonb; end if;
  resultado := '{}'::jsonb;
  for chave, modelo in select * from jsonb_each(forma) loop
    resultado := resultado || jsonb_build_object(chave, app.projetar_json_publico(p->chave, modelo));
  end loop;
  return jsonb_strip_nulls(resultado);
end;
$$;
revoke all on function app.projetar_json_publico(jsonb,jsonb) from public, anon, authenticated;

create function public.regulamento_publico()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('geradoEm', now(), 'edicoes', coalesce(jsonb_agg(
    jsonb_build_object('id', e.id, 'nome', e.nome, 'inicio', e.inicio, 'fim', e.fim,
      'regrasVersao', e.regras_versao,
      'regras', app.projetar_json_publico(e.regras, '{
        "versao":"texto", "presenca":{"pontosPorIntegrante":"numero","maximoPorDupla":"numero"},
        "participacao":{"criterios":[{"id":"texto","rotulo":"texto","maximo":"numero"}]},
        "questoes":{"maximo":"numero"},
        "entrega":{"criterios":[{"id":"texto","rotulo":"texto","maximo":"numero"}],
          "criterioDeAtraso":"texto","limiteAtrasoMinutos":"numero",
          "faixasDeAtraso":[{"ateMinutos":"numero","desconto":"numero"}]},
        "apresentacao":{"criterios":[{"id":"texto","rotulo":"texto","maximo":"numero"}]},
        "provaOficial":{"pontosRealizacao":"numero","pontosBonus":"numero","notaMinimaBonus":"numero"},
        "penalidades":{"tetoDescontosPorEncontro":"numero"},
        "prazos":{"manifestacaoHoras":"numero","revisaoHoras":"numero"}
      }'::jsonb),
      'encontros', coalesce((select jsonb_agg(jsonb_build_object(
        'numero', n.numero, 'titulo', n.titulo, 'data', n.data, 'inicio', n.inicio,
        'fim', n.fim, 'estado', n.estado) order by n.numero)
        from public.encontros n where n.edicao_id = e.id), '[]'::jsonb))
    order by e.inicio asc nulls last, e.nome, e.id), '[]'::jsonb))
  from public.edicoes e where e.estado = 'ativa' and e.regulamento_publico;
$$;
revoke all on function public.regulamento_publico() from public;
grant execute on function public.regulamento_publico() to anon, authenticated;

-- A marca só muda pela RPC: `edicoes` continua sem UPDATE direto (spec 010), inclusive por
-- grants de coluna; as RPCs security definer autorizam as escritas.
revoke update on public.edicoes from authenticated, anon;
do $$
declare coluna text;
begin
  for coluna in select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'edicoes' loop
    execute format('revoke update (%I) on public.edicoes from authenticated, anon', coluna);
  end loop;
end $$;

create function public.definir_regulamento_publico(p_id uuid, p_publico boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.edicoes;
begin
  perform app.exigir_coordenacao_de(p_id);
  select * into e from public.edicoes where id = p_id for update;
  if not found then raise exception 'Edição não encontrada.' using errcode = '23514'; end if;
  if p_publico is null then raise exception 'Informe se o regulamento deve ser público.' using errcode = '23514'; end if;
  if e.estado <> 'ativa' then
    raise exception 'Só edições ativas podem ter o regulamento público.' using errcode = '23514';
  end if;
  if e.regulamento_publico is distinct from p_publico then
    update public.edicoes set regulamento_publico = p_publico where id = p_id;
  end if;
  return jsonb_build_object('regulamentoPublico', p_publico);
end;
$$;
revoke all on function public.definir_regulamento_publico(uuid,boolean) from public, anon;
grant execute on function public.definir_regulamento_publico(uuid,boolean) to authenticated;

create or replace function public.edicoes_que_coordeno()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',e.id,'nome',e.nome,'inicio',e.inicio,'fim',e.fim,'estado',e.estado,
    'regrasVersao',e.regras_versao,'encerradaEm',e.encerrada_em,
    'justificativaEncerramento',e.justificativa_encerramento,
    'pendenciasNoEncerramento',e.pendencias_no_encerramento,
    'regulamentoPublico',e.regulamento_publico)
    order by case e.estado when 'ativa' then 0 when 'rascunho' then 1 else 2 end,
      e.inicio desc nulls last,e.criado_em desc), '[]'::jsonb)
  from public.edicoes e where app.e_coordenacao(e.id);
$$;
