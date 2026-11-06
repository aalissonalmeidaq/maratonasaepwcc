-- =============================================================================
-- Premissas decididas pelo projeto (2026-11-06), sem spec nova. O que o sistema já usa e é regra
-- do próprio sistema passa a valer como decisão: a premissa fica resolvida (nunca é apagada).
-- Seguem em aberto as que dependem de fato externo ou de conferência visual da unidade:
--   P01, P02, P06, P08 (fidelidade e confirmação da identidade visual),
--   P13 (valores, quantidade, validade e entrega da premiação) e
--   P32 (provedor e remetente dos e-mails).
-- =============================================================================
update public.premissas
set resolvida_por = 'decisão do projeto de 06/11/2026'
where resolvida_por is null
  and codigo in ('P03', 'P04', 'P05', 'P07',
                 'P09', 'P10', 'P11', 'P12', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19',
                 'P20', 'P21', 'P22', 'P23', 'P24',
                 'P26', 'P27', 'P28', 'P29', 'P30', 'P31');
