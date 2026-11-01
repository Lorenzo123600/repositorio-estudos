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
