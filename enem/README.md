# repositorio-estudos

# Reta Final ENEM

Aplicativo web de revisão em português, com plano ajustável de 14 dias, 8 questões autorais comentadas, editor de redação com checklist e download, e cronômetro de foco de 25 minutos.

## Executar

Requer Node.js 20.19+ ou 22.12+.

```bash
npm ci
npm run dev
```

## Validar e compilar

```bash
npm test
npm run build
npm run preview
```

O progresso, as respostas e o rascunho ficam no armazenamento local do navegador. Não há servidor de dados, conta ou sincronização entre dispositivos. A limpeza dos dados do navegador remove o progresso. O cronômetro funciona enquanto a página permanece aberta; abas em segundo plano podem sofrer limitação do navegador.

O plano é uma sugestão de estudo, não um calendário oficial. Ajuste a data inicial e confira as datas e o local de prova no cartão do participante do INEP. As questões e o tema de redação são autorais; o app não fornece correção automática de redação ou estimativa da nota TRI.

## Capitu, simulados e desafios

- **Capitu:** mascote capivara desenhada em SVG local, com mensagens de incentivo e missões diárias. Não depende de imagens ou serviços externos.
- **Simulados:** sessões de 10 questões em 30 minutos ou 20 em 60 minutos, com navegação livre, confirmação de entrega, correção comentada e resumo por área. O banco contém 20 questões autorais (5 por área); cada sessão não repete questões, mas sessões e treino compartilham o banco. Sem estimativa TRI.
- **Retomar uma sessão:** abra Simulados no mesmo navegador. Respostas e prazo são salvos; o tempo continua ao fechar ou trocar de aba. Uma sessão expirada é finalizada automaticamente ao retornar. Até 20 resultados ficam no histórico.
- **Desafios:** cinco atividades de revisão com explicação, nova tentativa e cartões baseados nos erros do treino ou de simulados. Após virar um cartão, é possível praticar a questão novamente.
- **Missões:** três questões diferentes, um desafio e um rascunho trabalhado com pelo menos 40 palavras no dia. Renovam no horário de São Paulo; não há penalidade por descanso. Conquistas refletem o progresso salvo, sem ranking.

## Publicação no GitHub Pages

Este aplicativo fica em `/enem/` para preservar o aplicativo UEPG na raiz do repositório.

O site compilado está na branch `gh-pages`. Em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**, branch **gh-pages**, pasta **/ (root)**, e salve.

Endereço esperado após o GitHub concluir a publicação: https://lorenzo123600.github.io/repositorio-estudos/enem/

Para atualizar os arquivos compilados, execute `npm ci` e `npm run build:pages` nesta pasta. Publique o conteúdo de `dist/` na pasta `enem/` da branch `gh-pages`, preservando os demais arquivos da branch.

A compilação de Pages contém CSS e JavaScript no próprio HTML para evitar falhas por caminhos de arquivos ou cache de assets.

### Guapa

A shih-tzu Guapa acompanha a Capitu no painel e nos desafios. Ela tem medo de capivara e participa mantendo seu espaço. O diálogo é opcional e cada desafio oferece uma pista própria pelo botão “Pedir uma pista para a Guapa”, sem marcar a resposta. Suas falas mudam após um e três desafios concluídos, respeitando o ritmo da personagem.

### Temas de redação

O seletor na área Redação oferece 12 propostas autorais de treino, com orientações específicas. Não são previsões do tema do ENEM. Cada proposta mantém rascunho e checklist independentes no navegador; a seleção é restaurada ao retornar. O rascunho anterior é preservado no tema de inclusão digital. O download inclui o título e usa o nome do tema no arquivo.
