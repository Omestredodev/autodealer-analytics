# AUTODEALER ANALYTICS
# CONTRATO DE DADOS E INTEGRAÇÃO ENTRE BANCOS

**Arquivo:** `docs/database-models/data-contract.md`  
**Versão:** 1.0  
**Status:** Proposta inicial para aprovação da equipe  
**Bancos:** PostgreSQL, MongoDB e Apache Cassandra

---

## 1. Objetivo

Este documento define os padrões compartilhados entre os três bancos de dados do AutoDealer Analytics.

Seu objetivo é garantir que os bancos possam trabalhar de maneira independente, mas armazenem informações compatíveis e relacionáveis.

Nenhum integrante deve alterar individualmente os padrões definidos neste documento sem alinhamento com a equipe.

## 2. Arquitetura e responsabilidades

A arquitetura será baseada em três bancos com responsabilidades distintas.

| Banco | Responsabilidade | Fonte oficial? |
|---|---|---|
| PostgreSQL | Dados relacionais e transacionais | Sim, para os dados centrais |
| MongoDB | Auditoria e histórico de alterações | Sim, para os registros de auditoria |
| Cassandra | Eventos e interações de alto volume | Sim, para os eventos de atividade |

### 2.1 PostgreSQL

Responsável pelos dados centrais do sistema:

- Veículos.
- Usuários.
- Clientes.
- Anúncios.
- Leads.
- Agendamentos.
- Vendas.

É a fonte oficial dos dados atuais dessas entidades.

### 2.2 MongoDB

Responsável por armazenar:

- Histórico de alterações de veículos.
- Histórico de alterações de anúncios.
- Alterações de status.
- Ações administrativas relevantes.
- Registros de auditoria.

Não deve substituir o PostgreSQL como fonte dos dados atuais das entidades.

### 2.3 Apache Cassandra

Responsável por armazenar:

- Visualizações de anúncios.
- Pesquisas realizadas.
- Favoritos.
- Cliques e interações.
- Eventos de navegação e atividade da plataforma.

Sua modelagem deverá ser orientada pelas consultas que o sistema precisa executar.

Não deverá reproduzir o modelo relacional do PostgreSQL.

---

## 3. Padrão de identificadores

Todos os identificadores compartilhados entre bancos deverão utilizar UUID.

O PostgreSQL será responsável por gerar os identificadores oficiais das entidades centrais.

### 3.1 Entidades e identificadores

| Entidade | Campo PostgreSQL | Campo MongoDB | Campo Cassandra |
|---|---|---|---|
| Veículo | `vehicle_id` | `vehicleId` | `vehicle_id` |
| Anúncio | `advertisement_id` | `advertisementId` | `advertisement_id` |
| Usuário | `user_id` | `userId` | `user_id` |
| Cliente | `customer_id` | `customerId` | `customer_id` |
| Lead | `lead_id` | `leadId` | `lead_id` |
| Agendamento | `appointment_id` | `appointmentId` | `appointment_id` |
| Venda | `sale_id` | `saleId` | `sale_id` |

### 3.2 Formato

Exemplo:

`550e8400-e29b-41d4-a716-446655440000`

Regras:

- PostgreSQL deverá utilizar o tipo `UUID`.
- MongoDB deverá armazenar os identificadores como UUID ou string canônica, desde que a representação seja padronizada e documentada.
- Cassandra deverá utilizar o tipo `uuid`.
- Não utilizar IDs sequenciais de um banco como identificadores compartilhados.
- Não gerar um novo identificador para a mesma entidade em outro banco.
- Os valores deverão representar exatamente o mesmo UUID nos três bancos.

**Importante:** o identificador de um evento também deverá ser UUID, mas será independente do identificador da entidade relacionada.

---

## 4. Relacionamentos principais

### 4.1 Veículo e anúncio

- Um veículo poderá possuir vários anúncios ao longo do tempo.
- Cada anúncio deverá referenciar um único veículo.
- Cada anúncio terá seu próprio `advertisement_id`.
- O anúncio não deverá criar uma cópia independente do veículo no PostgreSQL.

### 4.2 Eventos e auditoria

Os registros do MongoDB e Cassandra deverão referenciar os identificadores oficiais das entidades.

Exemplo:

Um registro de visualização de anúncio poderá conter:

- `advertisement_id`
- `vehicle_id`
- `user_id`, quando o visitante estiver autenticado.

Um registro de auditoria de alteração de veículo poderá conter:

- `vehicleId`
- `userId`
- `entityType`
- `entityId`

Os bancos de eventos e auditoria não precisam criar relacionamentos físicos com o PostgreSQL. A associação ocorrerá pelos identificadores.

---

## 5. Padrão de datas e horários

Todos os bancos deverão utilizar UTC para datas e horários compartilhados.

Padrão de representação:

`2026-11-01T18:30:00Z`

Regras:

- Utilizar ISO 8601 na representação textual.
- PostgreSQL: utilizar `TIMESTAMPTZ`.
- MongoDB: utilizar BSON Date.
- Cassandra: utilizar `timestamp`.
- Não armazenar horários locais sem informar o fuso.
- A conversão para o horário brasileiro deverá ocorrer na camada de apresentação.

---

## 6. Dicionário oficial de status

Os valores abaixo representam o vocabulário oficial do sistema.

### 6.1 Veículos

| Status | Significado |
|---|---|
| `AVAILABLE` | Disponível para negociação |
| `RESERVED` | Reservado |
| `SOLD` | Vendido |
| `INACTIVE` | Inativo no sistema |

### 6.2 Anúncios

| Status | Significado |
|---|---|
| `DRAFT` | Rascunho |
| `PUBLISHED` | Publicado |
| `PAUSED` | Pausado |
| `ENDED` | Encerrado |

### 6.3 Leads

| Status | Significado |
|---|---|
| `NEW` | Novo |
| `IN_PROGRESS` | Em atendimento |
| `CONVERTED` | Convertido |
| `LOST` | Perdido |

### 6.4 Agendamentos

| Status | Significado |
|---|---|
| `SCHEDULED` | Agendado |
| `CONFIRMED` | Confirmado |
| `CANCELLED` | Cancelado |
| `COMPLETED` | Concluído |

### 6.5 Vendas

| Status | Significado |
|---|---|
| `PENDING` | Em andamento ou aguardando conclusão |
| `COMPLETED` | Concluída |
| `CANCELLED` | Cancelada |

Regras:

- Utilizar os valores exatamente como definidos.
- Não traduzir os valores armazenados nos bancos.
- A interface poderá exibir os nomes em português.
- Não criar novos status sem alinhamento da equipe.
- MongoDB e Cassandra só deverão armazenar status quando forem necessários ao histórico ou às consultas de eventos.

---

## 7. Catálogo de eventos

Os nomes dos eventos deverão seguir o padrão `UPPER_SNAKE_CASE`.

### 7.1 Eventos de auditoria — MongoDB

| Evento | Descrição |
|---|---|
| `VEHICLE_CREATED` | Cadastro de veículo |
| `VEHICLE_UPDATED` | Alteração de veículo |
| `VEHICLE_STATUS_CHANGED` | Alteração de status do veículo |
| `ADVERTISEMENT_CREATED` | Criação de anúncio |
| `ADVERTISEMENT_UPDATED` | Alteração de anúncio |
| `ADVERTISEMENT_PUBLISHED` | Publicação de anúncio |
| `ADVERTISEMENT_PAUSED` | Pausa de anúncio |
| `ADVERTISEMENT_ENDED` | Encerramento de anúncio |
| `LEAD_STATUS_CHANGED` | Alteração de status de lead |
| `APPOINTMENT_STATUS_CHANGED` | Alteração de status de agendamento |
| `SALE_COMPLETED` | Conclusão de venda |
| `SALE_CANCELLED` | Cancelamento de venda |

### 7.2 Eventos de atividade — Cassandra

| Evento | Descrição |
|---|---|
| `ADVERTISEMENT_VIEWED` | Visualização de anúncio |
| `ADVERTISEMENT_CLICKED` | Clique em anúncio |
| `VEHICLE_SEARCHED` | Pesquisa de veículos |
| `VEHICLE_FAVORITED` | Veículo adicionado aos favoritos |
| `VEHICLE_UNFAVORITED` | Veículo removido dos favoritos |
| `LEAD_INTERACTION` | Interação relacionada a um lead |

### 7.3 Regras

- O MongoDB deverá registrar alterações e ações administrativas relevantes.
- O Cassandra deverá registrar atividades e interações da plataforma.
- Uma mesma operação poderá gerar registros nos dois bancos somente quando houver justificativa.
- Não registrar uma visualização de anúncio no MongoDB apenas por ela ter ocorrido.
- Não utilizar o Cassandra como histórico administrativo completo.

---

## 8. Estrutura mínima de auditoria — MongoDB

Os registros de auditoria deverão possuir, quando aplicável:

| Campo | Finalidade |
|---|---|
| `eventId` | UUID único do evento |
| `eventType` | Tipo do evento |
| `userId` | Usuário responsável |
| `entityType` | Tipo da entidade afetada |
| `entityId` | UUID da entidade afetada |
| `occurredAt` | Data e horário UTC |
| `previousValues` | Valores anteriores |
| `newValues` | Valores posteriores |
| `correlationId` | Identificador para correlacionar operações |

Exemplo ilustrativo:

```json
{
  "eventId": "a4d9f81a-8a0b-4a4e-b5a4-6f0a4e3c5d21",
  "eventType": "VEHICLE_UPDATED",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "entityType": "vehicle",
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "occurredAt": "2026-11-01T18:30:00Z",
  "previousValues": {
    "price": 85000
  },
  "newValues": {
    "price": 82000
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440099"
}
```

Os campos de valores anteriores e posteriores deverão conter apenas os dados relevantes à alteração, evitando armazenar informações sensíveis desnecessárias.

---

## 9. Estrutura mínima de atividade — Cassandra

Os registros de atividade deverão permitir identificar:

- Tipo de evento.
- Momento em que ocorreu.
- Veículo relacionado, quando aplicável.
- Anúncio relacionado, quando aplicável.
- Usuário relacionado, quando autenticado.
- Identificador único do evento.

Exemplo conceitual:

```text
event_id
event_type
occurred_at
vehicle_id
advertisement_id
user_id
```

Essa lista não determina uma tabela única.

O responsável pelo Cassandra deverá criar tabelas específicas conforme as consultas previstas, definindo partition keys e clustering columns adequadamente.

---

## 10. Regras de integração entre os bancos

1. O PostgreSQL é a fonte oficial dos dados centrais.
2. MongoDB e Cassandra recebem referências aos IDs oficiais.
3. Não criar IDs independentes para representar uma mesma entidade.
4. Alterações realizadas no PostgreSQL não atualizam automaticamente os outros bancos.
5. A integração deverá ser implementada posteriormente pelo backend.
6. Os mecanismos de envio deverão considerar falhas, duplicidade e possibilidade de reprocessamento.
7. Quando necessário, utilizar identificadores únicos de eventos e mecanismos de idempotência.
8. Não considerar uma operação concluída nos três bancos apenas porque foi concluída no PostgreSQL.
9. Documentar quais operações geram quais eventos.

### 10.1 Correlação de operações

Quando uma operação gerar registros em mais de um banco, deverá ser possível relacioná-los por meio de um `correlationId`.

O `correlationId` identifica a operação de negócio que originou os registros; o `eventId` identifica cada evento individualmente.

---

## 11. Regras de desenvolvimento em equipe

- Cada integrante deverá trabalhar em sua branch.
- Não desenvolver diretamente na `main`.
- Não alterar contratos compartilhados sem aprovação da equipe.
- Não duplicar responsabilidades entre bancos.
- Documentar as decisões de modelagem.
- Utilizar dados fictícios nos testes.
- Não publicar credenciais, tokens ou arquivos `.env`.
- Integrar alterações por Pull Request.

### Branches oficiais

| Responsável | Branch | Pasta |
|---|---|---|
| Guilherme | `feat/postgresql-core` | `database/postgresql/` |
| Integrante 2 | `feat/mongodb-audit` | `database/mongodb/` |
| Integrante 3 | `feat/cassandra-events` | `database/cassandra/` |

---

## 12. Decisões que exigem alinhamento antes de mudar

As seguintes definições são compartilhadas e não devem ser alteradas individualmente:

- Tipo e formato dos identificadores.
- Responsabilidade de cada banco.
- Nomes dos eventos.
- Vocabulário dos status.
- Padrão de datas e horários.
- Relacionamento entre veículos e anúncios.
- Campos de correlação entre eventos.

**Este documento é a referência comum para a implementação dos três bancos. Em caso de divergência entre uma implementação individual e este contrato, a equipe deverá alinhar e atualizar o contrato antes de integrar a alteração.**
