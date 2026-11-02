# AutoDealer Analytics — Dicionário de Status

**Versão:** 1.0  
**Status:** Definição inicial

## 1. Objetivo

Este documento estabelece os valores padronizados de status utilizados pelo AutoDealer Analytics.

Os nomes devem ser mantidos em inglês, utilizando `UPPER_SNAKE_CASE`, para garantir consistência entre PostgreSQL, MongoDB, Cassandra e backend.

## 2. Veículos (Vehicle)

| Status | Significado |
|---|---|
| `AVAILABLE` | Veículo disponível para negociação |
| `RESERVED` | Veículo reservado |
| `SOLD` | Veículo vendido |
| `INACTIVE` | Veículo inativo ou retirado do estoque |

## 3. Anúncios (Advertisement)

| Status | Significado |
|---|---|
| `DRAFT` | Anúncio em elaboração |
| `PUBLISHED` | Anúncio publicado e disponível ao público |
| `PAUSED` | Anúncio temporariamente pausado |
| `ENDED` | Anúncio encerrado |

## 4. Leads (Lead)

| Status | Significado |
|---|---|
| `NEW` | Lead recém-criado |
| `IN_PROGRESS` | Lead em atendimento |
| `CONVERTED` | Lead convertido em oportunidade concretizada |
| `LOST` | Lead perdido |

## 5. Agendamentos (Appointment)

| Status | Significado |
|---|---|
| `SCHEDULED` | Agendamento criado |
| `CONFIRMED` | Agendamento confirmado |
| `CANCELLED` | Agendamento cancelado |
| `COMPLETED` | Atendimento concluído |

## 6. Vendas (Sale)

| Status | Significado |
|---|---|
| `PENDING` | Venda em andamento, aguardando conclusão |
| `COMPLETED` | Venda concluída |
| `CANCELLED` | Venda cancelada |

## 7. Regras de utilização

1. Os valores devem ser armazenados utilizando exatamente a nomenclatura definida neste documento.
2. Não devem ser criadas variações de escrita, abreviações ou traduções dos valores técnicos.
3. As descrições em português servem para apresentação na interface.
4. A interface pode exibir rótulos amigáveis, mas deve preservar os valores técnicos.
5. Alterações no dicionário devem ser comunicadas aos responsáveis pelos bancos e backend.
6. A validação dos status deve ocorrer na aplicação e, quando aplicável, também no banco de dados.

## 8. Referência

Este documento complementa:

- `docs/database-models/data-contract.md`
- `docs/database-models/event-catalog.md`
- `docs/architecture/database-architecture.md`

Todos os componentes do sistema devem respeitar estas definições.