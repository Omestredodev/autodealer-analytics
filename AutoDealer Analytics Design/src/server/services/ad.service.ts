/**
 * AutoDealer Analytics — Serviço de Anúncios com Auditoria (MongoDB) e Telemetria (Cassandra)
 */

import { postgresCore } from '../db/postgres';
import { integrationBus, generateUUID } from '../bus/integration-bus';
import { Advertisement } from '../types/models';
import { AdvertisementStatus } from '../types/events';

export class AdvertisementService {
  public static getAll(): Advertisement[] {
    return postgresCore.getAds();
  }

  public static getById(adId: string): Advertisement | undefined {
    return postgresCore.getAdById(adId);
  }

  public static async create(data: Omit<Advertisement, 'advertisementId' | 'createdAt' | 'updatedAt' | 'viewsCount'>, userId?: string): Promise<Advertisement> {
    const advertisementId = generateUUID();
    const created = postgresCore.createAd({ ...data, advertisementId });

    // Auditoria MongoDB: ADVERTISEMENT_CREATED
    await integrationBus.emitAuditEvent({
      eventType: 'ADVERTISEMENT_CREATED',
      entityType: 'advertisement',
      entityId: created.advertisementId,
      userId: userId || null,
      previousValues: null,
      newValues: {
        vehicleId: created.vehicleId,
        title: created.title,
        price: created.price,
        status: created.status
      }
    });

    return created;
  }

  public static async update(adId: string, delta: Partial<Advertisement>, userId?: string): Promise<Advertisement> {
    const { previous, current } = postgresCore.updateAd(adId, delta);

    const prevDelta: Record<string, unknown> = {};
    const newDelta: Record<string, unknown> = {};

    Object.keys(delta).forEach(k => {
      const key = k as keyof Advertisement;
      if (previous[key] !== current[key]) {
        prevDelta[key] = previous[key];
        newDelta[key] = current[key];
      }
    });

    if (Object.keys(newDelta).length > 0) {
      await integrationBus.emitAuditEvent({
        eventType: 'ADVERTISEMENT_UPDATED',
        entityType: 'advertisement',
        entityId: adId,
        userId: userId || null,
        previousValues: prevDelta,
        newValues: newDelta
      });
    }

    return current;
  }

  public static async changeStatus(adId: string, targetStatus: AdvertisementStatus, userId?: string, correlationId?: string): Promise<Advertisement> {
    const { previous, current } = postgresCore.setAdStatus(adId, targetStatus);

    let eventType: 'ADVERTISEMENT_PUBLISHED' | 'ADVERTISEMENT_PAUSED' | 'ADVERTISEMENT_ENDED' | null = null;
    if (targetStatus === 'PUBLISHED') eventType = 'ADVERTISEMENT_PUBLISHED';
    else if (targetStatus === 'PAUSED') eventType = 'ADVERTISEMENT_PAUSED';
    else if (targetStatus === 'ENDED') eventType = 'ADVERTISEMENT_ENDED';

    if (eventType) {
      await integrationBus.emitAuditEvent({
        eventType,
        entityType: 'advertisement',
        entityId: adId,
        userId: userId || null,
        previousValues: { status: previous.status },
        newValues: { status: current.status },
        correlationId: correlationId || null
      });
    }

    return current;
  }

  /**
   * Registra visualização de anúncio (encaminha para Cassandra)
   */
  public static recordView(adId: string, vehicleId?: string, userId?: string) {
    integrationBus.emitTelemetryEvent('ADVERTISEMENT_VIEWED', {
      advertisementId: adId,
      vehicleId,
      userId
    });
  }

  /**
   * Registra clique no anúncio (encaminha para Cassandra)
   */
  public static recordClick(adId: string, vehicleId?: string, userId?: string) {
    integrationBus.emitTelemetryEvent('ADVERTISEMENT_CLICKED', {
      advertisementId: adId,
      vehicleId,
      userId
    });
  }
}
