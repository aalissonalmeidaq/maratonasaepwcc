-- =============================================================================
-- Últimas seis premissas decididas pelo projeto (2026-11-06), a pedido do usuário. Nenhuma regra
-- do sistema muda: o que o sistema já faz vira decisão registrada.
--   P01: valem os arquivos de docs/referencias/ (a pasta antiga não existe mais).
--   P02, P06: ícones e padrões seguem como estão; ajustes visuais futuros viram spec.
--   P08: Montserrat (SIL OFL), hospedada com o aplicativo.
--   P13: premiação continua configuração da edição; valores, quantidade, validade e entrega são
--        preenchidos pela coordenação em cada edição (nada a decidir no sistema).
--   P32: provedor e remetente de e-mail são configuração de implantação (docs/operacao-e-homologacao.md).
-- =============================================================================
update public.premissas
set resolvida_por = 'decisão do projeto de 06/11/2026'
where resolvida_por is null and codigo in ('P01', 'P02', 'P06', 'P08', 'P13', 'P32');
