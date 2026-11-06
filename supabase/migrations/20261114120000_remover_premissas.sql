-- =============================================================================
-- Spec 018 — premissas fora do site. As premissas passam a ser tratadas no desenvolvimento
-- (docs/premissas.md), não no site: decisão do usuário de 06/11/2026, que também autorizou
-- apagar a tabela de respostas (só havia respostas de teste).
--
-- Só remoções, cada objeto pelo nome (sem `cascade`), idempotentes. A ordem importa: a função
-- auxiliar de resposta tem parâmetro do tipo da tabela e sai antes dela; a função do gatilho só
-- sai depois da tabela. As linhas da auditoria geral sobre `respostas_premissas` ficam como
-- histórico (não há chave estrangeira).
-- =============================================================================
drop function if exists public.premissas_em_validacao();
drop function if exists public.responder_premissa(text, public.decisao_premissa, text, uuid);
drop function if exists app.resposta_json(public.respostas_premissas);

drop table if exists public.respostas_premissas;
drop table if exists public.premissas;

drop function if exists app.recusar_alteracao_de_resposta();
drop function if exists app.atua_como_docente_em_alguma();

drop type if exists public.decisao_premissa;
