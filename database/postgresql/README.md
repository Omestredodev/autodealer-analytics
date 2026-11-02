
# PostgreSQL - AutoDealer Analytics

## 1. Visão geral

O PostgreSQL é responsável pelo armazenamento dos dados transacionais e relacionais do AutoDealer Analytics.

Ele funciona como a fonte principal de dados do sistema (Source of Truth), mantendo a integridade e os relacionamentos entre as entidades centrais da aplicação.

## 2. Responsabilidades

O banco PostgreSQL armazena:

- Usuários e permissões.
- Clientes.
- Catálogo de configurações de veículos.
- Veículos cadastrados no estoque.
- Anúncios.
- Leads comerciais.
- Agendamentos.
- Vendas.

Os dados centrais são identificados por UUID, permitindo que outras bases do projeto referenciem as mesmas entidades.

## 3. Estrutura do banco

O banco possui as seguintes tabelas:

| Tabela | Responsabilidade |
|---|---|
| users | Usuários do sistema |
| customers | Cadastro de clientes |
| vehicle_catalog | Catálogo de configurações de veículos |
| vehicles | Veículos disponíveis no estoque |
| advertisements | Anúncios dos veículos |
| leads | Oportunidades comerciais |
| appointments | Agendamentos |
| sales | Registro de vendas |

## 4. Tecnologias

- PostgreSQL 17
- SQL
- pgAdmin 4

## 5. Arquivos

| Arquivo | Descrição |
|---|---|
| schema.sql | Criação das tabelas, relacionamentos e restrições |
| seed.sql | Inserção de dados para testes |
| queries.sql | Consultas de negócio |
| indexes.sql | Criação de índices |
| benchmark.sql | Análise de desempenho |

## 6. Massa de dados

O ambiente de testes utiliza dados sintéticos para simular uma concessionária.

| Tabela | Registros |
|---|---:|
| users | 20 |
| customers | 5.000 |
| vehicle_catalog | 4 |
| vehicles | 10.000 |
| advertisements | 12.000 |
| leads | 15.000 |
| appointments | 7.000 |
| sales | 4.000 |
| **Total** | **53.024** |

Os dados são destinados a testes de consultas, relacionamentos e desempenho, não representando uma operação comercial real.

## 7. Consultas de negócio

O arquivo queries.sql contém consultas para:

- Listagem de veículos disponíveis.
- Consulta de anúncios publicados.
- Pesquisa de veículos por marca e modelo.
- Agrupamento de leads por status.
- Consulta de clientes e leads.
- Consulta de agendamentos por período.
- Listagem de vendas concluídas.
- Cálculo de faturamento e ticket médio.
- Faturamento mensal.
- Taxa de conversão de leads.

## 8. Indexação

Foram criados índices para otimizar operações frequentes:

- Pesquisa de veículos por marca e modelo.
- Listagem de veículos disponíveis.
- Consulta de anúncios publicados.
- Pesquisa de leads por status e data.
- Consulta de agendamentos por período.
- Consulta de vendas concluídas.
- Relacionamentos entre tabelas.

Também foi utilizado o comando ANALYZE para atualizar as estatísticas utilizadas pelo otimizador do PostgreSQL.

## 9. Benchmark

O desempenho das consultas é avaliado por meio de:

```sql
EXPLAIN (ANALYZE, BUFFERS)
```

São analisados:

- Planning Time.
- Execution Time.
- Tipo de acesso aos dados.
- Quantidade de buffers utilizados.
- Estimativa de registros e registros encontrados.

### Resultado inicial: veículos disponíveis

| Cenário | Tempo |
|---|---:|
| Sem Index Scan | 9,224 ms |
| Com índice | 2,017 ms |

O teste apresentou redução aproximada de 78,1% no tempo de execução.

O cenário sem Index Scan é uma aproximação experimental, obtida desabilitando temporariamente esse tipo de acesso. Não representa uma execução em um banco sem índices.

## 10. Como executar

1. Criar o banco autodealer_analytics no PostgreSQL.
2. Executar schema.sql.
3. Executar seed.sql.
4. Executar queries.sql.
5. Executar indexes.sql.
6. Executar benchmark.sql.

## 11. Integração com outras bases

O PostgreSQL mantém os dados transacionais principais do sistema.

O MongoDB é utilizado para armazenar documentos de auditoria e histórico de alterações.

O Apache Cassandra é utilizado para armazenar eventos de interação e atividades de alto volume.

Os identificadores UUID permitem referenciar as entidades do PostgreSQL nas demais bases.

A integração entre os bancos será realizada posteriormente pela camada backend.
