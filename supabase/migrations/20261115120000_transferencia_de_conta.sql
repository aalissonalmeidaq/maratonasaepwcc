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
