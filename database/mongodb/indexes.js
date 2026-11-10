/**
 * AutoDealer Analytics — Módulo MongoDB
 * Arquivo: database/mongodb/indexes.js
 * Descrição: Criação e documentação dos índices para a coleção de auditoria.
 * 
 * Regras e Boas Práticas:
 * - Padrão ESR (Equality, Sort, Range) em índices compostos.
 * - Unicidade estrita em eventId para garantir idempotência contra reprocessamentos.
 * - Índices parciais para campos opcionais (userId, correlationId) economizando espaço de índice na RAM.
 */

const COLLECTION_NAME = "audit_events";

const indexDefinitions = [
  {
    key: { eventId: 1 },
    options: {
      name: "idx_unique_eventId",
      unique: true,
      background: true
    },
    rationale: "Garante a unicidade global de cada evento e suporta inserções idempotentes via chave única."
  },
  {
    key: { entityType: 1, entityId: 1, occurredAt: -1 },
    options: {
      name: "idx_entity_history",
      background: true
    },
    rationale: "Padrão ESR: otimiza a recuperação cronológica do histórico completo de qualquer entidade (veículo, anúncio, lead, etc.)."
  },
  {
    key: { eventType: 1, occurredAt: -1 },
    options: {
      name: "idx_eventType_occurredAt",
      background: true
    },
    rationale: "Permite filtrar rapidamente por tipos específicos de evento (ex: SALE_CANCELLED, VEHICLE_STATUS_CHANGED) ordenados por data."
  },
  {
    key: { userId: 1, occurredAt: -1 },
    options: {
      name: "idx_userId_occurredAt",
      partialFilterExpression: { userId: { $exists: true, $type: "string" } },
      background: true
    },
    rationale: "Índice parcial para auditoria de ações por operador/usuário, descartando eventos anônimos ou automatizados do sistema."
  },
  {
    key: { occurredAt: -1 },
    options: {
      name: "idx_occurredAt",
      background: true
    },
    rationale: "Suporta varredura de compliance e auditoria global por janelas de tempo UTC (diário, mensal, anual)."
  },
  {
    key: { correlationId: 1, occurredAt: -1 },
    options: {
      name: "idx_correlationId",
      partialFilterExpression: { correlationId: { $exists: true, $type: "string" } },
      background: true
    },
    rationale: "Rastreia todas as etapas de uma mesma operação comercial compartilhada entre PostgreSQL, Cassandra e MongoDB."
  }
];

function setupIndexes(database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  print(`[indexes.js] Aplicando índices na coleção '${COLLECTION_NAME}'...`);

  indexDefinitions.forEach((def) => {
    print(`[indexes.js] Criando índice '${def.options.name}': ${JSON.stringify(def.key)}`);
    print(`             Finalidade: ${def.rationale}`);
    try {
      const result = collection.createIndex(def.key, def.options);
      print(`             Resultado: ${result}`);
    } catch (err) {
      print(`             Aviso/Erro ao criar índice '${def.options.name}': ${err.message}`);
    }
  });

  print(`[indexes.js] Índices existentes na coleção:`);
  const existing = collection.getIndexes();
  printjson(existing);
}

// Execução direta no mongosh
if (typeof db !== "undefined") {
  setupIndexes(db);
}

// Exportação para uso modular se executado via Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    indexDefinitions,
    setupIndexes
  };
}
