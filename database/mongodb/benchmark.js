
/**
 * AutoDealer Analytics - MongoDB Audit Benchmark
 *
 * Compara consultas indexadas com varreduras completas.
 * Utiliza uma colecao temporaria com o validador e os
 * indices da colecao oficial audit_events.
 *
 * Nao modifica nem remove os registros oficiais.
 */

const BENCHMARK_VOLUME = 10000;
const BATCH_SIZE = 1000;

const EVENTS = [
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
];

const ENTITIES = [
  "vehicle",
  "advertisement",
  "lead",
  "appointment",
  "sale"
];

// Cria identificadores UUID validos para os testes.
function makeUUID(prefix, number) {
  const suffix = number.toString(16).padStart(12, "0");
  return `${prefix}0000-0000-4000-8000-${suffix}`;
}

// Gera documentos compativeis com o schema oficial.
function benchmarkDocuments(offset, count, baseDate) {
  const docs = [];

  for (let n = offset; n < offset + count; n++) {
    docs.push({
      eventId: makeUUID("9999", n),
      eventType: EVENTS[n % EVENTS.length],
      entityType: ENTITIES[n % ENTITIES.length],
      entityId: makeUUID("ee00", n % 50),
      userId: makeUUID("aa00", n % 10),
      correlationId: makeUUID("cc00", n % 100),
      occurredAt: new Date(
        baseDate.getTime() + n * 60000
      ),
      previousValues: { value: n },
      newValues: { value: n + 1 }
    });
  }

  return docs;
}

// Extrai os estagios do explain, inclusive aninhados.
function explainSummary(explain) {
  const stages = new Set();
  const indexes = new Set();

  function scan(node) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach(scan);
      return;
    }

    if (typeof node.stage === "string") {
      stages.add(node.stage);
    }

    if (typeof node.indexName === "string") {
      indexes.add(node.indexName);
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") {
        scan(value);
      }
    }
  }

  scan(explain.executionStats?.executionStages);
  scan(explain.queryPlanner?.winningPlan);

  const stats = explain.executionStats || {};

  return {
    stages: [...stages].join(", ") || "nao identificado",
    indexes: [...indexes].join(", ") || "nenhum",
    ms: stats.executionTimeMillis ?? "N/D",
    docs: stats.totalDocsExamined ?? "N/D",
    keys: stats.totalKeysExamined ?? "N/D",
    returned: stats.nReturned ?? "N/D"
  };
}

function runBenchmark(database) {
  const source = database.getCollection("audit_events");

  const info = database.getCollectionInfos({
    name: "audit_events"
  })[0];

  if (!info || !info.options?.validator) {
    throw new Error(
      "Colecao audit_events com validador nao encontrada. " +
      "Execute collections.js primeiro."
    );
  }

  // Nome exclusivo para evitar sobrescrever outras colecoes.
  const tempName =
    `audit_events_benchmark_${Date.now()}`;

  database.createCollection(tempName, {
    validator: info.options.validator,
    validationLevel: "strict",
    validationAction: "error"
  });

  const collection = database.getCollection(tempName);

  try {
    // Reproduz os indices da colecao oficial.
    for (const ix of source.getIndexes()) {
      if (ix.name === "_id_") continue;

      const options = { name: ix.name };

      if (ix.unique) {
        options.unique = true;
      }

      if (ix.partialFilterExpression) {
        options.partialFilterExpression =
          ix.partialFilterExpression;
      }

      collection.createIndex(ix.key, options);
    }

    print(`[benchmark] Colecao temporaria: ${tempName}`);

    // Insercao em lotes de 1.000 documentos.
    const base = new Date(
      "2026-01-01T00:00:00.000Z"
    );

    const start = Date.now();

    for (
      let offset = 0;
      offset < BENCHMARK_VOLUME;
      offset += BATCH_SIZE
    ) {
      const batch = benchmarkDocuments(
        offset,
        BATCH_SIZE,
        base
      );

      collection.insertMany(batch);
    }

    const elapsed = Date.now() - start;

    print(
      `[benchmark] Inseridos: ` +
      `${collection.countDocuments({})} em ${elapsed} ms`
    );

    // Consultas baseadas nos indices existentes.
    const scenarios = [
      {
        name: "Historico por entidade",
        filter: {
          entityType: "vehicle",
          entityId: makeUUID("ee00", 10)
        },
        sort: { occurredAt: -1 },
        index: "idx_entity_history"
      },
      {
        name: "Tipo SALE_COMPLETED",
        filter: {
          eventType: "SALE_COMPLETED"
        },
        sort: { occurredAt: -1 },
        index: "idx_eventType_occurredAt"
      },
      {
        name: "Auditoria por usuario",
        filter: {
          userId: makeUUID("aa00", 3)
        },
        sort: { occurredAt: -1 },
        index: "idx_userId_occurredAt"
      },
      {
        name: "Intervalo UTC",
        filter: {
          occurredAt: {
            $gte: new Date(
              base.getTime() + 1000 * 60000
            ),
            $lte: new Date(
              base.getTime() + 3000 * 60000
            )
          }
        },
        sort: { occurredAt: -1 },
        index: "idx_occurredAt"
      },
      {
        name: "Fluxo por correlationId",
        filter: {
          correlationId: makeUUID("cc00", 5)
        },
        sort: { occurredAt: 1 },
        index: "idx_correlationId"
      }
    ];

    // Executa cada consulta usando indice e COLLSCAN.
    for (const scenario of scenarios) {
      const withIndex = collection
        .find(scenario.filter)
        .sort(scenario.sort)
        .hint(scenario.index)
        .explain("executionStats");

      const withoutIndex = collection
        .find(scenario.filter)
        .sort(scenario.sort)
        .hint({ $natural: 1 })
        .explain("executionStats");

    // Diagnostico dos indices parciais que tiveram baixo desempenho.
    if (
      scenario.index === "idx_userId_occurredAt" ||
      scenario.index === "idx_correlationId"
    ) {
      print(`\n[DIAGNOSTICO] Plano de ${scenario.name}:`);

      print(
        EJSON.stringify(
          withIndex.queryPlanner.winningPlan,
          null,
          2
        )
      );
    }


      print(`\n[benchmark] ${scenario.name}`);

      print(
        "  COM indice: " +
        JSON.stringify(explainSummary(withIndex))
      );

      print(
        "  COLLSCAN forcado: " +
        JSON.stringify(explainSummary(withoutIndex))
      );
    }

    print(
      "\n[benchmark] Os tempos sao medicoes pontuais."
    );
    print(
      "[benchmark] Compare tambem documentos " +
      "e chaves examinados."
    );
    print(
      "[benchmark] COLLSCAN e forcado com $natural; " +
      "os indices nao sao removidos."
    );

  } finally {
    // Exclui somente a colecao temporaria.
    collection.drop();

    print(
      `[benchmark] Colecao temporaria removida: ${tempName}`
    );

    print(
      `[benchmark] Documentos originais preservados: ` +
      `${source.countDocuments({})}`
    );
  }
}

// Execucao direta pelo mongosh.
if (typeof db !== "undefined") {
  runBenchmark(db);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    makeUUID,
    benchmarkDocuments,
    explainSummary,
    runBenchmark
  };
}
