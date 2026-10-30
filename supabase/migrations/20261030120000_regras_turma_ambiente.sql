-- Spec 002, esclarecimentos de 2026-10-30.
-- FR-001: o curso de uma turma com dupla ativa não muda (o curso define a categoria do ranking).
-- FR-012: ambiente usado por encontro não é removido; a mensagem lista os encontros.

create function app.validar_troca_de_curso()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.curso_id is distinct from old.curso_id and exists (
    select 1 from public.duplas d where d.turma_id = old.id and d.ativa
  ) then
    raise exception 'Esta turma já tem duplas; o curso não pode ser alterado.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger turmas_validar_troca_de_curso
  before update of curso_id on public.turmas
  for each row execute function app.validar_troca_de_curso();

create function app.impedir_remocao_de_ambiente_em_uso()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_encontros text;
begin
  -- Remoção da edição inteira (cascata): encontros e ambientes saem juntos.
  if not exists (select 1 from public.edicoes e where e.id = old.edicao_id) then
    return old;
  end if;
  select string_agg(e.numero || ' — ' || e.titulo, '; ' order by e.numero) into v_encontros
  from public.encontros e where e.ambiente_id = old.id;
  if v_encontros is not null then
    raise exception 'Este ambiente está em uso nos encontros: %. Troque o ambiente desses encontros antes de removê-lo.',
      v_encontros using errcode = '23514';
  end if;
  return old;
end;
$$;

create trigger ambientes_impedir_remocao_em_uso
  before delete on public.ambientes
  for each row execute function app.impedir_remocao_de_ambiente_em_uso();

-- Defesa adicional: o encontro nunca perde o ambiente em silêncio. NO ACTION verifica no fim do
-- comando, o que mantém a remoção em cascata da edição.
alter table public.encontros drop constraint encontros_ambiente_id_fkey;
alter table public.encontros add constraint encontros_ambiente_id_fkey
  foreign key (ambiente_id) references public.ambientes (id) on delete no action;
