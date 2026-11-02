# Verificação de marca do Google OAuth

Nome do aplicativo: `bora pro enem` (mesma grafia na tela de consentimento e na página inicial).

- Página inicial pública: https://bora-pro-enem.pages.dev/
- Política pública: https://bora-pro-enem.pages.dev/privacidade
- Contato de suporte e privacidade: manualdeumgamer25@gmail.com

## Publicação e reenvio

1. Publique este código no projeto Cloudflare Pages existente. A edição comercial usa `CF_PAGES=1` e exige as configurações públicas do Supabase. Não use as configurações fictícias dos testes em produção.
2. Abra os dois endereços em janela anônima e confira que a apresentação e a política são acessíveis sem login. Confirme que o Cloudflare Access não exige autenticação nessas páginas.
3. Em Google Auth Platform → Branding (ou Tela de consentimento OAuth), use o nome e os endereços acima. Confira também os contatos do desenvolvedor.
4. No Google Search Console, adicione a propriedade de prefixo de URL `https://bora-pro-enem.pages.dev/` usando uma conta autorizada para o projeto Google Cloud. Use o arquivo HTML ou a meta tag de verificação fornecidos pelo próprio Google. Para arquivo HTML, coloque o arquivo original em `enem/public/` e publique novamente; para meta tag, insira a tag exata em `enem/index.html`, dentro de `<head>`, e publique. Não substitua por um código inventado.
5. Conclua a verificação no Search Console, aguarde pelo menos 24 horas conforme o aviso e solicite nova verificação no Google Cloud.

A alteração do site não comprova a propriedade automaticamente e não garante aprovação. Este repositório não contém o token individual do Search Console nem acesso de configuração ao projeto Google Cloud.
