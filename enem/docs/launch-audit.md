# Auditoria de lançamento — Bora Pro ENEM

Data: 02/11/2026. Base: `c4a213e5b3f31f0ac52a347bc5bbc943895fb0ca`.
Escopo: somente `enem/`. Branch de revisão, sem merge, deploy ou alteração do Supabase publicado.

**Resultado: correções implementadas e verificadas localmente; lançamento pago ainda bloqueado pelas pendências abaixo.**

## Classificação implementada para revisão

O repositório não tinha catálogo comercial nem integração de pagamentos. A divisão abaixo é uma decisão proposta nesta branch, que precisa ser validada antes do lançamento comercial.

| Categoria | Telas e recursos | Controle |
|---|---|---|
| Demonstração | Início, questões e explicações do banco atual, cronômetro, mascotes do início, termos, privacidade e imagens públicas | Visitante permitido; progresso visitante separado |
| Usuário | Meu plano, redações, desafios, progresso sincronizado, gerenciamento de conta | Supabase Auth; RLS por `auth.uid()` no progresso |
| Premium | Simulados, estado/histórico de simulados sincronizados, tabela reservada para futuros conteúdos exclusivos | Auth + pagamento `approved` + início/prazo vigente; RLS tanto por titular quanto vigência |

O algoritmo do simulado e o banco de questões continuam públicos. A proteção efetiva no backend é sobre sessões, histórico e recursos armazenados nas tabelas premium. Não há promessa de impedir alguém de copiar o código público e construir um simulado local. Conteúdo comercial exclusivo deve ser servido por `enem_premium_resources`, nunca incluído em `src/` ou `public/`.

## Achados, causas e correções

| Severidade | Achado e causa raiz | Tratamento |
|---|---|---|
| Crítica para venda | Nenhuma verificação de pagamento/vigência; inexistência de integração de cobrança | Migração `premium.sql`, RPCs e transporte Supabase; cliente não pode conceder ou alterar direitos. Cobrança real ainda pendente |
| Alta | Todas as telas de estudo abriam sem login; autenticação servia apenas à sincronização | Guardas nas áreas pessoais; demonstração preservada; acesso direto por fragmento também validado |
| Alta | Etapas do plano tinham apenas conclusão manual, sem atividade vinculada | IDs estáveis, botões Iniciar/Continuar, questões da área, redação, simulado e checklist; conclusão individual e retorno ao plano |
| Alta | Navegação dependia de variável em memória | Rotas `#view=...`, histórico do navegador, contexto/cursor do plano no progresso sincronizado |
| Alta | Respostas assíncronas poderiam atualizar estado/cache depois de troca de usuário | Comparação da identidade antes de aplicar respostas; invalidação por evento de autenticação |
| Alta | Simulado guardado junto ao documento comum não diferenciava acesso pago | Sessões separadas, migração preservando dados anteriores, autorização no servidor e revisão otimista para rejeitar conflitos |
| Média | Cronômetro sobrepunha os atalhos inferiores em 320px | Posicionamento acima da navegação móvel e teste de não sobreposição |
| Média | Alguns controles não tinham altura mínima de toque | Mínimo de 44px; modais com altura limitada e rolagem; reforço de quebra/layout estreito |

O isolamento original de `enem_study_progress` já estava presente no SQL. Foi testado localmente; não foi alegada uma invasão ou vazamento no banco publicado.

## Inventário de acesso a páginas e APIs

A aplicação usa uma página HTML com seis telas; esta branch permite links diretos por `#view=`. Arquivos estáticos de `public/`, bundle JavaScript, CSS e questões são públicos.

No transporte Supabase, `/register`, `/login`, `/recover` são operações públicas do Auth. `/me`, `/logout`, `/password`, `/progress`, `/access`, `/premium-progress` e `/premium-resources` exigem usuário verificado; os dois últimos consultam tabelas com RLS. Esses nomes são operações internas do transporte, não rotas HTTP do Cloudflare. As chamadas reais vão ao Auth, REST e RPC do Supabase.

No servidor SQLite legado, `/api/health`, `/api/register`, `/api/login` e `/api/recover` são públicos. `/api/me`, `/api/logout`, `/api/recovery-code`, `/api/password` e `/api/progress` exigem sessão; progresso restringido ao usuário da sessão e cabeçalho de identidade. Escritas verificam origem e JSON. Premium não foi implementado no SQLite: falha fechado/indisponível nesse modo. O lançamento solicitado usa Supabase.

## Testes e evidências

- `npm test`: 40 testes aprovados (lógica, banco de questões, servidor, transporte Supabase, plano e autorização).
- `CHROMIUM_PATH=/tmp/chromium npm run test:cloud`: 12 testes aprovados com SDK Supabase real e respostas HTTP simuladas. Inclui login/recuperação, visitante, não pagante, pagante, expirado, URL direta, alteração de localStorage, retomada do simulado e plano concluído em duas sessões independentes.
- Larguras verificadas: **320, 375, 390, 430, 768, 1024 e 1440px**, altura 900px. Plano, questões, redação, desafios, seleção de simulado, modal de login, cronômetro, ausência de overflow, ação por teclado e alvo de toque do retorno ao plano. Inspeção visual de screenshots de 320/1440px; não são aparelhos físicos.
- Dois testes legados de navegador aprovados separadamente com build SQLite: sincronização/conflito entre sessões e recuperação por código.
- `npm run build` e `build:pages` aprovados; `git diff --check` aprovado.
- SQL executado em PostgreSQL embarcado PGlite: bootstrap, schema, premium (reaplicação), isolamento e testes premium. Aprovados: anônimo negado, não pagante negado, aprovado permitido, expirado negado, forja de direito negada, isolamento entre dois pagantes, conflito de revisão e preservação da tabela do outro aplicativo. Não é uma execução contra o Supabase de produção.
- O runner Docker `npm run test:sql` foi estendido; nesta sessão a execução SQL usou PGlite, não Docker.
- A suíte antiga completa de UI não foi executada: vários cenários pressupõem acesso irrestrito como visitante ou injetam simulados diretamente no localStorage, comportamento substituído deliberadamente. Os cenários obrigatórios desta solicitação estão na suíte nova; falta migrar todos os cenários antigos.

## Arquivos

- `src/main.js`: navegação, guardas, contexto e conclusão do plano, simulados com sincronização premium.
- `src/account.js`: identidade nas respostas assíncronas e troca de sessão.
- `src/supabase-account.js`: acesso e persistência premium via backend.
- `src/state.js`, `src/study-plan.js`: normalização e vínculos/cursor estáveis.
- `src/style.css`: toque, modal, layout estreito e cronômetro.
- `supabase/premium.sql`: migração, direitos, RLS, sessões e RPC com revisão.
- `tests/access.test.js`, `tests/study-plan.test.js`: cobertura de lógica/transporte.
- `tests/e2e-cloud/launch.spec.js`: matriz mobile e jornadas de acesso/progresso.
- `tests/sql/premium.sql`, `tests/sql/run.sh`: autorização e isolamento no banco.
- `docs/launch-audit.md`: este relatório.

## Pendências para lançamento

1. **Bloqueador: cobrança.** Não há checkout, webhook ou credenciais de Mercado Pago no código auditado. Falta conectar a confirmação verificada no servidor a `enem_entitlements` e tratar estorno/cancelamento. Não usar resposta do navegador, URL de retorno, metadados editáveis do usuário ou localStorage para liberar acesso. Apenas backend confiável escreve os direitos.
2. **Bloqueador: homologar e aplicar migração.** Executar `schema.sql` e depois `premium.sql` primeiro em projeto de homologação, com cópia dos dados. Validar migração de simulados antigos, duas contas reais, pagamento e expiração. Nada foi executado no projeto publicado.
3. Validar a divisão comercial proposta. Simulados agora exigem premium; usuários antigos devem ter uma política explícita de acesso. Seus simulados existentes são copiados para a tabela nova, sem concessão automática de pagamento.
4. Questões do plano são vinculadas por área; revisões e preparação final dependem de confirmação do aluno. Não há novos conteúdos/aulas para cada tema nem correção automática de redação. O botão manual de concluir dia foi preservado como autoavaliação.
5. Validar Safari/iOS, Android real, leitor de tela, contraste e todo o conjunto antigo de regressão. As sete larguras em Chromium não equivalem a uma certificação completa de acessibilidade.
6. Testar cobrança ponta a ponta, revogação durante sessão, interrupção de rede e concorrência premium em dois dispositivos reais. SQL rejeita escrita indevida/conflito; falha na gravação exibe erro e requer nova verificação. Aguarde “Simulado sincronizado” antes de fechar a página.

Não publicar esta branch como lançamento pago antes de resolver os bloqueadores. Nenhum arquivo do outro aplicativo ou workflow de deploy foi alterado.
