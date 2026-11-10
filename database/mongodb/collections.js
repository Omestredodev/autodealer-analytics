
/**
 * AutoDealer Analytics — Módulo MongoDB
 * Arquivo: database/mongodb/collections.js
 * Descrição: Criação e configuração das coleções com validação por JSON Schema.
 *
 * Compatível com o catálogo de eventos e contrato de dados oficial:
 * - docs/database-models/data-contract.md
 * - docs/database-models/event-catalog.md
 * - docs/database-models/status-dictionary.md
 */

const COLLECTION_NAME = "audit_events";

// Definição do validador JSON Schema para a coleção de auditoria
const auditEventValidator = {
  $jsonSchema: {
    bsonType: "object",

    required: [
      "eventId",
      "eventType",
      "entityType",
      "entityId",
      "occurredAt"
    ],

    properties: {
      // Campo gerado automaticamente pelo MongoDB em inserções.
      _id: {
        bsonType: "objectId",
        description: "Identificador interno do documento MongoDB"
      },

      eventId: {
        bsonType: "string",
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description: "UUID canônico único do evento de auditoria (obrigatório)"
      },

      eventType: {
        bsonType: "string",
        enum: [
          "VEHICLE_CREATED",
          "VEHICLE_UPDATED",
          "VEHICLE_STATUS_CHANGED",
          "ADVERTISEMENT_CREATED",
          "ADVERTISEMENT_UPDATED",
          "ADVERTISEMENT_PUBLISHED",
          "ADVERTISEMENT_PAUSED",
          "ADVERTISEMENT_ENDED",
          "LEAD_STATUS_CHANGED",
          "APPOINTMENT_STATUS_CHANGED",
          "SALE_COMPLETED",
          "SALE_CANCELLED"
        ],
        description: "Tipo de evento de auditoria cadastrado no catálogo oficial (obrigatório)"
      },

      userId: {
        bsonType: ["string", "null"],
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description: "UUID do usuário autenticado responsável pela ação (opcional/anônimo)"
      },


      entityType: {
        bsonType: "string",
        enum: [
          "vehicle",
          "advertisement",
          "lead",
          "appointment",
          "sale"
        ],
        description: "Tipo da entidade afetada pela alteração (obrigatório)"
      },

      entityId: {
        bsonType: "string",
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description: "UUID oficial da entidade gerado pelo PostgreSQL (obrigatório)"
      },

      occurredAt: {
        bsonType: "date",
        description: "Data e horário do evento em UTC como BSON Date (obrigatório)"
      },

      previousValues: {
        bsonType: ["object", "null"],
        description: "Valores anteriores à alteração para auditoria diferencial (delta)"
      },

      newValues: {
        bsonType: ["object", "null"],
        description: "Valores posteriores à alteração para auditoria diferencial (delta)"
      },

      correlationId: {
        bsonType: ["string", "null"],
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description: "Identificador UUID para correlacionar operações entre PostgreSQL, MongoDB e Cassandra"
      }
    },

    additionalProperties: false
  }
};

/**
 * Cria ou atualiza a coleção de auditoria.
 *
 * Se a coleção já existir, atualiza o validador
 * utilizando o comando collMod.
 *
 * Caso contrário, cria uma coleção com validação estrita.
 */
function setupCollections(database) {
  const currentDb = database || db;
  const existingCollections = currentDb.getCollectionNames();

  if (existingCollections.includes(COLLECTION_NAME)) {
    print(
      `[collections.js] Atualizando validador da coleção existente '${COLLECTION_NAME}'...`
    );

    const result = currentDb.runCommand({
      collMod: COLLECTION_NAME,
      validator: auditEventValidator,
      validationLevel: "strict",
      validationAction: "error"
    });

    print(
      `[collections.js] Resultado collMod: ${JSON.stringify(result)}`
    );

    if (result.ok !== 1) {
      throw new Error(
        `[collections.js] Falha ao atualizar a coleção '${COLLECTION_NAME}'`
      );
    }
  } else {
    print(
      `[collections.js] Criando coleção '${COLLECTION_NAME}' com validação de esquema estrita...`
    );

    const result = currentDb.createCollection(COLLECTION_NAME, {
      validator: auditEventValidator,
      validationLevel: "strict",
      validationAction: "error"
    });

    print(
      `[collections.js] Resultado createCollection: ${JSON.stringify(result)}`
    );
  }

  print(
    `[collections.js] Configuração da coleção '${COLLECTION_NAME}' concluída com sucesso.`
  );
}

// Execução direta no mongosh
if (typeof db !== "undefined") {
  setupCollections(db);
}

// Exportação para uso modular se executado via Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COLLECTION_NAME,
    auditEventValidator,
    setupCollections
  };
}
