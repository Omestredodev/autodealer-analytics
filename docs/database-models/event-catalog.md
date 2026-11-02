# AutoDealer Analytics — Catálogo de Eventos

**Versão:** 1.0  
**Status:** Definição inicial

## 1. Objetivo

Este documento define os eventos utilizados pelo AutoDealer Analytics para registrar alterações administrativas e interações dos usuários.

Os eventos são divididos entre MongoDB e Cassandra conforme a responsabilidade de cada banco.

## 2. Padrão de nomenclatura

Todos os eventos devem utilizar `UPPER_SNAKE_CASE`.

Cada evento deve possuir:
- Identificador único (`eventId`).
- Tipo do evento (`eventType`).
- Data e horário da ocorrência (`occurredAt`).
- Identificador da entidade relacionada, quando aplicável.
- Identificador de correlação (`correlationId`), quando fizer parte de uma operação compartilhada.

## 3. Eventos do MongoDB

O MongoDB registra eventos administrativos e alterações relevantes nas entidades principais.

| Evento | Quando ocorre |
|---|---|
| `VEHICLE_CREATED` | Cadastro de um veículo |
| `VEHICLE_UPDATED` | Alteração de dados de um veículo |
| `VEHICLE_STATUS_CHANGED` | Mudança de status de um veículo |
| `ADVERTISEMENT_CREATED` | Criação de anúncio |
| `ADVERTISEMENT_UPDATED` | Alteração de anúncio |
| `ADVERTISEMENT_PUBLISHED` | Publicação de anúncio |
| `ADVERTISEMENT_PAUSED` | Pausa de anúncio |
| `ADVERTISEMENT_ENDED` | Encerramento de anúncio |
| `LEAD_STATUS_CHANGED` | Alteração de status de lead |
| `APPOINTMENT_STATUS_CHANGED` | Alteração de status de agendamento |
| `SALE_COMPLETED` | Conclusão de venda |
| `SALE_CANCELLED` | Cancelamento de venda |

### 3.1 Estrutura do documento

Campos previstos:

- `eventId`: UUID do evento.
- `eventType`: nome do evento.
- `userId`: UUID do usuário responsável, quando aplicável.
- `entityType`: tipo da entidade alterada.
- `entityId`: UUID da entidade.
- `occurredAt`: data e horário em UTC.
- `previousValues`: valores anteriores, quando aplicável.
- `newValues`: valores posteriores, quando aplicável.
- `correlationId`: identificador da operação relacionada, quando aplicável.

## 4. Eventos do Cassandra

O Cassandra registra eventos de navegação e interação, que podem apresentar grande volume de ocorrências.

| Evento | Quando ocorre |
|---|---|
| `ADVERTISEMENT_VIEWED` | Visualização de anúncio |
| `ADVERTISEMENT_CLICKED` | Clique em anúncio |
| `VEHICLE_SEARCHED` | Realização de pesquisa de veículos |
| `VEHICLE_FAVORITED` | Inclusão de veículo nos favoritos |
| `VEHICLE_UNFAVORITED` | Remoção de veículo dos favoritos |
| `LEAD_INTERACTION` | Interação relacionada a um lead |

### 4.1 Campos previstos

- `event_id`: UUID do evento.
- `event_type`: nome do evento.
- `occurred_at`: data e horário em UTC.
- `vehicle_id`: UUID do veículo relacionado, quando aplicável.
- `advertisement_id`: UUID do anúncio relacionado, quando aplicável.
- `user_id`: UUID do usuário, quando aplicável.
- `correlation_id`: identificador da operação relacionada, quando aplicável.

A estrutura física das tabelas será definida pelo responsável pelo Cassandra conforme as consultas que o sistema precisará executar.

## 5. Regras de integração

1. O PostgreSQL permanece como fonte oficial dos dados transacionais.
2. Os eventos devem referenciar os UUIDs gerados pelo PostgreSQL.
3. Um evento não deve ser interpretado como alteração automática de outra base.
4. O backend será responsável pelo encaminhamento dos eventos.
5. O processamento deve considerar idempotência para evitar duplicações.
6. Datas e horários devem utilizar UTC.
7. Os eventos devem respeitar os nomes definidos neste catálogo.

## 6. Evolução do catálogo

A inclusão, remoção ou alteração de eventos deve ser comunicada aos responsáveis pelos três bancos.

Qualquer mudança deve ser compatível com o contrato de dados e com a arquitetura definida em `docs/architecture/database-architecture.md`.