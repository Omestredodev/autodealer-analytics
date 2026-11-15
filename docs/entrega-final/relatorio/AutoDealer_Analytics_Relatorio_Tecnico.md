# AutoDealer Analytics
Relatório técnico de arquitetura, consistência e desempenho


**Disciplina:** Tuning e Performance de Dados  
**Curso:** Ciência da Computação  
**Equipe:** [preencher]  
**Docente:** [preencher]  
**Local/data:** São Bernardo do Campo, novembro de 2026



---


# Resumo


Este relatório descreve a arquitetura multibanco do AutoDealer Analytics, projeto acadêmico de análise e operações de concessionária. PostgreSQL é a fonte de verdade das entidades transacionais; MongoDB preserva a trilha de auditoria; Cassandra armazena eventos de navegação. Os bancos compartilham UUIDs e convenções de tempo UTC, mas cumprem responsabilidades distintas. A integração entre PostgreSQL e MongoDB utiliza o padrão outbox transacional: as alterações de negócio e a intenção de auditoria são confirmadas na mesma transação PostgreSQL; a entrega ao MongoDB ocorre em etapa posterior, com idempotência e possibilidade de reprocessamento.


Os testes observaram, em uma comparação pontual do PostgreSQL, 92,461 ms no plano sequencial forçado e 2,381 ms em um plano indexado para consulta de 20 veículos. No MongoDB, duas rodadas sobre 10.000 documentos sintéticos demonstraram redução do número de documentos examinados com índices, embora uma consulta tenha sido mais lenta com índice na primeira medição. No Cassandra, duas rodadas de 500 leituras apresentaram médias predominantemente próximas a 15–16 ms para cinco consultas por chave de partição, com conjunto de dados pequeno. Os dados não permitem comparar diretamente a velocidade dos três bancos nem concluir sobre disponibilidade sob partições de rede, pois o laboratório executou instâncias locais sem topologia distribuída.


Palavras-chave: bancos poliglotas; PostgreSQL; MongoDB; Cassandra; índice; benchmark; consistência; CAP; outbox transacional.


# Sumário


- 1. Contexto, objetivo e escopo

- 2. Arquitetura e contratos compartilhados

- 3. Modelagem e fluxos de negócio

- 4. Metodologia dos experimentos

- 5. Resultados de desempenho

- 6. CAP, consistência e falhas

- 7. Limitações e recomendações

- 8. Conclusão

- Apêndice A — Comandos reproduzíveis

- Apêndice B — Catálogos e evidências

- Referências documentais e técnicas


---


# 1. Contexto, objetivo e escopo


O AutoDealer Analytics reúne catálogo de veículos, anúncios, leads, agendamentos, vendas e indicadores de atividade. O desafio da disciplina é utilizar um banco relacional e dois bancos NoSQL em um único sistema, justificando especializações de armazenamento e avaliando escolhas de desempenho.


## 1.1 Objetivo geral


Projetar, implementar e avaliar uma solução poliglota em que integridade transacional, trilha de auditoria e eventos de interação sejam atendidos por tecnologias diferentes, sem duplicar indevidamente as entidades centrais.


## 1.2 Objetivos específicos


- Aplicar PostgreSQL 17 às entidades relacionais, restrições e alterações comerciais.

- Utilizar MongoDB 7.0 para documentos de auditoria com índices e identificação idempotente.

- Modelar Cassandra 5.0 por padrões de consulta para eventos de atividade.

- Conectar Fastify/TypeScript e interface React às três bases.

- Registrar experimentos reproduzíveis e discutir consistência, tolerância a falhas e limites de generalização.

## 1.3 Evidências e procedência


Este texto se baseia nos quatro arquivos compartilhados pela equipe — database-architecture.md, data-contract.md, event-catalog.md e status-dictionary.md —, nos scripts de modelagem e integração fornecidos durante o desenvolvimento e nos resultados de terminal efetivamente apresentados ao longo da validação. Os documentos de contrato se identificam como definições iniciais; as descrições de implementação deste relatório representam a evolução observada após essas definições.


# 2. Arquitetura e contratos compartilhados


*Figura 1 — Fluxo lógico da aplicação e responsabilidades de armazenamento*


| Camada | Responsabilidade | Fonte oficial |

|---|---|---|

| PostgreSQL | Veículos, anúncios, usuários, clientes, leads, agendamentos, vendas; integridade referencial. | Sim, entidades transacionais |

| MongoDB | Histórico e auditoria de alterações; valores anteriores/posteriores. | Sim, registros de auditoria |

| Cassandra | Visualizações, cliques, buscas e outras atividades de navegação. | Sim, registros de atividade |



## 2.1 Identificadores, datas e nomenclatura


Os identificadores oficiais das entidades são UUIDs do PostgreSQL e são reutilizados nas referências do MongoDB e do Cassandra. Eventos possuem UUID próprio, independente da entidade; correlationId associa eventos de uma mesma operação. Datas compartilhadas seguem UTC: TIMESTAMPTZ no PostgreSQL, BSON Date no MongoDB e timestamp no Cassandra. Eventos usam UPPER_SNAKE_CASE; a interface pode traduzir rótulos, mas não altera os valores técnicos de status.


## 2.2 Segregação de responsabilidades


O modelo evita copiar dados transacionais completos em bancos orientados a eventos. Uma visualização de anúncio é um registro de atividade no Cassandra, não uma alteração de status do anúncio; um evento de auditoria no MongoDB descreve uma alteração feita no PostgreSQL, não substitui o estado atual da entidade. A coordenação entre bancos ocorre na aplicação.


# 3. Modelagem e fluxos de negócio


## 3.1 Modelo relacional PostgreSQL


O schema principal validado contém oito tabelas: users, customers, vehicle_catalog, vehicles, advertisements, leads, appointments e sales. Uma migração aditiva acrescentou audit_outbox como mecanismo de entrega assíncrona de eventos de auditoria.


| Entidade | Registros inseridos no seed inicial | Função |

|---|---|---|

| users | 20 | Operadores e usuários |

| customers | 5.000 | Clientes |

| vehicle_catalog | 4 | Especificações verificadas |

| vehicles | 10.000 | Veículos individuais |

| advertisements | 12.000 | Anúncios comerciais |

| leads | 15.000 | Oportunidades de contato |

| appointments | 7.000 | Atendimentos agendados |

| sales | 4.000 | Vendas |



Total inicial registrado pelo seed: 53.024 linhas nas oito tabelas. Os testes posteriores alteraram status sem necessariamente aumentar esses totais. A referência entre veículos e catálogo usa vehicles.catalog_id; anúncios referenciam vehicles.id por vehicle_id. As entidades comerciais possuem chaves estrangeiras para clientes, usuários e outras entidades conforme o schema.


## 3.2 Estados de negócio e operações verificadas


| Entidade | Estados padronizados |

|---|---|

| Veículo | AVAILABLE / RESERVED / SOLD / INACTIVE |

| Anúncio | DRAFT / PUBLISHED / PAUSED / ENDED |

| Lead | NEW / IN_PROGRESS / CONVERTED / LOST |

| Agendamento | SCHEDULED / CONFIRMED / CANCELLED / COMPLETED |

| Venda | PENDING / COMPLETED / CANCELLED |



Na integração funcional, a alteração de lead de NEW para IN_PROGRESS, a confirmação de agendamento SCHEDULED para CONFIRMED e a conclusão de venda PENDING para COMPLETED foram exercitadas por API e interface React. A conclusão de venda atualizou o veículo relacionado para SOLD e encerrou anúncios relacionados, com emissão de eventos de auditoria. Os testes reportaram 0 eventos pendentes de auditoria ao final do cenário executado.


## 3.3 MongoDB: auditoria documental


O MongoDB usa a coleção audit_events e referencia entityType/entityId, eventId, occurredAt, previousValues, newValues e correlationId. Foram definidos 12 tipos de eventos de auditoria. O módulo mantém índices por eventId (único), histórico de entidade, tipo de evento, usuário, instante e correlação. O índice único de eventId auxilia o reprocessamento idempotente.


## 3.4 Cassandra: tabelas por padrão de consulta


O Cassandra mantém cinco tabelas denormalizadas: events_by_advertisement, events_by_user, events_by_vehicle, events_by_type e events_by_period. Cada tabela foi organizada para uma família de consultas. A chave de partição combina o identificador do agrupamento (quando aplicável), event_day e shard; occurred_at e event_id compõem as colunas de clustering. A estratégia evita ALLOW FILTERING nas consultas previstas.


No laboratório, o keyspace autodealer utiliza SimpleStrategy com replication_factor = 1, suficiente para o ensaio local, mas incapaz de demonstrar redundância ou tolerância à indisponibilidade de nó.


## 3.5 Outbox transacional e integração entre bases


1. O backend recebe a alteração de status e inicia uma transação no PostgreSQL.

1. Altera a entidade de negócio e insere evento em audit_outbox na mesma transação.

1. Após o COMMIT, tenta entregar o documento ao MongoDB.

1. A chave única eventId impede duplicação lógica em reenvios; em falha, o evento permanece pendente para replay.

1. Ao confirmar a entrega, registra delivered_at; em erro, mantém attempts/last_error.

O teste funcional validou o caminho feliz e a entrega sem pendências no instante observado. Ele não comprova recuperação automática de todos os tipos de falha nem atomicidade distribuída; entre COMMIT no PostgreSQL e confirmação no MongoDB existe janela de consistência eventual. Telemetria Cassandra usa fluxo próprio e não participa da transação comercial.


# 4. Metodologia dos experimentos


Os três bancos foram executados localmente via Docker Desktop, nas versões PostgreSQL 17, MongoDB 7.0 e Cassandra 5.0. As medições foram realizadas em Windows/PowerShell; o benchmark Python utilizou Python 3.12.10 com cassandra-driver e pacote de compatibilidade pyasyncore. Não foram coletadas especificações de CPU, RAM, armazenamento, limites de contêiner, latências de rede nem cargas concorrentes controladas.


| Banco | Carga / consulta | Instrumento | Repetição observada |

|---|---|---|---|

| PostgreSQL | 10.000 veículos; top 20 AVAILABLE | EXPLAIN (ANALYZE, BUFFERS) | 1 par de planos |

| MongoDB | 10.000 documentos sintéticos temporários; 5 filtros | explain; IXSCAN vs $natural | 2 rodadas de 5 cenários |

| Cassandra | 2 eventos do seed em partição fixa; 5 SELECTs | cqlsh + time.perf_counter | 2 rodadas × 100/consulta |



Metodologias e cargas não são equivalentes entre bancos. Para PostgreSQL, EXPLAIN ANALYZE reporta tempo do executor, não inclui apresentação da resposta ao cliente; para MongoDB, os campos ms são métricas pontuais do plano; para Cassandra, o cronômetro Python inclui chamada do driver, protocolo e resposta. Consequentemente, a comparação quantitativa apropriada é interna a cada tecnologia.


## 4.1 Controle experimental e cuidados


- No PostgreSQL, o cenário “sem índice” foi simulado com enable_indexscan, enable_indexonlyscan e enable_bitmapscan desligados somente na transação; índices não foram removidos.

- No MongoDB, o cenário COLLSCAN foi forçado via $natural; o script criou e excluiu coleção temporária, preservando a coleção de auditoria principal.

- No Cassandra, o arquivo benchmark.cql definiu explicitamente CONSISTENCY ONE. O arquivo benchmark.py recebido originalmente não apresentava configuração explícita de consistência; confirmar a cópia efetivamente executada antes da submissão definitiva.

- Os benchmarks não mediram tolerância a partições, falha de nós, throughput máximo, carga concorrente ou escalabilidade horizontal.

# 5. Resultados de desempenho


## 5.1 PostgreSQL — consulta de catálogo


Consulta: SELECT id, status, created_at FROM public.vehicles WHERE status = 'AVAILABLE' ORDER BY created_at DESC LIMIT 20. O plano sequencial examinou 10.000 linhas e encontrou 8.498 disponíveis, removendo 1.502 pelo filtro. O plano indexado utilizou idx_vehicles_available_created e retornou rapidamente os 20 resultados.


| Indicador | Seq Scan + Sort (forçado) | Index Scan (normal) |

|---|---|---|

| Execution Time | 92,461 ms | 2,381 ms |

| Planning Time | 15,788 ms | 0,916 ms |

| Buffers | 519 shared hit | 2 shared hit; 2 shared read |

| Linhas retornadas | 20 | 20 |

| Índice | Acesso desabilitado na transação | idx_vehicles_available_created |



*Figura 2 — Tempos observados da consulta PostgreSQL; uma medição por plano*


Nesta execução, o plano com índice apresentou aproximadamente 38,8 vezes menos tempo (redução de 97,4%). Essa razão é descritiva da amostra, não uma estimativa estatística de ganho médio. A diferença de buffers e o primeiro read do índice também indicam que o estado do cache e o planejamento influenciam a medição.


## 5.2 MongoDB — índices versus COLLSCAN


Cada rodada criou uma coleção temporária com 10.000 documentos sintéticos (499 ms na primeira inserção e 473 ms na segunda) e comparou índices especializados com COLLSCAN forçado. A coleção temporária foi excluída ao final. O script registrou 29 documentos originais preservados na coleção de auditoria principal.


| Consulta | R1 índice | R1 scan | R2 índice | R2 scan | Docs índice |

|---|---|---|---|---|---|

| Histórico por entidade | 16 ms | 11 ms | 1 ms | 6 ms | 200 |

| SALE_COMPLETED | 1 ms | 5 ms | 1 ms | 5 ms | 833 |

| Auditoria por usuário | 2 ms | 5 ms | 1 ms | 6 ms | 1.000 |

| Intervalo UTC | 5 ms | 7 ms | 2 ms | 7 ms | 2.001 |

| Fluxo por correlationId | 2 ms | 5 ms | 1 ms | 5 ms | 100 |



*Figura 3 — Duas rodadas MongoDB: tempos de planos com índice e varredura forçada*


Nas cinco consultas, o índice reduziu o número de documentos examinados em relação aos 10.000 documentos do COLLSCAN. A primeira rodada do histórico por entidade apresentou resultado inverso em tempo (16 ms indexado versus 11 ms sequencial); a segunda mostrou 1 ms versus 6 ms. Isso deve ser relatado integralmente: o uso de índice reduz trabalho de leitura, mas não garante menor latência em toda execução pontual.


## 5.3 Cassandra — consultas por partição


As cinco consultas CQL retornaram 2 registros por anúncio, 2 por usuário, 2 por veículo, 1 por tipo ADVERTISEMENT_VIEWED e 2 por período, usando o seed da partição 2026-11-02 / shard 0. Todas concluíram sem ALLOW FILTERING. Em Python, cada rodada efetuou 100 medições por categoria e uma chamada de aquecimento por consulta.


| Consulta | Média R1 | Mediana R1 | Média R2 | Mediana R2 |

|---|---|---|---|---|

| Por anúncio | 15,337 | 15,191 | 15,529 | 15,540 |

| Por usuário | 16,539 | 15,520 | 15,526 | 15,515 |

| Por veículo | 15,592 | 15,678 | 15,659 | 15,503 |

| Por tipo | 15,439 | 15,439 | 15,463 | 15,459 |

| Por período | 15,867 | 15,545 | 15,900 | 15,575 |



Valores em milissegundos (ms). A maior latência individual reportada foi 45,531 ms na rodada 2 (por período); a menor foi 4,862 ms (por usuário, rodada 2). As duas rodadas totalizaram 1.000 medições, não incluindo as chamadas de aquecimento.


*Figura 4 — Médias Cassandra entre as duas rodadas do script Python*


As médias próximas a 15–16 ms são resultados de consultas pequenas, orientadas a partição, em um único nó. Sua proximidade entre rodadas não permite inferir desempenho em centenas de milhares ou milhões de eventos. Também não equivalem aos tempos de execução medidos no servidor PostgreSQL: aqui se mede a interação do cliente Python com Cassandra.


# 6. Teorema CAP, consistência e tolerância a falhas


## 6.1 Interpretação do CAP


O teorema CAP descreve uma escolha condicionada à ocorrência de partição de rede em sistemas distribuídos: não é possível manter simultaneamente disponibilidade de todas as requisições e consistência no sentido de visão única coerente do estado. Tolerância à partição é uma condição do cenário distribuído, não um recurso opcional a simplesmente desligar. CAP não substitui ACID, isolamento de transações nem modelos de consistência configuráveis.


Os contratos internos não apresentam uma classificação CAP formal. A análise a seguir é conceitual, fundamentada na arquitetura implementada e na documentação dos fabricantes; NÃO deriva de um ensaio prático de partição, pois o laboratório possui instâncias únicas locais.


| Tecnologia | Decisão de consistência / disponibilidade | O que foi de fato testado |

|---|---|---|

| PostgreSQL | Transações locais e integridade referencial preservam o estado transacional; características em falhas distribuídas dependem da topologia de replicação, não ensaiada. | Commit/Rollback e índices em instância única. |

| MongoDB | Replica sets oferecem readConcern e writeConcern ajustáveis; maioria pode privilegiar garantias de commit frente à perda de quórum. A instância standalone usada não demonstrou isso. | Auditoria/idempotência e consultas indexadas locais. |

| Cassandra | Consistência ajustável por operação; ONE exige resposta de uma réplica. RF=1 não oferece redundância diante de queda de nó. | Consultas CQL com ONE; não houve partição entre nós. |



## 6.2 Consistência observada na integração


PostgreSQL fornece atomicidade no escopo da transação local. A outbox insere o evento pendente na mesma transação da mudança comercial; após o commit, a entrega ao MongoDB é separada. Assim, o estado do negócio pode estar atualizado enquanto a auditoria ainda está pendente — consistência eventual entre bancos. eventId único e novas tentativas mitigam duplicações. O correlationId mantém rastreabilidade entre eventos gerados por uma única operação.


No Cassandra, o contrato prevê registros de interação independentemente das transações de venda. O uso de ONE no CQL, em um nó com fator de replicação 1, não implica tolerância a falhas. Em uma futura implantação distribuída, o requisito de visibilidade poderá alterar os níveis de consistência. MongoDB também pode oferecer modelos de leitura/escrita mais fortes conforme readConcern/writeConcern e topologia de replica set; nada disso foi medido no protótipo standalone.


## 6.3 Cenários de falha e comportamento esperado


| Cenário | Comportamento esperado / mitigação |

|---|---|

| MongoDB fora do ar após COMMIT PostgreSQL | Evento permanece na audit_outbox para reprocessamento posterior; operação de negócio não é desfeita retroativamente. |

| Resposta MongoDB perdida após gravação | Novo envio com mesmo eventId deve encontrar duplicata e validar o documento, evitando duplicação lógica. |

| Cassandra indisponível no registro de atividade | Falha da telemetria não significa que a operação comercial no PostgreSQL tenha sido revertida; política de retry da atividade precisa ser definida. |

| Queda de único nó Cassandra (RF=1) | Serviço sem réplica disponível; não há tolerância comprovada. |

| Falha de rede entre réplicas (laboratório) | Não ensaiada. Seria necessário ambiente multinó e injeção de falhas controlada. |



# 7. Limitações, riscos e melhorias recomendadas


## 7.1 Limitações metodológicas


- PostgreSQL: apenas uma execução por plano; sem repetições, variância ou experimento com cache controlado.

- MongoDB: duas rodadas pontuais sobre dados sintéticos, sem carga concorrente ou distribuição realista de tamanhos de documento.

- Cassandra: duas rodadas de 500 leituras, mas partições de seed com 1–2 registros; não avalia grandes volumes, hot partitions nem comportamento sob múltiplos nós.

- Não foi registrada configuração detalhada do hardware, parâmetros do Docker, distribuição de tamanhos de dados, simultaneidade e versão exata do driver Python.

- O código original do benchmark.py disponibilizado não define explicitamente ConsistencyLevel.ONE nem consome toda a iteração na medição; confirmar a versão efetivamente utilizada e anexá-la como evidência.

- Não ocorreram testes de partição de rede e queda de nó, portanto CAP e garantias distribuídas permanecem análise teórica.

## 7.2 Segurança e limites de implantação


A aplicação demonstrativa permite ações comerciais em modo local, mas ainda não possui autenticação/autorização de produção. Um controle visual de “habilitar alterações” no React não substitui autorização no backend. É indispensável implementar identidade, permissões por perfil, validações de negócio, proteção de endpoints e observabilidade antes de exposição externa.


## 7.3 Evolução para experimentos mais robustos


- Executar ≥ 30 amostras por cenário PostgreSQL, com warm-up e ordem alternada, registrando mediana, p95 e desvio.

- Repetir MongoDB sob conjuntos de dados maiores e métricas combinadas de latência, docsExamined/keysExamined e seletividade.

- Criar carga sintética separada para Cassandra com particionamento distribuído, múltiplos tamanhos de partição e avaliação de throughput e p95.

- Montar topologias replicadas de MongoDB e Cassandra em ambiente de testes para medir disponibilidade e consistência sob partições.

- Conferir instrumentação cliente-servidor, fixar nível ONE no script Python se for a decisão experimental e guardar logs brutos junto ao relatório.

# 8. Conclusão


O AutoDealer Analytics demonstrou integração funcional entre três tecnologias de banco de dados orientadas a responsabilidades distintas. PostgreSQL preservou as entidades e operações transacionais; MongoDB manteve histórico de auditoria; Cassandra armazenou eventos de interação e respondeu a consultas planejadas por chave de partição. Os testes do frontend confirmaram alterações de leads, agendamentos, vendas e visualizações de anúncios, com registros nos bancos correspondentes.


A análise de desempenho forneceu evidências internas a cada motor: a consulta indexada PostgreSQL foi muito mais rápida no experimento pontual; o MongoDB reduziu consistentemente documentos examinados com índices; o Cassandra atendeu cinco consultas orientadas a partição com latências locais na ordem de dezenas de milissegundos. Os resultados não provam superioridade absoluta de um banco sobre outro, nem elasticidade, disponibilidade ou consistência distribuída sob falhas. A arquitetura poliglota se justifica pelas diferentes necessidades de integridade, histórico e telemetria, e não por uma comparação artificial de tempos entre consultas não equivalentes.



---


# Apêndice A — Comandos para reprodução


Os comandos a seguir foram os utilizados nos testes, ou reproduzem seu método. Executar a partir de C:\Projetos\autodealer-analytics, com Docker Desktop iniciado. Não executar novamente scripts de seed indiscriminadamente em bancos já populados. Não utilizar docker compose down -v, pois remove volumes persistidos.


## A.1 Preparar o ambiente


```powershell
cd C:\Projetos\autodealer-analytics
docker compose up -d
docker compose ps
```


## A.2 PostgreSQL: comparar planos


```powershell
docker exec autodealer-postgres psql -X -v ON_ERROR_STOP=1 -U postgres -d autodealer_analytics -c "BEGIN; SET LOCAL enable_indexscan = off; SET LOCAL enable_indexonlyscan = off; SET LOCAL enable_bitmapscan = off; EXPLAIN (ANALYZE, BUFFERS) SELECT id, status, created_at FROM public.vehicles WHERE status = 'AVAILABLE' ORDER BY created_at DESC LIMIT 20; ROLLBACK;"
```


```powershell
docker exec autodealer-postgres psql -X -v ON_ERROR_STOP=1 -U postgres -d autodealer_analytics -c "EXPLAIN (ANALYZE, BUFFERS) SELECT id, status, created_at FROM public.vehicles WHERE status = 'AVAILABLE' ORDER BY created_at DESC LIMIT 20;"
```


## A.3 MongoDB: benchmark de auditoria


```powershell
docker cp .\database\mongodb\benchmark.js autodealer-mongo:/tmp/benchmark.js
docker exec autodealer-mongo mongosh --quiet "mongodb://127.0.0.1:27017/autodealer" /tmp/benchmark.js
```


O script cria uma coleção temporária, compara cenários indexados com COLLSCAN forçado por $natural e remove essa coleção ao final. Não confundir a coleção temporária de benchmark com audit_events, usada pela aplicação.


## A.4 Cassandra: consultas CQL


```powershell
docker cp .\database\cassandra\benchmark.cql autodealer-cassandra:/tmp/benchmark.cql
docker exec autodealer-cassandra cqlsh -f /tmp/benchmark.cql
```


As cinco consultas do arquivo utilizam a chave de partição, data 2026-11-02 e shard 0; o CQL declara CONSISTENCY ONE.


## A.5 Cassandra: benchmark Python


```powershell
py -3.12 -m pip install cassandra-driver pyasyncore
py -3.12 -c "from cassandra.cluster import Cluster; print('Driver Cassandra carregado com sucesso!')"
py -3.12 .\database\cassandra\benchmark.py
New-Item -ItemType Directory -Force .\docs\benchmarks | Out-Null
py -3.12 .\database\cassandra\benchmark.py | Tee-Object -FilePath .\docs\benchmarks\cassandra-resultados.txt
```


Recomenda-se adicionar ao script Python um SimpleStatement(consistency_level=ConsistencyLevel.ONE) caso seja necessário assegurar esse nível explicitamente, e consumir o result set dentro do período medido. O arquivo original recebido não continha esses detalhes; tratam-se de recomendações para revisão, não de evidências retrospectivas.


## A.6 Verificação funcional da aplicação


```powershell
# Terminal 1
cd C:\Projetos\autodealer-analytics\backend
npm run dev
# Terminal 2
cd C:\Projetos\autodealer-analytics\frontend
npm run dev
# Terminal 3
Invoke-RestMethod http://127.0.0.1:3333/health
Invoke-RestMethod http://127.0.0.1:5173/api/health
```


O fluxo demonstrativo principal: listar um lead NEW, alterar para IN_PROGRESS, consultar evento LEAD_STATUS_CHANGED no MongoDB, confirmar agendamento, concluir venda e consultar veículo SOLD; visitar anúncio no site público e conferir ADVERTISEMENT_VIEWED no Cassandra. Usar somente dados fictícios de desenvolvimento.


# Apêndice B — Evidências e arquivos-fonte


| Arquivo / evidência | Uso no relatório |

|---|---|

| docs/architecture/database-architecture.md | Responsabilidades e limites arquiteturais |

| docs/database-models/data-contract.md | UUID, UTC, contratos de integração |

| docs/database-models/event-catalog.md | Eventos MongoDB/Cassandra |

| docs/database-models/status-dictionary.md | Status oficiais |

| database/postgresql/{schema,seed,indexes,benchmark}.sql | Modelo relacional e avaliação |

| database/mongodb/{collections,indexes,benchmark}.js | Modelo e comparação IXSCAN / COLLSCAN |

| database/cassandra/{schema,benchmark}.cql | Particionamento e SELECTs de referência |

| database/cassandra/benchmark.py | 100 leituras por padrão |

| database/postgresql/migrations/001_audit_outbox.sql | Outbox de auditoria |

| docs/benchmarks/cassandra-resultados.txt | Segunda rodada Cassandra, salva pelo grupo |



## B.1 Eventos de auditoria (MongoDB)


Catálogo documentado: VEHICLE_CREATED, VEHICLE_UPDATED, VEHICLE_STATUS_CHANGED, ADVERTISEMENT_CREATED, ADVERTISEMENT_UPDATED, ADVERTISEMENT_PUBLISHED, ADVERTISEMENT_PAUSED, ADVERTISEMENT_ENDED, LEAD_STATUS_CHANGED, APPOINTMENT_STATUS_CHANGED, SALE_COMPLETED e SALE_CANCELLED.


## B.2 Eventos de atividade (Cassandra)


Catálogo documentado: ADVERTISEMENT_VIEWED, ADVERTISEMENT_CLICKED, VEHICLE_SEARCHED, VEHICLE_FAVORITED, VEHICLE_UNFAVORITED e LEAD_INTERACTION. O seed CQL conferido contém dois tipos de eventos; não se deve afirmar que as seis categorias foram simuladas no benchmark.


# Referências documentais e técnicas


[D1] EQUIPE AUTODEALER ANALYTICS. database-architecture.md. Arquitetura de Banco de Dados, versão 1.0, documento interno.


[D2] EQUIPE AUTODEALER ANALYTICS. data-contract.md. Contrato de Dados e Integração entre Bancos, versão 1.0, documento interno.


[D3] EQUIPE AUTODEALER ANALYTICS. event-catalog.md. Catálogo de Eventos, versão 1.0, documento interno.


[D4] EQUIPE AUTODEALER ANALYTICS. status-dictionary.md. Dicionário de Status, versão 1.0, documento interno.


[R1] POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL 17: Using EXPLAIN. https://www.postgresql.org/docs/17/using-explain.html. Acesso em: 15 nov. 2026.


[R2] POSTGRESQL GLOBAL DEVELOPMENT GROUP. PostgreSQL: Multiversion Concurrency Control. https://www.postgresql.org/docs/17/mvcc-intro.html. Acesso em: 15 nov. 2026.


[R3] MONGODB, INC. Read Concern. https://www.mongodb.com/docs/manual/reference/read-concern/. Acesso em: 15 nov. 2026.


[R4] MONGODB, INC. Write Concern. https://www.mongodb.com/docs/manual/reference/write-concern/. Acesso em: 15 nov. 2026.


[R5] APACHE SOFTWARE FOUNDATION. Cassandra 5.0: Dynamo Architecture (Tunable Consistency). https://cassandra.apache.org/doc/stable/cassandra/architecture/dynamo.html. Acesso em: 15 nov. 2026.


[R6] APACHE SOFTWARE FOUNDATION. Cassandra cqlsh: CONSISTENCY. https://cassandra.apache.org/doc/stable/cassandra/managing/tools/cqlsh.html. Acesso em: 15 nov. 2026.

