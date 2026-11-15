import { postgres } from '../database/postgresql';
import { closeMongoConnection } from '../database/mongodb';
import { deliverAuditBatch } from '../modules/operations/audit-outbox';

/** Reenvia até 100 auditorias pendentes. Seguro para executar novamente. */
async function run() {
  const pending = await postgres.query<{ event_id: string }>(
    `SELECT event_id FROM public.audit_outbox
     WHERE delivered_at IS NULL ORDER BY created_at, event_id LIMIT 100`,
  );
  if (pending.rows.length === 0) {
    console.log('[OK] Nenhum evento de auditoria pendente.');
    return;
  }
  const result = await deliverAuditBatch(pending.rows.map((row) => row.event_id));
  console.log(`[OUTBOX] Processados: ${result.eventIds.length}; pendentes: ${result.pending}`);
  if (result.pending) process.exitCode = 1;
}

run().catch((error: unknown) => {
  console.error('[ERRO] Reprocessamento da outbox falhou:', error);
  process.exitCode = 1;
}).finally(async () => {
  await Promise.allSettled([postgres.end(), closeMongoConnection()]);
});
