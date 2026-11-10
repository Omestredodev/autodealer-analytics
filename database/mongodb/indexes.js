
/**
 * AutoDealer Analytics - Modulo MongoDB
 * Arquivo: database/mongodb/indexes.js
 *
 * Indices para auditoria e historico.
 *
 * Os indices parciais utilizam $exists: true para
 * permitir consultas por igualdade sem a restricao
 * de otimizacao associada a $type: "string".
 */

const COLLECTION_NAME = "audit_events";

const indexDefinitions = [
  {
    key: { eventId: 1 },
    options: {
      name: "idx_unique_eventId",
      unique: true
    },
    rationale: "Unicidade global de eventId e idempotencia."
  },
  {
    key: {
      entityType: 1,
      entityId: 1,
      occurredAt: -1
    },
    options: {
      name: "idx_entity_history"
    },
    rationale: "Historico cronologico por entidade."
  },
  {
    key: {
      eventType: 1,
      occurredAt: -1
    },
    options: {
      name: "idx_eventType_occurredAt"
    },
    rationale: "Eventos filtrados por tipo e data."
  },
  {
    key: {
      userId: 1,
      occurredAt: -1
    },
    options: {
      name: "idx_userId_occurredAt",
      partialFilterExpression: {
        userId: { $exists: true }
      }
    },
    rationale: "Auditoria por usuario com indice parcial."
  },
  {
    key: { occurredAt: -1 },
    options: {
      name: "idx_occurredAt"
    },
    rationale: "Consultas por intervalo temporal."
  },
  {
    key: {
      correlationId: 1,
      occurredAt: -1
    },
    options: {
      name: "idx_correlationId",
      partialFilterExpression: {
        correlationId: { $exists: true }
      }
    },
    rationale: "Rastreamento de operacoes correlacionadas."
  }
];

/**
 * Cria indices ausentes.
 * Nao remove indices automaticamente.
 *
 * Se um indice existente tiver configuracao diferente,
 * interrompe a execucao para evitar erros silenciosos.
 */
function setupIndexes(database) {
  const currentDb = database || db;

  if (!currentDb.getCollectionNames().includes(COLLECTION_NAME)) {
    throw new Error(
      `Colecao '${COLLECTION_NAME}' nao encontrada. ` +
      "Execute collections.js primeiro."
    );
  }

  const collection = currentDb.getCollection(COLLECTION_NAME);

  print(`[indexes.js] Validando indices de '${COLLECTION_NAME}'...`);

  for (const def of indexDefinitions) {
    const existing = collection
      .getIndexes()
      .find((index) => index.name === def.options.name);

    if (existing) {
      const sameKey =
        JSON.stringify(existing.key) ===
        JSON.stringify(def.key);

      const samePartial =
        JSON.stringify(existing.partialFilterExpression ?? null) ===
        JSON.stringify(def.options.partialFilterExpression ?? null);

      const sameUnique =
        Boolean(existing.unique) ===
        Boolean(def.options.unique);

      if (!sameKey || !samePartial || !sameUnique) {
        throw new Error(
          `O indice '${def.options.name}' existe com ` +
          "configuracao diferente. Execute a migracao " +
          "dos indices antes de continuar."
        );
      }

      print(`[indexes.js] Ja existente: ${def.options.name}`);
      continue;
    }

    const name = collection.createIndex(def.key, def.options);

    if (name !== def.options.name) {
      throw new Error(
        `Nome de indice inesperado: ${name}`
      );
    }

    print(`[indexes.js] Criado: ${name}`);
    print(`             ${def.rationale}`);
  }

  print("[indexes.js] Indices configurados:");
  printjson(collection.getIndexes().map((index) => ({
    name: index.name,
    key: index.key,
    partialFilterExpression:
      index.partialFilterExpression ?? null
  })));

  print("[indexes.js] Configuracao concluida.");
}

if (typeof db !== "undefined") {
  setupIndexes(db);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COLLECTION_NAME,
    indexDefinitions,
    setupIndexes
  };
}
