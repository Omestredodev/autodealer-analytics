
# AutoDealer Analytics

Sistema de gestão de concessionárias desenvolvido como projeto acadêmico da disciplina de **Tuning e Performance de Dados**, do curso de Ciência da Computação.

A aplicação utiliza uma arquitetura de persistência poliglota, integrando **PostgreSQL, MongoDB e Apache Cassandra** a um backend Fastify e a uma interface React.

## Objetivo

Desenvolver uma plataforma para gerenciar veículos, anúncios, clientes, leads, agendamentos e vendas, utilizando diferentes modelos de banco de dados conforme os requisitos de cada operação.

O projeto também explora estratégias de indexação, otimização de consultas, consistência, teorema CAP e desempenho de bancos relacionais e NoSQL.

## Tecnologias utilizadas

| Camada | Tecnologias |
|---|---|
| Frontend | React, TypeScript, Vite e Tailwind CSS |
| Backend | Node.js, TypeScript e Fastify |
| Banco relacional | PostgreSQL 17 |
| Banco documental | MongoDB 7.0 |
| Banco de colunas largas | Apache Cassandra 5.0 |
| Infraestrutura | Docker e Docker Compose |
| Versionamento | Git e GitHub |

## Arquitetura de dados

| Banco | Responsabilidade |
|---|---|
| PostgreSQL | Dados transacionais: veículos, anúncios, clientes, leads, agendamentos e vendas |
| MongoDB | Histórico de auditoria e registros documentais das alterações |
| Apache Cassandra | Eventos de atividade e consultas por anúncio, veículo, usuário, tipo e período |

O PostgreSQL é utilizado como fonte principal dos dados transacionais.

As alterações comerciais geram registros de auditoria encaminhados ao MongoDB por meio de um mecanismo de **outbox transacional**, com processamento assíncrono e possibilidade de reenvio.

O Cassandra utiliza tabelas desnormalizadas organizadas para os padrões de consulta dos eventos de atividade.

## Funcionalidades implementadas

- Consulta de veículos e anúncios.
- Visualização do catálogo público.
- Listagem de leads, agendamentos e vendas.
- Atualização de status das operações comerciais.
- Registro de auditoria das alterações no MongoDB.
- Registro e consulta de eventos de atividade no Cassandra.
- Painel administrativo integrado aos bancos de dados.
- Consultas com paginação e filtros nos módulos compatíveis.
- Endpoints de saúde e conectividade dos serviços.
- Scripts de benchmark e análise de desempenho.

**Observação:** o sistema foi desenvolvido para execução e demonstração em ambiente local. A API ainda não possui autenticação, portanto não deve ser exposta publicamente sem controles adicionais de segurança.

## Estrutura do projeto

~~~text
autodealer-analytics/
├── backend/
│   └── src/
├── frontend/
│   └── src/
├── database/
│   ├── postgresql/
│   ├── mongodb/
│   └── cassandra/
├── docs/
│   ├── architecture/
│   ├── database-models/
│   ├── benchmarks/
│   └── entrega-final/
├── docker-compose.yml
└── README.md
~~~

## Como executar o projeto

### Pré-requisitos

- Docker Desktop
- Node.js e npm
- Git

### 1. Clonar o repositório

~~~powershell
git clone https://github.com/Omestredodev/autodealer-analytics.git
cd autodealer-analytics
~~~

### 2. Preparar as configurações

Configure as variáveis de ambiente do backend conforme a documentação do projeto.

Certifique-se de que os serviços PostgreSQL, MongoDB e Cassandra estão configurados para o ambiente local.

### 3. Iniciar os bancos de dados

~~~powershell
docker compose up -d
docker compose ps
~~~

Para uma instalação nova, execute também os scripts de inicialização e carga de dados descritos na documentação de cada banco.

### 4. Iniciar o backend

Em um terminal:

~~~powershell
npm --prefix backend install
npm --prefix backend run dev
~~~

A API estará disponível em:

http://127.0.0.1:3333

Endpoint de verificação:

http://127.0.0.1:3333/health

### 5. Iniciar o frontend

Em outro terminal:

~~~powershell
npm --prefix frontend install
npm --prefix frontend run dev
~~~

Acesse:

http://127.0.0.1:5173

## Endpoints principais

| Método | Endpoint | Responsabilidade |
|---|---|---|
| GET | `/health` | Verificar os serviços |
| GET | `/vehicles` | Consultar veículos |
| GET | `/advertisements` | Consultar anúncios |
| GET | `/leads` | Consultar leads |
| GET | `/appointments` | Consultar agendamentos |
| GET | `/sales` | Consultar vendas |
| GET | `/audit-events` | Consultar auditorias MongoDB |
| GET | `/activity-events` | Consultar eventos Cassandra |
| POST | `/activity-events` | Registrar evento de atividade |

A rota `/audit-events` aceita filtros específicos e `limit`, sem paginação por `page`.

As consultas ao Cassandra exigem parâmetros de partição, como `day` e `shard`.

## Benchmarks e tuning

Foram realizados experimentos de desempenho nos três bancos de dados.

### PostgreSQL

Consulta de veículos disponíveis ordenados por data:

| Plano de execução | Tempo medido |
|---|---:|
| Varredura sequencial forçada | 92,461 ms |
| Consulta utilizando índice | 2,381 ms |

A consulta indexada foi aproximadamente **38,8 vezes mais rápida nessa execução específica**.

O teste sequencial foi realizado desabilitando os caminhos de acesso por índices para comparação, sem remover fisicamente os índices existentes.

### MongoDB

Foram analisadas consultas por entidade, tipo de evento, usuário, período e identificador de correlação.

Os testes utilizaram uma coleção temporária com 10.000 documentos e compararam planos indexados com varredura de coleção.

### Cassandra

Foram executadas duas rodadas de benchmark, com 100 execuções para cada um dos cinco padrões de consulta.

As médias observadas ficaram próximas de 15 a 16 ms, dependendo da consulta e da rodada.

Esses experimentos foram realizados em ambiente local e não representam testes de carga de produção.

## CAP e consistência

O relatório técnico apresenta a análise dos modelos de consistência e das propriedades de tolerância a falhas de cada banco.

A configuração local utiliza uma instância de cada tecnologia, sem demonstrar tolerância real à queda de nós.

Para Cassandra, a implantação local utiliza fator de replicação 1 (`RF=1`). Cenários com múltiplas réplicas, quórum e disponibilidade distribuída são discutidos teoricamente na documentação.

## Documentação acadêmica

Os materiais finais estão disponíveis em:

**`docs/entrega-final/`**

Incluindo:

- Relatório técnico em Word, PDF e Markdown.
- Apresentação em PowerPoint e PDF.
- Roteiro de apresentação.
- Checklist de entrega.
- Script de verificação do ambiente.

Resultados adicionais de benchmark estão em:

**`docs/benchmarks/`**

## Validação do projeto

Para verificar as compilações:

~~~powershell
npm --prefix backend run check
npm --prefix backend run build
npm --prefix frontend run build
~~~

Para verificar o ambiente de demonstração:

~~~powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\entrega-final\scripts\verificar-ambiente.ps1
~~~

## Equipe

- Guilherme Gomes — PostgreSQL
- Gustavo Delfino — MongoDB
- Bruno Kenez — Apache Cassandra

## Status do projeto

**Concluído para entrega acadêmica e demonstração local.**

A integração entre frontend, backend e os três bancos foi validada por testes de leitura, operações comerciais e consultas de auditoria e atividade.

O projeto não está preparado para implantação pública em produção sem autenticação, autorização, proteção de dados e demais controles operacionais.
