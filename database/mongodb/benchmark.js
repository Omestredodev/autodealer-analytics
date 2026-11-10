/**
 * AutoDealer Analytics — Módulo MongoDB
 * Arquivo: database/mongodb/benchmark.js
 * Descrição: Testes de desempenho e reprodutibilidade com métricas de explain("executionStats").
 * 
 * Cenários avaliados:
 * 1. Inserção em lote (Bulk Insert) de 10.000 eventos de auditoria.
 * 2. Consulta de Histórico de Entidade: COM índice vs SEM índice (COLLSCAN).
 * 3. Consulta por Tipo de Evento: COM índice vs SEM índice (COLLSCAN).
 * 4. Consulta por Usuário Responsável: COM índice parcial vs SEM índice (COLLSCAN).
 * 5. Consulta por Intervalo de Datas UTC: COM índice vs SEM índice (COLLSCAN).
 * 6. Consulta por Correlação de Fluxo Comercial: COM índice vs SEM índice.
 */

const COLLECTION_NAME = "audit_events";
const BENCHMARK_VOLUME = 10000;
const BATCH_SIZE = 1000;

// Tipos de eventos e entidades para geração aleatória representativa
const EVENT_TYPES = [
  "VEHICLE_CREATED", "VEHICLE_UPDATED", "VEHICLE_STATUS_CHANGED",
  "ADVERTISEMENT_CREATED", "ADVERTISEMENT_UPDATED", "ADVERTISEMENT_PUBLISHED",
  "ADVERTISEMENT_PAUSED", "ADVERTISEMENT_ENDED", "LEAD_STATUS_CHANGED",
  "APPOINTMENT_STATUS_CHANGED", "SALE_COMPLETED", "SALE_CANCELLED"
];

const ENTITY_TYPES = ["vehicle", "advertisement", "lead", "appointment", "sale"];

// Função auxiliar para gerar UUID v4 compatível
function generateUUID(index, prefix = "bbbb") {
  const hex = index.toString(16).padStart(12, "0");
  return `${prefix}0000-0000-4000-8000-${hex}`;
}

/**
 * Gera um lote de documentos sintéticos de auditoria válidos segundo o contrato.
 */
function generateBenchmarkBatch(startIndex, count, baseTimestamp) {
  const batch = [];
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const eventType = EVENT_TYPES[idx % EVENT_TYPES.length];
    const entityType = ENTITY_TYPES[idx % ENTITY_TYPES.length];
    
    // Distribuição de 50 entidades por tipo para simular histórico denso
    const entityIndex = idx % 50;
    const entityId = generateUUID(entityIndex, "ee00");
    
    // 10 operadores distintos
    const userIndex = idx % 10;
    const userId = generateUUID(userIndex, "uu00");
    
    // 100 fluxos comerciais correlacionados
    const correlationIndex = idx % 100;
    const correlationId = generateUUID(correlationIndex, "cc00");

    // Espaçamento temporal de 1 minuto entre eventos
    const occurredAt = new Date(baseTimestamp.getTime() + idx * 60000);

    batch.push({
      eventId: generateUUID(idx, "9999"),
      eventType: eventType,
      userId: userId,
      entityType: entityType,
      entityId: entityId,
      occurredAt: occurredAt,
      previousValues: { status: "PREVIOUS_STATE", value: 10000 + (idx % 100) },
      newValues: { status: "NEW_STATE", value: 10500 + (idx % 100) },
      correlationId: correlationId,
      _isBenchmarkData: true
    });
  }
  return batch;
}

/**
 * Extrai métricas essenciais do explain("executionStats").
 */
function extractStats(explainResult) {
  const stats = explainResult.executionStats || {};
  const stage = stats.executionStages?.stage || stats.executionStages?.inputStage?.stage || "N/A";
  const indexName = stats.executionStages?.indexName || stats.executionStages?.inputStage?.indexName || "NENHUM (COLLSCAN)";

  return {
    stage: stage,
    indexName: indexName,
    executionTimeMillis: stats.executionTimeMillis ?? 0,
    totalDocsExamined: stats.totalDocsExamined ?? 0,
    totalKeysExamined: stats.totalKeysExamined ?? 0,
    nReturned: stats.nReturned ?? 0
  };
}

function runBenchmark(database) {
  const currentDb = database || db;
  const collection = currentDb.getCollection(COLLECTION_NAME);

  print("===================================================================================");
  print(` AUTO DEALER ANALYTICS — BENCHMARK DE DESEMPENHO MONGODB AUDIT (${BENCHMARK_VOLUME} DOCS)`);
  print("===================================================================================\n");

  // 1. Limpeza prévia de dados antigos de benchmark (se existirem)
  print("[Etapa 1] Preparando coleção para o teste...");
  collection.deleteMany({ _isBenchmarkData: true });

  // 2. Teste de Inserção em Lote (Bulk Insert)
  print(`[Etapa 2] Executando inserção em lote de ${BENCHMARK_VOLUME} documentos (batches de ${BATCH_SIZE})...`);
  const baseTime = new Date("2026-01-01T00:00:00Z");
  const insertStart = Date.now();

  for (let offset = 0; offset < BENCHMARK_VOLUME; offset += BATCH_SIZE) {
    const batch = generateBenchmarkBatch(offset, BATCH_SIZE, baseTime);
    collection.insertMany(batch, { ordered: false });
  }

  const insertDurationMs = Date.now() - insertStart;
  const docsPerSec = Math.round((BENCHMARK_VOLUME / insertDurationMs) * 1000);
  print(`  -> Inserção concluída em: ${insertDurationMs} ms (${docsPerSec} docs/segundo)`);
  print(`  -> Total de documentos na coleção: ${collection.countDocuments()}\n`);

  // 3. Execução dos Cenários de Leitura e Explain
  const benchmarkResults = [];

  const targetEntityId = generateUUID(10, "ee00");
  const targetUserId = generateUUID(3, "uu00");
  const targetCorrelationId = generateUUID(5, "cc00");
  const startDate = new Date(baseTime.getTime() + 1000 * 60000);
  const endDate = new Date(baseTime.getTime() + 3000 * 60000);

  const scenarios = [
    {
      name: "Cenário 1: Histórico de Entidade (ESR)",
      query: { entityType: "vehicle", entityId: targetEntityId },
      sort: { occurredAt: -1 },
      indexHint: { entityType: 1, entityId: 1, occurredAt: -1 }
    },
    {
      name: "Cenário 2: Tipo de Evento (SALE_COMPLETED)",
      query: { eventType: "SALE_COMPLETED" },
      sort: { occurredAt: -1 },
      indexHint: { eventType: 1, occurredAt: -1 }
    },
    {
      name: "Cenário 3: Auditoria por Usuário (Índice Parcial)",
      query: { userId: targetUserId },
      sort: { occurredAt: -1 },
      indexHint: { userId: 1, occurredAt: -1 }
    },
    {
      name: "Cenário 4: Intervalo de Datas UTC",
      query: { occurredAt: { $gte: startDate, $lte: endDate } },
      sort: { occurredAt: -1 },
      indexHint: { occurredAt: -1 }
    },
    {
      name: "Cenário 5: Correlação de Fluxo Comercial",
      query: { correlationId: targetCorrelationId },
      sort: { occurredAt: 1 },
      indexHint: { correlationId: 1, occurredAt: -1 }
    }
  ];

  print("[Etapa 3] Executando testes comparativos COM índice vs SEM índice (explain executionStats)...\n");

  scenarios.forEach((sc, i) => {
    // Consulta COM índice (otimizada)
    const explainIndexed = collection
      .find(sc.query)
      .sort(sc.sort)
      .hint(sc.indexHint)
      .explain("executionStats");
    const statsIndexed = extractStats(explainIndexed);

    // Consulta SEM índice (forçando COLLSCAN via natural order)
    const explainNoIndex = collection
      .find(sc.query)
      .sort(sc.sort)
      .hint({ $natural: 1 })
      .explain("executionStats");
    const statsNoIndex = extractStats(explainNoIndex);

    benchmarkResults.push({
      scenario: sc.name,
      query: JSON.stringify(sc.query),
      indexed: statsIndexed,
      noIndex: statsNoIndex
    });
  });

  // 4. Exibição Tabular dos Resultados
  print("===================================================================================");
  print(" TABELA COMPARATIVA DE DESEMPENHO (COM ÍNDICE vs SEM ÍNDICE)");
  print("===================================================================================");
  print(
    "| Cenário | Modo | Índice Utilizado | Estágio | Tempo (ms) | Docs Examinados | Chaves Examinadas | Retornados |"
  );
  print(
    "|---|---|---|---|---|---|---|---|"
  );

  benchmarkResults.forEach(r => {
    print(
      `| ${r.scenario} | COM ÍNDICE | ${r.indexed.indexName} | ${r.indexed.stage} | ${r.indexed.executionTimeMillis} ms | ${r.indexed.totalDocsExamined} | ${r.indexed.totalKeysExamined} | ${r.indexed.nReturned} |`
    );
    print(
      `| ${r.scenario} | SEM ÍNDICE | NENHUM | ${r.noIndex.stage} | ${r.noIndex.executionTimeMillis} ms | ${r.noIndex.totalDocsExamined} | ${r.noIndex.totalKeysExamined} | ${r.noIndex.nReturned} |`
    );
  });

  print("\n===================================================================================");
  print(" OBSERVAÇÕES TÉCNICAS E ANÁLISE DE EFICIÊNCIA");
  print("===================================================================================");
  print("1. Redução de Varredura (Docs Examined):");
  print("   - Consultas indexadas examinam exclusivamente as chaves correspondentes (IXSCAN + FETCH).");
  print("   - Sem índice, o MongoDB realiza varredura completa da coleção (COLLSCAN = 10.000+ docs).");
  print("2. Padrão ESR (Equality, Sort, Range):");
  print("   - O índice { entityType: 1, entityId: 1, occurredAt: -1 } entrega os documentos pré-ordenados,");
  print("     eliminando o estágio consumidor de memória SORT em tempo de execução.");
  print("3. Índices Parciais:");
  print("   - Os índices de userId e correlationId descartam documentos com valores nulos, reduzindo");
  print("     o consumo de memória RAM pelo WiredTiger sem perder cobertura de consulta.");
  print("===================================================================================\n");
}

// Execução direta no mongosh
if (typeof db !== "undefined") {
  runBenchmark(db);
}

// Exportação para uso modular se executado via Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    BENCHMARK_VOLUME,
    generateBenchmarkBatch,
    extractStats,
    runBenchmark
  };
}
