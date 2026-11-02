# Correções do conteúdo e do plano — 02/11/2026

## Questões corrigidas

- **106/2022:** as cinco estruturas químicas agora ficam inteiras nas respectivas alternativas A–E. O enunciado não inclui mais a parte superior de A.
- **137/2020:** a alternativa E apresenta a fração completa **42/16**, e D não inclui mais o numerador da alternativa seguinte.
- **16 questões de 2020:** os pequenos cortes em letras/marcadores e os resíduos de glifos da questão anterior foram removidos.

Foram regenerados **24 recortes em 18 questões**, com transcrições, dimensões e hashes atualizados. Nenhum gabarito, ID, fingerprint, índice persistente ou status de elegibilidade foi alterado. O banco mantém as 1.070 questões validadas.

Os limites revisados são vinculados ao hash do PDF e à página em `references/enem-1000/reviewed-crop-boundaries.json`. O importador os aplica em novas execuções; os verificadores conferem esses limites para impedir que uma reimportação reintroduza o defeito. `repair-reviewed-content.py` sem `--write` verifica se há correções pendentes; depois da aplicação, retorna zero.

## Transcrições

Foram recuperadas **525 regiões**: 60 enunciados e 465 alternativas. O problema de origem era a codificação de fontes embutidas nos PDFs de 2017/2021. A recuperação compara o contorno exato do glifo, sua largura, família de fonte e posição com caracteres identificados nas fontes dos próprios documentos. Não usa OCR nem completa palavras por contexto.

Permanecem **446 regiões pendentes** — 241 enunciados e 205 alternativas — por glifos sem identificação segura, símbolos matemáticos ou posições ambíguas. Nesses casos a imagem original continua disponível e nenhuma transcrição foi inventada. A extração linear de texto também não substitui uma descrição acessível de figuras nem uma representação semântica de fórmulas.

As transcrições disponíveis das alternativas agora são usadas como texto alternativo das imagens, inclusive no conteúdo compacto da edição paga. O relatório `transcript-recovery.json` registra as 525 recuperações e as pendências; `transcript-recovery-check.json` mostra que uma repetição não propõe novas alterações seguras.

## Plano por assunto

Cada atividade tem um botão que abre suas questões, com o assunto identificado no treino e opção de voltar ao plano. A seleção é explícita e revisada por tema; não é uma substituição silenciosa por todas as questões da área. Os IDs dos conjuntos estão em `src/plan-practice.js`.

- As atividades-base e suas revisões espaçadas mantêm o mesmo destino ao mudar a duração de 1 a 180 dias.
- Dias com várias atividades oferecem um botão para cada assunto.
- A recomendação inicial do painel abre diretamente as questões da próxima atividade.
- Redação oferece questões de apoio e acesso ao editor.
- Revisão de erros abre as respostas incorretas, preservando as demais respostas. Sem erros registrados, apresenta uma revisão inicial explicitamente identificada.
- A posição e a seleção do treino são retomadas após recarga na mesma aba.
- Abrir questões ou o editor não conclui a etapa automaticamente. O botão de conclusão permanece separado.

## Verificação

Passaram os 81 testes JavaScript, 14 testes Python, os testes de navegador do novo fluxo do plano e as regressões de simulados, contas, filtros e hospedagem estática. A compilação passou; permanece o aviso já existente de tamanho do bundle.

Os relatórios atuais de auditoria estão em `references/enem-1000/content-audit.json`, `option-layout-audit.json` e `boundary-pixel-audit.json`; os originais anteriores às correções ficam em `audit-baseline/`. Os alertas de caixa métrica sem pixels cortados e os conteúdos do enunciado imediatamente antes de A continuam separados de defeitos visuais confirmados.

Comandos em `enem/`:

```sh
python scripts/repair-reviewed-content.py
python scripts/repair-official-crops.py
python scripts/recover-pdf-transcripts.py
python scripts/audit-question-content.py
python scripts/audit-option-layout.py
python scripts/audit-boundary-pixels.py
npm run validate:release
npm run verify:originals
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_pdf_*.py'
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_content_audit.py'
npm test
npm run build:pages
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- tests/e2e/plan-practice.spec.js tests/e2e/study-plan.spec.js tests/e2e/exam-journey.spec.js tests/e2e/study.spec.js
CHROMIUM_PATH=/usr/bin/chromium npm run test:pages
```

As alterações estão na área de trabalho. Nenhuma nova publicação do site ou das funções Supabase foi executada nesta etapa.
