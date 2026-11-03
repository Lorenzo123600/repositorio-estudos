# Carrossel do plano de estudos

O plano conserva o resumo e a barra geral acima dos dias. Exibe um dia por vez até 1099px e dois a partir de 1100px, usando rolagem nativa e scroll snap, sem novas dependências. Ao abrir, seleciona o primeiro dia com atividades pendentes; em desktop o último dia pode compartilhar a posição com o anterior.

Anterior/próximo, indicadores, seletor e setas/Home/End (com foco na faixa) mudam apenas a apresentação. Cards fora da posição ficam `inert` e ocultos na árvore de acessibilidade. A posição é anunciada por uma região de status. Movimento reduzido desativa a animação. Os detalhes de cada dia conservam os botões para as questões e redações reais.

## Auditoria do progresso

Questões respondidas, acertos e atividades concluídas têm denominadores diferentes. Uma atividade pode conter dez questões; responder uma gera aproveitamento, mas não conclui a atividade. As métricas do card usam a união das seleções persistidas por atividade, sem duplicar questões em dias agrupados. A conclusão manual continua sem inventar respostas.

Foi identificada uma falha: a conclusão automática de treino não consultava a sequência de dias, ao contrário da conclusão manual. Agora ela exige todas as respostas confirmadas e os dias anteriores concluídos. Praticar um dia futuro continua permitido e preserva as respostas, mas não conclui sua etapa nem desbloqueia dias. Não há exigência de percentual de acertos.

Também foi coberto o caso de uma sessão restaurada sem seleção registrada nas métricas: confirmar respostas ou finalizar registra os IDs estáveis usados no treino. A estrutura persistida, autenticação e controles de acesso continuam existentes; não há migração de banco ou alteração de gabaritos.

## Verificação

- Testes unitários: seleção inicial, métricas parciais, agrupamento, retomada, conclusão idempotente e bloqueio de dias futuros.
- Playwright: 320, 390, 768 e 1365px; planos de 1 a 180 dias; toque, teclado, indicadores, detalhes, retorno às questões, foco, árvore acessível e movimento reduzido.
- Regressão dos fluxos de estudo, questões, simulados, redação, autenticação e isolamento de contas.
- SDK Supabase com HTTP simulado: navegar no carrossel não dispara gravação de progresso; sincronização entre sessões preservada.

Os testes de acessibilidade são automatizados em Chromium; não substituem uma sessão manual com leitores de tela em dispositivos físicos.

Resultado nesta alteração: 92 testes unitários, 31 de regressão local, 4 específicos do carrossel, 3 de Supabase, 5 de acesso comercial e 5 de Pages aprovados (140 no total). Builds local, comercial e Pages aprovados. Para repetir Pages após o build comercial, executar `npm run build:pages` antes de `npm run test:pages`, pois ambos usam `dist`.
