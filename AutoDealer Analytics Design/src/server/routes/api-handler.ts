/**
 * AutoDealer Analytics — Roteador de Endpoints REST Full-Stack
 * Executa as operações contra MongoDB, PostgreSQL e Cassandra.
 */

import { mongoAudit } from '../db/mongo';
import { integrationBus } from '../bus/integration-bus';
import { VehicleService } from '../services/vehicle.service';
import { AdvertisementService } from '../services/ad.service';
import { SaleService } from '../services/sale.service';
import { AuditEventType, EntityType, AdvertisementStatus, VehicleStatus } from '../types/events';

export interface ApiRequest {
  method: string;
  url: string;
  body?: any;
  query?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  data: any;
  headers?: Record<string, string>;
}

export async function handleApiRequest(req: ApiRequest): Promise<ApiResponse> {
  const urlObj = new URL(req.url, 'http://localhost');
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  try {
    // 1. Health & Tri-Database Architecture
    if (pathname === '/api/system/health' && req.method === 'GET') {
      return { status: 200, data: integrationBus.getSystemArchitectureStatus() };
    }

    // 2. AUDITORIA MONGODB: Consultar eventos
    if (pathname === '/api/audit/events' && req.method === 'GET') {
      const filters = {
        entityType: (searchParams.get('entityType') as EntityType) || undefined,
        entityId: searchParams.get('entityId') || undefined,
        eventType: (searchParams.get('eventType') as AuditEventType) || undefined,
        userId: searchParams.get('userId') || undefined,
        correlationId: searchParams.get('correlationId') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
      };
      const events = await mongoAudit.queryEvents(filters);
      return { status: 200, data: events };
    }

    // 3. AUDITORIA MONGODB: Gravar evento diretamente (Idempotente)
    if (pathname === '/api/audit/events' && req.method === 'POST') {
      const result = await mongoAudit.recordAuditEvent(req.body);
      return { status: 201, data: result };
    }

    // 4. AUDITORIA MONGODB: Sumário volumétrico e entidades mais modificadas
    if (pathname === '/api/audit/summary' && req.method === 'GET') {
      const [volumeSummary, mostModified] = await Promise.all([
        mongoAudit.getAuditEventVolumeSummary(),
        mongoAudit.getMostModifiedEntities(10)
      ]);
      return { status: 200, data: { volumeSummary, mostModified } };
    }

    // 5. VEÍCULOS (PostgreSQL Core com auditoria automática no MongoDB)
    if (pathname === '/api/vehicles' && req.method === 'GET') {
      const vehicles = VehicleService.getAll();
      return { status: 200, data: vehicles };
    }

    if (pathname === '/api/vehicles' && req.method === 'POST') {
      const vehicle = await VehicleService.create(req.body.vehicle, req.body.userId, req.body.correlationId);
      return { status: 201, data: vehicle };
    }

    if (pathname.startsWith('/api/vehicles/') && req.method === 'PATCH') {
      const id = pathname.replace('/api/vehicles/', '');
      if (req.body.status) {
        const updated = await VehicleService.setStatus(id, req.body.status as VehicleStatus, req.body.userId, req.body.correlationId);
        return { status: 200, data: updated };
      }
      const updated = await VehicleService.update(id, req.body.delta, req.body.userId, req.body.correlationId);
      return { status: 200, data: updated };
    }

    // 6. ANÚNCIOS (PostgreSQL + MongoDB Audit + Cassandra Views)
    if (pathname === '/api/ads' && req.method === 'GET') {
      const ads = AdvertisementService.getAll();
      return { status: 200, data: ads };
    }

    if (pathname === '/api/ads' && req.method === 'POST') {
      const ad = await AdvertisementService.create(req.body.ad, req.body.userId);
      return { status: 201, data: ad };
    }

    if (pathname.includes('/status') && pathname.startsWith('/api/ads/') && req.method === 'PATCH') {
      const id = pathname.split('/')[3];
      const updated = await AdvertisementService.changeStatus(id, req.body.status as AdvertisementStatus, req.body.userId, req.body.correlationId);
      return { status: 200, data: updated };
    }

    // 7. TELEMETRIA CASSANDRA
    if (pathname === '/api/telemetry/ad-view' && req.method === 'POST') {
      AdvertisementService.recordView(req.body.adId, req.body.vehicleId, req.body.userId);
      return { status: 200, data: { ok: true } };
    }

    // 8. VENDAS
    if (pathname === '/api/sales' && req.method === 'GET') {
      return { status: 200, data: SaleService.getAll() };
    }

    if (pathname.endsWith('/complete') && pathname.startsWith('/api/sales/') && req.method === 'POST') {
      const id = pathname.split('/')[3];
      const completed = await SaleService.completeSale(id, req.body.finalAmount, req.body.paymentMethod, req.body.userId, req.body.correlationId);
      return { status: 200, data: completed };
    }

    if (pathname.endsWith('/cancel') && pathname.startsWith('/api/sales/') && req.method === 'POST') {
      const id = pathname.split('/')[3];
      const cancelled = await SaleService.cancelSale(id, req.body.reason, req.body.userId, req.body.correlationId);
      return { status: 200, data: cancelled };
    }

    return { status: 404, data: { error: `Endpoint não encontrado: ${req.method} ${pathname}` } };
  } catch (err: any) {
    console.error('[API Error]:', err);
    return { status: 500, data: { error: err.message || 'Erro interno no servidor' } };
  }
}
