-- =============================================================================
-- Spec 019 — transferência de conta entre unidades. Só o master transfere, e só contas de equipe.
-- Funções e vínculos da origem ficam inativos (nada é apagado); a conta chega ao destino sem
-- funções, e a gestão do destino as define depois.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Parte 1 — registro das transferências e caminho único para mudar a unidade do perfil
-- -----------------------------------------------------------------------------
create table public.transferencias_de_conta (
  id uuid primary key default gen_random_uuid(),
  chave_envio uuid not null unique,
  usuario_id uuid not null references public.perfis (id),
  unidade_origem uuid not null references public.unidades (id),
  unidade_destino uuid not null references public.unidades (id),
  justificativa text not null,
  funcoes_anteriores jsonb not null,
  vinculos_encerrados integer not null check (vinculos_encerrados >= 0),
  autor_id uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  constraint transferencias_unidades_diferentes check (unidade_destino <> unidade_origem),
  constraint transferencias_justificativa check (
    justificativa = btrim(justificativa) and char_length(justificativa) between 10 and 2000)
);
create index transferencias_de_conta_usuario_idx on public.transferencias_de_conta (usuario_id, criado_em);
comment on table public.transferencias_de_conta is
  'Transferências de conta entre unidades (spec 019). Só inserção, por RPC; nenhum privilégio direto.';

alter table public.transferencias_de_conta enable row level security;
revoke all on public.transferencias_de_conta from anon, authenticated;
create policy conta_ativa on public.transferencias_de_conta as restrictive for all to authenticated
  using ((select app.conta_ativa())) with check ((select app.conta_ativa()));

create function app.recusar_alteracao_de_transferencia()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'O registro de transferência não é alterado nem apagado.' using errcode = '42501';
end;
$$;
create trigger transferencias_imutaveis before update or delete on public.transferencias_de_conta
  for each row execute function app.recusar_alteracao_de_transferencia();
create trigger auditoria_transferencias_de_conta after insert on public.transferencias_de_conta
  for each row execute function app.registrar_auditoria();

-- A unidade do perfil só muda dentro da RPC de transferência (marcador local à transação).
create or replace function app.proteger_unidade_do_perfil()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.unidade_id is distinct from old.unidade_id
     and coalesce(current_setting('app.transferencia_em_curso', true), '') <> 'on' then
    raise exception 'A unidade da conta não muda.' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- A edição nunca fica sem coordenação ativa (FR-014 da spec 010). A transferência é a exceção
-- consciente: a RPC já recusou a conta que é a última coordenação de edição não encerrada, e nas
-- encerradas o vínculo vira histórico.
create or replace function app.garantir_coordenacao_ativa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.papel = 'coordenacao' and old.ativo
     and (tg_op = 'DELETE' or not new.ativo or new.papel <> 'coordenacao')
     and coalesce(current_setting('app.sincronizando_mentores', true), '') <> 'on'
     and coalesce(current_setting('app.transferencia_em_curso', true), '') <> 'on'
     -- Remoção da edição inteira (cascata): a regra não se aplica a uma edição que não existe mais.
     and exists (select 1 from public.edicoes where id = old.edicao_id)
     and not exists (select 1 from public.atribuicoes
                     where edicao_id = old.edicao_id and papel = 'coordenacao' and ativo and id <> old.id) then
    raise exception 'A edição precisa de pelo menos uma coordenação ativa.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

-- Edição encerrada é só leitura (spec 010). A transferência é a única exceção, e só para vínculos
-- (`atribuicoes`): precisam ficar inativos para a pessoa não manter acesso ao que era da origem;
-- a linha continua existindo como histórico.
create or replace function app.bloquear_edicao_encerrada()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_coluna text := tg_argv[0];
  v_edicoes uuid[];
begin
  if tg_table_name = 'atribuicoes' and tg_op = 'UPDATE'
     and coalesce(current_setting('app.transferencia_em_curso', true), '') = 'on' then
    return new;
  end if;
  v_edicoes := array_remove(array[
    case when tg_op <> 'DELETE' then app.edicao_pela_coluna(v_coluna, (to_jsonb(new) ->> v_coluna)::uuid) end,
    case when tg_op <> 'INSERT' then app.edicao_pela_coluna(v_coluna, (to_jsonb(old) ->> v_coluna)::uuid) end], null);
  if exists (select 1 from public.edicoes where id = any (v_edicoes) and estado = 'encerrada') then
    raise exception 'A edição está encerrada; os dados só podem ser lidos.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end;
$$;

-- -----------------------------------------------------------------------------
-- Parte 2 — equipe da unidade para o master escolher a conta e transferência (caminho feliz)
-- -----------------------------------------------------------------------------
create function public.equipe_de_unidade_da_rede(p_unidade uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform app.exigir_conta_ativa();
  perform app.exigir_master();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'usuarioId', p.id, 'nome', p.nome, 'email', au.email,
      'funcoes', coalesce((select jsonb_agg(f.funcao order by f.funcao::text) from public.funcoes_unidade f
                           where f.usuario_id = p.id and f.ativa), '[]'::jsonb),
      'situacaoAcesso', app.situacao_do_acesso(p.id), 'ativo', p.ativo) order by p.nome, p.id)
    from public.perfis p join auth.users au on au.id = p.id
    where p.unidade_id = p_unidade
      and exists (select 1 from public.funcoes_unidade f where f.usuario_id = p.id)
      and not exists (select 1 from public.atribuicoes a where a.usuario_id = p.id and a.papel = 'aluno')), '[]'::jsonb);
end;
$$;

create function public.transferir_conta(p_chave uuid, p_usuario uuid, p_unidade_origem uuid,
                                        p_unidade_destino uuid, p_justificativa text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_perfil public.perfis%rowtype;
  v_justificativa text := btrim(coalesce(p_justificativa, ''));
  v_funcoes jsonb;
  v_vinculos integer;
begin
  perform app.exigir_conta_ativa();
  perform app.exigir_master();
  -- Repetição do mesmo pedido: devolve a transferência já feita, sem alterar nada.
  select id into v_id from public.transferencias_de_conta where chave_envio = p_chave;
  if found then
    return v_id;
  end if;
  if char_length(v_justificativa) not between 10 and 2000 then
    raise exception 'Justifique com 10 a 2.000 caracteres.' using errcode = '23514';
  end if;
  if p_unidade_origem is not distinct from p_unidade_destino then
    raise exception 'A unidade de destino deve ser outra.' using errcode = '23514';
  end if;
  -- Trava a conta e relê a unidade (uma transferência concorrente já pode ter mudado).
  select * into v_perfil from public.perfis where id = p_usuario for update;
  if not found then
    raise exception 'Esta conta não é da unidade de origem.' using errcode = '23514';
  end if;
  if exists (select 1 from public.masters where usuario_id = p_usuario) then
    raise exception 'Contas de master não são transferidas.' using errcode = '23514';
  end if;
  if v_perfil.unidade_id is distinct from p_unidade_origem then
    raise exception 'Esta conta não é da unidade de origem.' using errcode = '23514';
  end if;
  if exists (select 1 from public.atribuicoes where usuario_id = p_usuario and papel = 'aluno') then
    raise exception 'Contas de estudante não são transferidas.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.funcoes_unidade where usuario_id = p_usuario) then
    raise exception 'Esta não é uma conta de equipe.' using errcode = '23514';
  end if;
  if not v_perfil.ativo then
    raise exception 'Reative a conta antes de transferi-la.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.unidades where id = p_unidade_destino) then
    raise exception 'Unidade de destino não encontrada.' using errcode = '23514';
  end if;
  if exists (select 1 from public.unidades where id in (p_unidade_origem, p_unidade_destino) and not ativa) then
    raise exception 'Unidade desativada.' using errcode = '23514';
  end if;
  -- A origem não fica sem responsável.
  if exists (select 1 from public.funcoes_unidade where usuario_id = p_usuario and funcao = 'gestao' and ativa)
     and not exists (
       select 1 from public.funcoes_unidade f
       join public.perfis o on o.id = f.usuario_id
       where f.funcao = 'gestao' and f.ativa and o.ativo and o.unidade_id = p_unidade_origem and o.id <> p_usuario) then
    raise exception 'Indique outra gestão antes.' using errcode = '23514';
  end if;
  if app.e_ultima_coordenacao(p_usuario) then
    raise exception 'Indique outra coordenação antes.' using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(f.funcao order by f.funcao::text), '[]'::jsonb) into v_funcoes
  from public.funcoes_unidade f where f.usuario_id = p_usuario;
  select count(*) into v_vinculos from public.atribuicoes where usuario_id = p_usuario and ativo;

  perform set_config('app.justificativa', v_justificativa, true);
  perform set_config('app.transferencia_em_curso', 'on', true);
  -- Vínculos diretos; as derivadas de mentor acompanham pela trigger de sincronia.
  update public.atribuicoes set ativo = false
  where usuario_id = p_usuario and ativo and origem_id is null;
  update public.funcoes_unidade set ativa = false, desativada_com_conta = false
  where usuario_id = p_usuario and (ativa or desativada_com_conta);
  update public.perfis set unidade_id = p_unidade_destino where id = p_usuario;
  insert into public.transferencias_de_conta (chave_envio, usuario_id, unidade_origem, unidade_destino,
                                              justificativa, funcoes_anteriores, vinculos_encerrados)
  values (p_chave, p_usuario, p_unidade_origem, p_unidade_destino, v_justificativa, v_funcoes, v_vinculos)
  returning id into v_id;
  perform set_config('app.transferencia_em_curso', 'off', true);
  perform set_config('app.justificativa', '', true);
  return v_id;
end;
$$;

revoke all on function public.equipe_de_unidade_da_rede(uuid), public.transferir_conta(uuid, uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.equipe_de_unidade_da_rede(uuid), public.transferir_conta(uuid, uuid, uuid, uuid, text)
  to authenticated;
