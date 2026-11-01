# Sincronização Supabase (ENEM + Prumo)

## Configurar sem publicar mudanças antes de validar

1. No painel do projeto Supabase `oeblcfrygdrywdorengz`, abra **SQL Editor** e execute `supabase/migrations/001_study_progress.sql`.
2. Em **Authentication > Providers > Email**, deixe Email habilitado. Configure confirmação de e-mail conforme desejado. Cadastre a conta do estudante por **Criar conta** em um dos aplicativos; se a confirmação estiver ligada, confirme o e-mail antes de entrar.
3. No Supabase, confirme que **RLS** está ativado em `public.study_progress`. Não adicione service_role no código.
4. Public URL: `https://oeblcfrygdrywdorengz.supabase.co`. A chave `sb_publishable_...` é pública e está configurada em `cloud-sync.js` e `enem/src/cloud-sync.js`. Se o projeto for trocado, ajuste ambos os arquivos.
5. O mesmo e-mail/senha funciona nos dois apps; dados isolados por `app_id`.
6. Teste na branch antes de aprovar o PR. GitHub Pages continua apontando para `main`.

## Preservação de dados e resolução de conflito

- O app continua gravando o estado original imediatamente no localStorage.
- A primeira autenticação tira um backup local separado (`study-backup:<app>:<timestamp>`).
- Se não houver registro remoto, migra o estado local; se houver remoto mas não houver alterações locais, traz o remoto.
- Caso ambos tenham progresso ou haja edição simultânea, **bloqueia o envio** e oferece ações explícitas: **Usar dados locais** (substitui remoto apenas após verificar revisão) ou **Usar dados da nuvem** (mantém backup local antes de substituir). Não há mesclagem automática de itens.
- Offline e em erro temporário: alterações permanecem locais e a sincronização é reexecutada ao reconectar.
- Não limpe cache/localStorage antes de confirmar a migração. A versão original dos dados é preservada em backup.
- As tentativas de login usam sessão local; evite usar em computador compartilhado.

## Checklist manual obrigatório antes de produção

- [ ] Conta nova, sem progresso: criar conta, entrar, estudar e atualizar página.
- [ ] Dados legados existentes: entrar, conferir backup e migração.
- [ ] Desconectar internet, estudar, reconectar: verificar sincronização.
- [ ] Entrar com a mesma conta em outro dispositivo.
- [ ] Dois dispositivos editando: confirmar bloqueio de conflito e backups.
- [ ] Simular falha temporária do Supabase.
- [ ] Confirmar que outro usuário não lê nem escreve progresso alheio.
- [ ] Conferir que ENEM/Prumo permanecem distintos e que questões, provas e redações funcionam.
- [ ] Conferir responsividade e URLs públicas.

## Riscos/limitações

- O modelo atual salva uma fotografia JSON completa por aplicativo, não um log imutável de tentativas. Histórico só é persistido se existir no estado de origem.
- Alterações simultâneas requerem decisão manual, sem mescla automática.
- Prumo não salva simulado ainda em andamento no estado original; essa funcionalidade não foi alterada.
- Concluir os testes end-to-end exige o SQL aplicado e duas sessões reais; o conector GitHub sozinho não executa SQL no Supabase.
