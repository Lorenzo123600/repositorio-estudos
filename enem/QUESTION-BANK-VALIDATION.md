# Verificação da missão de 1.000 questões — 02/11/2026

**1.070 questões únicas validadas**, com 6.420 recortes comparados aos PDFs oficiais arquivados. 839 registros são novos e 231 anteriores foram revalidados. As 403 pendências e sete anulações estão fora dos novos sorteios e da contagem.

- `npm run validate:release`: aprovado; verifica estrutura, IDs/canônicos, duplicação, alternativas, imagens, hashes, origens, gabaritos, manifesto, índices históricos e mínimo de 1.000 aprovações.
- `npm run verify:originals`: aprovado; 1.070 originais e 6.420 imagens, confirmação de caderno, página, cabeçalho, idioma e gabarito. Usa PyMuPDF/Pillow apenas em desenvolvimento/CI.
- `npm test`: **48 aprovados**, incluindo regressão de renderização de registros antigos sem original novo.
- `npm run test:pages`: **5 aprovados**, sobre servidor estático em subdiretório. Cobrem todos os 32 pares de ano/área, imagens, filtro, simulado, persistência, revisão e recuperação de erro de JSON.
- Regressões existentes de simulados, contas e plano: **7 aprovadas**, via `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- tests/e2e/exam-journey.spec.js tests/e2e/study-plan.spec.js tests/e2e/study.spec.js`.
- A suíte completa antiga não é declarada verde: cinco testes de mascotes/redesign/sequência têm expectativas já obsoletas, reproduzidas no commit anterior à missão. Seus componentes não foram simplificados para satisfazer os testes.
- `npm run build:pages`: aprovado. O aviso de tamanho do bundle principal permanece; os novos enunciados e imagens não são incorporados ao JavaScript.
- Credenciais externas de Supabase/PostgreSQL não foram usadas para testes de serviços reais. Testes locais de conta e transportes simulados passaram.

O piloto de 50 itens foi testado antes de ampliar: 46 testes unitários, quatro testes de navegador e 300 comparações de imagens aprovados naquele estágio. O processo não declarou a meta concluída no lote que aprovou somente 954 itens.

Fontes, condições de reutilização, contagens por área/ano, limitações de transcrição e instruções de reprodução estão em [QUESTION-BANK-1000.md](QUESTION-BANK-1000.md). A publicação utiliza o GitHub Pages existente e agora exige `validate:release` e a comparação com os documentos oficiais antes de compilar e publicar.
