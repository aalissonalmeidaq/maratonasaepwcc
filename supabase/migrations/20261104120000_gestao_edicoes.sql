-- Spec 010 — gestão de edições, turmas e vínculos.
-- Cadastro permanente de cursos e turmas; as tabelas `cursos` e `turmas` passam a representar o
-- curso e a turma NA EDIÇÃO (participação de um item do cadastro numa edição) e continuam sendo o
-- alvo de todas as chaves estrangeiras existentes. Edições por RPC, mentor por curso com vínculos
-- derivados, bloqueio de escrita em edição encerrada e coordenação mínima.

-- ===========================================================================
-- Fundação (T004)
-- ===========================================================================

-- Quem coordena alguma edição (de qualquer estado) cria edições e mantém o cadastro (R2).
create function app.coordena_alguma_edicao()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.atribuicoes a
    where a.usuario_id = (select auth.uid()) and a.papel = 'coordenacao' and a.ativo
  );
$$;
revoke execute on function app.coordena_alguma_edicao() from public, anon;
grant execute on function app.coordena_alguma_edicao() to authenticated;

create table public.cadastro_cursos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 160),
  categoria text not null check (char_length(btrim(categoria)) between 1 and 120),
  criado_em timestamptz not null default now()
);
comment on table public.cadastro_cursos is 'Cadastro permanente de cursos da unidade (spec 010).';
create unique index cadastro_cursos_nome_unico on public.cadastro_cursos (lower(btrim(nome)));

create table public.cadastro_turmas (
  id uuid primary key default gen_random_uuid(),
  cadastro_curso_id uuid not null references public.cadastro_cursos (id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  ano_letivo integer check (ano_letivo between 2000 and 2100),
  criado_em timestamptz not null default now()
);
comment on table public.cadastro_turmas is 'Cadastro permanente de turmas da unidade (spec 010).';
create unique index cadastro_turmas_nome_unico on public.cadastro_turmas (cadastro_curso_id, lower(btrim(nome)));

create trigger auditoria_cadastro_cursos after insert or update or delete on public.cadastro_cursos
  for each row execute function app.registrar_auditoria();
create trigger auditoria_cadastro_turmas after insert or update or delete on public.cadastro_turmas
  for each row execute function app.registrar_auditoria();

alter table public.cadastro_cursos enable row level security;
alter table public.cadastro_turmas enable row level security;
create policy cadastro_cursos_ler on public.cadastro_cursos for select to authenticated
  using (app.coordena_alguma_edicao());
create policy cadastro_turmas_ler on public.cadastro_turmas for select to authenticated
  using (app.coordena_alguma_edicao());
revoke insert, update, delete, truncate on public.cadastro_cursos, public.cadastro_turmas from authenticated, anon;
revoke select on public.cadastro_cursos, public.cadastro_turmas from anon;

-- Curso e turma na edição ligados ao cadastro.
alter table public.cursos add column cadastro_curso_id uuid references public.cadastro_cursos (id) on delete restrict;
alter table public.turmas add column cadastro_turma_id uuid references public.cadastro_turmas (id) on delete restrict;

-- Migração dos dados existentes (R12): um item por nome de curso e por nome de turma no curso.
insert into public.cadastro_cursos (nome, categoria)
select distinct on (lower(btrim(nome))) btrim(nome), btrim(categoria)
from public.cursos
order by lower(btrim(nome)), criado_em desc;
update public.cursos c set cadastro_curso_id = k.id
from public.cadastro_cursos k where lower(btrim(k.nome)) = lower(btrim(c.nome));

insert into public.cadastro_turmas (cadastro_curso_id, nome, ano_letivo)
select distinct on (c.cadastro_curso_id, lower(btrim(t.nome))) c.cadastro_curso_id, btrim(t.nome), t.ano_letivo
from public.turmas t join public.cursos c on c.id = t.curso_id
order by c.cadastro_curso_id, lower(btrim(t.nome)), t.criado_em desc;
update public.turmas t set cadastro_turma_id = k.id
from public.cursos c, public.cadastro_turmas k
where c.id = t.curso_id and k.cadastro_curso_id = c.cadastro_curso_id and lower(btrim(k.nome)) = lower(btrim(t.nome));

alter table public.cursos alter column cadastro_curso_id set not null;
alter table public.turmas alter column cadastro_turma_id set not null;
alter table public.cursos add constraint cursos_cadastro_por_edicao unique (edicao_id, cadastro_curso_id);
alter table public.turmas add constraint turmas_cadastro_por_curso unique (curso_id, cadastro_turma_id);
create index cursos_cadastro_idx on public.cursos (cadastro_curso_id);
create index turmas_cadastro_idx on public.turmas (cadastro_turma_id);

-- Compatibilidade: curso ou turma inserido sem id de cadastro (seed, fixtures, scripts) é ligado ao
-- item de mesmo nome do cadastro, que é criado quando falta.
create function app.ligar_ao_cadastro()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_curso_cadastro uuid;
begin
  if tg_table_name = 'cursos' then
    if new.cadastro_curso_id is null then
      select id into new.cadastro_curso_id from public.cadastro_cursos
      where lower(btrim(nome)) = lower(btrim(new.nome));
      if new.cadastro_curso_id is null then
        insert into public.cadastro_cursos (nome, categoria) values (btrim(new.nome), btrim(new.categoria))
        returning id into new.cadastro_curso_id;
      end if;
    end if;
  else
    if new.cadastro_turma_id is null then
      select cadastro_curso_id into v_curso_cadastro from public.cursos where id = new.curso_id;
      select id into new.cadastro_turma_id from public.cadastro_turmas
      where cadastro_curso_id = v_curso_cadastro and lower(btrim(nome)) = lower(btrim(new.nome));
      if new.cadastro_turma_id is null then
        insert into public.cadastro_turmas (cadastro_curso_id, nome, ano_letivo)
        values (v_curso_cadastro, btrim(new.nome), new.ano_letivo)
        returning id into new.cadastro_turma_id;
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger ligar_curso_ao_cadastro before insert on public.cursos
  for each row execute function app.ligar_ao_cadastro();
create trigger ligar_turma_ao_cadastro before insert on public.turmas
  for each row execute function app.ligar_ao_cadastro();

-- Edições: idempotência da criação e ciclo de vida. A justificativa do encerramento é exigida pela
-- RPC `encerrar_edicao`; as encerradas antes desta spec recebem um texto padrão.
alter table public.edicoes
  add column chave_envio uuid unique,
  add column ativada_em timestamptz,
  add column encerrada_em timestamptz,
  add column justificativa_encerramento text
    check (justificativa_encerramento is null or char_length(btrim(justificativa_encerramento)) between 10 and 2000),
  add column pendencias_no_encerramento jsonb;
update public.edicoes set encerrada_em = criado_em, justificativa_encerramento = 'Encerrada antes da spec 010.'
where estado = 'encerrada';
update public.edicoes set ativada_em = criado_em where estado = 'ativa';

-- Atribuições: vínculo de mentor ao curso e linhas derivadas por turma (R6).
alter table public.atribuicoes
  add column curso_id uuid references public.cursos (id) on delete restrict,
  add column origem_id uuid references public.atribuicoes (id) on delete cascade;
alter table public.atribuicoes drop constraint atribuicoes_unica;
alter table public.atribuicoes add constraint atribuicoes_unica
  unique nulls not distinct (usuario_id, edicao_id, papel, turma_id, curso_id);
create index atribuicoes_curso_idx on public.atribuicoes (curso_id) where curso_id is not null;
create index atribuicoes_origem_idx on public.atribuicoes (origem_id) where origem_id is not null;

-- ===========================================================================
-- US1 — criar a edição (T008)
-- ===========================================================================

-- Cópia de REGRAS_PILOTO (src/modules/pontuacao/domain/regras-piloto.ts), a mesma do seed; a
-- paridade é conferida no pgTAP e em scripts/testar-paridade-calculo.mjs.
create function app.regras_piloto()
returns jsonb language sql immutable set search_path = '' as $$
  select '{"versao":"piloto-2026.0-a-confirmar","quantidadeEncontros":4,"casasDecimais":2,"presenca":{"pontosPorIntegrante":5,"maximoPorDupla":10},"participacao":{"criterios":[{"id":"envolvimento","rotulo":"Envolvimento nas atividades","maximo":4},{"id":"colaboracao","rotulo":"Colaboração","maximo":3},{"id":"organizacao","rotulo":"Organização e cumprimento das orientações","maximo":3}]},"questoes":{"maximo":30},"entrega":{"criterios":[{"id":"compreensao","rotulo":"Compreensão do problema","maximo":10},{"id":"aplicacao","rotulo":"Aplicação de conhecimentos técnicos","maximo":10},{"id":"qualidade","rotulo":"Qualidade e adequação da solução","maximo":10},{"id":"organizacao","rotulo":"Organização e entrega","maximo":10}],"criterioDeAtraso":"organizacao","faixasDeAtraso":[{"ateMinutos":15,"desconto":2},{"ateMinutos":30,"desconto":5}],"limiteAtrasoMinutos":30},"apresentacao":{"criterios":[{"id":"clareza","rotulo":"Clareza","maximo":3},{"id":"explicacao","rotulo":"Explicação das decisões e etapas","maximo":4},{"id":"respostas","rotulo":"Respostas às perguntas","maximo":3}]},"provaOficial":{"pontosRealizacao":5,"notaMinimaBonus":70,"pontosBonus":10,"maximoPorDupla":30},"penalidades":{"tetoDescontosPorEncontro":10,"tipos":[{"id":"reincidencia","rotulo":"Reincidência após orientação registrada","pontos":2},{"id":"desrespeito","rotulo":"Desrespeito com responsabilidade da equipe","pontos":5},{"id":"uso_nao_autorizado","rotulo":"Uso não autorizado","pontos":5},{"id":"plagio","rotulo":"Plágio comprovado","zeraEntrega":true}]},"prazos":{"manifestacaoHoras":24,"revisaoHoras":24}}'::jsonb;
$$;

-- Coordenação da edição ou recusa com a mensagem dada.
create function app.exigir_coordenacao_de(p_edicao uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.edicoes where id = p_edicao) then
    raise exception 'Edição não encontrada.' using errcode = 'P0002';
  end if;
  if not app.e_coordenacao(p_edicao) then
    raise exception 'Somente a coordenação desta edição pode fazer isso.' using errcode = '42501';
  end if;
end;
$$;

create function app.validar_dados_da_edicao(p_nome text, p_inicio date, p_fim date)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if char_length(btrim(coalesce(p_nome, ''))) not between 3 and 160 then
    raise exception 'Informe um nome de 3 a 160 caracteres.' using errcode = '23514';
  end if;
  if p_inicio is not null and p_fim is not null and p_fim < p_inicio then
    raise exception 'O fim não pode ser antes do início.' using errcode = '23514';
  end if;
end;
$$;

create function public.criar_edicao(p_chave uuid, p_nome text, p_inicio date, p_fim date, p_base_edicao uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_regras jsonb;
  v_versao text;
begin
  if not app.coordena_alguma_edicao() then
    raise exception 'Somente quem coordena uma edição pode criar outra.' using errcode = '42501';
  end if;
  select id into v_id from public.edicoes where chave_envio = p_chave;
  if found then
    return v_id;
  end if;
  perform app.validar_dados_da_edicao(p_nome, p_inicio, p_fim);
  if p_base_edicao is null then
    v_regras := app.regras_piloto();
    v_versao := v_regras ->> 'versao';
  else
    if not app.e_coordenacao(p_base_edicao) then
      raise exception 'Só é possível copiar as regras de uma edição que você coordena.' using errcode = '42501';
    end if;
    select regras, regras_versao into v_regras, v_versao from public.edicoes where id = p_base_edicao;
  end if;
  -- Reenvio simultâneo com a mesma chave: o segundo espera o primeiro e devolve a mesma edição.
  insert into public.edicoes (nome, inicio, fim, estado, regras, regras_versao, chave_envio)
  values (btrim(p_nome), p_inicio, p_fim, 'rascunho', v_regras, v_versao, p_chave)
  on conflict (chave_envio) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.edicoes where chave_envio = p_chave;
    return v_id;
  end if;
  insert into public.atribuicoes (usuario_id, edicao_id, papel, concedido_por)
  values ((select auth.uid()), v_id, 'coordenacao', (select auth.uid()));
  return v_id;
end;
$$;

create function public.alterar_edicao(p_id uuid, p_nome text, p_inicio date, p_fim date)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.edicoes%rowtype;
begin
  perform app.exigir_coordenacao_de(p_id);
  select * into v from public.edicoes where id = p_id for update;
  if v.estado = 'encerrada' then
    raise exception 'A edição está encerrada; os dados só podem ser lidos.' using errcode = '23514';
  end if;
  perform app.validar_dados_da_edicao(p_nome, p_inicio, p_fim);
  if v.estado = 'ativa' and (p_inicio is null or p_fim is null) then
    raise exception 'Edição ativa precisa de início e fim.' using errcode = '23514';
  end if;
  if v.nome = btrim(p_nome) and v.inicio is not distinct from p_inicio and v.fim is not distinct from p_fim then
    return;
  end if;
  update public.edicoes set nome = btrim(p_nome), inicio = p_inicio, fim = p_fim where id = p_id;
end;
$$;

-- Só rascunho sem turmas vinculadas nem atribuições além das de coordenação (FR-016).
create function public.apagar_edicao(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.edicoes%rowtype;
begin
  perform app.exigir_coordenacao_de(p_id);
  select * into v from public.edicoes where id = p_id for update;
  if v.estado <> 'rascunho'
     or exists (select 1 from public.cursos where edicao_id = p_id)
     or exists (select 1 from public.atribuicoes where edicao_id = p_id and papel <> 'coordenacao') then
    raise exception 'Só uma edição em preparação, sem turmas vinculadas nem pessoas, pode ser apagada.'
      using errcode = '23514';
  end if;
  perform set_config('app.sincronizando_mentores', 'on', true);
  delete from public.atribuicoes where edicao_id = p_id;
  delete from public.edicoes where id = p_id;
  perform set_config('app.sincronizando_mentores', '', true);
end;
$$;

create function public.edicoes_que_coordeno()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'nome', e.nome, 'inicio', e.inicio, 'fim', e.fim, 'estado', e.estado,
           'regrasVersao', e.regras_versao, 'encerradaEm', e.encerrada_em,
           'justificativaEncerramento', e.justificativa_encerramento)
         order by case e.estado when 'ativa' then 0 when 'rascunho' then 1 else 2 end,
                  e.inicio desc nulls last, e.criado_em desc), '[]'::jsonb)
  from public.edicoes e
  where app.e_coordenacao(e.id);
$$;

-- Escrita de edições só por RPC (R1).
drop policy edicoes_atualizar on public.edicoes;
revoke insert, update, delete, truncate on public.edicoes from authenticated, anon;

revoke all on function app.regras_piloto(), app.exigir_coordenacao_de(uuid),
  app.validar_dados_da_edicao(text, date, date) from public, anon;
revoke all on function public.criar_edicao(uuid, text, date, date, uuid), public.alterar_edicao(uuid, text, date, date),
  public.apagar_edicao(uuid), public.edicoes_que_coordeno() from public, anon;
grant execute on function public.criar_edicao(uuid, text, date, date, uuid), public.alterar_edicao(uuid, text, date, date),
  public.apagar_edicao(uuid), public.edicoes_que_coordeno() to authenticated;

-- ===========================================================================
-- US2 — cadastro permanente e vínculo das turmas (T013)
-- ===========================================================================

create function app.exigir_quem_coordena()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not app.coordena_alguma_edicao() then
    raise exception 'Somente a coordenação mantém o cadastro de cursos e turmas.' using errcode = '42501';
  end if;
end;
$$;

create function app.exigir_edicao_nao_encerrada(p_edicao uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if exists (select 1 from public.edicoes where id = p_edicao and estado = 'encerrada') then
    raise exception 'A edição está encerrada; os dados só podem ser lidos.' using errcode = '23514';
  end if;
end;
$$;

create function public.cadastro()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_quem_coordena();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', k.id, 'nome', k.nome, 'categoria', k.categoria,
             'turmas', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', kt.id, 'nome', kt.nome, 'anoLetivo', kt.ano_letivo,
                        'edicoes', coalesce((
                          select jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'estado', e.estado)
                                           order by e.inicio desc nulls last, e.criado_em desc)
                          from public.turmas t join public.cursos c on c.id = t.curso_id
                          join public.edicoes e on e.id = c.edicao_id
                          where t.cadastro_turma_id = kt.id), '[]'::jsonb))
                      order by kt.nome)
               from public.cadastro_turmas kt where kt.cadastro_curso_id = k.id), '[]'::jsonb))
           order by k.nome)
    from public.cadastro_cursos k), '[]'::jsonb);
end;
$$;

create function public.salvar_curso_do_cadastro(p_id uuid, p_nome text, p_categoria text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id;
begin
  perform app.exigir_quem_coordena();
  if exists (select 1 from public.cadastro_cursos
             where lower(btrim(nome)) = lower(btrim(p_nome)) and id is distinct from p_id) then
    raise exception 'Já existe um curso com esse nome no cadastro.' using errcode = '23514';
  end if;
  if v_id is null then
    insert into public.cadastro_cursos (nome, categoria) values (btrim(p_nome), btrim(p_categoria))
    returning id into v_id;
  else
    update public.cadastro_cursos set nome = btrim(p_nome), categoria = btrim(p_categoria)
    where id = v_id and (nome <> btrim(p_nome) or categoria <> btrim(p_categoria));
    if not exists (select 1 from public.cadastro_cursos where id = v_id) then
      raise exception 'Curso não encontrado no cadastro.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create function public.salvar_turma_do_cadastro(p_id uuid, p_curso uuid, p_nome text, p_ano_letivo int)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id;
begin
  perform app.exigir_quem_coordena();
  if not exists (select 1 from public.cadastro_cursos where id = p_curso) then
    raise exception 'Curso não encontrado no cadastro.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.cadastro_turmas
             where cadastro_curso_id = p_curso and lower(btrim(nome)) = lower(btrim(p_nome))
               and id is distinct from p_id) then
    raise exception 'Já existe uma turma com esse nome neste curso.' using errcode = '23514';
  end if;
  if v_id is null then
    insert into public.cadastro_turmas (cadastro_curso_id, nome, ano_letivo)
    values (p_curso, btrim(p_nome), p_ano_letivo)
    returning id into v_id;
  else
    update public.cadastro_turmas set nome = btrim(p_nome), ano_letivo = p_ano_letivo
    where id = v_id and cadastro_curso_id = p_curso
      and (nome <> btrim(p_nome) or ano_letivo is distinct from p_ano_letivo);
    if not exists (select 1 from public.cadastro_turmas where id = v_id and cadastro_curso_id = p_curso) then
      raise exception 'Turma não encontrada no cadastro.' using errcode = 'P0002';
    end if;
  end if;
  return v_id;
end;
$$;

create function public.apagar_do_cadastro(p_tipo text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.exigir_quem_coordena();
  if p_tipo = 'curso' then
    if exists (select 1 from public.cadastro_turmas where cadastro_curso_id = p_id) then
      raise exception 'Apague antes as turmas deste curso.' using errcode = '23514';
    end if;
    if exists (select 1 from public.cursos where cadastro_curso_id = p_id) then
      raise exception 'Este curso participa ou participou de uma edição e não pode ser apagado.' using errcode = '23514';
    end if;
    delete from public.cadastro_cursos where id = p_id;
  elsif p_tipo = 'turma' then
    if exists (select 1 from public.turmas where cadastro_turma_id = p_id) then
      raise exception 'Esta turma participa ou participou de uma edição e não pode ser apagada.' using errcode = '23514';
    end if;
    delete from public.cadastro_turmas where id = p_id;
  else
    raise exception 'Tipo inválido: use curso ou turma.' using errcode = '23514';
  end if;
end;
$$;

-- Correções do cadastro chegam sozinhas só às edições em preparação (R4).
create function app.sincronizar_cadastro()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'cadastro_cursos' then
    update public.cursos c set nome = new.nome, categoria = new.categoria
    from public.edicoes e
    where c.cadastro_curso_id = new.id and e.id = c.edicao_id and e.estado = 'rascunho'
      and (c.nome <> new.nome or c.categoria <> new.categoria);
  else
    update public.turmas t set nome = new.nome, ano_letivo = new.ano_letivo
    from public.cursos c, public.edicoes e
    where t.cadastro_turma_id = new.id and c.id = t.curso_id and e.id = c.edicao_id and e.estado = 'rascunho'
      and (t.nome <> new.nome or t.ano_letivo is distinct from new.ano_letivo);
  end if;
  return new;
end;
$$;
create trigger sincronizar_cadastro_cursos after update on public.cadastro_cursos
  for each row execute function app.sincronizar_cadastro();
create trigger sincronizar_cadastro_turmas after update on public.cadastro_turmas
  for each row execute function app.sincronizar_cadastro();

-- Edição ativa: a coordenação dela aplica as correções pendentes do cadastro (R4).
create function public.atualizar_do_cadastro(p_edicao uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  n_cursos int;
  n_turmas int;
begin
  perform app.exigir_coordenacao_de(p_edicao);
  perform app.exigir_edicao_nao_encerrada(p_edicao);
  update public.cursos c set nome = k.nome, categoria = k.categoria
  from public.cadastro_cursos k
  where c.edicao_id = p_edicao and k.id = c.cadastro_curso_id and (c.nome <> k.nome or c.categoria <> k.categoria);
  get diagnostics n_cursos = row_count;
  update public.turmas t set nome = k.nome, ano_letivo = k.ano_letivo
  from public.cadastro_turmas k, public.cursos c
  where c.id = t.curso_id and c.edicao_id = p_edicao and k.id = t.cadastro_turma_id
    and (t.nome <> k.nome or t.ano_letivo is distinct from k.ano_letivo);
  get diagnostics n_turmas = row_count;
  return jsonb_build_object('cursos', n_cursos, 'turmas', n_turmas);
end;
$$;

-- Vincula turmas do cadastro à edição, trazendo o curso; idempotente (R5).
create function public.vincular_turmas(p_edicao uuid, p_turmas uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cad public.cadastro_turmas%rowtype;
  v_curso uuid;
  v_turma uuid;
  v_resultado jsonb := '[]'::jsonb;
  v_id uuid;
begin
  perform app.exigir_coordenacao_de(p_edicao);
  perform 1 from public.edicoes where id = p_edicao for update;
  perform app.exigir_edicao_nao_encerrada(p_edicao);
  foreach v_id in array coalesce(p_turmas, '{}') loop
    select * into v_cad from public.cadastro_turmas where id = v_id;
    if not found then
      raise exception 'Turma não encontrada no cadastro.' using errcode = 'P0002';
    end if;
    select id into v_curso from public.cursos where edicao_id = p_edicao and cadastro_curso_id = v_cad.cadastro_curso_id;
    if v_curso is null then
      insert into public.cursos (edicao_id, nome, categoria, cadastro_curso_id)
      select p_edicao, k.nome, k.categoria, k.id from public.cadastro_cursos k where k.id = v_cad.cadastro_curso_id
      returning id into v_curso;
    end if;
    select id into v_turma from public.turmas where curso_id = v_curso and cadastro_turma_id = v_cad.id;
    if v_turma is null then
      insert into public.turmas (curso_id, nome, ano_letivo, cadastro_turma_id)
      values (v_curso, v_cad.nome, v_cad.ano_letivo, v_cad.id)
      returning id into v_turma;
    end if;
    v_resultado := v_resultado || jsonb_build_array(jsonb_build_object('turmaId', v_turma, 'cadastroTurmaId', v_cad.id));
  end loop;
  return v_resultado;
end;
$$;

-- Desvincula a turma se não houver alunos, docentes nem registros nela; derivadas de mentor saem
-- junto. Curso que fica sem turmas: apagado sem mentores; com mentores, eles ficam inativos (R5).
create function public.desvincular_turma(p_turma uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid := app.edicao_da_turma(p_turma);
  v_curso uuid;
  v_motivos text[] := '{}';
begin
  if v_edicao is null then
    raise exception 'Turma não encontrada nesta edição.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_de(v_edicao);
  perform 1 from public.edicoes where id = v_edicao for update;
  perform app.exigir_edicao_nao_encerrada(v_edicao);
  select curso_id into v_curso from public.turmas where id = p_turma;
  if exists (select 1 from public.atribuicoes where turma_id = p_turma and origem_id is null) then
    v_motivos := array_append(v_motivos, 'alunos ou docentes');
  end if;
  if exists (select 1 from public.duplas where turma_id = p_turma)
     or exists (select 1 from public.convites_equipe where turma_id = p_turma) then
    v_motivos := array_append(v_motivos, 'equipes ou convites');
  end if;
  if exists (select 1 from public.presencas where turma_id = p_turma)
     or exists (select 1 from public.desafio_turmas where turma_id = p_turma)
     or exists (select 1 from public.lista_turmas where turma_id = p_turma) then
    v_motivos := array_append(v_motivos, 'atividades ou presenças');
  end if;
  if exists (select 1 from public.comunicado_turmas where turma_id = p_turma) then
    v_motivos := array_append(v_motivos, 'comunicados');
  end if;
  if cardinality(v_motivos) > 0 then
    raise exception 'A turma não pode ser desvinculada porque tem %.', array_to_string(v_motivos, ', ')
      using errcode = '23514';
  end if;
  perform set_config('app.sincronizando_mentores', 'on', true);
  delete from public.turmas where id = p_turma;
  if not exists (select 1 from public.turmas where curso_id = v_curso) then
    if exists (select 1 from public.atribuicoes where curso_id = v_curso) then
      update public.atribuicoes set ativo = false where curso_id = v_curso and ativo;
    else
      delete from public.cursos where id = v_curso;
    end if;
  end if;
  perform set_config('app.sincronizando_mentores', '', true);
end;
$$;

-- Escrita de cursos e turmas na edição só pelas RPCs de vínculo (R4).
drop policy cursos_gerenciar on public.cursos;
drop policy turmas_gerenciar on public.turmas;
revoke insert, update, delete, truncate on public.cursos, public.turmas from authenticated, anon;

revoke all on function app.exigir_quem_coordena(), app.exigir_edicao_nao_encerrada(uuid) from public, anon;
revoke all on function public.cadastro(), public.salvar_curso_do_cadastro(uuid, text, text),
  public.salvar_turma_do_cadastro(uuid, uuid, text, int), public.apagar_do_cadastro(text, uuid),
  public.atualizar_do_cadastro(uuid), public.vincular_turmas(uuid, uuid[]), public.desvincular_turma(uuid)
  from public, anon;
grant execute on function public.cadastro(), public.salvar_curso_do_cadastro(uuid, text, text),
  public.salvar_turma_do_cadastro(uuid, uuid, text, int), public.apagar_do_cadastro(text, uuid),
  public.atualizar_do_cadastro(uuid), public.vincular_turmas(uuid, uuid[]), public.desvincular_turma(uuid)
  to authenticated;

-- ===========================================================================
-- US3 — gestão por turma (T018)
-- ===========================================================================

-- Contas ativas que participam ou participaram de edições que a pessoa coordena, filtradas por
-- nome; nunca devolve e-mail (R7). [validar] se é preciso buscar qualquer conta da instalação.
create function public.pessoas_para_vincular(p_edicao uuid, p_busca text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_de(p_edicao);
  return coalesce((
    select jsonb_agg(jsonb_build_object('usuarioId', x.id, 'nome', x.nome) order by x.nome)
    from (
      select distinct p.id, p.nome
      from public.perfis p
      join public.atribuicoes a on a.usuario_id = p.id
      where p.ativo and app.e_coordenacao(a.edicao_id)
        and p.nome ilike '%' || coalesce(btrim(p_busca), '') || '%'
      order by p.nome
      limit 20
    ) x), '[]'::jsonb);
end;
$$;
revoke all on function public.pessoas_para_vincular(uuid, text) from public, anon;
grant execute on function public.pessoas_para_vincular(uuid, text) to authenticated;

-- ===========================================================================
-- US4 — mentor vinculado ao curso (T023)
-- ===========================================================================

-- Conversão dos vínculos existentes (FR-009): cada mentor por turma ganha o vínculo ao curso da
-- turma, as linhas antigas viram derivadas dele e as demais turmas do curso são completadas.
-- [validar] o mentor passa a atuar também nas outras turmas do mesmo curso.
insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id, ativo, concedido_por)
select a.usuario_id, a.edicao_id, 'mentor', t.curso_id, bool_or(a.ativo), min(a.concedido_por::text)::uuid
from public.atribuicoes a join public.turmas t on t.id = a.turma_id
where a.papel = 'mentor' and a.origem_id is null and a.turma_id is not null
group by a.usuario_id, a.edicao_id, t.curso_id;
update public.atribuicoes a set origem_id = o.id
from public.turmas t, public.atribuicoes o
where a.papel = 'mentor' and a.origem_id is null and a.turma_id = t.id
  and o.papel = 'mentor' and o.curso_id = t.curso_id and o.usuario_id = a.usuario_id and o.edicao_id = a.edicao_id;
insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id, origem_id, ativo, concedido_por)
select o.usuario_id, o.edicao_id, 'mentor', t.id, o.id, o.ativo, o.concedido_por
from public.atribuicoes o join public.turmas t on t.curso_id = o.curso_id
where o.papel = 'mentor' and o.curso_id is not null
  and not exists (select 1 from public.atribuicoes d where d.origem_id = o.id and d.turma_id = t.id);

alter table public.atribuicoes add constraint atribuicoes_vinculo_de_mentor check (
  (papel = 'mentor' and ((curso_id is not null and turma_id is null and origem_id is null)
                         or (turma_id is not null and origem_id is not null and curso_id is null)))
  or (papel <> 'mentor' and curso_id is null and origem_id is null));

-- Linhas derivadas só mudam pelos gatilhos de sincronia ou pelo desvínculo da turma.
create function app.proteger_derivadas()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.origem_id, old.origem_id) is not null
     and coalesce(current_setting('app.sincronizando_mentores', true), '') <> 'on' then
    raise exception 'Este vínculo vem do curso; altere o vínculo do mentor ao curso.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger proteger_derivadas before insert or update or delete on public.atribuicoes
  for each row execute function app.proteger_derivadas();

-- Mantém as derivadas do mentor em cada turma do curso na edição (R6).
create function app.sincronizar_mentor_do_curso()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_antes text := coalesce(current_setting('app.sincronizando_mentores', true), '');
begin
  perform set_config('app.sincronizando_mentores', 'on', true);
  if tg_table_name = 'atribuicoes' then
    if tg_op = 'INSERT' or new.ativo is distinct from old.ativo then
      insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id, origem_id, ativo, concedido_por)
      select new.usuario_id, new.edicao_id, 'mentor', t.id, new.id, new.ativo, new.concedido_por
      from public.turmas t where t.curso_id = new.curso_id
      on conflict on constraint atribuicoes_unica do update set ativo = excluded.ativo, origem_id = excluded.origem_id;
    end if;
  else
    insert into public.atribuicoes (usuario_id, edicao_id, papel, turma_id, origem_id, ativo, concedido_por)
    select o.usuario_id, o.edicao_id, 'mentor', new.id, o.id, true, o.concedido_por
    from public.atribuicoes o where o.curso_id = new.curso_id and o.papel = 'mentor' and o.ativo
    on conflict on constraint atribuicoes_unica do nothing;
  end if;
  perform set_config('app.sincronizando_mentores', v_antes, true);
  return new;
end;
$$;
create trigger sincronizar_mentor_do_curso after insert or update of ativo on public.atribuicoes
  for each row when (new.papel = 'mentor' and new.curso_id is not null)
  execute function app.sincronizar_mentor_do_curso();
create trigger sincronizar_mentores_da_turma after insert on public.turmas
  for each row execute function app.sincronizar_mentor_do_curso();

create function public.vincular_mentor_ao_curso(p_curso uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_edicao uuid := (select edicao_id from public.cursos where id = p_curso);
  v public.atribuicoes%rowtype;
begin
  if v_edicao is null then
    raise exception 'Curso não encontrado nesta edição.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_de(v_edicao);
  perform 1 from public.edicoes where id = v_edicao for update;
  perform app.exigir_edicao_nao_encerrada(v_edicao);
  if p_usuario = (select auth.uid()) then
    raise exception 'Ninguém altera a própria atribuição.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfis where id = p_usuario and ativo) then
    raise exception 'Conta não encontrada.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.turmas where curso_id = p_curso) then
    raise exception 'Vincule uma turma deste curso antes de vincular mentores.' using errcode = '23514';
  end if;
  select * into v from public.atribuicoes where curso_id = p_curso and usuario_id = p_usuario and papel = 'mentor';
  if not found then
    insert into public.atribuicoes (usuario_id, edicao_id, papel, curso_id, concedido_por)
    values (p_usuario, v_edicao, 'mentor', p_curso, (select auth.uid()));
  elsif not v.ativo then
    update public.atribuicoes set ativo = true where id = v.id;
  end if;
end;
$$;

create function public.desvincular_mentor_do_curso(p_curso uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_edicao uuid := (select edicao_id from public.cursos where id = p_curso);
begin
  if v_edicao is null then
    raise exception 'Curso não encontrado nesta edição.' using errcode = 'P0002';
  end if;
  perform app.exigir_coordenacao_de(v_edicao);
  perform app.exigir_edicao_nao_encerrada(v_edicao);
  if p_usuario = (select auth.uid()) then
    raise exception 'Ninguém altera a própria atribuição.' using errcode = '42501';
  end if;
  update public.atribuicoes set ativo = false
  where curso_id = p_curso and usuario_id = p_usuario and papel = 'mentor' and ativo;
end;
$$;

revoke all on function public.vincular_mentor_ao_curso(uuid, uuid), public.desvincular_mentor_do_curso(uuid, uuid)
  from public, anon;
grant execute on function public.vincular_mentor_ao_curso(uuid, uuid), public.desvincular_mentor_do_curso(uuid, uuid)
  to authenticated;

-- ===========================================================================
-- US5 — ativar e encerrar (T028)
-- ===========================================================================

create function public.ativar_edicao(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v public.edicoes%rowtype;
  v_falta text[] := '{}';
begin
  perform app.exigir_coordenacao_de(p_id);
  select * into v from public.edicoes where id = p_id for update;
  if v.estado = 'ativa' then
    return jsonb_build_object('ativadaEm', v.ativada_em);
  elsif v.estado = 'encerrada' then
    raise exception 'A edição está encerrada; os dados só podem ser lidos.' using errcode = '23514';
  end if;
  if v.inicio is null or v.fim is null then
    v_falta := array_append(v_falta, 'início e fim');
  end if;
  if not exists (select 1 from public.turmas t join public.cursos c on c.id = t.curso_id where c.edicao_id = p_id) then
    v_falta := array_append(v_falta, 'ao menos uma turma vinculada');
  end if;
  if cardinality(v_falta) > 0 then
    raise exception 'Para ativar, falta: %.', array_to_string(v_falta, '; ') using errcode = '23514';
  end if;
  update public.edicoes set estado = 'ativa', ativada_em = now() where id = p_id returning * into v;
  return jsonb_build_object('ativadaEm', v.ativada_em);
end;
$$;

-- Pendências mostradas antes de encerrar (R10); não impedem o encerramento.
create function app.pendencias_json(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'ocorrenciasSemDecisao', (select count(*) from public.ocorrencias
                              where edicao_id = p_id and estado in ('registrada', 'manifestada')),
    'revisoesAbertas', (select count(*) from public.pedidos_revisao where edicao_id = p_id and estado = 'aberto'),
    'categoriasSemRanking', coalesce((
      select jsonb_agg(distinct c.categoria order by c.categoria)
      from public.cursos c
      where c.edicao_id = p_id
        and exists (select 1 from public.turmas t where t.curso_id = c.id)
        and not exists (select 1 from public.publicacoes_ranking r where r.edicao_id = p_id and r.categoria = c.categoria)),
      '[]'::jsonb));
$$;

create function public.pendencias_da_edicao(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_de(p_id);
  return app.pendencias_json(p_id);
end;
$$;

create function public.encerrar_edicao(p_id uuid, p_justificativa text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.edicoes%rowtype;
begin
  perform app.exigir_coordenacao_de(p_id);
  select * into v from public.edicoes where id = p_id for update;
  if v.estado = 'encerrada' then
    return jsonb_build_object('encerradaEm', v.encerrada_em, 'pendencias', v.pendencias_no_encerramento);
  elsif v.estado <> 'ativa' then
    raise exception 'Só uma edição ativa pode ser encerrada.' using errcode = '23514';
  end if;
  perform app.registrar_justificativa(p_justificativa);
  update public.edicoes
  set estado = 'encerrada', encerrada_em = now(), justificativa_encerramento = btrim(p_justificativa),
      pendencias_no_encerramento = app.pendencias_json(p_id)
  where id = p_id
  returning * into v;
  return jsonb_build_object('encerradaEm', v.encerrada_em, 'pendencias', v.pendencias_no_encerramento);
end;
$$;

-- Bloqueio central de escrita em edição encerrada (R8). O argumento do gatilho diz a coluna que
-- leva à edição; vale para a linha nova e para a antiga.
create function app.edicao_pela_coluna(p_coluna text, p_valor uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select case p_coluna
    when 'edicao_id' then p_valor
    when 'turma_id' then app.edicao_da_turma(p_valor)
    when 'curso_id' then (select edicao_id from public.cursos where id = p_valor)
    when 'convite_id' then (select edicao_id from public.convites_equipe where id = p_valor)
    when 'desafio_id' then (select edicao_id from public.desafios where id = p_valor)
    when 'encontro_id' then (select edicao_id from public.encontros where id = p_valor)
    when 'lista_id' then (select edicao_id from public.listas_questoes where id = p_valor)
    when 'questao_id' then (select l.edicao_id from public.questoes q join public.listas_questoes l on l.id = q.lista_id
                            where q.id = p_valor)
    when 'ocorrencia_id' then (select edicao_id from public.ocorrencias where id = p_valor)
    when 'dupla_id' then (select edicao_id from public.duplas where id = p_valor)
    when 'publicacao_id' then (select edicao_id from public.publicacoes_ranking where id = p_valor)
    when 'comunicado_id' then (select edicao_id from public.comunicados where id = p_valor)
  end;
$$;

create function app.bloquear_edicao_encerrada()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_coluna text := tg_argv[0];
  v_edicoes uuid[];
begin
  v_edicoes := array_remove(array[
    case when tg_op <> 'DELETE' then app.edicao_pela_coluna(v_coluna, (to_jsonb(new) ->> v_coluna)::uuid) end,
    case when tg_op <> 'INSERT' then app.edicao_pela_coluna(v_coluna, (to_jsonb(old) ->> v_coluna)::uuid) end], null);
  if exists (select 1 from public.edicoes where id = any (v_edicoes) and estado = 'encerrada') then
    raise exception 'A edição está encerrada; os dados só podem ser lidos.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  v record;
begin
  for v in select * from (values
    ('cursos', 'edicao_id'), ('turmas', 'curso_id'), ('atribuicoes', 'edicao_id'), ('ambientes', 'edicao_id'),
    ('encontros', 'edicao_id'), ('duplas', 'edicao_id'), ('dupla_integrantes', 'edicao_id'),
    ('convites_equipe', 'edicao_id'), ('convite_equipe_convidados', 'convite_id'), ('desafios', 'edicao_id'),
    ('desafio_turmas', 'desafio_id'), ('entregas', 'desafio_id'), ('prorrogacoes', 'desafio_id'),
    ('presencas', 'encontro_id'), ('participacoes', 'encontro_id'), ('avaliacoes', 'desafio_id'),
    ('listas_questoes', 'edicao_id'), ('lista_turmas', 'lista_id'), ('questoes', 'lista_id'),
    ('alternativas', 'questao_id'), ('submissoes_questoes', 'lista_id'), ('resultados_prova', 'encontro_id'),
    ('ocorrencias', 'edicao_id'), ('manifestacoes', 'ocorrencia_id'), ('excecoes_prazo', 'dupla_id'),
    ('publicacoes_ranking', 'edicao_id'), ('publicacao_posicoes', 'publicacao_id'), ('pedidos_revisao', 'edicao_id'),
    ('comunicados', 'edicao_id'), ('comunicado_turmas', 'comunicado_id')) as t (tabela, coluna)
  loop
    execute format('create trigger bloquear_edicao_encerrada before insert or update or delete on public.%I '
                   'for each row execute function app.bloquear_edicao_encerrada(%L)', v.tabela, v.coluna);
  end loop;
end;
$$;

revoke all on function app.pendencias_json(uuid), app.edicao_pela_coluna(text, uuid) from public, anon;
revoke all on function public.ativar_edicao(uuid), public.pendencias_da_edicao(uuid), public.encerrar_edicao(uuid, text)
  from public, anon;
grant execute on function public.ativar_edicao(uuid), public.pendencias_da_edicao(uuid), public.encerrar_edicao(uuid, text)
  to authenticated;

-- ===========================================================================
-- US6 — coordenação da edição (T032)
-- ===========================================================================

-- A edição nunca fica sem coordenação ativa (FR-014); apagar a edição inteira é a exceção.
create function app.garantir_coordenacao_ativa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.papel = 'coordenacao' and old.ativo
     and (tg_op = 'DELETE' or not new.ativo or new.papel <> 'coordenacao')
     and coalesce(current_setting('app.sincronizando_mentores', true), '') <> 'on'
     -- Remoção da edição inteira (cascata): a regra não se aplica a uma edição que não existe mais.
     and exists (select 1 from public.edicoes where id = old.edicao_id)
     and not exists (select 1 from public.atribuicoes
                     where edicao_id = old.edicao_id and papel = 'coordenacao' and ativo and id <> old.id) then
    raise exception 'A edição precisa de pelo menos uma coordenação ativa.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger garantir_coordenacao_ativa before update or delete on public.atribuicoes
  for each row execute function app.garantir_coordenacao_ativa();

create function public.atribuir_coordenacao(p_edicao uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.atribuicoes%rowtype;
begin
  perform app.exigir_coordenacao_de(p_edicao);
  perform app.exigir_edicao_nao_encerrada(p_edicao);
  if p_usuario = (select auth.uid()) then
    raise exception 'Ninguém altera a própria atribuição.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfis where id = p_usuario and ativo) then
    raise exception 'Conta não encontrada.' using errcode = 'P0002';
  end if;
  select * into v from public.atribuicoes
  where edicao_id = p_edicao and usuario_id = p_usuario and papel = 'coordenacao' for update;
  if not found then
    insert into public.atribuicoes (usuario_id, edicao_id, papel, concedido_por)
    values (p_usuario, p_edicao, 'coordenacao', (select auth.uid()));
  elsif not v.ativo then
    update public.atribuicoes set ativo = true where id = v.id;
  end if;
end;
$$;

create function public.desativar_coordenacao(p_edicao uuid, p_usuario uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app.exigir_coordenacao_de(p_edicao);
  perform app.exigir_edicao_nao_encerrada(p_edicao);
  if p_usuario = (select auth.uid()) then
    raise exception 'Ninguém altera a própria atribuição.' using errcode = '42501';
  end if;
  update public.atribuicoes set ativo = false
  where edicao_id = p_edicao and usuario_id = p_usuario and papel = 'coordenacao' and ativo;
end;
$$;

revoke all on function public.atribuir_coordenacao(uuid, uuid), public.desativar_coordenacao(uuid, uuid) from public, anon;
grant execute on function public.atribuir_coordenacao(uuid, uuid), public.desativar_coordenacao(uuid, uuid) to authenticated;
