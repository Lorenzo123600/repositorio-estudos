# Ajustes da experiência do estudante

Base conferida: main `938e44d` (inclui as correções da auditoria e os indicadores do PR #11).

- **Embaralhar questões:** botão na prática para reorganizar o conjunto selecionado. Não embaralha alternativas nem altera IDs, gabaritos ou respostas. Em atividades do plano, a seleção e a posição atual continuam disponíveis para retomada.
- **Relógio personalizado:** duração livre de 1 a 240 minutos, além dos atalhos existentes. A contagem usa o horário de término, continua ao navegar/esconder e é recuperada após recarga.
- **Esconder relógio:** botão próprio no painel. O botão Relógio do cabeçalho permite reabrir. A preferência de ocultação também é preservada.
- **Simulado personalizado:** de 1 a 180 questões (limitado à disponibilidade nos filtros) e de 1 a 360 minutos. Preserva os filtros de ano, disciplina, área e dificuldade. As sessões de 10/20 questões continuam disponíveis.
- **Recarga:** a navegação da aba do navegador passa a guardar a área, filtros e questão atual, com preferências separadas por conta. Simulados continuam preservando seleções pendentes, confirmações e prazo no progresso. Não utiliza a URL ou a preferência de navegação como autorização de acesso.
- **Planos e pagamentos:** entrada explícita no cabeçalho; visitante pode consultar a oferta anunciada, e a conta autenticada consulta catálogo e compras pelo backend. Nenhuma configuração de habilitação de pagamentos foi alterada.
- **Conta já conectada:** enquanto a sessão é restaurada, a apresentação de visitante fica escondida. Contas conectadas sem acesso ativo recebem uma área de conta, sem convites repetidos para conhecer a demonstração. A autorização do conteúdo completo continua sendo confirmada pelo servidor.
- **Revisão autoral:** removida como opção da tela de questões. O banco e as respostas históricas não foram apagados.
- **Desafios:** foco em missões diárias e conquistas, conforme preferência escolhida. Mostra progresso real das missões, coleção de conquistas e atalhos para cada ação; preserva os desafios de conceitos e o caderno de erros.

## Verificação

`tests/e2e/student-experience.spec.js` verifica embaralhamento sem perda de respostas, simulado de 7 questões/13 minutos com filtro de Natureza, preservação de área e respostas pendentes após recarga, relógio de 7 minutos com avanço controlado do tempo, ocultação e restauração, missões baseadas em ações reais e layout móvel de 320/390 px. As suítes existentes continuam cobrindo isolamento de contas, plano, simulados e pagamentos simulados.

Mudanças ficam em branch/PR próprio; não habilitam cobranças reais, não alteram gabaritos e não removem histórico do aluno.

Resultado local: 85 testes JavaScript e 44 testes de navegador aprovados (31 locais, 3 Supabase simulado, 5 comerciais e 5 Pages). Compilações e validação do banco concluídas nas suítes.


## Correção do carregamento na prévia

Diagnóstico remoto: `OPTIONS /functions/v1/study-content` com origem `https://bora-pro-enem.pages.dev` retorna 204; com `https://17a4e897.bora-pro-enem.pages.dev` retorna 403 `origin_not_allowed`. A função hospedada permite somente `PAYMENTS_APP_ORIGIN`, enquanto a interface da prévia consegue autenticar e consultar o acesso pelo SDK. A falha ocorre na entrega do conteúdo.

A função passa a aceitar também uma lista **explícita**, separada por vírgulas, em `STUDY_CONTENT_ALLOWED_ORIGINS`. Para esta prévia, configurar:

```text
STUDY_CONTENT_ALLOWED_ORIGINS=https://17a4e897.bora-pro-enem.pages.dev,https://feat-student-experience-2026.bora-pro-enem.pages.dev
```

É necessário publicar a versão atualizada da Edge Function `study-content` e configurar essa variável no projeto Supabase `oeblcfrygdrywdorengz`. Esta sessão não tem credencial administrativa para executar essa implantação. A publicação automática do frontend na Cloudflare não publica funções Supabase.

Não alterar `PAYMENTS_APP_ORIGIN` para resolver a prévia. A lista se aplica somente à entrega do estudo; não muda checkout, RLS, validação de JWT ou exigência de acesso vigente. Não aceita wildcard ou confiança por sufixo. Novos endereços de prévia precisam ser incluídos explicitamente. Os testes verificam prévia autorizada, origens falsas, requisição anônima, usuário sem acesso e conteúdo protegido.
