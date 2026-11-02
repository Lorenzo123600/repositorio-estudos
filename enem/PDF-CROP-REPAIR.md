# Correção dos recortes dos PDFs — 02/11/2026

Foram auditadas as 1.070 questões validadas e corrigidas 515 imagens da alternativa E. A relação completa, com coordenadas anteriores e corrigidas, está em `references/enem-1000/crop-repair.json`.

| Ano | Recortes corrigidos |
| --- | ---: |
| 2017 | 81 |
| 2018 | 81 |
| 2019 | 80 |
| 2020 | 80 |
| 2021 | 73 |
| 2022 | 79 |
| 2023 | 41 |
| 2024 | 0 |

## Causa

O limite inferior de E era a próxima questão ou uma margem fixa da página. O detector de rodapés consultava apenas o texto já filtrado por coluna e margem: perdia rodapés situados na outra coluna ou abaixo desse filtro. Linhas vetoriais entre questões e linhas finais antes de áreas vazias também entravam no recorte. A comparação de pixels anterior comprovava que a imagem correspondia ao retângulo salvo, mas não que esse retângulo excluía elementos da página.

## Tratamento

`official-pdf.py` agora procura o rodapé na página inteira antes dos filtros, considera a espessura das linhas e exclui separadores da próxima questão. Linhas finais de coluna só são removidas quando existe uma faixa branca acima e toda a área abaixo está vazia. Não se usa um espaço em branco isolado para encerrar figuras ou fórmulas.

`repair-official-crops.py` verifica os registros existentes, rejeita limites que cortariam texto e regenera apenas E, sua transcrição e os hashes correspondentes. Sem `--write`, apenas audita e retorna erro se houver correções pendentes. IDs, gabaritos, fingerprints, índices, elegibilidade, enunciados e alternativas A–D foram comparados com o Git e preservados. A amostra pública gerada também foi atualizada.

## Verificação e prevenção

- Cinco testes Python cobrem rodapé na outra coluna, separadores, preservação de diagramas/eixos e PDFs reais de 2017/2018 e separadores pontilhados de 2019.
- O validador JavaScript rejeita texto de rodapé nas alternativas; a suíte inclui uma regressão que injeta esse defeito.
- O verificador profundo verifica limites de página/questão além da igualdade de pixels dos 6.420 recortes.
- A execução final conferiu com sucesso as 1.070 questões e os 6.420 recortes contra os PDFs arquivados; a auditoria repetida encontrou zero ajustes pendentes. A revisão visual foi amostral.
- A publicação agora exige os testes Python e a auditoria sem escrita; a comparação profunda continua opcional no workflow.
- Os 77 testes JavaScript, os cinco testes de navegador estático e `npm run build:pages` passaram. O aviso já existente sobre tamanho do bundle permanece.

Comandos em `enem/`:

```sh
python -m unittest discover -s tests -p 'test_pdf_*.py'
python scripts/repair-official-crops.py
npm run verify:originals
npm test
npm run build:pages
CHROMIUM_PATH=/usr/bin/chromium npm run test:pages
```

A correção está no checkout local; nenhuma publicação do site foi executada nesta sessão.
