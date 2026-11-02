# Reta Final ENEM

**Para hospedar gratuitamente com login e sincronização, siga [GRATUITO.md](GRATUITO.md): GitHub Pages + Supabase Free.** A integração usa autenticação e PostgreSQL com RLS, sem servidor Node pago. As instruções abaixo descrevem também a alternativa Node/SQLite.

Aplicativo de estudo em português com contas, progresso sincronizado e banco SQLite persistente. Inclui plano de 14 dias, treino por área e nível, simulados, redação com 12 propostas, cronômetro e desafios com Capitu e Guapa.

## Executar no computador

Requer **Node.js 24.10+** (testado em 24.19.0). O servidor usa `node:sqlite`, sem banco externo ou chave de API.

```bash
cd /workspace/repositorio-estudos/enem
npm ci
npm run build
npm start
```

Acesse a porta 3000. O mesmo servidor entrega a interface e a API. O banco é criado em `var/enem.sqlite`, ignorado pelo Git. Encerrar e iniciar o servidor preserva contas e progresso.

Para desenvolver com recarga automática, use dois terminais nesta pasta:

```bash
npm run dev:server
```

```bash
npm run dev
```

O Vite encaminha `/api` ao servidor da porta 3000. `npm run preview` mostra a compilação estática; para usar contas, prefira `npm start`, que também entrega a API.

## Conta e sincronização

Clique em **Entrar / Criar conta**, informe nome, e-mail e uma senha de 10 a 128 caracteres. O e-mail é identificador de login: esta versão não envia e-mail nem verifica sua titularidade. Guarde o **código de recuperação** exibido ao cadastrar; ele permite trocar a senha pelo menu **Esqueci minha senha**, sem serviço de e-mail. Um código usado é substituído por outro. Na conta, também é possível alterar a senha e gerar novo código, invalidando o anterior. Sem senha e sem código, não há recuperação automática.

Entre com a mesma conta na mesma instalação hospedada para estudar em outros dispositivos. Plano, respostas, redações por tema, checklists, desafios, missões e sessões de simulado ficam associados à conta. O cronômetro de foco é local à aba; o prazo do simulado fica no progresso.

O rodapé distingue salvamento local, sincronização pendente, sucesso e conflito. Alterações são enviadas após uma pausa breve; outros dispositivos consultam atualizações a cada 15 segundos e ao retornar à janela. Edições sem conexão ficam em uma cópia local vinculada à conta e são reenviadas quando possível. O carregamento inicial da página ainda exige conexão; isto não é um aplicativo offline instalável.

Quando dois dispositivos alteram a mesma versão, o servidor recusa a sobrescrita. Abra sua conta, baixe uma cópia se necessário e escolha explicitamente entre a versão da conta e a deste dispositivo. A escolha substitui o progresso completo; não há mesclagem automática de redações. Evite editar simultaneamente o mesmo estudo em dois dispositivos.

O estudo visitante antigo permanece separado. Após entrar, use **Importar estudo anterior deste navegador** para substituí-lo na conta, com confirmação. **Baixar cópia do progresso** exporta JSON para conservação; não há importação de arquivos JSON nesta versão. A limpeza dos dados do navegador pode remover edições ainda não sincronizadas.

Senhas usam scrypt com salt aleatório. Sessões usam cookies HttpOnly/SameSite; em produção, Secure. O banco guarda somente hashes dos tokens de sessão e recuperação. Há verificação de origem, limite de corpo e limite de tentativas por IP. Ao mudar ou recuperar a senha, as outras sessões são encerradas. Dados de cada conta são consultados pelo usuário da sessão, nunca por um identificador fornecido pelo navegador.

## Questões reais e níveis

- **72 questões reais do ENEM 2023**, dezoito por área, com enunciado, alternativas, imagens locais, gabarito, explicação e referência em texto (ano, aplicação, dia, caderno e número).
- Três níveis **editoriais**: fácil, médio e difícil, com seis questões por área em cada nível. Não são níveis oficiais do INEP nem parâmetros da TRI.
- Os **20 itens autorais** anteriores continuam disponíveis no filtro de revisão, preservando os índices do progresso existente.
- Simulados novos usam somente questões reais: 10 ou 20 questões por nível ou com níveis misturados, sem repetição dentro de uma sessão. Há 24 questões em cada nível, suficientes para uma sessão de 20 sem repetição.
- Resultado em acertos, sem previsão de nota TRI. O tempo segue correndo ao fechar a página; uma sessão expirada é finalizada ao voltar.

Fonte comunitária: [API ENEM de yunger7](https://github.com/yunger7/enem-api). Proveniência, critérios e limitações em [QUESTION-SOURCES.md](QUESTION-SOURCES.md). Os dados importados são distribuídos com sua licença GPL-2.0, preservada em `public/licenses/`. Não há chamada externa à API durante o estudo. A seleção foi revisada para evitar imagens ausentes e alternativas duplicadas detectadas; não substitui conferência dos PDFs oficiais em caso de divergência.

Redações e desafios continuam autorais. Não há correção automática de redação. Missões renovam pelo horário de São Paulo, sem ranking ou penalidade por descanso.

## Validar

```bash
npm test
npm run build
# Instale o navegador do Playwright uma vez, se necessário:
npx playwright install chromium
npm run test:e2e
```

Em uma máquina com Chromium instalado, use `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`. Os testes de navegador usam um banco temporário e servidor na porta 3100. Testes da API cobrem duas sessões, isolamento entre contas, concorrência, reinício do servidor, recuperação de senha e encerramento de sessões. Os testes de navegador verificam sincronização, conflito após edição offline, filtros, imagens, simulados e tela móvel.

## Colocar no ar para usar em vários dispositivos

**No modo Node/SQLite, GitHub Pages não executa este servidor. Para usar o modo gratuito Supabase no GitHub Pages, siga [GRATUITO.md](GRATUITO.md).** Publicar o ambiente de desenvolvimento também não hospeda o aplicativo publicamente. É necessário um serviço Node.js com HTTPS e **disco persistente**, ou um contêiner com volume persistente. Use uma única instância do servidor com SQLite; não distribua o mesmo arquivo por múltiplas réplicas.

Há um exemplo de configuração do Render em [`../render.yaml`](../render.yaml), na raiz do repositório. Ele usa um plano com disco persistente, que é **pago**: confira preços antes de criar o serviço. Nenhum serviço foi criado ou publicado por esta alteração.

1. Envie as alterações ao seu repositório e conecte-o ao Render.
2. Use a configuração fornecida, com diretório raiz `enem`.
3. Configure `APP_ORIGIN` com a origem HTTPS exata do site, por exemplo `https://seu-servico.onrender.com`, sem caminho nem barra final.
4. Preserve o disco em `/var/data`; `DATABASE_PATH=/var/data/enem.sqlite`.
5. Verifique `/api/health`, crie uma conta e entre em um segundo dispositivo para conferir o progresso.

Variáveis:

| Nome | Uso |
| --- | --- |
| `PORT` | Porta HTTP do servidor; padrão 3000. |
| `DATABASE_PATH` | Arquivo SQLite em disco persistente; padrão `var/enem.sqlite`. |
| `NODE_ENV` | `production` ativa cookie Secure e exige origem HTTPS. |
| `APP_ORIGIN` | Origem pública HTTPS exata, obrigatória em produção; protege operações contra requisições de outros sites. |

O `Dockerfile` também prepara a aplicação. Monte um volume em `/data` e forneça `APP_ORIGIN`, com HTTPS terminado por um proxy confiável. Banco e backups contêm dados pessoais; restrinja acesso ao disco. Não use disco efêmero: ele perde contas ao recriar o serviço.

### Backup e restauração

```bash
npm run backup
# Ou destino explícito, com DATABASE_PATH apontando para o banco correto:
npm run backup -- /caminho/seguro/enem-backup.sqlite
```

O backup usa a API SQLite para obter uma cópia consistente, inclusive com o servidor ativo. O destino padrão é `backups/`, ignorado pelo Git. Guarde cópias fora do disco do servidor e programe backups na hospedagem. Para restaurar: pare o servidor, preserve o banco atual e seus arquivos `-wal`/`-shm`, coloque o backup no caminho `DATABASE_PATH` sem arquivos auxiliares antigos e reinicie. O backup inclui contas e sessões; trate-o como dado privado.

### Compilação estática

`npm run build:pages` continua gerando HTML com JavaScript e CSS embutidos; as imagens devem ser publicadas junto com as pastas de `dist/`. Com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` configuradas, esse modo oferece contas e sincronização pelo Supabase no GitHub Pages. Sem essas variáveis, o GitHub Pages oferece apenas estudo visitante; o backend SQLite requer servidor. Não substitua o site atual esperando que o banco funcione sem o servidor.

## Redesign Bora pro ENEM

Layout baseado no SVG fornecido pelo usuário, preservado em `design/bora-pro-enem-redesign.svg`: navegação lateral verde no desktop, menu e atalhos inferiores no celular, progresso real, treino recomendado de dez questões de Linguagens e revisão de quinze minutos. Capitu, Guapa, missões, desafios, simulados, contas e as chaves de armazenamento existentes foram preservados.

No treino de questões, selecionar uma alternativa apenas a destaca; **Confirmar resposta** registra a escolha e apresenta a resolução. A seleção do treino recomendado dura na aba, mas suas respostas confirmadas continuam salvas. Questões respondidas anteriormente podem reaparecer e entram no resumo sem apagar o registro. Os dias de prática contam datas com atividade registrada, sem simular uma sequência ou impor penalidade por pausa. Revisão rápida prepara o cronômetro para quinze minutos; iniciar e pausar continuam sendo decisões do estudante.

Validação: compilação, 27 testes de dados/API/configuração, seis testes de navegador (incluindo contas, sincronização, conflitos, simulados, confirmação e navegação móvel) e teste de integração Supabase com respostas simuladas. O teste simulado não comprova disponibilidade nem configuração de um projeto Supabase hospedado.

## Interações das mascotes e desafios

Capitu e Guapa podem ser acionadas por botões identificados, com mensagens visíveis e anunciadas para leitores de tela. Nos desafios, a Guapa abre uma pista específica. O botão Ouvir usa a síntese de voz do navegador e permite interromper; a conversa escrita continua disponível quando não há suporte ou a reprodução falha. A voz depende do dispositivo e é encerrada ao trocar de tela.

Selecionar uma alternativa de desafio não registra uma resposta até confirmar. Novas conquistas e a missão diária de vencer um desafio só são concedidas após acerto; errar oferece explicação e nova tentativa. Jogar novamente não apaga conquistas já salvas. Registros e conquistas das versões anteriores são preservados.

## Duração personalizada do plano

Em Meu plano, escolha a duração (1 a 180 dias) e a data inicial e clique em Aplicar meu plano. O padrão continua sendo 14 dias. Prazos curtos agrupam as 14 atividades-base; prazos longos acrescentam revisões espaçadas desses conteúdos, mantendo a preparação final no último dia. Não há geração automática de novos conteúdos exclusivos para cada dia adicional.

A conclusão é armazenada por atividade estável (`planUnitsDone`); `done` reflete os dias totalmente concluídos no prazo atual. O progresso antigo de 14 dias é convertido sem apagar atividades concluídas. Reduzir o prazo não apaga revisões adicionais já feitas: elas reaparecem ao ampliar o plano novamente. O número de dias concluídos pode mudar com o reagrupamento. A duração e as atividades acompanham a sincronização da conta existente; não é necessário alterar o banco.

## Sequência, feedback e novos ciclos

Novos dias só podem ser marcados como concluídos quando todos os anteriores estiverem concluídos. A regra é validada tanto no botão quanto na função que altera o progresso. Todos os conteúdos continuam disponíveis para leitura. Dias concluídos antes dessa regra são preservados; se houver lacunas, termine-as antes de marcar novos dias. Desfazer um dia reabre a etapa sem apagar as conclusões posteriores.

Alterar a duração ou a data inicial recalcula o roteiro ao sair do campo; Aplicar meu plano também funciona. O painel mostra dias concluídos/restantes, atividades do roteiro atual e planos finalizados no histórico guardado. Cada conclusão informa as atividades terminadas. Ao completar tudo, há um aviso persistente com sugestões de novos ciclos de 7, 14 ou 30 dias. As sugestões repetem o roteiro-base com agrupamento ou revisões espaçadas; não são conteúdos novos gerados automaticamente.

Um novo ciclo só começa após seleção e confirmação explícitas. O anterior é arquivado em `planHistory` (até 20 registros recentes). Respostas, redações, conquistas e demais estudos ficam preservados; apenas as atividades do ciclo ativo começam em zero. O histórico é salvo e sincronizado junto ao restante do progresso, sem migração do banco.
