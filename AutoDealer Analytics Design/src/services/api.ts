/**
 * AutoDealer Analytics — Cliente de API Full-Stack
 * Comunica com o backend TypeScript e integra com o MongoDB
 */

import { handleApiRequest } from '../server/routes/api-handler';
import { AuditEventDocument, AuditEventType, EntityType, VehicleStatus, AdvertisementStatus } from '../server/types/events';
import { Vehicle, Advertisement } from '../server/types/models';

class ApiClient {
  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    // 1. Tentar requisição HTTP real
    try {
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'AutoDealer-Client'
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback local se o servidor HTTP externo não estiver ativo
    }

    // 2. Execução in-process do backend TypeScript
    const result = await handleApiRequest({
      method,
      url: path,
      body
    });

    if (result.status >= 400) {
      throw new Error(result.data?.error || `Erro ${result.status} na requisição`);
    }

    return result.data as T;
  }

  // --- AUDITORIA MONGODB ---
  public async getAuditEvents(filters?: { entityType?: EntityType; entityId?: string; eventType?: AuditEventType; limit?: number }): Promise<AuditEventDocument[]> {
    const params = new URLSearchParams();
    if (filters?.entityType) params.set('entityType', filters.entityType);
    if (filters?.entityId) params.set('entityId', filters.entityId);
    if (filters?.eventType) params.set('eventType', filters.eventType);
    if (filters?.limit) params.set('limit', filters.limit.toString());

    const qs = params.toString();
    return this.request<AuditEventDocument[]>('GET', `/api/audit/events${qs ? `?${qs}` : ''}`);
  }

  public async recordAuditEvent(event: AuditEventDocument): Promise<{ status: string; eventId: string }> {
    return this.request('POST', '/api/audit/events', event);
  }

  public async getAuditSummary(): Promise<{ volumeSummary: any[]; mostModified: any[] }> {
    return this.request('GET', '/api/audit/summary');
  }

  // --- SISTEMA E DISPONIBILIDADE TRI-BANCO ---
  public async getSystemHealth(): Promise<any> {
    return this.request('GET', '/api/system/health');
  }

  // --- VEÍCULOS ---
  public async getVehicles(): Promise<Vehicle[]> {
    return this.request<Vehicle[]>('GET', '/api/vehicles');
  }

  public async createVehicle(vehicle: Omit<Vehicle, 'vehicleId' | 'createdAt' | 'updatedAt'>, userId?: string): Promise<Vehicle> {
    return this.request<Vehicle>('POST', '/api/vehicles', { vehicle, userId });
  }

  public async setVehicleStatus(vehicleId: string, status: VehicleStatus, userId?: string): Promise<Vehicle> {
    return this.request<Vehicle>('PATCH', `/api/vehicles/${vehicleId}`, { status, userId });
  }

  // --- ANÚNCIOS ---
  public async getAds(): Promise<Advertisement[]> {
    return this.request<Advertisement[]>('GET', '/api/ads');
  }

  public async createAd(ad: Omit<Advertisement, 'advertisementId' | 'createdAt' | 'updatedAt' | 'viewsCount'>, userId?: string): Promise<Advertisement> {
    return this.request<Advertisement>('POST', '/api/ads', { ad, userId });
  }

  public async changeAdStatus(adId: string, status: AdvertisementStatus, userId?: string): Promise<Advertisement> {
    return this.request<Advertisement>('PATCH', `/api/ads/${adId}/status`, { status, userId });
  }

  // --- TELEMETRIA CASSANDRA ---
  public async trackAdView(adId: string, vehicleId?: string, userId?: string): Promise<void> {
    await this.request('POST', '/api/telemetry/ad-view', { adId, vehicleId, userId });
  }

  // --- VENDAS ---
  public async completeSale(saleId: string, finalAmount: number, paymentMethod: any, userId?: string): Promise<any> {
    return this.request('POST', `/api/sales/${saleId}/complete`, { finalAmount, paymentMethod, userId });
  }

  public async cancelSale(saleId: string, reason: string, userId?: string): Promise<any> {
    return this.request('POST', `/api/sales/${saleId}/cancel`, { reason, userId });
  }
}

export const api = new ApiClient();
