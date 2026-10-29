# ADR 0005 — PWA e política de cache

- **Status:** aceita (2026-10-29)
- **Decisão:**
  - `vite-plugin-pwa` com `registerType: 'prompt'`: nova versão só é ativada quando a pessoa
    clica em "Atualizar agora".
  - Precache **apenas** do shell estático (HTML, JS, CSS, fontes, ícones e SVGs da marca).
  - **Nenhuma** regra de `runtimeCaching`: respostas do Supabase (dados, Auth, Storage, RPC)
    nunca vão para o cache do service worker.
  - Indicador de conexão; ações de escrita desabilitadas offline; confirmação de envio apenas
    com resposta do servidor.
  - Instalação via `beforeinstallprompt` quando suportado; no iOS/Safari a instalação é pela
    opção "Adicionar à Tela de Início" e o app continua funcionando no navegador.
- **Fora do MVP:** escrita offline com sincronização (exige spec própria), leitura offline de
  conteúdo público além do shell (exige definir quais conteúdos são públicos).
- **Observação:** a sessão do Supabase fica no `localStorage` do navegador (padrão do
  supabase-js). Em computadores compartilhados do laboratório, orientar a usar "Sair".
