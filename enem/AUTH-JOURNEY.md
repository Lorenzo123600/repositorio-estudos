# Cadastro e proteção básica

O cadastro comercial agora termina em uma etapa própria, com o e-mail informado,
instruções para confirmar o link e verificar Spam/Lixo eletrônico e um botão para
voltar ao login com o e-mail preenchido. “Já tenho conta” sempre abre o login.
Erros recebem destaque e foco; o formulário mostra quando está enviando. Não há
reenvio automático. A recuperação tem orientação equivalente sem revelar se a conta existe.
O modal é compacto, sem barra visível, preservando a rolagem quando necessária.
Entrar a partir de pagamentos retorna aos planos após autenticar, se ainda não há acesso.

## Cloudflare Pages

O build comercial gera `dist/_headers` com CSP, bloqueio de frames, `nosniff`,
referrer policy, HSTS e bloqueio de câmera/microfone/localização. A CSP permite
scripts locais e conexões somente à própria origem e ao projeto Supabase configurado.
Estilos inline continuam permitidos porque são usados pela interface. O fallback
inicial passou a usar `public/startup.js`, sem código inline nem handlers HTML.
Os cabeçalhos dependem da publicação do build na Cloudflare. GitHub Pages não aplica `_headers`.

Os testes comerciais simulam os cabeçalhos do Cloudflare e o Supabase; cobrem
cadastro, erros, correção de e-mail, login, pagamento, acesso pago, progresso,
revogação, bloqueio de scripts inline e bloqueio de frames.
Não alteram o Supabase de produção nem realizam cobranças.

## Entrega de e-mail (configuração externa)

O aviso sobre Spam ajuda a encontrar a mensagem, mas não altera a reputação do remetente.
No painel do Supabase, conferir Authentication → Email/SMTP Settings e os logs.
Para envio em produção, usar um provedor SMTP com domínio verificado e configurar
SPF/DKIM e DMARC conforme as instruções do provedor. Testar no Gmail após a alteração.
Não colocar credenciais SMTP no frontend nem desativar confirmação de e-mail como atalho.
CAPTCHA/Turnstile exige configuração conjunta no provedor e no frontend; não foi ativado.
