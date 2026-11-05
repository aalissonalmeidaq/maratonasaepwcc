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
- **Extensão — spec 014 (2026-11-04):** `/regulamento` lê, sem sessão, somente a projeção
  pública de regras/encontros de edições ativas publicadas pela coordenação. A cópia validada
  fica em `localStorage` sob `maratona:regulamento-publico:v1:<modo>:<projeto>`, com data de
  gravação bem-sucedida; demo e projetos são isolados. Resposta vazia substitui a cópia anterior.
  Falha de armazenamento mantém leitura online e mostra aviso sem confirmar gravação.
  Nenhuma regra de runtimeCaching foi adicionada. Dados autenticados continuam apenas na
  memória da sessão; ao sair são limpos os dados da consulta e a sessão Auth. A preferência do
  seletor conserva somente o identificador da edição, como exige a spec 010; não é uma resposta
  autenticada nem conteúdo para leitura offline.
- **Fora do MVP:** escrita offline com sincronização (exige spec própria); cache de comunicados,
  rankings, turmas, pessoas, notas e demais respostas autenticadas.
- **Observação:** a sessão do Supabase fica no `localStorage` do navegador (padrão do
  supabase-js). Em computadores compartilhados do laboratório, orientar a usar "Sair".
