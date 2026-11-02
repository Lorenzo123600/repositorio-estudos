# Auditoria das 1.070 questões — 02/11/2026

**Atualização após a correção autorizada:** os 24 recortes de 18 questões foram corrigidos, e 525 transcrições foram recuperadas. A análise dos pixels não encontrou mais os 16 defeitos de borda. Restam 446 transcrições com símbolos sem correspondência segura. Consulte [as correções e o estado atual](CONTENT-CORRECTIONS.md). O relato abaixo documenta os achados anteriores; seus relatórios originais estão preservados em `references/enem-1000/audit-baseline/`.

**Foram encontrados dois problemas relevantes de segmentação de fórmulas e 16 questões com pequenos defeitos nas bordas dos recortes. Nenhum gabarito, dado de questão ou imagem de produção foi alterado.**

Base auditada: commit `a21dfb209a1469574309fc00d876f7e112e1401e`, 1.070 questões com status `validated`, de 2017–2024. Os registros pendentes usados somente no histórico estão fora deste escopo.

## Resultado por categoria

| Verificação | Resultado |
| --- | --- |
| Arquivos de imagem | 6.420 existentes, decodificáveis, não vazios, com dimensões e hashes conferidos |
| Igualdade com os PDFs arquivados | 1.070 questões e 6.420 recortes aprovados na comparação de pixels |
| Alternativas duplicadas | Nenhuma duplicação confirmada: zero textos normalizados iguais; os 66 pares de imagens semelhantes foram inspecionados e diferem em valores, palavras, sinais, índices ou expoentes |
| Gabaritos | 1.070 respostas concordam com as tabelas extraídas dos PDFs de gabarito, incluindo identificação do idioma/caderno no verificador profundo; nenhuma anulação entre as validadas |
| Fórmulas/recortes | Dois problemas relevantes confirmados; a imagem pode corresponder exatamente ao PDF e, ainda assim, seu retângulo dividir uma fórmula incorretamente |
| Bordas de texto/marcadores | 16 questões de 2020 com cortes pequenos ou resíduos de glifos da questão anterior |
| Transcrições acessíveis | 301 enunciados e 670 alternativas sem transcrição utilizável, em 302 questões distintas; as imagens correspondentes existem |

## Problemas relevantes confirmados

| Questão | Evidência | Problema | Gabarito preservado |
| --- | --- | --- | --- |
| ENEM 2022, Natureza, 106 | Prova do dia 2, página 7; [imagem com os limites atuais](references/enem-1000/audit-evidence/enem-2022-106.png) | As cinco estruturas químicas começam acima dos respectivos marcadores A–E. Os recortes iniciam junto aos marcadores e atribuem as partes superiores das moléculas ao enunciado ou à alternativa anterior. Há ligações e grupos químicos separados entre imagens. | **C**, confirmado no PDF de gabarito |
| ENEM 2020, Matemática, 137 | Prova do dia 2, página 16; [imagem com os limites atuais](references/enem-1000/audit-evidence/enem-2020-137.png) | O numerador **42** da alternativa E (**42/16**) ficou na imagem D. A imagem E mostra a barra e o denominador **16**, sem o numerador. A–C permanecem íntegros. | **A**, confirmado no PDF de gabarito |

As linhas vermelhas nas evidências indicam os limites atuais dos recortes sobre o original. A causa é usar a posição do marcador como início da alternativa quando ele está alinhado ao meio da fórmula. É necessário separar os blocos visuais completos, preservando sua associação com A–E; escolher apenas uma linha de pixels brancos próxima ao marcador não basta.

## Defeitos menores confirmados

| Questões de 2020 | Região | Evidência observada |
| --- | --- | --- |
| 12, 25, 48, 57 | Alternativa E | Parte inferior de letras com descendentes/cedilha atravessa o limite inferior do recorte. O caso 57 inclui partes de “Projeção”. |
| 114, 130, 161 | Alternativa E | Pequeno corte na parte inferior do marcador circular E. Não foi confirmada perda do texto da resposta nesses três casos. |
| 14, 26, 49, 58, 107, 115, 129, 131, 162 | Topo do enunciado | Pequenos fragmentos de glifos da questão anterior entram no recorte. Não foi confirmada omissão de palavras do próprio enunciado nesses casos. |

Os IDs completos, as páginas, as coordenadas dos pixels e os caracteres envolvidos constam em `references/enem-1000/content-audit-review.json` e `boundary-pixel-audit.json`. São defeitos menores que a divisão das fórmulas, mas devem ser corrigidos antes de declarar os recortes integralmente limpos.

## Como foi conferido

1. `npm run validate:release`: estrutura, integridade, manifesto, catálogo, índices históricos e provas de gabarito aprovados.
2. `npm run verify:originals`: 1.070 questões e 6.420 imagens comparadas aos PDFs locais, com gabaritos e idiomas conferidos.
3. `audit-question-content.py`: leitura de todas as imagens, remoção dos marcadores para comparar alternativas, comparação de textos sem apagar sinais matemáticos, verificação de respostas e triagem de limites por glifos individuais. Operações textuais agregadas do PDF não são tratadas como um glifo, pois podem reunir as duas colunas em uma única caixa.
4. `audit-option-layout.py`: busca adicional por componentes de fórmulas acima dos marcadores, mesmo quando o corte atravessa um espaço branco.
5. `audit-boundary-pixels.py`: distingue caixas métricas de fontes de pixels efetivamente visíveis nas bordas. Caixas de máscaras do PDF, como na questão 135/2023, não constituem prova de figura cortada.
6. Inspeção visual assistida de **135 alertas em 87 questões**: 66 pares de alternativas semelhantes, 37 alertas de borda e 32 alertas de conteúdo acima de marcadores. Cada resolução, inclusive falsos positivos, está registrada. Os quatro testes dos novos utilitários passaram.

Relatórios reproduzíveis em `references/enem-1000/`:

- `content-audit.json`: resultado automático por questão, hashes dos JSONs de entrada e todos os alertas, incluindo as lacunas de transcrição.
- `option-layout-audit.json`: candidatos de estrutura visual acima dos marcadores.
- `boundary-pixel-audit.json`: análise dos pixels nas bordas.
- `content-audit-review.json`: conclusões, prioridades e resolução individual dos 135 alertas.

Para reproduzir, na pasta `enem/`:

```sh
python scripts/audit-question-content.py
python scripts/audit-option-layout.py
python scripts/audit-boundary-pixels.py
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_content_audit.py'
npm run validate:release
npm run verify:originals
```

Os scripts escrevem somente relatórios. As conclusões visuais revisadas não são sobrescritas automaticamente.

## Limites e prioridade

A varredura automatizada cobre todas as 1.070 questões; a inspeção visual descrita cobre todos os alertas produzidos, não uma leitura pedagógica manual de todas as provas. Não se afirma que nenhum outro defeito possa existir. A concordância de gabarito é com as versões dos documentos arquivadas em `sources.json`, não uma resolução independente de cada exercício nem uma nova consulta ao INEP. A igualdade de pixels não valida a escolha semântica dos limites.

Prioridade recomendada: **corrigir a separação das fórmulas de 106/2022 e 137/2020**, depois as 16 bordas menores e as transcrições acessíveis. Não há evidência nesta auditoria que justifique mudar respostas. Esta tarefa apenas audita; nenhuma correção ou publicação adicional foi executada.
