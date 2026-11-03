/**
 * AutoDealer Analytics — Repositório Apache Cassandra (Eventos e Telemetria de Alto Volume)
 * Conforme: docs/architecture/database-architecture.md e docs/database-models/data-contract.md
 */

import { CassandraTelemetryEvent, CassandraEventType } from '../types/events';

class CassandraTelemetryRepository {
  private events: CassandraTelemetryEvent[] = [];

  constructor() {
    this.seedInitialTelemetry();
  }

  public getStatus() {
    return {
      service: 'Apache Cassandra',
      connected: true,
      role: 'Eventos de Alto Volume e Navegação',
      uptime: '99.72%',
      keyspace: 'autodealer_telemetry',
      totalTelemetryEvents: this.events.length,
      consistency: 'QUORUM'
    };
  }

  /**
   * Registra evento de atividade de alto volume (views, clicks, buscas, favoritos)
   */
  public logActivity(event: Omit<CassandraTelemetryEvent, 'event_id' | 'occurred_at'>): CassandraTelemetryEvent {
    const fullEvent: CassandraTelemetryEvent = {
      ...event,
      event_id: `cass-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      occurred_at: new Date().toISOString()
    };
    this.events.unshift(fullEvent);
    return fullEvent;
  }

  /**
   * Busca métricas agregadas de engajamento por anúncio
   */
  public getAdMetrics(advertisementId: string) {
    const views = this.events.filter(e => e.advertisement_id === advertisementId && e.event_type === 'ADVERTISEMENT_VIEWED').length;
    const clicks = this.events.filter(e => e.advertisement_id === advertisementId && e.event_type === 'ADVERTISEMENT_CLICKED').length;
    return {
      advertisementId,
      views,
      clicks,
      ctr: views > 0 ? ((clicks / views) * 100).toFixed(1) + '%' : '0%'
    };
  }

  /**
   * Retorna os eventos recentes de telemetria
   */
  public getRecentEvents(limit = 20): CassandraTelemetryEvent[] {
    return this.events.slice(0, limit);
  }

  private seedInitialTelemetry() {
    const sampleAdId = "c1111111-1111-4111-8111-111111111111";
    for (let i = 0; i < 35; i++) {
      this.events.push({
        event_id: `cass-seed-${i}`,
        event_type: i % 5 === 0 ? 'ADVERTISEMENT_CLICKED' : 'ADVERTISEMENT_VIEWED',
        occurred_at: new Date(Date.now() - i * 1800000).toISOString(),
        advertisement_id: sampleAdId,
        user_id: i % 2 === 0 ? 'user-anon-visitor' : 'a2222222-2222-4222-8222-222222222222'
      });
    }
  }
}

export const cassandraTelemetry = new CassandraTelemetryRepository();
