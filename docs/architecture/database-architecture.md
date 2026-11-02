# AutoDealer Analytics — Arquitetura de Banco de Dados

**Versão:** 1.0  
**Status:** Definição inicial

## 1. Visão geral

O AutoDealer Analytics utiliza uma arquitetura com três bancos de dados especializados, cada um responsável por um tipo de armazenamento e operação.

- **PostgreSQL:** banco relacional principal, responsável pelos dados transacionais e pela integridade das entidades centrais.
- **MongoDB:** armazenamento de documentos de auditoria, histórico de alterações e registros flexíveis.
- **Apache Cassandra:** armazenamento de eventos de alto volume relacionados à navegação e interação dos usuários.

O PostgreSQL é a fonte oficial dos dados das entidades principais.

## 2. Responsabilidades

### 2.1 PostgreSQL

Responsável por:
- Usuários e permissões.
- Veículos.
- Anúncios.
- Clientes e leads.
- Agendamentos.
- Vendas.
- Relacionamentos e integridade referencial.
- Consultas transacionais e indicadores operacionais.

### 2.2 MongoDB

Responsável por:
- Auditoria de operações.
- Histórico de alterações de entidades.
- Registro dos valores anteriores e posteriores às alterações.
- Eventos administrativos e comerciais definidos no contrato de dados.

Os documentos devem referenciar os identificadores UUID das entidades mantidas no PostgreSQL.

### 2.3 Apache Cassandra

Responsável por:
- Visualizações de anúncios.
- Cliques em anúncios.
- Pesquisas de veículos.
- Favoritos e remoção de favoritos.
- Interações de navegação.

As tabelas devem ser modeladas de acordo com as consultas esperadas, utilizando chaves de partição e clustering adequadas.

## 3. Identificadores e relacionamentos

O PostgreSQL gera os identificadores UUID das entidades principais.

MongoDB e Cassandra devem reutilizar esses identificadores quando precisarem referenciar essas entidades.

Um veículo pode possuir vários anúncios ao longo do tempo. Cada anúncio possui seu próprio identificador e referencia o veículo correspondente por `vehicle_id`.

## 4. Integração entre os bancos

Os bancos não compartilham automaticamente transações ou alterações.

A integração será realizada pela aplicação/backend, responsável por:
- Registrar as alterações no banco de origem.
- Encaminhar eventos aos bancos especializados.
- Tratar falhas e novas tentativas.
- Evitar registros duplicados por meio de idempotência.
- Manter os identificadores e formatos definidos no contrato de dados.

## 5. Padronização

Todos os bancos devem seguir o documento:

`docs/database-models/data-contract.md`

Também devem respeitar:
- Identificadores UUID.
- Datas e horários em UTC, no padrão ISO 8601.
- Nomes de eventos em `UPPER_SNAKE_CASE`.
- Dicionário compartilhado de status.
- Catálogo compartilhado de eventos.

## 6. Considerações sobre desempenho

O projeto permitirá comparar estratégias de armazenamento e consulta:

- PostgreSQL: índices relacionais, consultas SQL e integridade transacional.
- MongoDB: índices de documentos e consultas por campos de auditoria.
- Cassandra: modelagem orientada às consultas, particionamento e distribuição de dados.

Os testes de desempenho devem documentar os cenários, volume de dados, consultas, índices e resultados obtidos.

## 7. Limites arquiteturais

Cada banco deve manter sua responsabilidade definida.

Não devem ser criadas cópias desnecessárias das entidades transacionais em MongoDB ou Cassandra.

Qualquer alteração no contrato de integração deve ser comunicada aos responsáveis pelos três bancos.