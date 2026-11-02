# Cassandra — AutoDealer Analytics

## Objetivo

Este módulo utiliza o Apache Cassandra para armazenar eventos de navegação e interação da plataforma AutoDealer Analytics.

O Cassandra é utilizado para consultas de alto volume de eventos, complementando os demais bancos de dados do projeto.

## Responsabilidades

O módulo contempla:

- Armazenamento de eventos de visualização e interação com anúncios.
- Registro de pesquisas e interações com veículos.
- Consultas de eventos por anúncio, usuário, veículo, tipo e período.
- Testes iniciais de desempenho das consultas.

## Estrutura de arquivos

```text
database/cassandra/
├── schema.cql
├── seed.cql
├── queries.cql
├── benchmark.cql
├── benchmark.py
└── README.md
```

| Arquivo | Descrição |
|---|---|
| `schema.cql` | Criação do keyspace e das tabelas. |
| `seed.cql` | Inserção de dados fictícios para testes. |
| `queries.cql` | Consultas de leitura dos eventos. |
| `benchmark.cql` | Consultas utilizadas como referência para os testes. |
| `benchmark.py` | Execução e medição do tempo das consultas. |

## Modelagem de dados

O modelo utiliza desnormalização, característica do Cassandra, criando tabelas orientadas aos padrões de consulta da aplicação.

As tabelas implementadas são:

- `events_by_advertisement`
- `events_by_user`
- `events_by_vehicle`
- `events_by_type`
- `events_by_period`

A organização utiliza particionamento por dia (`event_day`) e shard, permitindo distribuir os eventos em partições.

## Tecnologias

- Apache Cassandra 5.0
- Docker
- CQL (Cassandra Query Language)
- Python 3.11
- Cassandra Python Driver 3.30.1

## Como executar localmente

### 1. Iniciar o Cassandra

```powershell
docker run --name autodealer-cassandra -p 9042:9042 -d cassandra:5.0
```

Caso o container já exista, utilize:

```powershell
docker start autodealer-cassandra
```

### 2. Criar o schema

Na raiz do projeto:

```powershell
Get-Content .\database\cassandra\schema.cql | docker exec -i autodealer-cassandra cqlsh
```

### 3. Inserir os dados de teste

```powershell
Get-Content .\database\cassandra\seed.cql | docker exec -i autodealer-cassandra cqlsh
```

### 4. Executar as consultas

```powershell
Get-Content .\database\cassandra\queries.cql | docker exec -i autodealer-cassandra cqlsh
```

### 5. Executar o benchmark CQL

```powershell
Get-Content .\database\cassandra\benchmark.cql | docker exec -i autodealer-cassandra cqlsh
```

### 6. Instalar a dependência Python

```powershell
py -3.11 -m pip install cassandra-driver
```

### 7. Executar o benchmark Python

```powershell
py -3.11 .\database\cassandra\benchmark.py
```

## Resultados do benchmark inicial

Foram realizadas 100 execuções para cada uma das cinco consultas, totalizando 500 execuções.

| Consulta | Tempo médio |
|---|---:|
| Eventos por anúncio | 15,523 ms |
| Eventos por usuário | 15,594 ms |
| Eventos por veículo | 15,560 ms |
| Eventos por tipo | 15,585 ms |
| Eventos por período | 15,605 ms |

**Observação:** os resultados representam um teste inicial em ambiente local, utilizando uma pequena quantidade de dados fictícios. Os tempos incluem a comunicação entre Python e Cassandra e não representam desempenho de produção.

## Observações

- Os dados utilizados no seed são fictícios.
- O ambiente local utiliza fator de replicação 1.
- Os identificadores são UUIDs.
- Os timestamps são armazenados em UTC.
- As tabelas são organizadas de acordo com os padrões de consulta definidos para o módulo.

