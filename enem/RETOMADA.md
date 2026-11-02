# Estado para retomada

- Missão implementada: 1.070 questões reais únicas validadas; 839 novos registros e 231 anteriores revalidados.
- 403 candidatos pendentes e 7 anuladas não entram em novos sorteios. IDs, respostas e histórico anteriores preservados.
- Verificação local concluída: 48 testes unitários, 5 testes estáticos, 7 testes de regressão e 6.420 comparações de recortes com PDFs oficiais.
- Relatório completo: QUESTION-BANK-1000.md. Fontes, lotes, hashes e resultados: references/enem-1000/.
- O runner do GitHub apresentou diferença de rasterização na comparação de pixels da questão 156/2021. A repetição profunda de rasterização ficou opcional (workflow_dispatch, deep_verify). A publicação continua exigindo validate:release (mínimo de 1.000, gabaritos, PDFs, JSONs e hashes de todas as imagens) e npm test.
- Não há necessidade de repetir importação ou gerar questões. Próximo passo: conferir o último workflow e o manifesto público após publicação.
- Site: https://lorenzo123600.github.io/repositorio-estudos/enem/
- Workflow: .github/workflows/enem-pages.yml

Para continuar: “Leia enem/RETOMADA.md e confira a publicação das 1.070 questões, sem repetir a importação.”
