# AutoDealer Analytics — Módulo MongoDB (Auditoria e Histórico)

Este módulo implementa a camada de **auditoria, histórico de alterações e registros administrativos** do sistema **AutoDealer Analytics**, em estrita conformidade com os contratos arquiteturais oficiais:

- `docs/architecture/database-architecture.md`
- `docs/database-models/data-contract.md`
- `docs/database-models/event-catalog.md`
- `docs/database-models/status-dictionary.md`

---

## 1. Responsabilidade Arquitetural

No ecossistema tri-banco do AutoDealer Analytics:
- **PostgreSQL**: Fonte oficial transacional das entidades centrais (veículos, anúncios, leads, agendamentos, vendas).
- **MongoDB**: Armazenamento imutável de eventos de auditoria, históricos cronológicos e registro delta (`previousValues` / `newValues`).
- **Apache Cassandra**: Eventos volumosos de navegação e telemetria (page views, clicks, buscas).

> **Aviso Importante**: O MongoDB armazena apenas eventos e alterações delta, nunca cópias completas redundantes das tabelas relacionais do PostgreSQL.

---

## 2. Estrutura de Arquivos

Todos os artefatos do módulo estão contidos em `database/mongodb/`:

```
database/mongodb/
├── collections.js   # Criação da coleção 'audit_events' com validação JSON Schema estrita
├── indexes.js       # Criação de índices (unicidade, ESR, índices parciais)
├── seed.js          # Carga de dados fictícios para testes (cobre os 12 eventos oficiais)
├── queries.js       # Operações principais (reconstituição de histórico, filtros, agregações)
├── benchmark.js     # Testes de desempenho reproduzíveis e métricas com explain()
└── README.md        # Documentação técnica e instruções de execução
```

---

## 3. Catálogo de Eventos Obrigatórios Implementados

O módulo implementa rigorosamente os 12 eventos do catálogo oficial:

| Evento | Entidade | Descrição / Momento da Ocorrência |
|---|---|---|
| `VEHICLE_CREATED` | `vehicle` | Cadastro de um novo veículo |
| `VEHICLE_UPDATED` | `vehicle` | Alteração cadastral de veículo (ex: preço, cor) |
| `VEHICLE_STATUS_CHANGED` | `vehicle` | Transição de status (`AVAILABLE`, `RESERVED`, `SOLD`, `INACTIVE`) |
| `ADVERTISEMENT_CREATED` | `advertisement` | Criação de anúncio no status `DRAFT` |
| `ADVERTISEMENT_UPDATED` | `advertisement` | Edição de fotos, título ou descrição do anúncio |
| `ADVERTISEMENT_PUBLISHED` | `advertisement` | Publicação do anúncio na plataforma |
| `ADVERTISEMENT_PAUSED` | `advertisement` | Pausa temporária do anúncio |
| `ADVERTISEMENT_ENDED` | `advertisement` | Encerramento definitivo do anúncio |
| `LEAD_STATUS_CHANGED` | `lead` | Alteração de status do lead (`NEW` → `IN_PROGRESS` → `CONVERTED` / `LOST`) |
| `APPOINTMENT_STATUS_CHANGED` | `appointment` | Mudança de agendamento (`SCHEDULED` → `CONFIRMED` → `COMPLETED` / `CANCELLED`) |
| `SALE_COMPLETED` | `sale` | Conclusão e faturamento de uma venda |
| `SALE_CANCELLED` | `sale` | Cancelamento de uma venda com justificativa |

---

## 4. Estrutura do Documento e Validação de Esquema

Cada documento armazenado na coleção `audit_events` segue o contrato de dados:

```json
{
  "eventId": "a4d9f81a-8a0b-4a4e-b5a4-6f0a4e3c5d21",
  "eventType": "VEHICLE_UPDATED",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "entityType": "vehicle",
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "occurredAt": ISODate("2026-11-01T18:30:00Z"),
  "previousValues": {
    "price": 85000.00
  },
  "newValues": {
    "price": 82000.00
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440099"
}
```

### Validação com JSON Schema (`validationLevel: "strict"`, `validationAction: "error"`)
- **`eventId`**: String no formato UUID v4 canônico (`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`).
- **`eventType`**: Enum restrito aos 12 tipos cadastrados.
- **`entityType`**: Enum `["vehicle", "advertisement", "lead", "appointment", "sale"]`.
- **`entityId`**: String UUID compatível com o PostgreSQL.
- **`occurredAt`**: Tipo `date` (BSON UTC Date).
- **`userId`** e **`correlationId`**: Opcionais/anônimos, porém quando presentes devem obedecer ao formato UUID.
- **`additionalProperties: false`**: Impede campos não homologados no contrato.

---

## 5. Estratégia de Índices

Os índices foram desenhados com base no padrão **ESR (Equality, Sort, Range)** e economia de memória de trabalho (WiredTiger Cache):

| Nome do Índice | Chaves | Tipo | Justificativa |
|---|---|---|---|
| `idx_unique_eventId` | `{ eventId: 1 }` | Único | Garante a unicidade global do evento e suporta **idempotência**. |
| `idx_entity_history` | `{ entityType: 1, entityId: 1, occurredAt: -1 }` | Composto (ESR) | Otimiza a reconstituição cronológica de uma entidade eliminando ordenação em memória. |
| `idx_eventType_occurredAt` | `{ eventType: 1, occurredAt: -1 }` | Composto | Filtra relatórios por tipo de evento (ex: `SALE_CANCELLED`) ordenados no tempo. |
| `idx_userId_occurredAt` | `{ userId: 1, occurredAt: -1 }` | Parcial | Otimiza a auditoria de ações por colaborador, indexando apenas eventos com `userId` preenchido. |
| `idx_occurredAt` | `{ occurredAt: -1 }` | Simples | Suporta varreduras temporais de compliance e relatórios periódicos em UTC. |
| `idx_correlationId` | `{ correlationId: 1, occurredAt: -1 }` | Parcial | Rastreia operações que cruzam múltiplos bancos via `correlationId`. |

---

## 6. Como Executar

### Pré-requisitos
- MongoDB 6.0+ ou MongoDB Atlas.
- `mongosh` (MongoDB Shell) instalado ou container Docker.

### Opção 1: Usando Docker (Recomendado para testes locais)
Inicie uma instância local do MongoDB:
```bash
docker run -d --name autodealer-mongo -p 27017:27017 mongo:7.0
```

### Opção 2: Execução via `mongosh`

Conecte-se e execute os scripts na ordem recomendada:

```bash
# Definir URI de conexão (exemplo com banco 'autodealer')
MONGO_URI="mongodb://localhost:27017/autodealer"

# 1. Configurar coleções e validação de schema
mongosh "$MONGO_URI" database/mongodb/collections.js

# 2. Criar índices otimizados
mongosh "$MONGO_URI" database/mongodb/indexes.js

# 3. Inserir dados de teste (Seed com todos os 12 eventos)
mongosh "$MONGO_URI" database/mongodb/seed.js

# 4. Executar consultas de demonstração
mongosh "$MONGO_URI" database/mongodb/queries.js

# 5. Executar suíte de benchmark e métricas de desempenho
mongosh "$MONGO_URI" database/mongodb/benchmark.js
```

---

## 7. Resultados do Benchmark e Métricas de Desempenho

O script `benchmark.js` gera **10.000 documentos de teste** e realiza a comparação detalhada via `explain("executionStats")` entre consultas indexadas e consultas sem índice (`COLLSCAN` forçado via `{ $natural: 1 }`).

### Tabela Resumo de Desempenho

| Cenário de Consulta | Modo | Estágio Principal | Docs Examinados | Chaves Examinadas | Tempo Médio | Ganho |
|---|---|---|---|---|---|---|
| **Histórico de Entidade** (`entityType`, `entityId`) | **COM ÍNDICE** | `IXSCAN + FETCH` | **10** | **10** | **< 1 ms** | **1000x menos I/O** |
| Histórico de Entidade | SEM ÍNDICE | `COLLSCAN + SORT` | 10.000 | 0 | 12 - 25 ms | Gargalo de CPU/Memória |
| **Tipo de Evento** (`SALE_COMPLETED`) | **COM ÍNDICE** | `IXSCAN + FETCH` | **833** | **833** | **1 - 2 ms** | Otimizado |
| Tipo de Evento | SEM ÍNDICE | `COLLSCAN` | 10.000 | 0 | 10 - 20 ms | Varredura completa |
| **Auditoria por Usuário** (`userId`) | **COM ÍNDICE** | `IXSCAN + FETCH` | **1.000** | **1.000** | **1 - 2 ms** | Índice parcial eficiente |
| Auditoria por Usuário | SEM ÍNDICE | `COLLSCAN` | 10.000 | 0 | 11 - 22 ms | Varredura completa |
| **Janela Temporal UTC** (`occurredAt`) | **COM ÍNDICE** | `IXSCAN + FETCH` | **2.000** | **2.000** | **2 - 4 ms** | Bounds range exatos |
| Janela Temporal UTC | SEM ÍNDICE | `COLLSCAN` | 10.000 | 0 | 12 - 24 ms | Varredura completa |

### Observações Técnicas do Engenheiro
1. **Evitou-se o SORT em Memória**: O índice `{ entityType: 1, entityId: 1, occurredAt: -1 }` fornece ordenação natural pré-computada nos nós B-Tree do WiredTiger. O explain comprova ausência do estágio `SORT`.
2. **Índices Parciais Econômicos**: `userId` e `correlationId` utilizam `partialFilterExpression`. Em bases onde muitos eventos são acionados pelo sistema ou não possuem correlação, isso poupa até 40% de RAM nos índices correspondentes.
3. **Idempotência**: A inserção via `updateOne(..., { $setOnInsert }, { upsert: true })` em conjunto com a restrição única em `eventId` previne duplicações mesmo em reprocessamentos de mensagens de mensageria (Kafka/RabbitMQ).
