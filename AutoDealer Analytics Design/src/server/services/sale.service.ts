/**
 * AutoDealer Analytics — Serviço de Vendas e Negociações
 */

import { postgresCore } from '../db/postgres';
import { integrationBus } from '../bus/integration-bus';
import { Sale } from '../types/models';

export class SaleService {
  public static getAll(): Sale[] {
    return postgresCore.getSales();
  }

  public static async completeSale(
    saleId: string,
    finalAmount: number,
    paymentMethod: Sale['paymentMethod'],
    userId?: string,
    correlationId?: string
  ): Promise<Sale> {
    const { previous, current } = postgresCore.completeSale(saleId, finalAmount, paymentMethod);

    // Auditoria oficial MongoDB: SALE_COMPLETED
    await integrationBus.emitAuditEvent({
      eventType: 'SALE_COMPLETED',
      entityType: 'sale',
      entityId: saleId,
      userId: userId || null,
      previousValues: { status: previous.status },
      newValues: {
        status: current.status,
        saleAmount: current.saleAmount,
        paymentMethod: current.paymentMethod
      },
      correlationId: correlationId || null
    });

    // Cascata arquitetural: atualiza o veículo para SOLD se vinculado
    if (current.vehicleId) {
      postgresCore.setVehicleStatus(current.vehicleId, 'SOLD');
      await integrationBus.emitAuditEvent({
        eventType: 'VEHICLE_STATUS_CHANGED',
        entityType: 'vehicle',
        entityId: current.vehicleId,
        userId: userId || null,
        previousValues: { status: 'AVAILABLE' },
        newValues: { status: 'SOLD' },
        correlationId: correlationId || null
      });
    }

    return current;
  }

  public static async cancelSale(saleId: string, reason: string, userId?: string, correlationId?: string): Promise<Sale> {
    const { previous, current } = postgresCore.cancelSale(saleId, reason);

    // Auditoria oficial MongoDB: SALE_CANCELLED
    await integrationBus.emitAuditEvent({
      eventType: 'SALE_CANCELLED',
      entityType: 'sale',
      entityId: saleId,
      userId: userId || null,
      previousValues: { status: previous.status },
      newValues: {
        status: current.status,
        cancellationReason: reason
      },
      correlationId: correlationId || null
    });

    return current;
  }
}
