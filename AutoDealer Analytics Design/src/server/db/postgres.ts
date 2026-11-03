/**
 * AutoDealer Analytics — Repositório PostgreSQL Core (Fonte Oficial Transacional)
 * Conforme: docs/architecture/database-architecture.md e docs/database-models/data-contract.md
 */

import { Vehicle, Advertisement, CustomerLead, Appointment, Sale, SystemUser } from '../types/models';
import { VehicleStatus, AdvertisementStatus, LeadStatus, AppointmentStatus, SaleStatus } from '../types/events';

class PostgresCoreRepository {
  public vehicles: Map<string, Vehicle> = new Map();
  public ads: Map<string, Advertisement> = new Map();
  public leads: Map<string, CustomerLead> = new Map();
  public appointments: Map<string, Appointment> = new Map();
  public sales: Map<string, Sale> = new Map();
  public users: Map<string, SystemUser> = new Map();

  constructor() {
    this.seedInitialData();
  }

  public getStatus() {
    return {
      service: 'PostgreSQL Core',
      connected: true,
      role: 'Fonte Oficial Transacional',
      uptime: '99.98%',
      isolationLevel: 'READ COMMITTED',
      counts: {
        vehicles: this.vehicles.size,
        advertisements: this.ads.size,
        leads: this.leads.size,
        appointments: this.appointments.size,
        sales: this.sales.size
      }
    };
  }

  // --- VEÍCULOS ---
  public getVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getVehicleById(vehicleId: string): Vehicle | undefined {
    return this.vehicles.get(vehicleId);
  }

  public createVehicle(vehicle: Omit<Vehicle, 'createdAt' | 'updatedAt'>): Vehicle {
    const now = new Date().toISOString();
    const created: Vehicle = {
      ...vehicle,
      createdAt: now,
      updatedAt: now
    };
    this.vehicles.set(created.vehicleId, created);
    return created;
  }

  public updateVehicle(vehicleId: string, delta: Partial<Vehicle>): { previous: Vehicle; current: Vehicle } {
    const existing = this.vehicles.get(vehicleId);
    if (!existing) throw new Error(`Veículo ${vehicleId} não encontrado no PostgreSQL.`);
    
    const previous = { ...existing };
    const current: Vehicle = {
      ...existing,
      ...delta,
      updatedAt: new Date().toISOString()
    };
    this.vehicles.set(vehicleId, current);
    return { previous, current };
  }

  public setVehicleStatus(vehicleId: string, status: VehicleStatus): { previous: Vehicle; current: Vehicle } {
    return this.updateVehicle(vehicleId, { status });
  }

  // --- ANÚNCIOS ---
  public getAds(): Advertisement[] {
    return Array.from(this.ads.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getAdById(adId: string): Advertisement | undefined {
    return this.ads.get(adId);
  }

  public createAd(ad: Omit<Advertisement, 'createdAt' | 'updatedAt' | 'viewsCount'>): Advertisement {
    const now = new Date().toISOString();
    const created: Advertisement = {
      ...ad,
      viewsCount: 0,
      createdAt: now,
      updatedAt: now
    };
    this.ads.set(created.advertisementId, created);
    return created;
  }

  public updateAd(adId: string, delta: Partial<Advertisement>): { previous: Advertisement; current: Advertisement } {
    const existing = this.ads.get(adId);
    if (!existing) throw new Error(`Anúncio ${adId} não encontrado no PostgreSQL.`);

    const previous = { ...existing };
    const current: Advertisement = {
      ...existing,
      ...delta,
      updatedAt: new Date().toISOString()
    };
    this.ads.set(adId, current);
    return { previous, current };
  }

  public setAdStatus(adId: string, status: AdvertisementStatus): { previous: Advertisement; current: Advertisement } {
    const patch: Partial<Advertisement> = { status };
    if (status === 'PUBLISHED' && !this.ads.get(adId)?.publishedAt) {
      patch.publishedAt = new Date().toISOString();
    }
    return this.updateAd(adId, patch);
  }

  // --- LEADS ---
  public getLeads(): CustomerLead[] {
    return Array.from(this.leads.values());
  }

  public setLeadStatus(leadId: string, status: LeadStatus): { previous: CustomerLead; current: CustomerLead } {
    const existing = this.leads.get(leadId);
    if (!existing) throw new Error(`Lead ${leadId} não encontrado no PostgreSQL.`);
    const previous = { ...existing };
    const current: CustomerLead = { ...existing, status, updatedAt: new Date().toISOString() };
    this.leads.set(leadId, current);
    return { previous, current };
  }

  // --- AGENDAMENTOS ---
  public getAppointments(): Appointment[] {
    return Array.from(this.appointments.values());
  }

  public setAppointmentStatus(aptId: string, status: AppointmentStatus): { previous: Appointment; current: Appointment } {
    const existing = this.appointments.get(aptId);
    if (!existing) throw new Error(`Agendamento ${aptId} não encontrado.`);
    const previous = { ...existing };
    const current: Appointment = { ...existing, status, updatedAt: new Date().toISOString() };
    this.appointments.set(aptId, current);
    return { previous, current };
  }

  // --- VENDAS ---
  public getSales(): Sale[] {
    return Array.from(this.sales.values());
  }

  public completeSale(saleId: string, finalAmount: number, paymentMethod: Sale['paymentMethod']): { previous: Sale; current: Sale } {
    const existing = this.sales.get(saleId);
    if (!existing) throw new Error(`Venda ${saleId} não encontrada.`);
    const previous = { ...existing };
    const current: Sale = {
      ...existing,
      saleAmount: finalAmount,
      paymentMethod,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.sales.set(saleId, current);
    return { previous, current };
  }

  public cancelSale(saleId: string, reason: string): { previous: Sale; current: Sale } {
    const existing = this.sales.get(saleId);
    if (!existing) throw new Error(`Venda ${saleId} não encontrada.`);
    const previous = { ...existing };
    const current: Sale = {
      ...existing,
      status: 'CANCELLED',
      cancellationReason: reason,
      updatedAt: new Date().toISOString()
    };
    this.sales.set(saleId, current);
    return { previous, current };
  }

  private seedInitialData() {
    // Veículos
    const v1: Vehicle = {
      vehicleId: "b1111111-1111-4111-8111-111111111111",
      vin: "9BRBL42E5P100001",
      make: "Jeep",
      model: "Compass",
      version: "Longitude TD350",
      year: 2024,
      modelYear: 2024,
      price: 159900,
      mileageKm: 8200,
      fuelType: "Diesel",
      transmission: "Automático",
      color: "Azul Jazz",
      status: "AVAILABLE",
      createdAt: "2026-10-15T09:00:00Z",
      updatedAt: "2026-10-15T09:00:00Z"
    };
    const v2: Vehicle = {
      vehicleId: "b2222222-2222-4222-8222-222222222222",
      vin: "9BRBL42E5P100002",
      make: "BMW",
      model: "X6",
      version: "M Sport",
      year: 2023,
      modelYear: 2023,
      price: 689900,
      mileageKm: 12400,
      fuelType: "Gasolina",
      transmission: "Automático",
      color: "Preto Sapphire",
      status: "RESERVED",
      createdAt: "2026-10-16T10:00:00Z",
      updatedAt: "2026-10-16T10:00:00Z"
    };
    const v3: Vehicle = {
      vehicleId: "b3333333-3333-4333-8333-333333333333",
      vin: "9BRBL42E5P100003",
      make: "Porsche",
      model: "718 Cayman",
      version: "PDK",
      year: 2024,
      modelYear: 2024,
      price: 599900,
      mileageKm: 3100,
      fuelType: "Gasolina",
      transmission: "Automático",
      color: "Amarelo Racing",
      status: "AVAILABLE",
      createdAt: "2026-10-17T11:00:00Z",
      updatedAt: "2026-10-17T11:00:00Z"
    };
    const v4: Vehicle = {
      vehicleId: "b4444444-4444-4444-8444-444444444444",
      vin: "9BRBL42E5P100004",
      make: "Audi",
      model: "Q5",
      version: "Performance Black",
      year: 2023,
      modelYear: 2023,
      price: 319900,
      mileageKm: 18700,
      fuelType: "Híbrido",
      transmission: "Automático",
      color: "Cinza Daytona",
      status: "SOLD",
      createdAt: "2026-10-18T14:00:00Z",
      updatedAt: "2026-10-20T11:31:00Z"
    };

    [v1, v2, v3, v4].forEach(v => this.vehicles.set(v.vehicleId, v));

    // Anúncios
    const ad1: Advertisement = {
      advertisementId: "c1111111-1111-4111-8111-111111111111",
      vehicleId: v1.vehicleId,
      title: "Jeep Compass Longitude 2024 — baixa quilometragem",
      description: "Veículo único dono, revisões em concessionária, garantia de fábrica até 2027.",
      price: 159900,
      status: "PUBLISHED",
      images: ["https://images.unsplash.com/photo-1611168935847-4bf3f7291cde?auto=format&fit=crop&w=900&q=85"],
      isFeatured: true,
      isVisible: true,
      viewsCount: 1284,
      createdAt: "2026-10-17T10:00:00Z",
      updatedAt: "2026-10-24T14:32:00Z",
      publishedAt: "2026-10-17T11:30:00Z"
    };
    const ad2: Advertisement = {
      advertisementId: "c2222222-2222-4222-8222-222222222222",
      vehicleId: v2.vehicleId,
      title: "BMW X6 M Sport — performance e exclusividade",
      description: "Configuração topo de linha, teto solar panorâmico, som Harman Kardon.",
      price: 689900,
      status: "DRAFT",
      images: ["https://images.unsplash.com/photo-1763165562062-91d744691c65?auto=format&fit=crop&w=900&q=85"],
      isFeatured: false,
      isVisible: true,
      viewsCount: 0,
      createdAt: "2026-10-24T10:08:00Z",
      updatedAt: "2026-10-24T10:08:00Z"
    };
    const ad3: Advertisement = {
      advertisementId: "c3333333-3333-4333-8333-333333333333",
      vehicleId: v3.vehicleId,
      title: "Porsche 718 Cayman 2024 — pronta entrega",
      description: "Exemplar em estado de zero km, pacote Sport Chrono.",
      price: 599900,
      status: "PAUSED",
      images: ["https://images.unsplash.com/photo-1763165561886-a9391b2132c1?auto=format&fit=crop&w=900&q=85"],
      isFeatured: true,
      isVisible: true,
      viewsCount: 986,
      createdAt: "2026-10-20T17:00:00Z",
      updatedAt: "2026-10-23T17:45:00Z"
    };

    [ad1, ad2, ad3].forEach(ad => this.ads.set(ad.advertisementId, ad));

    // Usuários
    this.users.set("a1111111-1111-4111-8111-111111111111", {
      userId: "a1111111-1111-4111-8111-111111111111",
      name: "Marina Souza",
      email: "marina@autodealer.com.br",
      role: "ADMINISTRATOR",
      status: "ACTIVE",
      lastAccessAt: "Hoje, 14:32"
    });
    this.users.set("a2222222-2222-4222-8222-222222222222", {
      userId: "a2222222-2222-4222-8222-222222222222",
      name: "João Costa",
      email: "joao@autodealer.com.br",
      role: "COMMERCIAL",
      status: "ACTIVE",
      lastAccessAt: "Hoje, 13:08"
    });
  }
}

export const postgresCore = new PostgresCoreRepository();
