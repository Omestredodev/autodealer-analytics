# AutoDealer Analytics — Roteiro de apresentação e defesa

**Disciplina:** Tuning e Performance de Dados  
**Tempo sugerido:** aproximadamente 12 minutos de exposição + 3 a 5 minutos de demonstração, ajustáveis conforme a orientação do professor.  
**Equipe:** preencher nomes antes da entrega.  
**Material-base:** `AutoDealer_Analytics_Apresentacao_Final.pptx` e relatório técnico da Entrega 8.

## Fala por slide

| Slide | Tempo sugerido | O que dizer (roteiro conciso) |
|---|---:|---|
| 1. Capa | 20 s | “O AutoDealer Analytics é uma aplicação de concessionária em que combinamos um banco relacional e dois NoSQL de acordo com necessidades de transação, auditoria e telemetria.” |
| 2. Problema | 45 s | “Os mesmos dados não precisam ter o mesmo modelo. Uma venda pede integridade; mudanças pedem histórico; visualizações são eventos que crescem em volume.” |
| 3. Tecnologias | 35 s | “Criamos uma API Fastify/TypeScript consumida por React. Os bancos rodam em contêineres Docker e são acessados pela aplicação.” |
| 4. Arquitetura | 55 s | “O PostgreSQL é a fonte oficial das entidades comerciais. O MongoDB recebe eventos de auditoria; o Cassandra recebe eventos de navegação. UUID e UTC são padrões compartilhados.” |
| 5. PostgreSQL | 45 s | “O seed inicial tem 53.024 linhas em oito tabelas. Validamos chaves estrangeiras, status e 13 índices. A outbox foi adicionada por migração, separada desse total inicial.” |
| 6. Operação comercial | 45 s | “Validamos alterações de leads e agendamentos e conclusão de vendas. Quando a venda é concluída, o veículo relacionado muda para SOLD; o MongoDB registra as mudanças.” |
| 7. Outbox | 1 min | “A alteração de negócio e a intenção de auditar são confirmadas juntas em uma transação PostgreSQL. Depois ocorre a entrega ao MongoDB. Se houver falha, fica pendente para replay. O eventId único evita duplicação lógica.” |
| 8. PostgreSQL: benchmark | 55 s | “Na medição pontual, o plano sequencial forçado levou 92,461 ms, contra 2,381 ms com índice. É uma diferença observada de 38,8×, não uma média validada estatisticamente.” |
| 9. MongoDB: benchmark | 55 s | “Executamos filtros em 10 mil documentos. Índices reduziram o número de documentos examinados. Em uma medição, histórico por entidade foi mais lento com índice; mostramos essa exceção para evitar conclusão enviesada.” |
| 10. Cassandra: benchmark | 55 s | “As cinco consultas foram modeladas por chave de partição. Medimos duas rodadas de 500 consultas por Python, com médias próximas de 15 a 16 ms. Esse conjunto é pequeno, portanto não demonstra escala.” |
| 11. CAP | 1 min | “CAP é relevante quando há partição de rede. Nossa implantação local com MongoDB standalone e Cassandra RF=1 não permitiu ensaiar falhas multinó. Portanto, as conclusões CAP aqui são conceituais.” |
| 12. Limitações | 45 s | “O laboratório validou integração e funcionamento, não alta disponibilidade, segurança de produção ou throughput sob milhões de eventos. O frontend local não substitui autenticação no backend.” |
| 13. Demonstração | 15 s | “Vamos mostrar um fluxo completo de operação, auditoria e telemetria, em dados fictícios.” Faça a demonstração descrita abaixo. |
| 14. Conclusão | 20 s | “O ganho principal é o encaixe entre responsabilidades: integridade no PostgreSQL, histórico no MongoDB e telemetria no Cassandra. Não é uma competição de latência entre bancos.” |

> A soma é uma referência flexível. Para uma apresentação curta, reduza os slides 3, 5, 10 e 12 e preserve arquitetura, outbox, benchmarks e demonstração.

## Demonstração recomendada (3 a 5 minutos)

**Pré-condição:** Docker Desktop com três contêineres funcionando; backend na porta 3333; frontend na 5173; saúde `/health` com `postgresql`, `mongodb` e `cassandra` conectados. Usar **somente dados sintéticos locais**.

1. **Saúde:** mostre a página inicial e, se necessário, execute `Invoke-RestMethod http://127.0.0.1:3333/health | ConvertTo-Json -Depth 4`.
2. **Catálogo:** abra “Veículos” ou “Ver site da concessionária”; busque um modelo e abra um anúncio publicado.
3. **Lead:** em “Leads”, filtre por `NEW`, abra “Detalhes / status”, habilite o modo de demonstração local e altere **um novo registro elegível** para `IN_PROGRESS`.
4. **MongoDB:** abra “Consultar auditoria no MongoDB” e procure `LEAD_STATUS_CHANGED` para **o mesmo UUID do lead**. Alternativamente, mostre em “Auditoria”.
5. **Agendamento (se houver tempo):** altere um `SCHEDULED` para `CONFIRMED` e mostre o evento de auditoria.
6. **Venda (apenas se elegível):** selecione uma venda `PENDING` ainda consistente com o estoque; conclua-a e mostre o veículo marcado `SOLD` e os eventos gerados. **Não force operações se a API rejeitar uma transição.**
7. **Cassandra:** no site público, abra os detalhes de um anúncio e depois consulte a seção de atividade do Dashboard para localizar um novo `ADVERTISEMENT_VIEWED` na data UTC correspondente.

### Plano B — sem risco de perder a apresentação

- **Se der HTTP 502:** verifique `docker compose ps`, depois backend `npm run dev` e frontend `npm run dev`, em terminais separados. Confira `/health`. Não altere o projeto ao vivo.
- **Se não houver lead/venda elegível:** mostre um registro alterado previamente, seu UUID, o evento de auditoria existente e o resultado salvo do teste automatizado. Não invente uma operação.
- **Se a visualização Cassandra não aparecer:** mostre registros existentes na seção de atividade ou o log do teste integrado `testar-integracao-3bancos.ps1`; avise que são evidências coletadas anteriormente, não da sessão ao vivo.
- **Se Docker estiver indisponível:** apresente os dados já registrados no relatório e os comandos no Apêndice A, distinguindo demonstração gravada/documentada de execução atual.

## Perguntas prováveis e respostas curtas

**Por que três bancos em vez de apenas PostgreSQL?**  
Porque o trabalho exige duas tecnologias NoSQL e um relacional e, na arquitetura proposta, cada uma possui um padrão de dados distinto: estado transacional, histórico documental e eventos organizados por consultas. Não seria correto dizer que PostgreSQL é incapaz de armazenar qualquer um deles.

**Por que MongoDB para auditoria?**  
Documentos aceitam conjuntos de campos como `previousValues` e `newValues`, `entityId`, `eventType`, `eventId` e `occurredAt`, com índices úteis para histórico por entidade e tipo.

**O que a outbox resolve?**  
Evita perder a **intenção de auditoria** quando uma mudança no PostgreSQL é confirmada, mas a escrita no MongoDB precisa ser tentada depois. Não torna a transação distribuída nem garante sincronia instantânea.

**Por que a consulta indexada no MongoDB foi mais lenta em um cenário?**  
Há variabilidade de cache, aquecimento e custo de busca; os índices reduziram documentos examinados, mas uma execução pontual não garante melhor latência sempre.

**Cassandra tem maior disponibilidade?**  
Em topologias e configurações apropriadas, Cassandra foi desenhado para distribuição e consistência ajustável. **Neste laboratório, RF=1 e apenas um nó não demonstram tolerância à queda de nó.**

**Qual banco foi o mais rápido?**  
Não é possível concluir, pois as cargas e os instrumentos de medição diferem. O relatório compara cenários **dentro de cada banco**.

**O sistema está pronto para a internet?**  
Não. É uma aplicação local acadêmica; ainda faltam autenticação, autorização no backend e testes de carga/segurança.

## Regras para uma apresentação fiel

- Não apresentar a razão **38,8×** do PostgreSQL como ganho médio ou universal: é uma medição pontual.
- Não dizer que índices foram removidos nos testes; planos sequenciais/`COLLSCAN` foram forçados temporariamente.
- Não afirmar que o benchmark Cassandra prova escalabilidade com milhões de eventos: usa partições pequenas.
- Não afirmar que houve teste real de CAP por partição de rede ou failover.
- No `benchmark.cql`, `CONSISTENCY ONE` está explícito. Confirmar separadamente se o script Python efetivamente executado fixou essa consistência.
- O modo local do frontend **não é mecanismo de autenticação/autorização**.
