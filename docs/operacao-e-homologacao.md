# Operação, homologação, backup e restauração — PROPOSTA

> Orientações a validar pela unidade. Nenhum ambiente remoto foi criado ou conectado.

## Ambientes

| Ambiente    | Banco                         | Dados                                        | Modo demo    |
| ----------- | ----------------------------- | -------------------------------------------- | ------------ |
| Local       | `supabase start` (Docker)     | seed fictício                                | permitido    |
| Homologação | projeto Supabase **separado** | fictícios ou anonimizados, salvo autorização | **proibido** |
| Produção    | projeto Supabase próprio      | reais                                        | **proibido** |

## Preparar homologação

1. Criar um projeto Supabase de homologação (conta institucional) e anotar a URL e a chave
   **pública**. A chave `service_role`/secreta fica só no painel/CI, nunca no repositório.
2. Configurar Auth: desabilitar auto-cadastro; URLs de redirecionamento do domínio de
   homologação; senha mínima ≥ 10.
3. Aplicar migrations a partir de uma máquina autorizada:
   `supabase link --project-ref <ref>` e `supabase db push` (revisar o diff antes).
   **Não** rodar `seed.sql` em homologação com dados reais.
4. Rodar os testes de RLS contra um banco local equivalente (`supabase test db`).
5. Publicar o build (`npm run build` → `dist/`) em hospedagem estática com HTTPS
   (obrigatório para PWA), com fallback de SPA para `index.html` e cabeçalho
   `Cache-Control: no-cache` para `sw.js` e `index.html`.
6. Definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de build; deixar
   `VITE_DEMO_MODE` vazio.
7. Testar em celulares, tablets e computadores da unidade (PRD RNF01, RNF08).
8. **E-mail** (spec 002, ADR 0009) — dois envios diferentes:
   - **convites de primeiro acesso**, enviados pelas Edge Functions por um provedor de e-mail
     **[validar: provedor, domínio e remetente da unidade]**. Segredos das funções:
     `APP_URL` (endereço público da aplicação), `EMAIL_PROVEDOR`, `EMAIL_REMETENTE` e as
     credenciais do provedor (`supabase secrets set …`, nunca no repositório). Um adaptador
     novo é necessário: hoje só existe o do Mailpit (ambiente local). Confirmar o bloqueio de
     SMTP (portas 25/587) nas funções hospedadas;
   - **recuperação de senha**, enviada pelo próprio Supabase Auth: configurar o **SMTP
     próprio** do Auth no painel (remetente e domínio da unidade) **[validar]** e incluir
     `<domínio>/redefinir-senha` nas URLs de redirecionamento.
9. Fazer o deploy das funções (`supabase functions deploy`) com `definir-senha-inicial` sem
   verificação de JWT (ela é pública; ver `supabase/config.toml`).

## Backup e restauração (a validar)

- Verificar o plano do Supabase contratado (backups diários/PITR) e registrar RPO/RTO acordados.
- Backup lógico adicional antes de cada publicação de ranking e ao fim de cada encontro:
  `supabase db dump --data-only -f backup-AAAAMMDD.sql` (e `--schema` separado), guardado em
  local institucional com acesso restrito (contém dados pessoais).
- Arquivos do Storage: exportação periódica do bucket privado (Incremento 3).
- **Testar a restauração** em projeto descartável antes do evento e registrar o resultado
  (PRD §16 exige backup e recuperação verificados).
