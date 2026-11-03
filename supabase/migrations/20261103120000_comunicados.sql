-- Spec 009 — comunicados e regulamento (RF06).
-- Comunicados por público (perfil e, opcionalmente, turmas), publicados pela coordenação ou por
-- docentes e mentores nas turmas em que atuam. Escrita só por RPC; leitura pela RLS e pelas RPCs.
-- Avisos de publicação e de correção na tabela avisos (spec 007); o selo "Novo" deriva deles.

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------
create table public.comunicados (
  id uuid primary key default gen_random_uuid(),
  edicao_id uuid not null references public.edicoes (id) on delete cascade,
  autor_id uuid not null references public.perfis (id),
  autor_papel text not null check (autor_papel in ('coordenacao', 'docente', 'mentor')),
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  texto text not null check (char_length(btrim(texto)) between 1 and 5000),
  publico text not null check (publico in ('todos', 'estudantes', 'equipe_docente')),
  estado text not null default 'rascunho' check (estado in ('rascunho', 'publicado', 'retirado')),
  versao int not null default 1 check (versao >= 1),
  chave_envio uuid not null unique,
  criado_em timestamptz not null default now(),
  publicado_em timestamptz,
  corrigido_em timestamptz,
  retirado_em timestamptz,
  justificativa_retirada text,
  constraint comunicados_publicado_tem_data check (estado = 'rascunho' or publicado_em is not null),
  constraint comunicados_retirado_completo check (
    estado <> 'retirado' or (retirado_em is not null and justificativa_retirada is not null))
);
comment on table public.comunicados is 'Comunicados da edição por público (spec 009). Escrita só por RPC.';
create index comunicados_edicao_idx on public.comunicados (edicao_id, estado, publicado_em desc);
create index comunicados_autor_idx on public.comunicados (autor_id);

create table public.comunicado_turmas (
  comunicado_id uuid not null references public.comunicados (id) on delete cascade,
  turma_id uuid not null references public.turmas (id),
  primary key (comunicado_id, turma_id)
);
create index comunicado_turmas_turma_idx on public.comunicado_turmas (turma_id);

create trigger auditoria_comunicados after insert or update or delete on public.comunicados
  for each row execute function app.registrar_auditoria();
create trigger auditoria_comunicado_turmas after insert or update or delete on public.comunicado_turmas
  for each row execute function app.registrar_auditoria();

-- A auditoria usa a coluna id; comunicado_turmas não tem id próprio, então o registro guarda o
-- comunicado como identificador.
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
    coalesce(v_depois ->> 'id', v_antes ->> 'id', v_depois ->> 'comunicado_id', v_antes ->> 'comunicado_id'),
    v_antes,
    v_depois,
    nullif(current_setting('app.justificativa', true), ''),
    nullif(current_setting('app.pedido_revisao', true), '')::uuid
  );
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- Avisos: tipos de comunicado (R4)
-- ---------------------------------------------------------------------------
alter table public.avisos drop constraint avisos_tipo_check;
alter table public.avisos add constraint avisos_tipo_check check (tipo in (
  'ocorrencia_registrada', 'ocorrencia_decidida', 'ranking_publicado', 'revisao_pedida',
  'revisao_respondida', 'comunicado_publicado', 'comunicado_atualizado'));

-- ---------------------------------------------------------------------------
-- Público (R3, R4)
-- ---------------------------------------------------------------------------
-- Papéis que o público alcança: estudantes, equipe docente ou os três (apoio e analista ficam fora).
create function app.papeis_do_publico(p_publico text)
returns public.papel[] language sql immutable set search_path = '' as $$
  select case p_publico
    when 'estudantes' then array['aluno']::public.papel[]
    when 'equipe_docente' then array['docente', 'mentor']::public.papel[]
    else array['aluno', 'docente', 'mentor']::public.papel[]
  end;
$$;

-- Atribuições ativas que o comunicado alcança (sem olhar o estado).
create function app.alcanca_comunicado(p_id uuid, p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.comunicados c
    join public.atribuicoes a on a.edicao_id = c.edicao_id and a.ativo
    where c.id = p_id and a.usuario_id = p_usuario
      and a.papel = any (app.papeis_do_publico(c.publico))
      and (not exists (select 1 from public.comunicado_turmas ct where ct.comunicado_id = c.id)
           or a.turma_id in (select ct.turma_id from public.comunicado_turmas ct where ct.comunicado_id = c.id))
  );
$$;

create function app.pode_ler_comunicado(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.comunicados c where c.id = p_id and c.estado = 'publicado')
    and app.alcanca_comunicado(p_id, (select auth.uid()));
$$;

create function app.destinatarios_do_comunicado(p_id uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct a.usuario_id), '{}')
  from public.comunicados c
  join public.atribuicoes a on a.edicao_id = c.edicao_id and a.ativo
  where c.id = p_id and c.estado = 'publicado' and a.usuario_id <> c.autor_id
    and a.papel = any (app.papeis_do_publico(c.publico))
    and (not exists (select 1 from public.comunicado_turmas ct where ct.comunicado_id = c.id)
         or a.turma_id in (select ct.turma_id from public.comunicado_turmas ct where ct.comunicado_id = c.id));
$$;

create function app.exigir_edicao_aberta_para_comunicados(p_edicao uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.edicoes where id = p_edicao and estado = 'encerrada') then
    raise exception 'A edição está encerrada; os comunicados só podem ser lidos.' using errcode = '23514';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: leitura pela coordenação, pelo autor ou pelo público; escrita só por RPC
-- ---------------------------------------------------------------------------
alter table public.comunicados enable row level security;
alter table public.comunicado_turmas enable row level security;

create policy comunicados_ler on public.comunicados for select to authenticated
  using (app.e_coordenacao(edicao_id) or autor_id = (select auth.uid()) or app.pode_ler_comunicado(id));
create policy comunicado_turmas_ler on public.comunicado_turmas for select to authenticated
  using (exists (select 1 from public.comunicados c where c.id = comunicado_id));

revoke insert, update, delete, truncate on public.comunicados, public.comunicado_turmas from authenticated, anon;
revoke select on public.comunicados, public.comunicado_turmas from anon;

revoke execute on function app.papeis_do_publico(text), app.alcanca_comunicado(uuid, uuid),
  app.pode_ler_comunicado(uuid), app.destinatarios_do_comunicado(uuid),
  app.exigir_edicao_aberta_para_comunicados(uuid) from public, anon;
grant execute on function app.pode_ler_comunicado(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Autoria e gestão (R2)
-- ---------------------------------------------------------------------------
-- Confere quem pode escrever para o público e devolve o papel exibido do autor:
-- coordenação para qualquer público; docente ou mentor só com turmas em que atua.
create function app.exigir_autoria_comunicado(p_edicao uuid, p_turmas uuid[])
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_turmas uuid[] := coalesce(p_turmas, '{}');
begin
  if exists (select 1 from unnest(v_turmas) t where app.edicao_da_turma(t) is distinct from p_edicao) then
    raise exception 'A turma escolhida não pertence a esta edição.' using errcode = '42501';
  end if;
  if app.e_coordenacao(p_edicao) then
    return 'coordenacao';
  end if;
  if not app.tem_papel(p_edicao, array['docente', 'mentor']::public.papel[]) then
    raise exception 'Somente a coordenação, docentes e mentores escrevem comunicados.' using errcode = '42501';
  end if;
  if cardinality(v_turmas) = 0
     or exists (select 1 from unnest(v_turmas) t where not app.atua_na_turma(t)) then
    raise exception 'Docentes e mentores publicam só para as turmas em que atuam; escolha pelo menos uma.'
      using errcode = '42501';
  end if;
  return case
    when (select bool_and(exists (select 1 from public.atribuicoes a
                                  where a.usuario_id = (select auth.uid()) and a.turma_id = t
                                    and a.papel = 'docente' and a.ativo))
          from unnest(v_turmas) t) then 'docente'
    else 'mentor'
  end;
end;
$$;

-- O autor (ainda atuando em todas as turmas do comunicado) ou a coordenação podem alterá-lo.
create function app.pode_gerir_comunicado(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.comunicados c
    where c.id = p_id
      and (app.e_coordenacao(c.edicao_id)
           or (c.autor_id = (select auth.uid())
               and exists (select 1 from public.comunicado_turmas ct where ct.comunicado_id = c.id)
               and not exists (select 1 from public.comunicado_turmas ct
                               where ct.comunicado_id = c.id and not app.atua_na_turma(ct.turma_id))))
  );
$$;

-- Trava a linha e confere a gestão; devolve o comunicado.
create function app.exigir_gestor_do_comunicado(p_id uuid)
returns public.comunicados language plpgsql security definer set search_path = '' as $$
declare v public.comunicados%rowtype;
begin
  select * into v from public.comunicados where id = p_id for update;
  if not found then
    raise exception 'Comunicado não encontrado.' using errcode = 'P0002';
  end if;
  if not app.pode_gerir_comunicado(p_id) then
    raise exception 'Somente o autor ou a coordenação podem alterar este comunicado.' using errcode = '42501';
  end if;
  return v;
end;
$$;

create function app.turmas_do_comunicado_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome) order by t.nome), '[]'::jsonb)
  from public.comunicado_turmas ct join public.turmas t on t.id = ct.turma_id
  where ct.comunicado_id = p_id;
$$;

-- Campos comuns às duas listas; o autor só como nome e papel (FR-017).
create function app.comunicado_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'titulo', c.titulo, 'texto', c.texto, 'publico', c.publico,
    'turmas', app.turmas_do_comunicado_json(c.id),
    'autor', jsonb_build_object('nome', p.nome, 'papel', c.autor_papel),
    'publicadoEm', c.publicado_em, 'corrigidoEm', c.corrigido_em)
  from public.comunicados c join public.perfis p on p.id = c.autor_id
  where c.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- Escrita (contracts/rpc.md)
-- ---------------------------------------------------------------------------
create function public.salvar_comunicado(p_chave uuid, p_id uuid, p_edicao uuid, p_titulo text, p_texto text,
                                         p_publico text, p_turmas uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v public.comunicados%rowtype;
  v_papel text;
  v_turmas uuid[] := array(select distinct t from unnest(coalesce(p_turmas, '{}')) t);
  v_id uuid := p_id;
begin
  if v_id is null then
    select * into v from public.comunicados where chave_envio = p_chave;
    if found then
      if v.autor_id is distinct from (select auth.uid()) then
        raise exception 'Chave de envio já usada por outra pessoa.' using errcode = '42501';
      end if;
      return v.id;
    end if;
    v_papel := app.exigir_autoria_comunicado(p_edicao, v_turmas);
    perform app.exigir_edicao_aberta_para_comunicados(p_edicao);
    insert into public.comunicados (edicao_id, autor_id, autor_papel, titulo, texto, publico, chave_envio)
    values (p_edicao, (select auth.uid()), v_papel, btrim(p_titulo), btrim(p_texto), p_publico, p_chave)
    returning id into v_id;
  else
    v := app.exigir_gestor_do_comunicado(v_id);
    if v.edicao_id is distinct from p_edicao then
      raise exception 'O comunicado não pertence a esta edição.' using errcode = '23514';
    end if;
    if v.estado <> 'rascunho' then
      raise exception 'Só rascunhos podem ser editados; corrija ou retire o comunicado publicado.'
        using errcode = '23514';
    end if;
    perform app.exigir_autoria_comunicado(p_edicao, v_turmas);
    perform app.exigir_edicao_aberta_para_comunicados(p_edicao);
    update public.comunicados set titulo = btrim(p_titulo), texto = btrim(p_texto), publico = p_publico
    where id = v_id;
    delete from public.comunicado_turmas where comunicado_id = v_id and turma_id <> all (v_turmas);
  end if;
  insert into public.comunicado_turmas (comunicado_id, turma_id)
  select v_id, t from unnest(v_turmas) t on conflict do nothing;
  return v_id;
end;
$$;

create function public.apagar_rascunho(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.comunicados%rowtype := app.exigir_gestor_do_comunicado(p_id);
begin
  perform app.exigir_edicao_aberta_para_comunicados(v.edicao_id);
  if v.estado <> 'rascunho' then
    raise exception 'Comunicado publicado não pode ser apagado; retire-o com justificativa.' using errcode = '23514';
  end if;
  delete from public.comunicados where id = p_id;
end;
$$;

create function public.publicar_comunicado(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.comunicados%rowtype := app.exigir_gestor_do_comunicado(p_id);
  n int;
begin
  perform app.exigir_edicao_aberta_para_comunicados(v.edicao_id);
  if v.estado = 'retirado' then
    raise exception 'O comunicado foi retirado; publique um comunicado novo.' using errcode = '23514';
  elsif v.estado = 'publicado' then
    return jsonb_build_object('publicadoEm', v.publicado_em, 'avisos', 0);
  end if;
  update public.comunicados set estado = 'publicado', publicado_em = now() where id = p_id
  returning * into v;
  n := app.avisar(app.destinatarios_do_comunicado(p_id), 'comunicado_publicado', v.titulo,
                  jsonb_build_object('comunicadoId', p_id));
  return jsonb_build_object('publicadoEm', v.publicado_em, 'avisos', n);
end;
$$;

-- ---------------------------------------------------------------------------
-- Leitura da gestão
-- ---------------------------------------------------------------------------
create function public.comunicados_que_gerencio(p_edicao uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_coordenacao boolean := app.e_coordenacao(p_edicao);
  v_encerrada boolean := exists (select 1 from public.edicoes where id = p_edicao and estado = 'encerrada');
begin
  if not v_coordenacao and not app.tem_papel(p_edicao, array['docente', 'mentor']::public.papel[]) then
    raise exception 'Somente a coordenação, docentes e mentores gerenciam comunicados.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(app.comunicado_json(c.id) || jsonb_build_object(
             'estado', c.estado, 'versao', c.versao, 'retiradoEm', c.retirado_em,
             'justificativaRetirada', c.justificativa_retirada,
             'podeEditar', not v_encerrada and c.estado <> 'retirado' and app.pode_gerir_comunicado(c.id))
           order by coalesce(c.publicado_em, c.criado_em) desc, c.id)
    from public.comunicados c
    where c.edicao_id = p_edicao and (v_coordenacao or c.autor_id = (select auth.uid()))), '[]'::jsonb);
end;
$$;

revoke all on function app.exigir_autoria_comunicado(uuid, uuid[]), app.pode_gerir_comunicado(uuid),
  app.exigir_gestor_do_comunicado(uuid), app.turmas_do_comunicado_json(uuid), app.comunicado_json(uuid)
  from public, anon;
revoke all on function public.salvar_comunicado(uuid, uuid, uuid, text, text, text, uuid[]),
  public.apagar_rascunho(uuid), public.publicar_comunicado(uuid), public.comunicados_que_gerencio(uuid)
  from public, anon;
grant execute on function public.salvar_comunicado(uuid, uuid, uuid, text, text, text, uuid[]),
  public.apagar_rascunho(uuid), public.publicar_comunicado(uuid), public.comunicados_que_gerencio(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Leitura do público (US2)
-- ---------------------------------------------------------------------------
-- Publicados legíveis pela pessoa, do mais recente ao mais antigo. "Novo" = há aviso de
-- comunicado não lido para ela (R4); quem entrou depois da publicação não tem aviso.
create function public.comunicados_para_mim(p_edicao uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(app.comunicado_json(c.id) || jsonb_build_object('novo', exists (
             select 1 from public.avisos a
             where a.destinatario_id = (select auth.uid()) and a.lido_em is null
               and a.tipo in ('comunicado_publicado', 'comunicado_atualizado')
               and a.referencia ->> 'comunicadoId' = c.id::text))
           order by c.publicado_em desc, c.id), '[]'::jsonb)
  from public.comunicados c
  where c.edicao_id = p_edicao and app.pode_ler_comunicado(c.id);
$$;

create function public.marcar_comunicado_lido(p_id uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.avisos set lido_em = now()
  where destinatario_id = (select auth.uid()) and lido_em is null
    and tipo in ('comunicado_publicado', 'comunicado_atualizado')
    and referencia ->> 'comunicadoId' = p_id::text;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.comunicados_para_mim(uuid), public.marcar_comunicado_lido(uuid) from public, anon;
grant execute on function public.comunicados_para_mim(uuid), public.marcar_comunicado_lido(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Correção e retirada (US3)
-- ---------------------------------------------------------------------------
-- Corrige título e texto de um publicado, com justificativa auditada; o público não muda.
-- Repetir os mesmos valores não grava nada; cada correção avisa o público de novo.
create function public.corrigir_comunicado(p_id uuid, p_titulo text, p_texto text, p_justificativa text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.comunicados%rowtype := app.exigir_gestor_do_comunicado(p_id);
  n int;
begin
  perform app.exigir_edicao_aberta_para_comunicados(v.edicao_id);
  if v.estado <> 'publicado' then
    raise exception 'Só comunicados publicados podem ser corrigidos.' using errcode = '23514';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  if v.titulo = btrim(p_titulo) and v.texto = btrim(p_texto) then
    return jsonb_build_object('versao', v.versao, 'corrigidoEm', v.corrigido_em, 'avisos', 0);
  end if;
  update public.comunicados
  set titulo = btrim(p_titulo), texto = btrim(p_texto), versao = versao + 1, corrigido_em = now()
  where id = p_id
  returning * into v;
  n := app.avisar(app.destinatarios_do_comunicado(p_id), 'comunicado_atualizado', v.titulo,
                  jsonb_build_object('comunicadoId', p_id));
  return jsonb_build_object('versao', v.versao, 'corrigidoEm', v.corrigido_em, 'avisos', n);
end;
$$;

create function public.retirar_comunicado(p_id uuid, p_justificativa text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.comunicados%rowtype := app.exigir_gestor_do_comunicado(p_id);
begin
  perform app.exigir_edicao_aberta_para_comunicados(v.edicao_id);
  if v.estado = 'retirado' then
    return;
  elsif v.estado = 'rascunho' then
    raise exception 'Rascunho não é retirado; apague-o.' using errcode = '23514';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  update public.comunicados
  set estado = 'retirado', retirado_em = now(), justificativa_retirada = btrim(p_justificativa)
  where id = p_id;
  -- O retirado some para o público: os avisos pendentes dele deixam de contar como não lidos.
  update public.avisos set lido_em = now()
  where lido_em is null and tipo in ('comunicado_publicado', 'comunicado_atualizado')
    and referencia ->> 'comunicadoId' = p_id::text;
end;
$$;

revoke all on function public.corrigir_comunicado(uuid, text, text, text), public.retirar_comunicado(uuid, text)
  from public, anon;
grant execute on function public.corrigir_comunicado(uuid, text, text, text), public.retirar_comunicado(uuid, text)
  to authenticated;
