# Verificação da ampliação — 02/11/2026

- 284 novas questões reais importadas em oito JSONs; 356 reais armazenadas, 355 elegíveis e 20 autorais preservadas.
- `npm run validate:questions`: IDs, alternativas, respostas, imagens, hashes, metadados, áreas por numeração oficial e gabaritos; confere alternativas textuais com os textos extraídos dos cadernos oficiais.
- `npm test`: 42 testes aprovados, incluindo conservação de índices, normalização do progresso antes de baixar enunciados, filtros combinados, exclusão da anulada, ausência de repetições, carregamento por demanda e recuperação de falha.
- `npm run build:pages`: aprovado; JSONs e imagens copiados para `dist/`. O Vite avisa que o pacote principal excede 500 kB; os enunciados novos continuam fora desse pacote. O pacote anterior e suas dependências foram mantidos.
- `npm run test:pages`: três testes aprovados sobre **servidor estático sem backend e com prefixo `/estudos/`**. Cobrem filtros, caminhos relativos, requisições necessárias, persistência após recarga, retomada de rascunho, correção, caderno de erros, nova tentativa após erro HTTP e largura móvel.
- `npm run test:e2e`: sete dos 12 testes antigos aprovados. Os cinco restantes também falham numa cópia limpa do commit original `c4a213e`, antes destas alterações, com os mesmos seletores/expectativas obsoletos: dois testes de mascotes, sequência de plano e dois testes de redesign. Esperam conteúdo de `details` aberto, CTA anterior ou IDs antigos do cronômetro. Os testes e componentes envolvidos foram preservados.
- Testes que exigem credenciais Supabase e PostgreSQL externos não foram executados nesta sessão; a suíte local usa seu ambiente de teste existente.

Fontes, contagens por ano/área, restrições de reutilização e instruções de manutenção estão em `QUESTION-SOURCES.md`. O diagnóstico anterior à edição foi apresentado no chat: Vite/JavaScript, 92 registros persistidos por índices, imagens locais e banco antigo importado estaticamente.
