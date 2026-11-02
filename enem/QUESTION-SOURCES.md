# Questões reais do ENEM

72 questões de 2023, dezoito por área, com seis itens por nível editorial em cada área. Transcrições e imagens obtidas do projeto comunitário [API ENEM](https://github.com/yunger7/enem-api), com commit de origem registrado em `references/enem-2023-review.json`. O projeto não é afiliado ao INEP/MEC.

## Conferência de referências e respostas

Em 01/11/2026, cada uma das 72 questões foi localizada na página correspondente do [Descomplica — ENEM 2023](https://descomplica.com.br/gabarito-enem/questoes/2023/). A chamada do enunciado, ano, dia, cor do caderno e alternativa de gabarito foram comparados. Não houve divergências de gabarito nesse conjunto. O manifesto local registra as URLs consultadas, os resultados e os metadados por questão. Os textos das resoluções do Descomplica não foram copiados; as explicações do aplicativo são próprias.

As referências identificam ENEM 2023, 1ª aplicação, caderno azul e dia 1 ou 2. A numeração pode mudar entre cadernos; não use o número isolado para comparar outras cores. Na interface, as referências aparecem somente em texto, sem links para GitHub ou Descomplica.

A página de [provas e gabaritos do INEP](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2023) foi consultada. Os PDFs de cadernos e gabaritos tentados retornaram HTTP 503 nesta sessão. Portanto, esta conferência é secundária e **não equivale a uma auditoria integral contra os PDFs oficiais**; não comprova a transcrição integral de todas as alternativas, imagens e fórmulas. Os arquivos oficiais são a referência principal em caso de divergência.

Itens com imagens ausentes, alternativas duplicadas ou inconsistências detectadas foram excluídos da nova seleção. Contextos que estavam unidos à chamada na transcrição foram separados apenas na apresentação. As imagens necessárias, inclusive alternativas em imagem, ficam locais no aplicativo.

## Dificuldade e continuidade do estudo

Fácil/médio/difícil são classificações editoriais, não níveis oficiais do INEP e não calibrados pela TRI. Fácil: informação central ou conceito básico. Médio: relação entre informações ou etapas de cálculo. Difícil: interpretação abstrata ou combinação de conceitos e etapas. Não há estimativa de nota TRI.

Os 20 itens autorais e as primeiras 36 questões reais mantêm sua ordem, seus identificadores e seu conteúdo. Os 36 novos registros foram acrescentados ao final, preservando respostas e simulados salvos em outros dispositivos. A ampliação não exige alterar o banco Supabase.

## Licença

As transcrições e imagens são distribuídas com a licença GPL-2.0 da fonte, preservada em `public/licenses/enem-api-GPL-2.0.txt`. Textos e imagens de terceiros reproduzidos na prova mantêm seus créditos no contexto. Não há chamada externa à API ou ao Descomplica durante o estudo.

## Ampliação de 02/11/2026: 284 novas questões locais

O banco passa de 72 para **356 questões reais armazenadas**, além das 20 autorais preservadas. Há **355 questões reais elegíveis para novas sessões**: o registro legado `enem-2023-164` foi identificado como **anulado** no gabarito oficial. Seu índice, resposta antiga e histórico permanecem intactos; ele fica fora dos filtros e sorteios de novos treinos. Simulados antigos que já o incluíam continuam legíveis, com aviso de anulação. Não foi recalculada a pontuação histórica.

| Ano | Linguagens | Humanas | Natureza | Matemática | Novas importadas |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2022 | 50 | 45 | 45 | 41 | 181 |
| 2023 | 28 | 25 | 24 | 26 | 103 |
| Total novo | 78 | 70 | 69 | 67 | **284** |

| Ano | Linguagens no banco | Humanas no banco | Natureza no banco | Matemática no banco | Total armazenado | Elegível |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2022 | 50 | 45 | 45 | 41 | 181 | 181 |
| 2023 | 46 | 43 | 42 | 44 | 175 | 174 |
| Total | 96 | 88 | 87 | 85 | **356** | **355** |

As variantes de inglês e espanhol são questões distintas, identificadas também pelo idioma no ID. Por isso, Linguagens pode ultrapassar 45 itens em um ano. Há filtro específico para Inglês/Espanhol. Nos demais itens, `discipline` registra a categoria comprovada pela prova (Linguagens e Códigos, Ciências Humanas, Ciências da Natureza ou Matemática); **não foram inventadas classificações individuais em Física, Química, História etc.**

### Fontes e conferência

- Transcrições e figuras: [API ENEM, commit 938c56f](https://github.com/yunger7/enem-api/tree/938c56fbd3b391e03d93316c920a90c3e54842e5/public). Cada questão aponta para o arquivo exato nesse commit e registra seu SHA-256.
- Referências oficiais: [INEP 2022](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2022) e [INEP 2023](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2023), **aplicação regular impressa, caderno azul 1 (dia 1) e 7 (dia 2)**.
- Os downloads diretos de `download.inep.gov.br` responderam HTTP 503 nesta sessão. Obtivemos os cadernos e gabaritos oficiais reproduzidos nas páginas do [Brasil Escola 2022](https://vestibular.brasilescola.uol.com.br/enem/gabarito-enem-2022.htm) e [Brasil Escola 2023](https://vestibular.brasilescola.uol.com.br/enem/provas-e-gabaritos-do-enem-2023.htm). São cópias dos documentos oficiais, não as resoluções dos professores. Não foi possível comprovar igualdade binária com um download direto do INEP indisponível.
- `references/official-keys/provenance.json`: URL oficial, URL efetivamente baixada, data, hashes dos quatro PDFs locais e de suas extrações textuais. `answers.json` contém as 370 posições dos dois anos, incluindo ambas as línguas estrangeiras e as anulações. O validador compara esse JSON com as tabelas extraídas dos documentos.
- `references/official-booklets/provenance.json`: URLs e hashes dos cadernos consultados, com extrações textuais locais para conferência reproduzível de alternativas. As extrações não substituem os PDFs para imagens, fórmulas e disposição em colunas.
- `references/enem-transcription-corrections.json`: **23 alternativas e 11 chamadas corrigidas** pelo texto dos cadernos oficiais. Há correções de palavras, omissões e uma chamada que trazia indevidamente as alternativas concatenadas. Os registros antigos não foram reescritos.
- Todas as respostas das 284 novas questões foram comparadas às posições correspondentes dos gabaritos oficiais. As alternativas textuais são comparadas por normalização de acentos, pontuação e espaços; figuras e alternativas em imagem continuam locais. Isso não é uma auditoria visual manual integral de cada figura e de cada linha dos contextos.

O relatório `references/enem-import-report.json` lista os 12 candidatos rejeitados: gabaritos divergentes/anulados, alternativas ausentes ou duplicadas e referências a imagens indisponíveis (`broken-image.svg`). O dataset não disponibilizava as questões 34 e 174 de 2023; elas não foram reconstruídas. Questões sem campo separado de contexto, mas com o enunciado completo na chamada, preservam o texto original. Nenhuma alternativa ou resposta foi criada para preencher lacunas.

### Reutilização e atribuição

A fonte estruturada declara **GNU GPL-2.0** em seu README e LICENSE. A licença integral já está preservada em `public/licenses/enem-api-GPL-2.0.txt`; os créditos, URLs, commit de origem e registros das modificações acompanham a importação. A fonte correspondente continua acessível no commit acima; o conversor está em `scripts/import-enem.py`. Ao redistribuir adaptações desse conjunto, devem ser mantidos os avisos e cumpridas as condições de disponibilização de fonte e copyleft da GPL aplicáveis ao material derivado.

A licença declarada pelo dataset não constitui uma nova licença sobre poemas, charges, fotografias e outros materiais de terceiros citados nas provas: os créditos originais foram mantidos. A publicação pública de uma prova não foi tratada como declaração de domínio público. Não copiamos resoluções editoriais dos portais usados para localizar os documentos.

### Funcionamento e continuidade

- `public/questions/`: oito arquivos JSON por ano e área; não fazem parte do bundle JavaScript.
- `src/question-catalog.json`: somente metadados de seleção, resposta para manter a contagem histórica sem baixar enunciados e índice persistente. Não contém contextos nem alternativas.
- `src/question-loader.js`: carrega apenas os arquivos que contêm as questões exibidas ou selecionadas para o simulado. Requisições simultâneas do mesmo arquivo são compartilhadas; erros permitem nova tentativa, sem apagar progresso. Imagens usam carregamento preguiçoso.
- Os 92 registros anteriores mantêm ordem e IDs. Os novos ocupam os índices **92 a 375**. A normalização do progresso reconhece esses índices mesmo antes do download dos enunciados, inclusive ao restaurar uma conta.
- Treino e simulados filtram ano e disciplina; o simulado também filtra área e mantém o filtro de dificuldade existente. Novos itens usam `unclassified` (Não classificada). Não foram atribuídos níveis oficiais nem resoluções inventadas.
- Desafios, missões, mascotes e pontuação permanecem com a lógica existente. Novas questões respondidas incorretamente alimentam o mesmo caderno de erros dos desafios.
- O carregador usa a URL base do documento. `npm run build:pages` copia JSONs e imagens para `dist`; publique **todo `dist/`**, incluindo `questions/` e `enem-assets/`. O HTML isolado já não representa uma distribuição completa do banco ampliado. Não há nova dependência de servidor ou API durante os estudos. Recursos de conta existentes mantêm seu comportamento anterior.

### Adicionar arquivos futuros

1. Obtenha questões completas de uma fonte com condições de reutilização verificadas. Registre prova, aplicação, caderno, idioma e gabarito; confira também a ordem das alternativas e as figuras. Não reutilize um número de outra cor do caderno.
2. Crie um array em `public/questions/ANO-AREA.json`, seguindo os arquivos existentes. Cada item precisa de `id`, `year`, `number`, `area`, `discipline`, `language` (ou `null`), `topic`, `origin: "enem"`, `difficulty`, `difficultyReason`, `context`, `text`, cinco `options`, `answer` inteiro de 0 a 4, `explanation`, `source`, `officialSource`, `answerSource`, `answerVerification`, `day`, `booklet`, `application`, `images` e informações de licença/proveniência. Use texto verificável para os enunciados e alternativas; uma resolução não disponível deve ser identificada como tal.
3. Copie imagens para `public/enem-assets/ANO/questions/…`. Referencie-as como `![](enem-assets/…)`, sem `/` inicial, e liste os mesmos caminhos em `images`. Não use imagens remotas nem placeholders.
4. Para um ano novo, acrescente os PDFs de gabarito e os textos extraídos em `references/official-keys/`, e suas URLs/hashes em `provenance.json`. Atualize `answers.json` a partir das tabelas oficiais (incluindo línguas e anulações). Acrescente a extração do caderno e sua proveniência em `references/official-booklets/`. A conferência textual não substitui a inspeção das fórmulas e imagens. O extrator de gabaritos atual suporta o formato de tabela dos cadernos azuis de 2022/2023; outros formatos exigem adaptar e conferir a extração.
5. Execute, **dentro de `enem/`**:

   ```sh
   node scripts/register-questions.mjs questions/ANO-AREA.json
   npm run validate:questions
   npm test
   npm run build:pages
   CHROMIUM_PATH=/usr/bin/chromium npm run test:pages
   ```

   O registrador acrescenta os metadados ao final e calcula o hash do arquivo. Se a validação falhar, restaura o catálogo anterior. Nunca reordene, remova ou reutilize índices existentes; não ordene o catálogo inteiro por ano. Registre novos arquivos ao final, inclusive quando acrescentar questões de um ano antigo. Para corrigir apenas conteúdo, mantenha IDs, ordem e respostas históricas; revise qualquer mudança de gabarito antes de atualizar os metadados e o hash.

Para reproduzir esta importação: obtenha o repositório da API ENEM no commit registrado e execute `python scripts/import-enem.py CAMINHO_DO_CHECKOUT`. O conversor aplica as correções documentadas e recusa alterações na sequência de IDs previamente publicada. Não é necessário executar o importador para publicar ou usar o site.
