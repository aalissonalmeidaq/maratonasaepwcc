-- Conferência de 06/11/2026: a biblioteca tem 118 ícones (arquivos em docs/icones/svg e dados.ts),
-- não 117. Só o texto da pergunta da P02 muda; respostas e histórico seguem intactos.
update public.premissas
set pergunta = replace(pergunta, 'Os 117 ícones', 'Os 118 ícones')
where codigo = 'P02';
