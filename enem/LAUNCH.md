# Preparação da venda — edição ENEM 2026

Oferta aprovada: **R$ 14,90, pagamento único, até 31/12/2026 às 23h59 de Brasília**.
O limite exclusivo no banco é `2027-01-01T03:00:00Z`. Não há renovação automática.

## Implementado nesta branch

- Oferta com preço, prazo, conteúdo incluído, suporte e links para termos e privacidade.
- Demonstração de três questões oficiais com resolução, sem alterar o progresso salvo.
- Build comercial sem o banco textual completo nos arquivos públicos; entrega autenticada pela Edge Function.
- No modo Supabase, navegação completa condicionada a acesso de produção ativo e vigente.
- Acesso consultado novamente após compra, retorno de foco e periodicamente; troca de conta,
  expiração ou falha de verificação não mantêm acesso por um valor salvo no navegador.
- Contas locais Node/SQLite continuam disponíveis para desenvolvimento; não representam a edição comercial hospedada.

## Pendências que impedem declarar a venda pronta

1. **Implantar a entrega protegida**: o novo comando `npm run build:sales` publica
   somente a demonstração e o código da interface. O banco completo de questões, os
   planos e os temas de redação vêm da nova Edge Function `study-content`, que valida
   Auth e `enem_has_paid_access()` no servidor. A função foi publicada via Management API e consta ACTIVE (versão 1); chamada anônima retornou 401 login_required. O frontend comercial ainda precisa ser publicado.
   `npm run build` e `build:pages` continuam sendo builds de desenvolvimento: não usá-los
   para publicar a edição comercial. As imagens das questões permanecem públicas.
2. **Teste remoto completo**: ainda não foi concluída uma compra de teste no Mercado Pago
   com confirmação assinada no webhook hospedado, compra persistida e acesso de teste
   correspondente. Os testes locais usam serviços simulados.
3. **Credenciais/configuração e publicação**: o token pessoal do Supabase foi configurado e validado por consulta à Management API. Não há acesso administrativo à Cloudflare ou ao Mercado Pago nesta sessão. A implantação atual do preview é `5eefd93`;
   as alterações desta branch ainda não foram enviadas/publicadas.

## Sequência de implantação

Não fazer merge em `main` nem ativar produção antes da validação remota.

1. Permitir no ambiente Codex os domínios `004c46c6.bora-pro-enem.pages.dev` e
   `oeblcfrygdrywdorengz.supabase.co`. Ambos já foram adicionados ao rascunho;
   salvar/publicar o ambiente é separado de publicar o site.
2. No Supabase, conferir `create-mercadopago-order` e `mercadopago-webhook`, as migrations
   existentes e o catálogo: um plano ativo de R$ 14,90 em BRL com a validade aprovada.
   Não repetir migrations ou scripts já aplicados sem conferir o histórico remoto.
3. Manter `MERCADOPAGO_ENVIRONMENT=test`. Configurar os nomes privados listados em
   `PAYMENTS-STATUS.md` no painel de Secrets do Supabase. Não enviar valores ao chat,
   ao Git ou às variáveis `VITE_*`.
4. Para o preview atual, `PAYMENTS_APP_ORIGIN` deve ser exatamente
   `https://004c46c6.bora-pro-enem.pages.dev`. Se houver `PAYMENTS_RETURN_URL`, usar
   essa mesma origem, por exemplo `https://004c46c6.bora-pro-enem.pages.dev/`.
   Um novo deployment pode gerar outro domínio: atualizar ambos antes do teste.
5. Cloudflare deve usar **`npm run build:sales`**, diretório raiz `enem`, saída `dist`.
   Precisa de `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
   também no build de preview. Somente chave pública; nenhuma chave administrativa.
   Um build sem configuração Supabase executa o modo local, não a edição comercial.
6. Gerar e publicar a função protegida antes de publicar o frontend comercial:

   ```sh
   cd /workspace/repositorio-estudos/enem
   node scripts/prepare-commercial-content.mjs
   supabase functions deploy study-content --project-ref oeblcfrygdrywdorengz
   ```

   A função usa os nomes padrão privados `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   e `SUPABASE_ANON_KEY`, além de `PAYMENTS_APP_ORIGIN`. Não copiar o arquivo
   `supabase/functions/_shared/study-content.json` para `public/` ou `dist/`.

7. Configurar no Mercado Pago o evento Order de teste para
   `https://oeblcfrygdrywdorengz.supabase.co/functions/v1/mercadopago-webhook`.
   Com conta e meio de pagamento oficiais de teste, verificar criação, checkout,
   retorno pendente, webhook, aprovação no banco, repetição sem duplicar acesso e reversão.
   Um acesso de teste não deve desbloquear a edição de produção.
8. Após resolver os bloqueios, publicar a branch validada em produção e restaurar
   `PAYMENTS_APP_ORIGIN` e retorno para o domínio público definitivo. Habilitar
   credenciais/IDs de produção e `MERCADOPAGO_PRODUCTION_ENABLED=true` somente nessa etapa.
   Conferir preço, prazo, suporte, login e entrega de acesso no domínio definitivo.

## Validação local

Na pasta `enem/`, com Node.js >=24.10:

```sh
npm ci
npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:cloud
CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config playwright.sales.config.js
bash tests/sql/run-payments.sh
npm run build
```

O teste SQL usa PostgreSQL 16 descartável via Docker, sem alterar o Supabase remoto.
O teste cloud compila com um Supabase fictício e serviços HTTP simulados; recompilar
depois sem essas fixtures antes de iniciar o modo Node/SQLite.
Não executar simultaneamente suítes de navegador que compartilham `dist/` e relatórios.

## Verificação remota de 02/11/2026

- Token pessoal funciona na Management API (HTTP 200); projeto ACTIVE_HEALTHY.
- Preview 004c46c6 respondeu HTTP 200.
- study-content publicado, ACTIVE v1; requisição sem login rejeitada com 401 login_required.
- Nomes das configurações de teste do Mercado Pago estão presentes; valores não foram lidos.
- A função create-mercadopago-order está ACTIVE v8, mas as sondagens CORS e sem login expiraram nesta sessão; causa ainda não identificada.
- Nenhum pedido foi criado e nenhum pagamento executado. A publicação do ambiente Codex não foi confirmada; solicitar a mensagem exata do erro.

## Correção da implantação do checkout

A versão 8 publicada de create-mercadopago-order continha o helper, sem o ponto de entrada Deno.serve. Foi preservada uma cópia local do bundle anterior e publicada a entrada completa com o helper como versão 9. A função responde OPTIONS 204 e POST anônimo 401 login_required na origem de preview. O catálogo remoto foi consultado em modo somente leitura: plano ativo BRL 14.90, validade exclusiva 2027-01-01T03:00:00Z.

Cloudflare é detectada automaticamente por CF_PAGES=1: os comandos build e build:pages produzem a edição comercial protegida, sem depender de mudar o comando do painel. O comando build:sales também continua disponível. Na Cloudflare, os chunks precisam permanecer externos; o empacotador Pages agora preserva esses arquivos nesse ambiente.

## Webhook e reconciliação do teste pago

A aplicação do vendedor de teste é 8518590645341952, diferente da aplicação da conta principal 2146208983000223. O webhook deve usar a assinatura da aplicação que criou a order. O webhook recebeu uma notificação automática válida (HTTP 200), confirmando o cancelamento do pedido de teste antigo; as simulações do painel foram recusadas por assinatura. Não foi desabilitada a validação HMAC.

A migration 202611020005_enem_webhook_receipts.sql e a função mercadopago-webhook v11 registram somente status, etapa e presença de campos; sem corpo, assinatura, tokens ou dados pessoais. Testes SQL, os 18 testes de pagamentos e deno check passaram após a instrumentação.

O pedido pago foi reconciliado por tarefa administrativa temporária restrita ao ID exato e ao ambiente test. A tarefa consultou GET /v1/orders com as credenciais privadas do runtime, reutilizou verifiedOrder para conferir vendedor, aplicação, moeda, valor, referência e provenance e chamou a RPC privada existente. O provedor retornou processed/accredited; o banco persistiu approved, environment=test, e acesso test ativo até o limite exclusivo 2027-01-01T03:00:00Z. A tarefa e sua chave efêmera foram removidas após execução. Nenhuma aprovação foi simulada no banco.

Ainda falta provar a aprovação automática de uma NOVA compra de teste criada após a configuração correta do webhook. O caso reconciliado não comprova essa etapa. A edição paga exige acesso production; acesso test não deve desbloqueá-la. Não ativar cobranças reais antes dessa validação.

## Compra de teste com confirmação automática validada

A compra criada em 02/11/2026 às 17:01:25 UTC foi aprovada pelo provedor em 17:01:55 UTC e confirmada automaticamente pelo webhook em 17:02:01 UTC (HTTP 200). O banco registrou approved, environment=test e acesso de teste active. Não houve reconciliação administrativa nessa compra. Isso substitui a pendência anterior de demonstrar uma aprovação automática nova.

Na preparação de produção, faltavam os nomes MERCADOPAGO_ACCESS_TOKEN_PROD, MERCADOPAGO_WEBHOOK_SECRET_PROD, MERCADOPAGO_SELLER_ID_PROD, MERCADOPAGO_APPLICATION_ID_PROD e MERCADOPAGO_PRODUCTION_ENABLED. Solicitar somente o primeiro passo necessário na conta principal Cintia/aplicação 2146208983000223; não confundir com TestApp do vendedor de teste. As credenciais reais devem permanecer nos Secrets do Supabase. Não ativar MERCADOPAGO_ENVIRONMENT=production antes de preparar e conferir o conjunto completo e a origem pública. O checkout atual não exclui meios de pagamento, mas a disponibilidade efetiva de Pix depende da configuração e elegibilidade da conta real Mercado Pago e deve ser verificada.

## Preparação final de produção e integração da main

O token real foi validado por GET /users/me (conta sem tag test_user) e a aplicação conferida por GET /applications/2146208983000223. Os IDs de produção conferem, e a assinatura de produção está cadastrada. Após cadastro de chave Pix na conta real, GET /v1/payment_methods passou a retornar pix active/bank_transfer. Não armazenar chaves Pix ou tokens em arquivos do projeto.

O backend foi preparado com MERCADOPAGO_ENVIRONMENT=production, PAYMENTS_APP_ORIGIN=https://bora-pro-enem.pages.dev e PAYMENTS_RETURN_URL=https://bora-pro-enem.pages.dev/, mas MERCADOPAGO_PRODUCTION_ENABLED=false impede cobranças até a conferência da publicação. A ativação final ainda está pendente.

A main recebeu 284 novas questões durante o onboarding. A integração preserva os 92 índices legados e os 284 novos (356 questões oficiais, sendo uma anulada preservada para histórico; 355 oficiais utilizáveis e 20 autorais). O gerador privado resolve os chunks antes de carregar o progresso do aluno; o build comercial remove dist/questions/ e substitui o carregador público. O workflow de publicação também usa build:sales. Testes passaram: 68 unitários, validação dos 284 novos itens/72 legados, três fluxos cloud, dois da edição comercial e três de Pages em subdiretório.
