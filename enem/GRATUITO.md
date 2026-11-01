# Usar sem hospedagem paga

O aplicativo agora suporta **GitHub Pages + Supabase Free**: a página continua estática e o Supabase mantém autenticação e banco. Não é necessário contratar Render nem disco. O servidor SQLite permanece como alternativa local; contas SQLite e Supabase são instalações independentes.

## 1. Criar o projeto gratuito

1. Abra https://supabase.com/dashboard e entre com GitHub.
2. Crie uma organização no plano **Free**, se solicitado.
3. Clique em **New project**, escolha a organização e nomeie `reta-final-enem`.
4. Defina uma senha de banco forte no próprio Supabase e guarde-a. **Não envie essa senha ao chat nem ao GitHub.**
5. Escolha uma região próxima e crie o projeto. Não faça upgrade para plano pago.

## 2. Preparar o banco

Abra **SQL Editor → New query**. Cole o conteúdo completo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Esse arquivo cria a tabela exclusiva `enem_study_progress`, as funções de sincronização e as políticas que restringem cada pessoa aos próprios dados. Pode ser executado novamente sem apagar os dados. Uma tabela preexistente chamada `study_progress`, inclusive com colunas `app_id` e `state`, permanece intacta. Não desative **Row Level Security (RLS)**.

## 3. Conectar o site

No projeto Supabase, abra **Connect** ou **Project Settings → API / API Keys** (os nomes podem variar). Copie somente:

- **Project URL**, no formato `https://seu-projeto.supabase.co`.
- **Publishable key** (`sb_publishable_…`), ou a chave pública legada **anon**.

Esses dois valores são públicos e serão usados pelo navegador. Nunca use **service_role**, **secret key**, `sb_secret_…` ou a senha do banco. A compilação recusa essas chaves administrativas.

No GitHub, abra `Lorenzo123600/repositorio-estudos` → **Settings → Secrets and variables → Actions → Variables**. Crie duas **Repository variables**:

| Nome | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key ou anon |

No Supabase, em **Authentication → URL Configuration**, configure:

- **Site URL:** `https://lorenzo123600.github.io/repositorio-estudos/enem/`
- **Redirect URLs:** adicione exatamente `https://lorenzo123600.github.io/repositorio-estudos/enem/`.

Mantenha o login por e-mail habilitado. Com confirmação de e-mail ativa, o aplicativo pede confirmação antes de entrar. A recuperação de senha também usa e-mail. O serviço padrão de e-mail do Supabase tem limites e restrições de destinatários: comece com o endereço da sua própria conta Supabase. Para outros usuários, pode ser necessário configurar SMTP conforme as regras do provedor. Não foi contratado serviço de e-mail.

## 4. Publicar

Os arquivos novos precisam estar no GitHub. Publicar o ambiente do Codex não faz commit nem push do código.

1. Envie estas alterações ao repositório, incluindo `.github/workflows/enem-pages.yml` e a pasta `enem`.
2. Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.
3. Abra **Actions → Publicar ENEM gratuito → Run workflow**, selecionando a branch com as alterações (normalmente `main`).
4. Aguarde os passos terminarem. A publicação usa as ações oficiais do GitHub Pages e preserva as outras páginas da branch `gh-pages`, substituindo apenas o conteúdo de `/enem/` no site publicado.
5. Acesse https://lorenzo123600.github.io/repositorio-estudos/enem/.

A ação é manual: apenas salvar os arquivos não publica nada. O projeto Supabase também precisa ser criado e receber o SQL antes de login/sincronização funcionarem.

## 5. Conferir

Crie uma conta, confirme o e-mail e entre. Marque um dia do plano e aguarde **Sincronizado com sua conta**. Entre com a mesma conta em outro dispositivo e confira o dia concluído. Se já estudava no modo visitante, abra a conta e use **Importar estudo anterior deste navegador** com confirmação. O progresso anterior não é apagado automaticamente.

Use **Esqueci minha senha** para receber um link. Ao abrir esse link, o aplicativo mostra o formulário de nova senha. No modo Supabase, não há código de recuperação local.

O plano Free tem limites e pode pausar projetos por inatividade, conforme as condições atuais do Supabase. Não há cobrança contratada por esta configuração. Mantenha cópias de seus textos e use a exportação de progresso da conta; não dependa de backups gerenciados pagos.

## Desenvolvimento e testes

Para testar com o SEU projeto: copie `.env.example` para `.env.local`, preencha apenas URL e chave pública, e execute `npm run dev`. Para desenvolvimento, adicione a URL local exata em **Redirect URLs** do Supabase. Sem essas variáveis, a alternativa local Node/SQLite continua funcionando.

```bash
npm test
npm run build
CHROMIUM_PATH=/usr/bin/chromium npm run test:cloud
npm run test:sql
```

`test:cloud` exercita o SDK real no navegador com respostas HTTP simuladas, sem acesso ao Supabase hospedado. `test:sql` requer Docker local e testa o esquema em PostgreSQL temporário sem rede: aplicação repetida, RLS, recusa de acesso anônimo, isolamento entre duas contas e conflitos de revisão. Esses testes não comprovam configuração, entrega de e-mail ou disponibilidade de um projeto externo: isso deve ser conferido após os passos acima.
