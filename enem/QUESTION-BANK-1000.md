# Relatório — banco local de questões do ENEM

## Resultado verificado em 02/11/2026

**Meta atingida: 1.070 questões reais, únicas e validadas**, elegíveis para novos treinos e simulados. Não há questões geradas para completar a meta.

| Métrica | Quantidade |
| --- | ---: |
| Questões encontradas nas provas regulares de 2017–2024 | 1480 |
| Novos registros únicos importados nesta missão | 839 |
| Registros anteriores revalidados com originais completos | 231 |
| Questões únicas validadas e elegíveis | **1070** |
| Rejeitadas por anulação oficial | 7 |
| Pendentes, não contadas na meta | 403 |
| Duplicatas contadas | **0** |
| Questões reais armazenadas, incluindo histórico | 1195 |
| Registros anteriores preservados apenas para histórico, com validação integral pendente | 124 |
| Anulada antiga preservada apenas no histórico | 1 |
| Questões autorais anteriores preservadas, fora da meta | 20 |

As 1480 posições incluem inglês e espanhol como variantes distintas; cada edição reúne até 185 possibilidades, das quais o candidato responde 180 conforme a língua escolhida. Não foram contados cadernos de cores diferentes como questões novas.

O banco anterior possuía 356 registros reais, sendo 355 elegíveis. Todos os seus IDs, índices numéricos e respostas históricas foram preservados. A conferência integral aprovou 231 deles; os restantes não desapareceram do histórico, mas ficam fora de novos sorteios. Novos registros só entram após aprovação. A pontuação, a confirmação de alternativas, os rascunhos e a sincronização mantêm a lógica existente.

## Quantidade de questões validadas por área e ano

| Ano | Linguagens | Humanas | Natureza | Matemática | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2017 | 34 | 42 | 39 | 36 | 151 |
| 2018 | 40 | 41 | 39 | 37 | 157 |
| 2019 | 34 | 42 | 42 | 37 | 155 |
| 2020 | 42 | 39 | 37 | 34 | 152 |
| 2021 | 40 | 39 | 37 | 34 | 150 |
| 2022 | 37 | 41 | 39 | 34 | 151 |
| 2023 | 19 | 23 | 24 | 21 | 87 |
| 2024 | 17 | 19 | 18 | 13 | 67 |
| **Total** | 263 | 286 | 275 | 246 | **1070** |

As disciplinas só são informadas no nível comprovado pela prova: Inglês, Espanhol, Linguagens e Códigos, Ciências Humanas, Ciências da Natureza e Matemática. Não foram atribuídas disciplinas mais específicas nem dificuldades ou resoluções sem fonte.

## Como a validação funciona

1. O importador lê provas e gabaritos oficiais da aplicação regular impressa, cadernos azuis 1 e 7. Arquivos, URLs de origem e SHA-256 estão em `references/enem-1000/sources.json`.
2. O primeiro lote foi de **50 questões**. Passou em 46 testes de unidade, quatro testes estáticos de navegador e 300 comparações de imagens originais. Depois foram registrados lotes de 250, 500, 954 e 1.070 aprovadas, sem tratar 954 como meta concluída. Os marcos estão em `references/enem-1000/batches/` e no relatório final.
3. O cabeçalho numerado e os marcadores A–E devem ser reconhecidos sem ambiguidade. Layouts de uma ou duas colunas são admitidos; continuações, páginas mistas ou limites de recorte inseguros ficam pendentes.
4. O **enunciado original e cada alternativa são recortes WebP sem perdas renderizados do PDF oficial**, incluindo figuras, fórmulas, tabelas e créditos. A camada textual dos PDFs não é usada para reconstruir fórmulas ou preencher lacunas. Quando legível, uma transcrição extraída do próprio PDF é oferecida separadamente; algumas questões têm apenas a versão visual original. Portanto, a cobertura de transcrição acessível não é integral.
5. Cada questão registra ID próprio, ID canônico, ano, aplicação, caderno, número, área, disciplina, idioma, gabarito oficial, status, referências e provas de origem. Cada uma das seis imagens possui página, coordenadas, tamanho e hash.
6. Os gabaritos são extraídos novamente dos PDFs, incluindo anulações e tabelas separadas por idioma. O verificador confirma também o idioma no cabeçalho da prova.
7. A comparação final re-renderizou **6420 recortes** dos PDFs arquivados e comparou seus pixels com os arquivos locais. Não é uma declaração de revisão humana manual de todas as questões: a auditoria integral é automatizada, com inspeções visuais pontuais.
8. IDs canônicos e fingerprints detectam duplicação. A seleção de simulados deduplica antes do sorteio, inclusive antes de baixar enunciados. Uma cópia com outro ID de exibição e o mesmo ID canônico não entra duas vezes.
9. Pendências e anulações estão separadas em `references/enem-1000/pending.json`. O validador rejeita novos registros sem aprovação e arquivos JSON públicos não registrados. `validate:release` bloqueia publicação abaixo de 1.000 aprovações reais.

## Fontes e condições de reutilização

- **INEP** — [provas e gabaritos oficiais](https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos), edições de 2017 a 2024, aplicação regular impressa e cadernos azuis. Os downloads diretos do domínio de arquivos responderam HTTP 503 nas tentativas da sessão; as cópias consultadas foram obtidas dos espelhos públicos do Brasil Escola, associados às respectivas edições. Todas as URLs oficiais e efetivamente utilizadas, além dos PDFs e hashes, acompanham o projeto. Não se afirma igualdade binária com um download direto do INEP que estava indisponível.
- **API ENEM / enem.dev** — [commit 938c56fbd3b391e03d93316c920a90c3e54842e5](https://github.com/yunger7/enem-api/tree/938c56fbd3b391e03d93316c920a90c3e54842e5). Dados estruturados consultados para referências, identificação e deduplicação. A fonte declara **GNU GPL-2.0**, mantida em `public/licenses/enem-api-GPL-2.0.txt`. Os enunciados e alternativas novos não foram aceitos por simples confiança em sua transcrição ou gabarito: a referência final são os PDFs. Itens de 2024 e ausentes no dataset vêm diretamente dos documentos oficiais.
- **Vestibular-data/enem_data** — [repositório consultado](https://github.com/Vestibular-data/enem_data), commit `4f227778612e8cb2b4f40752afeff964a98e8cbd`. O README declara livre acesso e afirma domínio público, mas não foi encontrada uma licença explícita que permitisse presumir direitos sobre todo o material. **Nenhuma questão foi importada dessa fonte.**

A licença declarada sobre metadados/transcrições de um dataset não concede automaticamente direitos sobre fotografias, poemas, charges, letras e outros textos citados nas provas. Os créditos dos cadernos foram preservados, os documentos originais não foram apresentados como domínio público e não foram copiadas resoluções editoriais dos portais. As obrigações de atribuição, fonte correspondente e copyleft da GPL devem acompanhar a redistribuição de material derivado dessa fonte.

## Problemas encontrados e tratamento

- Erros de OCR, alternativas incorretas e imagens ausentes nos datasets: não foram inventadas correções ou figuras. A versão visual foi obtida diretamente do caderno oficial.
- Sete anulações oficiais: excluídas da seleção e da meta; o registro antigo anulado permanece apenas para continuidade histórica.
- 403 questões com separação insegura: mantidas como pendentes. Há 228 casos de fluxo/segmentação ambíguos, 134 limites sem separação segura entre alternativas e 41 casos de conteúdo que ultrapassa a região reconhecida.
- Layouts de largura inteira exigiram distinguir páginas de uma e duas colunas. Alguns layouts mistos continuam pendentes.
- As imagens próximas ao cabeçalho passaram a incluir o cabeçalho original no recorte, evitando perda de bordas. Uma inspeção visual dos alertas de máscaras de imagens da questão 135/2023 está em `visual-review.json`.
- Uma regressão na revisão de registros antigos sem `originalStatement` foi corrigida e coberta por teste. Os fluxos de resultado e histórico foram reexecutados.
- O Vite ainda avisa sobre o tamanho do bundle principal: cerca de 1,05 MB antes de gzip. Os novos arquivos de questões e as imagens permanecem fora do bundle, carregados por demanda. Os 72 registros iniciais mantêm sua integração estática para compatibilidade.

## Arquitetura e arquivos

- `public/questions/manifest.json`: anos, arquivos, quantidades, hashes e total validado; carregado uma vez por sessão quando necessário.
- `src/question-catalog.json`: metadados de seleção e índices persistentes, sem enunciados novos.
- `src/question-identity.js`, `activities.js`, `question-loader.js`: identidade canônica, filtros, deduplicação e carregamento local.
- `main.js`, `features.js`, `question-view.js`, `style.css`: preservação da interface existente, apresentação dos originais e revisão de questões anteriores. O caderno de erros dos desafios continua usando o mesmo banco.
- `src/official-questions.json`: 72 registros iniciais enriquecidos quando aprovados, sem renumeração.
- `public/enem-assets/official/**`: **6420 imagens locais** verificadas. Imagens antigas também foram preservadas.
- `references/enem-1000/`: 32 PDFs de prova/gabarito, extrações, hashes, relatório, quarentena, baseline, lotes e resultados de verificação. PDFs não entram no diretório público do site.
- `scripts/import-official-enem.py`, `official-pdf.py`: conversão e segmentação conservadora.
- `scripts/fetch-enem-sources.py`: obtenção posterior de fontes congeladas e conferência de hashes.
- `scripts/validate-questions.mjs`, `validate-official.mjs`, `verify-official-originals.py`: estrutura, integridade, gabaritos, regiões originais, idiomas e pixels.
- `scripts/register-questions.mjs`: registro validado com atualização atômica de catálogo, manifesto e relatório, sem renumerar itens publicados.
- `scripts/clean-official-assets.py`: remoção somente de imagens intermediárias geradas sem referência.
- `scripts/requirements-enem.txt`: dependências de desenvolvimento para importar/verificar PDFs; nenhuma dependência nova em produção.
- `server/app.js`: tipo MIME WebP no servidor local opcional.
- Testes de dados, banco, originais, navegador estático e regressão atualizados; `package.json`, `.gitignore` e `.github/workflows/enem-pages.yml` ajustados.

### Arquivos JSON registrados

- `public/questions/2022-ciencias-humanas.json` (45 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2022-ciencias-natureza.json` (45 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2022-linguagens.json` (50 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2022-matematica.json` (41 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2023-ciencias-humanas.json` (25 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2023-ciencias-natureza.json` (24 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2023-linguagens.json` (28 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2023-matematica.json` (26 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2017.json` (138 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2018.json` (141 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2019.json` (134 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2020.json` (139 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2021.json` (135 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2022-supplement.json` (2 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2023-supplement.json` (3 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2024.json` (65 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2017-part-2.json` (13 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2018-part-2.json` (16 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2019-part-2.json` (21 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2020-part-2.json` (13 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2021-part-2.json` (15 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2023-part-2.json` (2 registros; alguns anteriores podem estar apenas no histórico).
- `public/questions/2024-part-2.json` (2 registros; alguns anteriores podem estar apenas no histórico).

Os novos arquivos são separados por ano. Partes adicionais de um mesmo ano são acrescentadas ao fim do catálogo, para nunca deslocar índices já salvos. Os oito arquivos anteriores por área/ano foram preservados e enriquecidos.

## Resultado dos testes

- **48 testes de unidade aprovados**: validação, duplicatas, filtros, capacidade, gabaritos, manifesto, histórico, contas, pontuação, plano e renderização legada.
- **5 testes de navegador em hospedagem estática e subdiretório aprovados**, incluindo os 32 pares de ano/área, imagens completas, filtro, minissimulado com 10/10, persistência após recarga, caderno de erros e recuperação de falha de JSON.
- **7 testes de regressão existentes aprovados**: rascunhos e confirmações, resultados, revisão, sincronização de duas sessões, recuperação de conta, plano, filtros e apresentação móvel.
- **1070 originais e 6420 imagens comparados** aos PDFs; IDs canônicos únicos e gabaritos conferidos.
- `npm run validate:release` e `npm run build:pages`: aprovados.
- A suíte antiga de navegador não é declarada integralmente verde: cinco testes de mascotes/redesign/sequência já falhavam no commit anterior, por esperarem seletores ou conteúdo visível que a interface anterior não oferece. Não foram reescritos componentes para satisfazer essas expectativas antigas.
- Testes externos que exigem credenciais Supabase/PostgreSQL não foram executados; os testes de conta locais e de transportes simulados foram mantidos.

## Publicação e manutenção

O site continua estático no [GitHub Pages existente](https://lorenzo123600.github.io/repositorio-estudos/enem/). O workflow preserva as outras páginas do repositório, verifica o mínimo de 1.000 questões, executa testes, compara originais e só então publica. Os estudos não consultam enem.dev, INEP ou outros fornecedores em tempo de execução. A autenticação opcional continua com a configuração anterior.

Publique **todo `enem/dist/`**, incluindo `questions/` e `enem-assets/`. Todos os caminhos de dados e imagens são relativos; não há nova dependência de backend. O HTML sozinho não contém o banco completo.

Para reproduzir com as fontes já arquivadas:

```sh
cd enem
# Instale também Poppler (pdftotext); em Debian/Ubuntu: sudo apt-get install poppler-utils
python -m pip install -r scripts/requirements-enem.txt
# Obtenha o checkout da API ENEM no commit registrado, para referências de origem.
python scripts/import-official-enem.py --sources references/enem-1000/sources.json --structured-root CAMINHO_DO_CHECKOUT --limit 2000
npm run validate:release
npm run verify:originals
npm test
npm run build:pages
CHROMIUM_PATH=/usr/bin/chromium npm run test:pages
```

Para baixar novamente os documentos, sem modificar sua versão revisada:

```sh
python scripts/fetch-enem-sources.py --output work/enem-sources
# O script tenta a URL oficial e o espelho, sempre exigindo o hash congelado.
# Se ambos falharem, downloads.json registra o erro; nenhum conteúdo é fabricado.
```

Para acrescentar outro ano: consulte condições de reutilização, obtenha prova/gabarito da mesma aplicação e caderno, registre URLs e hashes no manifesto de fontes e execute o importador com as novas fontes junto às anteriores. O formato atual aceita a numeração da aplicação regular azul de 2017 em diante; outros cadernos, formatos ou aplicações precisam de correspondência canônica verificada antes da importação. Aumente o limite para acomodar os itens novos; não reduza nem reordene validações publicadas.

Para um JSON preparado separadamente, mantenha-o fora de `public/` enquanto pendente. Ele precisa das evidências oficiais e de todas as seis imagens verificadas, além dos campos das questões existentes. Após revisão, coloque-o em `public/questions/ANO-PARTE.json` e execute `node scripts/register-questions.mjs questions/ANO-PARTE.json`. O registro recusa pendências e duplicatas e reverte os metadados caso a validação falhe. Rode novamente todos os comandos de verificação e o build antes de publicar.

## Fluxo de publicação ajustado

A comparação de pixels com os PDFs foi concluída localmente para as 6.420 imagens. Como o runner apresentou diferença de rasterização, sua repetição no GitHub ficou opcional (`workflow_dispatch`, `deep_verify`). Toda publicação continua exigindo o mínimo de 1.000 aprovações, validação dos gabaritos, dos documentos, dos JSONs, dos hashes de todas as imagens e os testes de unidade. Isso preserva os arquivos já verificados sem depender de igualdade de renderização entre ambientes.
