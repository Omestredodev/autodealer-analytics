
/**
 * AutoDealer Analytics - Modulo MongoDB
 * Arquivo: database/mongodb/queries.js
 *
 * Consultas de auditoria e historico de alteracoes.
 *
 * 1. recordAuditEvent
 * 2. getEntityHistory
 * 3. getEventsByType
 * 4. getEventsByUser
 * 5. getEventsByDateRange
 * 6. getEventsByCorrelationId
 * 7. getAuditEventVolumeSummary
 * 8. getMostModifiedEntities
 */

const COLLECTION_NAME = "audit_events";

/**
 * Registra um evento de auditoria com idempotencia.
 * O eventId e protegido por um indice unico.
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
      return {
        status: "INSERTED",
        eventId: eventDoc.eventId
      };
    }

    return {
      status: "IDEMPOTENT_IGNORED",
      eventId: eventDoc.eventId
    };
  } catch (err) {
    if (err.code === 11000) {
      return {
        status: "IDEMPOTENT_DUPLICATE_KEY",
        eventId: eventDoc.eventId
      };
    }

    throw err;
  }
}


/**
 * Q1 - Recupera o historico de uma entidade.
 *
 * Indice:
 * { entityType: 1, entityId: 1, occurredAt: -1 }
 *
 * A projecao e passada como segundo argumento
 * do metodo find(), compativel com mongosh.
 */
function getEntityHistory(entityType, entityId, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .find(
      {
        entityType: entityType,
        entityId: entityId
      },
      {
        _id: 0,
        eventId: 1,
        eventType: 1,
        userId: 1,
        occurredAt: 1,
        previousValues: 1,
        newValues: 1,
        correlationId: 1
      }
    )
    .sort({ occurredAt: 1 })
    .toArray();
}


/**
 * Q2 - Busca eventos por tipo.
 *
 * Indice:
 * { eventType: 1, occurredAt: -1 }
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
 * Q3 - Busca eventos por usuario.
 *
 * Indice parcial:
 * { userId: 1, occurredAt: -1 }
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
 * Q4 - Busca eventos em um intervalo de datas UTC.
 *
 * Indice:
 * { occurredAt: -1 }
 */
function getEventsByDateRange(
  startDate,
  endDate,
  limit = 100,
  database
) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  const start =
    startDate instanceof Date ? startDate : new Date(startDate);

  const end =
    endDate instanceof Date ? endDate : new Date(endDate);

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
 * Q5 - Recupera eventos da mesma operacao de negocio.
 *
 * Indice parcial:
 * { correlationId: 1, occurredAt: -1 }
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
 * Q6 - Resume o volume de auditoria por tipo de evento.
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
          uniqueEntitiesCount: {
            $size: "$distinctEntities"
          },
          _id: 0
        }
      },
      {
        $sort: {
          totalEvents: -1
        }
      }
    ])
    .toArray();
}

/**
 * Q7 - Identifica as entidades mais modificadas.
 */
function getMostModifiedEntities(limit = 10, database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  return collection
    .aggregate([
      {
        $group: {
          _id: {
            entityType: "$entityType",
            entityId: "$entityId"
          },
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
          eventTypesCount: {
            $size: "$eventTypes"
          },
          _id: 0
        }
      },
      {
        $sort: {
          totalChanges: -1
        }
      },
      {
        $limit: limit
      }
    ])
    .toArray();
}

/**
 * Executa consultas demonstrativas com os dados do seed.
 */
function runExampleQueries(database) {
  const currentDb = database || db;

  print("======================================================================");
  print(" AutoDealer Analytics - Demonstracao das Consultas de Auditoria");
  print("======================================================================\n");

  // Q1 - Historico de veiculo
  const sampleVehicleId =
    "b1111111-1111-4111-8111-111111111111";

  print(`[Q1] Historico do veiculo (${sampleVehicleId}):`);

  const history = getEntityHistory(
    "vehicle",
    sampleVehicleId,
    currentDb
  );

  history.forEach((h, idx) => {
    print(
      `  ${idx + 1}. [${h.occurredAt.toISOString()}] ` +
      `${h.eventType} | Usuario: ${h.userId || "SISTEMA"}`
    );

    if (h.previousValues) {
      print(`     Anterior: ${JSON.stringify(h.previousValues)}`);
    }

    if (h.newValues) {
      print(`     Novo: ${JSON.stringify(h.newValues)}`);
    }
  });

  print(`  Total de alteracoes registradas: ${history.length}\n`);

  // Q2 - Eventos de venda concluida
  print("[Q2] Eventos do tipo SALE_COMPLETED:");

  const sales = getEventsByType(
    "SALE_COMPLETED",
    5,
    currentDb
  );

  print(`  Encontrados: ${sales.length} evento(s)`);

  sales.forEach((s) => {
    print(
      `  - Evento: ${s.eventId} | ` +
      `Valor final: R$ ${s.newValues?.finalAmount ?? "N/A"}`
    );
  });

  print("");

  // Q3 - Correlacao de operacoes
  const sampleCorrelation =
    "10000000-0000-4000-8000-000000000001";

  print(
    `[Q3] Fluxo correlacionado (${sampleCorrelation}):`
  );

  const flow = getEventsByCorrelationId(
    sampleCorrelation,
    currentDb
  );

  flow.forEach((step, idx) => {
    print(
      `  Passo ${idx + 1}: ${step.eventType} ` +
      `em ${step.entityType} (${step.entityId}) ` +
      `as ${step.occurredAt.toISOString()}`
    );
  });

  print(
    `  Total de eventos correlacionados: ${flow.length}\n`
  );

  // Q4 - Agregacao por tipo
  print("[Q4] Resumo de eventos por tipo:");

  const summary = getAuditEventVolumeSummary(currentDb);
  printjson(summary);

  print("\n======================================================================");
}

// Execucao direta no mongosh
if (typeof db !== "undefined") {
  runExampleQueries(db);
}

// Exportacao para uso via Node.js
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
