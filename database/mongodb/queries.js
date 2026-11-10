/**
 * AutoDealer Analytics — Módulo MongoDB
 * Arquivo: database/mongodb/queries.js
 * Descrição: Operações e consultas principais para o módulo de auditoria e histórico.
 * 
 * Consultas disponíveis:
 * 1. recordAuditEvent: Inserção idempotente com detecção de chave duplicada.
 * 2. getEntityHistory: Reconstituição cronológica do histórico de qualquer entidade.
 * 3. getEventsByType: Filtro por tipo de evento do catálogo oficial.
 * 4. getEventsByUser: Auditoria de ações realizadas por colaborador/usuário.
 * 5. getEventsByDateRange: Varredura de eventos dentro de janela temporal UTC.
 * 6. getEventsByCorrelationId: Rastreamento ponta a ponta de fluxo compartilhado entre bancos.
 * 7. getAuditEventVolumeSummary: Agregação estatística de eventos por tipo.
 * 8. getMostModifiedEntities: Identificação de entidades com maior frequência de alterações.
 */

const COLLECTION_NAME = "audit_events";

/**
 * Registra um evento de auditoria com suporte a idempotência.
 * Se o eventId já existir, a operação é ignorada com segurança sem duplicar dados.
 */
function recordAuditEvent(eventDoc, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  try {
    const result = collection.updateOne(
      { eventId: eventDoc.eventId },
      { $setOnInsert: eventDoc },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      return { status: "INSERTED", eventId: eventDoc.eventId };
    } else {
      return { status: "IDEMPOTENT_IGNORED", eventId: eventDoc.eventId };
    }
  } catch (err) {
    if (err.code === 11000) {
      return { status: "IDEMPOTENT_DUPLICATE_KEY", eventId: eventDoc.eventId };
    }
    throw err;
  }
}

/**
 * Consulta 1: Busca o histórico cronológico de uma entidade (ex: veículo, anúncio).
 * Utiliza o índice composto: { entityType: 1, entityId: 1, occurredAt: -1 }
 */
function getEntityHistory(entityType, entityId, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .find(
      { entityType: entityType, entityId: entityId },
      {
        projection: {
          _id: 0,
          eventId: 1,
          eventType: 1,
          userId: 1,
          occurredAt: 1,
          previousValues: 1,
          newValues: 1,
          correlationId: 1
        }
      }
    )
    .sort({ occurredAt: 1 })
    .toArray();
}

/**
 * Consulta 2: Busca eventos de auditoria filtrados por tipo.
 * Utiliza o índice composto: { eventType: 1, occurredAt: -1 }
 */
function getEventsByType(eventType, limit = 50, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .find({ eventType: eventType })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Consulta 3: Busca eventos realizados por um usuário/operador específico.
 * Utiliza o índice parcial: { userId: 1, occurredAt: -1 }
 */
function getEventsByUser(userId, limit = 50, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .find({ userId: userId })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Consulta 4: Busca eventos dentro de um intervalo de datas UTC.
 * Utiliza o índice: { occurredAt: -1 }
 */
function getEventsByDateRange(startDate, endDate, limit = 100, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  return collection
    .find({
      occurredAt: {
        $gte: start,
        $lte: end
      }
    })
    .sort({ occurredAt: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Consulta 5: Rastreia eventos pertencentes a uma mesma operação de negócio correlacionada.
 * Utiliza o índice parcial: { correlationId: 1, occurredAt: -1 }
 */
function getEventsByCorrelationId(correlationId, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .find({ correlationId: correlationId })
    .sort({ occurredAt: 1 })
    .toArray();
}

/**
 * Consulta 6: Agregação com sumário de volume de auditoria por tipo de evento.
 */
function getAuditEventVolumeSummary(database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .aggregate([
      {
        $group: {
          _id: "$eventType",
          totalEvents: { $sum: 1 },
          firstOccurrence: { $min: "$occurredAt" },
          lastOccurrence: { $max: "$occurredAt" },
          distinctEntities: { $addToSet: "$entityId" }
        }
      },
      {
        $project: {
          eventType: "$_id",
          totalEvents: 1,
          firstOccurrence: 1,
          lastOccurrence: 1,
          uniqueEntitiesCount: { $size: "$distinctEntities" },
          _id: 0
        }
      },
      {
        $sort: { totalEvents: -1 }
      }
    ])
    .toArray();
}

/**
 * Consulta 7: Agregação para identificar entidades com maior quantidade de alterações.
 */
function getMostModifiedEntities(limit = 10, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .aggregate([
      {
        $group: {
          _id: { entityType: "$entityType", entityId: "$entityId" },
          totalChanges: { $sum: 1 },
          lastChange: { $max: "$occurredAt" },
          eventTypes: { $addToSet: "$eventType" }
        }
      },
      {
        $project: {
          entityType: "$_id.entityType",
          entityId: "$_id.entityId",
          totalChanges: 1,
          lastChange: 1,
          eventTypesCount: { $size: "$eventTypes" },
          _id: 0
        }
      },
      {
        $sort: { totalChanges: -1 }
      },
      {
        $limit: limit
      }
    ])
    .toArray();
}

/**
 * Função utilitária para executar e exibir consultas de exemplo no mongosh.
 */
function runExampleQueries(database) {
  const currentDb = database || db;
  print("======================================================================");
  print(" AutoDealer Analytics — Demonstração das Consultas de Auditoria");
  print("======================================================================\n");

  // 1. Histórico de entidade
  const sampleVehicleId = "b1111111-1111-4111-8111-111111111111";
  print(`[Q1] Reconstituição de histórico do Veículo (${sampleVehicleId}):`);
  const history = getEntityHistory("vehicle", sampleVehicleId, currentDb);
  history.forEach((h, idx) => {
    print(`  ${idx + 1}. [${h.occurredAt.toISOString()}] ${h.eventType} | Usuário: ${h.userId || 'SISTEMA'}`);
    if (h.previousValues) print(`     Anterior: ${JSON.stringify(h.previousValues)}`);
    if (h.newValues) print(`     Novo:     ${JSON.stringify(h.newValues)}`);
  });
  print(`  Total de alterações registradas: ${history.length}\n`);

  // 2. Busca por tipo de evento
  print("[Q2] Consultando eventos de tipo 'SALE_COMPLETED':");
  const sales = getEventsByType("SALE_COMPLETED", 5, currentDb);
  print(`  Encontrados: ${sales.length} evento(s)`);
  sales.forEach(s => print(`  - Evento: ${s.eventId} | Valor final: R$ ${s.newValues?.finalAmount || 'N/A'}`));
  print("");

  // 3. Busca por correlationId
  const sampleCorrelation = "10000000-0000-4000-8000-000000000001";
  print(`[Q3] Rastreamento de fluxo comercial correlacionado (${sampleCorrelation}):`);
  const flow = getEventsByCorrelationId(sampleCorrelation, currentDb);
  flow.forEach((step, idx) => {
    print(`  Passo ${idx + 1}: ${step.eventType} em ${step.entityType} (${step.entityId}) às ${step.occurredAt.toISOString()}`);
  });
  print(`  Total de eventos correlacionados no fluxo: ${flow.length}\n`);

  // 4. Sumário agregado por tipo
  print("[Q4] Sumário volumétrico por tipo de evento de auditoria:");
  const summary = getAuditEventVolumeSummary(currentDb);
  printjson(summary);
  print("\n======================================================================");
}

// Execução direta no mongosh
if (typeof db !== "undefined") {
  runExampleQueries(db);
}

// Exportação para uso modular se executado via Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    recordAuditEvent,
    getEntityHistory,
    getEventsByType,
    getEventsByUser,
    getEventsByDateRange,
    getEventsByCorrelationId,
    getAuditEventVolumeSummary,
    getMostModifiedEntities,
    runExampleQueries
  };
}
