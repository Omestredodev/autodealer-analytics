# AutoDealer Analytics

Sistema de gestão de concessionária com arquitetura poliglota de bancos de dados, análise de desempenho e experimentos de tuning.

## Objetivo

Desenvolver uma plataforma para gestão de veículos, anúncios, clientes, leads, agendamentos e vendas, utilizando diferentes tecnologias de banco de dados conforme suas características e finalidades.

## Arquitetura de dados

| Banco | Responsabilidade |
|---|---|
| PostgreSQL | Dados relacionais e transacionais |
| MongoDB | Auditoria e registros documentais |
| Apache Cassandra | Eventos e histórico de atividades |

## Estrutura do projeto

```text
database/
├── postgresql/
├── mongodb/
└── cassandra/

backend/
frontend/

docs/
├── architecture/
├── database-models/
└── benchmarks/
```

## Equipe

- Guilherme Gomes — PostgreSQL
- Integrante 2 — MongoDB
- Integrante 3 — Apache Cassandra

## Tecnologias

- PostgreSQL
- MongoDB
- Apache Cassandra
- Git e GitHub
- Docker

## Status

Em desenvolvimento.