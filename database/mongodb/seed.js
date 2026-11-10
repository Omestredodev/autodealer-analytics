/**
 * AutoDealer Analytics — Módulo MongoDB
 * Arquivo: database/mongodb/seed.js
 * Descrição: Dados fictícios de teste cobrindo todos os 12 eventos obrigatórios,
 *            obedecendo ao contrato de dados e dicionário de status.
 */

const COLLECTION_NAME = "audit_events";

// UUIDs estáticos padronizados para representar entidades do PostgreSQL
const USERS = {
  admin: "a1111111-1111-4111-8111-111111111111",
  salesRep1: "a2222222-2222-4222-8222-222222222222",
  salesRep2: "a3333333-3333-4333-8333-333333333333",
  systemBot: "a4444444-4444-4444-8444-444444444444"
};

const VEHICLES = {
  corolla: "b1111111-1111-4111-8111-111111111111",
  civic: "b2222222-2222-4222-8222-222222222222",
  compass: "b3333333-3333-4333-8333-333333333333"
};

const ADVERTISEMENTS = {
  adCorolla: "c1111111-1111-4111-8111-111111111111",
  adCivic: "c2222222-2222-4222-8222-222222222222"
};

const LEADS = {
  maria: "d1111111-1111-4111-8111-111111111111",
  carlos: "d2222222-2222-4222-8222-222222222222"
};

const APPOINTMENTS = {
  aptMaria: "e1111111-1111-4111-8111-111111111111",
  aptCarlos: "e2222222-2222-4222-8222-222222222222"
};

const SALES = {
  saleMaria: "f1111111-1111-4111-8111-111111111111",
  saleCarlos: "f2222222-2222-4222-8222-222222222222"
};

const CORRELATIONS = {
  flowMaria: "10000000-0000-4000-8000-000000000001",
  flowCarlos: "20000000-0000-4000-8000-000000000002",
  flowStockMaintenance: "30000000-0000-4000-8000-000000000003"
};

// Conjunto de sementes contendo todos os 12 eventos do catálogo
const seedEvents = [
  // 1. VEHICLE_CREATED: Cadastro do Corolla
  {
    eventId: "9a010001-0000-4000-8000-000000000001",
    eventType: "VEHICLE_CREATED",
    userId: USERS.admin,
    entityType: "vehicle",
    entityId: VEHICLES.corolla,
    occurredAt: new Date("2026-10-15T09:00:00Z"),
    previousValues: null,
    newValues: {
      vin: "9BRBL42E5P100001",
      make: "Toyota",
      model: "Corolla 2.0 XEi",
      year: 2023,
      price: 135000.00,
      status: "AVAILABLE"
    },
    correlationId: CORRELATIONS.flowStockMaintenance
  },

  // 2. VEHICLE_UPDATED: Ajuste de preço do Corolla
  {
    eventId: "9a010001-0000-4000-8000-000000000002",
    eventType: "VEHICLE_UPDATED",
    userId: USERS.admin,
    entityType: "vehicle",
    entityId: VEHICLES.corolla,
    occurredAt: new Date("2026-10-16T14:30:00Z"),
    previousValues: {
      price: 135000.00
    },
    newValues: {
      price: 132000.00
    },
    correlationId: CORRELATIONS.flowStockMaintenance
  },

  // 3. ADVERTISEMENT_CREATED: Criação de rascunho de anúncio
  {
    eventId: "9a010001-0000-4000-8000-000000000003",
    eventType: "ADVERTISEMENT_CREATED",
    userId: USERS.salesRep1,
    entityType: "advertisement",
    entityId: ADVERTISEMENTS.adCorolla,
    occurredAt: new Date("2026-10-17T10:00:00Z"),
    previousValues: null,
    newValues: {
      vehicleId: VEHICLES.corolla,
      title: "Toyota Corolla 2.0 XEi 2023 - Impecável Único Dono",
      price: 132000.00,
      status: "DRAFT"
    },
    correlationId: null
  },

  // 4. ADVERTISEMENT_UPDATED: Adição de fotos e descrição ao anúncio
  {
    eventId: "9a010001-0000-4000-8000-000000000004",
    eventType: "ADVERTISEMENT_UPDATED",
    userId: USERS.salesRep1,
    entityType: "advertisement",
    entityId: ADVERTISEMENTS.adCorolla,
    occurredAt: new Date("2026-10-17T11:15:00Z"),
    previousValues: {
      highlightPhotoCount: 0
    },
    newValues: {
      highlightPhotoCount: 8,
      description: "Garantia de fábrica até 2028, revisões em concessionária."
    },
    correlationId: null
  },

  // 5. ADVERTISEMENT_PUBLISHED: Publicação oficial do anúncio na plataforma
  {
    eventId: "9a010001-0000-4000-8000-000000000005",
    eventType: "ADVERTISEMENT_PUBLISHED",
    userId: USERS.salesRep1,
    entityType: "advertisement",
    entityId: ADVERTISEMENTS.adCorolla,
    occurredAt: new Date("2026-10-17T11:30:00Z"),
    previousValues: {
      status: "DRAFT"
    },
    newValues: {
      status: "PUBLISHED",
      publishedAt: "2026-10-17T11:30:00Z"
    },
    correlationId: null
  },

  // 6. LEAD_STATUS_CHANGED: Lead Maria passa para atendimento
  {
    eventId: "9a010001-0000-4000-8000-000000000006",
    eventType: "LEAD_STATUS_CHANGED",
    userId: USERS.salesRep1,
    entityType: "lead",
    entityId: LEADS.maria,
    occurredAt: new Date("2026-10-18T08:45:00Z"),
    previousValues: {
      status: "NEW",
      assignedTo: null
    },
    newValues: {
      status: "IN_PROGRESS",
      assignedTo: USERS.salesRep1
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 7. APPOINTMENT_STATUS_CHANGED: Agendamento de test-drive confirmado
  {
    eventId: "9a010001-0000-4000-8000-000000000007",
    eventType: "APPOINTMENT_STATUS_CHANGED",
    userId: USERS.salesRep1,
    entityType: "appointment",
    entityId: APPOINTMENTS.aptMaria,
    occurredAt: new Date("2026-10-18T10:00:00Z"),
    previousValues: {
      status: "SCHEDULED"
    },
    newValues: {
      status: "CONFIRMED"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 8. APPOINTMENT_STATUS_CHANGED: Test-drive concluído com sucesso
  {
    eventId: "9a010001-0000-4000-8000-000000000008",
    eventType: "APPOINTMENT_STATUS_CHANGED",
    userId: USERS.salesRep1,
    entityType: "appointment",
    entityId: APPOINTMENTS.aptMaria,
    occurredAt: new Date("2026-10-19T15:30:00Z"),
    previousValues: {
      status: "CONFIRMED"
    },
    newValues: {
      status: "COMPLETED"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 9. VEHICLE_STATUS_CHANGED: Veículo reservado para Maria
  {
    eventId: "9a010001-0000-4000-8000-000000000009",
    eventType: "VEHICLE_STATUS_CHANGED",
    userId: USERS.salesRep1,
    entityType: "vehicle",
    entityId: VEHICLES.corolla,
    occurredAt: new Date("2026-10-19T16:00:00Z"),
    previousValues: {
      status: "AVAILABLE"
    },
    newValues: {
      status: "RESERVED"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 10. ADVERTISEMENT_PAUSED: Anúncio pausado após reserva do veículo
  {
    eventId: "9a010001-0000-4000-8000-000000000010",
    eventType: "ADVERTISEMENT_PAUSED",
    userId: USERS.salesRep1,
    entityType: "advertisement",
    entityId: ADVERTISEMENTS.adCorolla,
    occurredAt: new Date("2026-10-19T16:05:00Z"),
    previousValues: {
      status: "PUBLISHED"
    },
    newValues: {
      status: "PAUSED",
      pauseReason: "RESERVED_BY_CUSTOMER"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 11. LEAD_STATUS_CHANGED: Lead Maria convertida em venda
  {
    eventId: "9a010001-0000-4000-8000-000000000011",
    eventType: "LEAD_STATUS_CHANGED",
    userId: USERS.salesRep1,
    entityType: "lead",
    entityId: LEADS.maria,
    occurredAt: new Date("2026-10-20T11:00:00Z"),
    previousValues: {
      status: "IN_PROGRESS"
    },
    newValues: {
      status: "CONVERTED"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 12. SALE_COMPLETED: Venda do Corolla para Maria finalizada com sucesso
  {
    eventId: "9a010001-0000-4000-8000-000000000012",
    eventType: "SALE_COMPLETED",
    userId: USERS.salesRep1,
    entityType: "sale",
    entityId: SALES.saleMaria,
    occurredAt: new Date("2026-10-20T11:30:00Z"),
    previousValues: {
      status: "PENDING"
    },
    newValues: {
      status: "COMPLETED",
      finalAmount: 130000.00,
      paymentMethod: "FINANCING"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 13. VEHICLE_STATUS_CHANGED: Veículo atualizado para vendido
  {
    eventId: "9a010001-0000-4000-8000-000000000013",
    eventType: "VEHICLE_STATUS_CHANGED",
    userId: USERS.systemBot,
    entityType: "vehicle",
    entityId: VEHICLES.corolla,
    occurredAt: new Date("2026-10-20T11:31:00Z"),
    previousValues: {
      status: "RESERVED"
    },
    newValues: {
      status: "SOLD"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 14. ADVERTISEMENT_ENDED: Anúncio finalizado em decorrência da venda
  {
    eventId: "9a010001-0000-4000-8000-000000000014",
    eventType: "ADVERTISEMENT_ENDED",
    userId: USERS.systemBot,
    entityType: "advertisement",
    entityId: ADVERTISEMENTS.adCorolla,
    occurredAt: new Date("2026-10-20T11:32:00Z"),
    previousValues: {
      status: "PAUSED"
    },
    newValues: {
      status: "ENDED",
      endedReason: "VEHICLE_SOLD"
    },
    correlationId: CORRELATIONS.flowMaria
  },

  // 15. SALE_CANCELLED: Venda de Carlos cancelada por reprovação de crédito
  {
    eventId: "9a010001-0000-4000-8000-000000000015",
    eventType: "SALE_CANCELLED",
    userId: USERS.salesRep2,
    entityType: "sale",
    entityId: SALES.saleCarlos,
    occurredAt: new Date("2026-10-21T16:45:00Z"),
    previousValues: {
      status: "PENDING"
    },
    newValues: {
      status: "CANCELLED",
      cancellationReason: "CREDIT_APPROVAL_DENIED"
    },
    correlationId: CORRELATIONS.flowCarlos
  },

  // 16. LEAD_STATUS_CHANGED: Lead Carlos marcado como perdido
  {
    eventId: "9a010001-0000-4000-8000-000000000016",
    eventType: "LEAD_STATUS_CHANGED",
    userId: USERS.salesRep2,
    entityType: "lead",
    entityId: LEADS.carlos,
    occurredAt: new Date("2026-10-21T17:00:00Z"),
    previousValues: {
      status: "IN_PROGRESS"
    },
    newValues: {
      status: "LOST"
    },
    correlationId: CORRELATIONS.flowCarlos
  },

  // 17. VEHICLE_STATUS_CHANGED: Veículo Honda Civic inativado (retirado de estoque)
  {
    eventId: "9a010001-0000-4000-8000-000000000017",
    eventType: "VEHICLE_STATUS_CHANGED",
    userId: USERS.admin,
    entityType: "vehicle",
    entityId: VEHICLES.civic,
    occurredAt: new Date("2026-10-22T09:15:00Z"),
    previousValues: {
      status: "AVAILABLE"
    },
    newValues: {
      status: "INACTIVE",
      inactivationReason: "TRANSFERRED_TO_AFFILIATE"
    },
    correlationId: null
  }
];

function seedDatabase(database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  print(`[seed.js] Iniciando inserção de dados fictícios em '${COLLECTION_NAME}'...`);

  let insertedCount = 0;
  let skippedCount = 0;

  seedEvents.forEach((eventDoc) => {
    try {
      // Inserção com idempotência baseada na chave primária de negócio (eventId)
      const res = collection.updateOne(
        { eventId: eventDoc.eventId },
        { $setOnInsert: eventDoc },
        { upsert: true }
      );

      if (res.upsertedCount > 0) {
        insertedCount++;
      } else {
        skippedCount++;
      }
    } catch (err) {
      print(`[seed.js] Falha ao inserir o evento ${eventDoc.eventId}`);
      print(`[seed.js] Mensagem: ${err.message}`);

      if (err.errInfo) {
        print("[seed.js] Detalhes da validacao:");
        print(EJSON.stringify(err.errInfo, null, 2));
      } else {
        print("[seed.js] Erro completo:");
        print(err);
      }

      throw err;
    }
  });

  print(`[seed.js] Carga de dados concluída.`);
  print(`          Documentos inseridos: ${insertedCount}`);
  print(`          Documentos já existentes (idempotência preservada): ${skippedCount}`);
  print(`          Total atual na coleção: ${collection.countDocuments()}`);
}

// Execução direta no mongosh
if (typeof db !== "undefined") {
  seedDatabase(db);
}

// Exportação para uso modular se executado via Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    USERS,
    VEHICLES,
    ADVERTISEMENTS,
    LEADS,
    APPOINTMENTS,
    SALES,
    CORRELATIONS,
    seedEvents,
    seedDatabase
  };
}
