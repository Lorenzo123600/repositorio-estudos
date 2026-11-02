# Pagamentos Bora Pro ENEM — código preparado, integração remota pendente

## O que foi implementado

O ENEM fica em `enem/`. O outro app na raiz e as tabelas/funções de progresso foram preservados. Não houve cobrança, implantação, alteração do Supabase remoto ou publicação Cloudflare. O projeto versiona um workflow GitHub Pages; a configuração Cloudflare informada pelo usuário não foi acessada.

- `supabase/migrations/202611020001_enem_payments.sql`: catálogo sem preços inventados, compras, acessos, RLS por aluno, snapshots do contrato comercial, transação com bloqueio por compra, idempotência, expiração e reversão configurável.
- `supabase/migrations/202611020002_enem_checkout.sql`: congela o payload da criação para retries, salva a URL e vincula a order sem sobrescrever uma vinculação diferente. As novas RPCs são exclusivas do backend.
- `supabase/migrations/202611020003_enem_order_provenance.sql`: vincula imutavelmente conta vendedora, aplicação e ambiente antes da chamada ao provedor. A RPC de confirmação confere a order vinculada antes de conceder acesso.
- `supabase/functions/create-mercadopago-order/index.ts` e `_shared/create-order.js`: valida o JWT pelo Supabase Auth, exige e-mail confirmado, origem exata, plano e chave UUID. O banco fornece preço, moeda, usuário e referência. Chama somente `POST https://api.mercadopago.com/v1/orders` com `type=online`, `processing_mode=manual`, itens, total e `X-Idempotency-Key`. Configura `config.online` com URLs de retorno da origem permitida e `auto_return=all`; retorna somente identificação interna, ambiente e URL validada do checkout brasileiro. Falhas não registram tokens ou respostas privadas.
- `supabase/functions/mercadopago-webhook/index.ts` e `_shared/webhook.js`: aceita POST externo, valida HMAC SHA256 conforme o manifesto oficial, normaliza o ID para minúsculas no manifesto e usa verificação criptográfica. Consulta `GET /v1/orders/{id}` e não utiliza status, ambiente ou usuário do corpo recebido para conceder acesso. Confere vendedor, aplicação, referência, valor, moeda, país, ambiente e aprovação integral; aplica a RPC antes de responder 200. Falhas temporárias retornam erro para retry do provedor. Duplicatas não prorrogam acesso graças à transação SQL.
- `supabase/config.toml`: as duas funções usam `verify_jwt=false`. Isso é necessário para o webhook e para suporte a chaves publishable modernas na criação; **a criação continua exigindo JWT de aluno validado por `auth.getUser(token)` dentro do handler**.
- `src/payments.js`: diálogo aberto por **Planos**, login obrigatório, catálogo do banco, tentativa persistida por usuário/plano, redirecionamento validado, histórico e estados aprovado/pendente/recusado/cancelado/reembolsado/contestado. Consulta pagamentos/acessos a cada dez segundos enquanto aberto e ao recuperar foco. Não libera acesso por parâmetros de URL. Recarga e outro dispositivo consultam novamente o Supabase.
- Alterações em `src/main.js`, `src/account.js`, `src/supabase-account.js`, `src/style.css`: botão, sessão existente compartilhada, consultas RLS e estilo responsivo do diálogo. Não há segundo cliente Auth nem alteração no protocolo de sincronização do estudo.
- Testes: `tests/payments.test.js`, `tests/e2e-cloud/payments.spec.js`, `tests/sql/payments.sql`, `tests/sql/run-payments.sh`.

O usuário cadastrou o plano de R$ 14,90 até 31/12/2026 pelo Editor SQL, com execução confirmada; não houve compra validada. Cada compra tem prazo independente; não há renovação recorrente ou extensão cumulativa. As políticas `revoke` (revoga em reversão) e `preserve` (mantém o prazo original) são congeladas na compra e precisam de decisão comercial. Compras test nunca autorizam funcionalidades de produção. `enem_has_paid_access()` consulta o usuário autenticado e prazo vigente. Nenhuma funcionalidade de estudo existente foi colocada atrás de cobrança; a definição de recursos premium ainda está pendente. Proteção de novos serviços premium deve ser feita no backend/RLS, não apenas na interface.

## Documentação e pendências técnicas

O usuário forneceu as páginas oficiais de criação, notificações e **Get order by ID**. A consulta GET **não retorna `live_mode`**; o código não exige esse campo e não usa o valor do aviso nem prefixos de IDs para determinar o ambiente. A checagem combina credencial privada selecionada, vendedor/aplicação retornados pela API, contexto imutável registrado antes da criação e order já vinculada à compra. A RPC de aplicação confere novamente esse vínculo e o ambiente. Uma notificação que chega antes de salvar a vinculação retorna erro para posterior retry.

A referência GET também documenta `config.online.callback_url`, `success_url`, `failure_url`, `pending_url` e `auto_return`. Esses campos foram configurados usando `PAYMENTS_RETURN_URL` (opcional; por padrão raiz da origem do site). A URL deve pertencer à origem permitida; o navegador nunca pode escolher o retorno. Ao voltar com `payment_return=1`, o site restaura a sessão, abre Planos e consulta a situação persistida. O parâmetro apenas abre a tela e não concede acesso.

Pedidos `expired` aparecem como cancelados. Reembolso total ou parcial e chargeback, inclusive indicados em transações, seguem a política de reversão congelada na compra. Estados desconhecidos continuam sendo rejeitados. Uma conta de produção só é habilitada explicitamente e deve ter vendedor diferente da conta de teste.

**A integração ainda não foi validada ponta a ponta.** O usuário publicou as duas funções e cadastrou as configurações e o plano no Supabase. As verificações remotas sem autenticação retornaram 401. Falta publicar o frontend em preview e validar uma compra com a conta de teste; a produção não foi habilitada. A referência GET informa que credenciais chamadas “de teste” não são aceitas por esse endpoint: usar contas de teste com as credenciais próprias dessas contas (descritas pela referência como production credentials do usuário de teste). A variável `MERCADOPAGO_ACCESS_TOKEN_TEST` recebe a credencial da **conta de teste**, nunca a credencial da conta vendedora real. Conferir a conta selecionada no painel antes de cadastrar qualquer token; não enviar o valor no chat.

## Testes

Executados nesta etapa:

- `npm test`: **53 passaram** (37 originais + 16 de pagamentos com dependências injetadas).
- `npm run build:pages`: passou.
- Deno 2.9.6, `deno check --no-lock` das duas funções: passou após corrigir o tipo do callback de log.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:cloud`: **2 passaram**, autenticação existente e fluxo de pagamentos. Usa SDK real com serviços HTTP simulados. Cobriu login, falha inicial/retry com mesma chave, URL de checkout, retorno sem concessão por query string, atualização da situação, recarga, outro dispositivo e layout de celular.
- Sete testes selecionados de estudo/autenticação no navegador: **7 passaram**, após recompilar sem a configuração fictícia do teste cloud.
- `bash tests/sql/run-payments.sh`: passou no PostgreSQL 16 descartável, com as três migrations. A prontidão do runner foi corrigida para aguardar o processo PostgreSQL definitivo, evitando o servidor temporário usado na inicialização. Cobriu estados, duplicata sem prorrogação, divergência de valor/moeda/ambiente, RLS, usuário diferente, escrita/concessão proibida, snapshots, expiração, reembolso/chargeback, políticas, timestamps iguais, payload congelado, vinculação da order e preservação do progresso do outro app.

Na etapa anterior, a suíte completa de UI teve 7 aprovações e 5 falhas de expectativas antigas (seções fechadas/visibilidade e seletor antigo `#clock`). Essas cinco não foram modificadas nem declaradas resolvidas. Após testes cloud, é necessário recompilar antes dos testes Node/SQLite: o teste cloud gera dist com configuração fictícia Supabase. Não executar as duas suítes de navegador ao mesmo tempo, pois compartilham `test-results`.

**Nenhum pagamento ponta a ponta no Mercado Pago foi testado.** Testes simulados/SQL não comprovam aceitação do payload, disponibilidade da API, esquema GET, ambiente, credenciais, webhook hospedado ou checkout real. Também falta validar reversões totais/parciais e expiração no fluxo remoto; a lógica local desses estados passou nos testes.

## Configuração privada no Supabase

Cadastrar no painel seguro de Secrets das Edge Functions (não no chat, frontend, Git, variáveis VITE ou scripts versionados):

- `MERCADOPAGO_ACCESS_TOKEN_TEST`
- `MERCADOPAGO_WEBHOOK_SECRET_TEST`
- `MERCADOPAGO_SELLER_ID_TEST`: ID do vendedor esperado na resposta consultada.
- `MERCADOPAGO_APPLICATION_ID_TEST`: ID da aplicação da conta de teste. Em produção, usar `MERCADOPAGO_APPLICATION_ID_PROD`. O nome comum `MERCADOPAGO_APPLICATION_ID` também é aceito como fallback para instalações existentes.
- `PAYMENTS_APP_ORIGIN`: origem exata permitida, por exemplo `https://bora-pro-enem.pages.dev`.
- `PAYMENTS_RETURN_URL` (opcional): endereço completo da página do app nessa mesma origem. Para uma instalação em subpasta, incluir o caminho correto.
- `MERCADOPAGO_ENVIRONMENT`: `test` inicialmente (padrão). Nunca escolhido pelo navegador.

Somente ao ativar pagamentos reais, cadastrar `MERCADOPAGO_ACCESS_TOKEN_PROD`, `MERCADOPAGO_WEBHOOK_SECRET_PROD`, `MERCADOPAGO_SELLER_ID_PROD` e selecionar `production` no backend. Os IDs de vendedor/aplicação e origem não são credenciais secretas, mas precisam de configuração confiável do servidor. A conta de teste e a conta real devem ser diferentes. Em produção, também é obrigatório manter o ID do vendedor de teste e cadastrar `MERCADOPAGO_PRODUCTION_ENABLED=true`; sem essa ativação explícita a função recusa criar pagamentos reais. Um runtime atende apenas ao ambiente selecionado; ao mudar para production, ele deixa de aceitar assinaturas de teste.

As funções usam `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no runtime privado Supabase. Nenhuma chave administrativa vai para o cliente. O frontend mantém apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` pública. Na última inspeção não havia variáveis de pagamentos/Supabase exportadas nesta máquina. O acesso Git pelo proxy já funciona; não solicitar token GitHub.

## Publicação futura — não executada

Com Supabase CLI, acesso de implantação autorizado e Secrets configurados em teste:

```sh
cd /workspace/repositorio-estudos/enem
supabase link --project-ref oeblcfrygdrywdorengz
supabase db push --dry-run
# Conferir o histórico remoto e a lista completa de migrations antes de aplicar.
supabase db push
supabase functions deploy create-mercadopago-order
supabase functions deploy mercadopago-webhook
```

`verify_jwt=false` já está no config; não remover a verificação explícita de aluno na criação. O esquema de progresso existente fica em `supabase/schema.sql` e deve estar previamente instalado conforme as instruções existentes. Não aplicar esse arquivo às cegas como substituto de revisar o histórico remoto.

URL **prevista**, não publicada:
`https://oeblcfrygdrywdorengz.supabase.co/functions/v1/mercadopago-webhook`

No Mercado Pago: aplicação Bora-Pro-ENEM → Configuração de Webhooks → **Teste** → URL acima → evento **Order (Mercado Pago)** → Salvar. Guardar a assinatura secreta em `MERCADOPAGO_WEBHOOK_SECRET_TEST`. Usar contas/cartões de teste oficiais; não realizar cobranças reais. O simulador do painel pode não localizar uma order real: erro nesse caso não comprova sucesso de pagamento.

Antes de produção, validar: aprovado, pendente, recusado, cancelado, assinatura inválida, duplicata, alteração de preço, outro aluno, concessão sem pagamento, retorno, recarga, outro dispositivo, falha temporária, expiração e reversão conforme política. Só depois publicar frontend Cloudflare, configurar webhook/credenciais de produção e ativar planos comerciais. Nenhuma credencial privada foi exposta nesta entrega.

As instruções reutilizáveis `start_skill` foram atualizadas no rascunho do ambiente. O salvamento foi confirmado; isso não publica o ambiente nem executa implantação. O usuário pode revisar/salvar o rascunho e publicar nas configurações do ambiente quando a publicação estiver disponível. Esse passo é separado da implantação do site.

## Atualização comercial e configuração assistida

O usuário definiu R$ 14,90 com acesso até o fim de 31/12/2026 (Brasília). O limite exclusivo persistido é `2027-01-01T03:00:00Z`, cobrindo todo o dia 31/12. A migration `202611020004_enem_fixed_access_expiry.sql` permite validade absoluta ou prazo em dias, com exatamente uma regra em cada plano/compra; preserva o prazo das compras anteriores. A concessão não cria acesso se a confirmação chegar após a data final. O checkout novo usa expiration_time limitado à data final. Pagamento creditado após o prazo permanece registrado, sem acesso, para tratamento/reembolso administrativo conforme política; não há reembolso automático implementado.

O arquivo `/workspace/entrega-pagamentos/configurar-plano-1490.sql` atualiza a estrutura já instalada e cadastra o plano aprovado, em uma transação. O script foi testado sobre as três migrations anteriores em PostgreSQL descartável e não altera as tabelas de estudo. A política inicial continua `revoke` para reversões. O usuário executou esse script no Supabase e confirmou Success. Não cadastrar novamente a estrutura inicial. O usuário republicou o helper atualizado na função de criação e confirmou Success.

Nesta etapa passaram 55 testes locais (incluindo limite exato, fuso de Brasília, snapshots e validade fixa), SQL com as quatro migrations e o script incremental de cadastro. As duas Edge Functions foram publicadas manualmente pelo usuário e recusaram com HTTP 401 chamadas sem login/assinatura. Isso valida apenas a rejeição inicial, não um pagamento ponta a ponta. O usuário cadastrou seis nomes de configuração no painel privado; não vimos os valores secretos. O frontend atualizado ainda não foi publicado e não há pagamento real/sandbox completo validado.

## Publicação do frontend

A Cloudflare Pages está conectada ao repositório GitHub, com main como produção e deploy automático. A integração será enviada apenas para a branch feat/enem-mercadopago-checkout, para preview. Não fazer merge/push na main antes da validação. O backend atualmente aceita somente a origem configurada em PAYMENTS_APP_ORIGIN (bora-pro-enem.pages.dev); para testar checkout em um preview, configurar temporariamente essa variável com a origem exata do preview e usar o mesmo domínio no retorno. Não usar wildcard de origens. Após testes e antes da publicação final, restaurar a origem pública. Configurações públicas Supabase precisam estar disponíveis também no build de preview. Nenhuma chave privada deve ir para o Cloudflare.
