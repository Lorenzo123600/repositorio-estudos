# Auditoria preventiva e estabilização — Bora pro ENEM

Base: `main` em `2dde0b018ae26bdfe57d3e80fe6681e7f5cae670`, conferida antes das alterações. PR #9 inspecionado separadamente em `8a464b2039af9eaa38429f08cce1ad820355e0eb`. PR #2 permanece aberto, conflitante e não foi incorporado. O trabalho não adiciona funcionalidades nem habilita pagamentos.

**Conclusão: há defeitos comprovados e correções nesta branch. Não se declara o produto integralmente homologado.** As lacunas editoriais, de acessibilidade e de homologação hospedada descritas abaixo permanecem. Nenhum dado de aluno ou registro de pagamento foi alterado em produção.

## Defeitos reproduzidos

| ID / prioridade | Evidência antes da correção | Correção e verificação |
| --- | --- | --- |
| QA-01 / alta — resposta atrasada após logout | Entrar na conta A, sincronizar redação; outro dispositivo avança a revisão; reter a resposta GET de progresso; sair; entregar a resposta. O rascunho A reaparecia na interface e era gravado no armazenamento visitante. | Respostas de leitura são aceitas somente para a conta e versão local que iniciaram a operação. Logout invalida operações pendentes e cancela o temporizador. Teste `late progress response after logout must never restore private draft` reproduz antes e passa depois. |
| QA-02 / alta — troca de sessão em outra aba | Duas abas do mesmo navegador: A exibe a redação; a outra aba sai e entra em B; focar A. A resposta 401 era ignorada e o texto privado de A continuava visível. | Falha de autenticação limpa a interface privada, preservando a cópia vinculada ao proprietário. Eventos de armazenamento da sessão Supabase também invalidam a interface ao sair/trocar usuário. Testes reais com servidor local e teste do SDK Supabase com HTTP simulado cobrem os casos. |
| QA-03 / média — regressão CI sem compilação | Runs `41553916449` e `41554637959` da main: 22 falhas. O servidor respondia ao health check, mas o workflow não gerava `dist/`; a página/testes não encontravam a interface. Os logs do PR #9 também mostram seletores indisponíveis. | O servidor de teste compila antes de iniciar. A regressão passa a cobrir também Cloud/Supabase, edição comercial, Pages e SQL; falhas preservam traces e screenshots. |
| QA-04 / média — navegação móvel bloqueada | Abrir Revisão rápida, iniciar/reiniciar o cronômetro e tocar em Plano na barra inferior, viewport 390×844. O painel fixo, com `bottom:12px`, cobria os botões; o clique não chegava à navegação. | No celular o cronômetro fica acima da barra. O teste verifica a geometria e navega com o cronômetro aberto, sem forçar cliques. |
| QA-05 / média — promessa editorial incorreta | O texto público prometia resoluções para 1.070 questões. Em **1.034**, o próprio dado informa que resolução comentada ainda não está disponível. | A apresentação passa a informar gabaritos oficiais, preservando a demonstração comentada. Não se inventaram resoluções. Lista em `editorial-gaps.json`. |
| QA-06 / alta, somente PR #9 — percentual contraditório | Para a atividade 12, registrar dois erros: indicador 0/2, 0%. Corrigir um: o seletor de revisão o remove do denominador e o indicador passa a 0/1, 0%, em vez de refletir o acerto. | **Bloqueio documentado; PR #9 não incorporado.** O conjunto da atividade precisa permanecer estável para medir seu desempenho. Os testes atuais desse PR não cobrem essa transição. |

Os testes antigos também estavam desatualizados em relação à interface existente: atividades/mascotes recolhidas em `details`, aplicação explícita do formulário de prazo, conclusão automática da última questão e IDs do cronômetro. Foram atualizados para executar as ações reais de expansão, submissão e navegação, sem esconder elementos nem usar cliques forçados.

## Banco e fontes oficiais

- Validação estrutural de todos os arquivos locais e preservação dos índices históricos: `npm run validate:release`.
- **1.070 questões reais elegíveis, 1.070 IDs canônicos únicos e 6.420 imagens** comparados novamente aos PDFs arquivados, incluindo hashes, prova/caderno/idioma, páginas, limites revisados e tabelas oficiais de gabarito. Verificador profundo aprovado.
- A inspeção visual desta execução cobriu **40 questões** estratificadas por 2017–2024, quatro áreas, inglês/espanhol, textos, tabelas, figuras, frações e estruturas químicas. Os IDs e estratos estão em `references/preventive-audit/visual-sample.json`. O teste móvel carrega as mesmas 40, verifica cinco alternativas, todas as seis imagens e ausência de transbordamento horizontal.
- Os 20 exercícios autorais foram lidos com suas opções, respostas e explicações; não se encontrou divergência nessa revisão. Não têm fonte INEP, por definição.
- Casos 137/2020, 106/2022 e 57/2020 conferidos visualmente: fração E `42/16` completa, estruturas químicas inteiras e texto inferior de E preservado. Não se constatou reaparecimento desses defeitos.
- A nova varredura de bordas retornou 16 candidatos métricos, **zero com pixels visíveis de glifos atravessados**. A varredura de alternativas retornou 26 candidatos em 25 questões; os resultados e hashes coincidem com a revisão anterior, salvo a identificação do novo commit. Alertas automáticos não foram rotulados como defeitos sem evidência visual.
- Questões pendentes/canceladas permanecem fora de novos sorteios. O runtime conserva posições históricas e placeholders; seu comprimento não deve ser confundido com o total de questões disponíveis.

**Limites editoriais:** 446 regiões ainda carecem de transcrição segura; a imagem permanece disponível, mas não é equivalente a uma alternativa acessível para um aluno cego. A igualdade de pixels não comprova a correção pedagógica de toda explicação. A conferência das 1.070 respostas é com os PDFs oficiais arquivados e seus hashes, não uma resolução independente de todas as questões nem nova autenticação editorial com o INEP. Não foi identificado motivo para alterar gabaritos.

## Jornada e aprendizagem

Cobertura automatizada: demonstração, login/cadastro/confirmação e recuperação por e-mail com SDK real e respostas HTTP simuladas; recuperação local; duração e data inicial; **1, 2, 7, 14, 30 e 180 dias**; um card por dia; agrupamento e expansão; seleção por assunto; confirmação versus seleção pendente; interrupção/retomada; conclusão; revisão de erros; redação; simulados; novo ciclo; preservação após mudança de prazo.

Conclusão de atividade e conhecimento não são equivalentes. A marcação manual de um dia não cria respostas nem acertos. O painel existente utiliza a última resposta confirmada por questão, incluindo as copiadas de simulados finalizados; essa regra agora está explícita no painel. Histórico de simulado preserva seu resultado próprio. Os indicadores diários novos do PR #9 não estão na main e não foram aprovados por esta auditoria.

Na reprodução de QA-06 foram executadas as funções reais de seleção da main com a função `planDayMetrics` extraída do SHA auditado do PR #9, sem checkout/merge desse PR. Resultado:

```text
revisão com dois erros: answered=2, correct=0, accuracy=0
após corrigir um deles: answered=1, correct=0, accuracy=0
```

## Persistência, segurança e pagamentos

- Servidor local: contas isoladas, duas sessões, conflitos de revisão, falha de conexão, rascunho de redação, respostas confirmadas/pendentes, recarga e histórico de simulado. Novos testes retêm respostas em trânsito e trocam a sessão compartilhada para verificar isolamento na interface.
- PostgreSQL 16 em container isolado: schema e migrations, RLS, negação a anônimos, tentativa de acesso/criação/alteração cruzada, conflito de revisão, pagamentos, idempotência, integridade dos pedidos e cortesia. A tabela compartilhada de outro aplicativo permaneceu intacta.
- Produção, somente leitura: home e privacidade HTTP 200; chamadas anônimas a `load_enem_study_progress`, `enem_access_status` e `study-content` recusadas com **401**. Foram usadas somente as configurações públicas já distribuídas pelo site. Não foram coletados dados privados.
- `npm audit`, incluindo desenvolvimento: zero vulnerabilidades conhecidas reportadas pelo registro na execução. Isso não comprova ausência de vulnerabilidades na aplicação.
- Mercado Pago exercitado somente por fixtures e SQL local. O bloqueio de produção é fechado por padrão e coberto por testes; **nenhuma configuração de habilitação foi alterada**. Não se afirma que o valor atual do secret hospedado foi consultado: não há credencial administrativa disponível nesta sessão.

## Limites da homologação hospedada

Não houve cadastro de usuários reais, envio de e-mails, compra, reembolso, alteração de secrets, migration hospedada nem teste invasivo em produção. A confirmação de e-mail e recuperação foram verificadas com o SDK e mocks; entrega real, configuração do provedor de e-mail e fluxo hospedado continuam pendentes. RLS foi executado no PostgreSQL local com os scripts do repositório; a sessão não fornece acesso administrativo para atestar que todos os schemas/secrets hospedados correspondem exatamente a eles. O teste entre dispositivos usa contextos independentes de navegador, não dois aparelhos físicos nem uma queda do computador.

## Reprodução

Na pasta `enem/`, com Node 24, Chromium/Playwright, dependências Python do repositório e Docker local:

```sh
npm ci
npm test
npm run validate:release
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
CHROMIUM_PATH=/usr/bin/chromium npm run test:cloud
CHROMIUM_PATH=/usr/bin/chromium npx playwright test --config playwright.sales.config.js
npm run build:pages
CHROMIUM_PATH=/usr/bin/chromium npm run test:pages
bash tests/sql/run-payments.sh
npm run verify:originals
PYTHONDONTWRITEBYTECODE=1 python -m unittest discover -s tests -p 'test_*.py'
python scripts/audit-question-content.py
python scripts/audit-option-layout.py
python scripts/audit-boundary-pixels.py
```

Os builds usam o mesmo diretório `dist/`; executar suítes de navegador sequencialmente em uma mesma pasta. No CI, os modos rodam em jobs isolados. Em runners com Chromium instalado pelo Playwright, omitir `CHROMIUM_PATH`.

## Resultado final da execução

Passaram **82 testes JavaScript, 39 testes de navegador** (26 locais, 3 Supabase simulado, 5 comerciais simulados, 5 estáticos), **14 testes Python**, a validação estrutural e todos os scripts de isolamento/pagamentos no PostgreSQL local. O verificador profundo conferiu 1.070 questões / 6.420 recortes. A amostra visual e móvel cobre 40 questões, e a leitura editorial autoral cobre 20.

A tabela consolidada e as evidências ficam em `references/preventive-audit/`. As correções são entregues em branch/PR separado; não incorporam os PRs #2 ou #9 e não constituem ativação de vendas.
