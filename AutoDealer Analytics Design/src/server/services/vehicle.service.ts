/**
 * AutoDealer Analytics — Serviço de Veículos com Integração de Auditoria
 */

import { postgresCore } from '../db/postgres';
import { integrationBus, generateUUID } from '../bus/integration-bus';
import { Vehicle } from '../types/models';
import { VehicleStatus } from '../types/events';

export class VehicleService {
  public static getAll(): Vehicle[] {
    return postgresCore.getVehicles();
  }

  public static getById(vehicleId: string): Vehicle | undefined {
    return postgresCore.getVehicleById(vehicleId);
  }

  public static async create(data: Omit<Vehicle, 'vehicleId' | 'createdAt' | 'updatedAt'>, userId?: string, correlationId?: string): Promise<Vehicle> {
    const vehicleId = generateUUID();
    const created = postgresCore.createVehicle({ ...data, vehicleId });

    // Emissão do evento oficial de auditoria para o MongoDB
    await integrationBus.emitAuditEvent({
      eventType: 'VEHICLE_CREATED',
      entityType: 'vehicle',
      entityId: created.vehicleId,
      userId: userId || null,
      previousValues: null,
      newValues: {
        vin: created.vin,
        make: created.make,
        model: created.model,
        year: created.year,
        price: created.price,
        status: created.status
      },
      correlationId: correlationId || null
    });

    return created;
  }

  public static async update(vehicleId: string, delta: Partial<Vehicle>, userId?: string, correlationId?: string): Promise<Vehicle> {
    const { previous, current } = postgresCore.updateVehicle(vehicleId, delta);

    // Calcular valores delta modificados
    const previousDelta: Record<string, unknown> = {};
    const newDelta: Record<string, unknown> = {};

    Object.keys(delta).forEach(k => {
      const key = k as keyof Vehicle;
      if (previous[key] !== current[key]) {
        previousDelta[key] = previous[key];
        newDelta[key] = current[key];
      }
    });

    if (Object.keys(newDelta).length > 0) {
      await integrationBus.emitAuditEvent({
        eventType: 'VEHICLE_UPDATED',
        entityType: 'vehicle',
        entityId: vehicleId,
        userId: userId || null,
        previousValues: previousDelta,
        newValues: newDelta,
        correlationId: correlationId || null
      });
    }

    return current;
  }

  public static async setStatus(vehicleId: string, status: VehicleStatus, userId?: string, correlationId?: string): Promise<Vehicle> {
    const { previous, current } = postgresCore.setVehicleStatus(vehicleId, status);

    if (previous.status !== current.status) {
      await integrationBus.emitAuditEvent({
        eventType: 'VEHICLE_STATUS_CHANGED',
        entityType: 'vehicle',
        entityId: vehicleId,
        userId: userId || null,
        previousValues: { status: previous.status },
        newValues: { status: current.status },
        correlationId: correlationId || null
      });
    }

    return current;
  }
}
