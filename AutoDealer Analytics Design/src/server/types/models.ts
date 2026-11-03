/**
 * AutoDealer Analytics — Modelos de Entidades Principais (PostgreSQL Core)
 * Conforme: docs/database-models/data-contract.md e docs/architecture/database-architecture.md
 */

import { VehicleStatus, AdvertisementStatus, LeadStatus, AppointmentStatus, SaleStatus } from './events';

export interface Vehicle {
  vehicleId: string; // UUID v4 (PostgreSQL primary key)
  vin: string;
  make: string;
  model: string;
  version?: string;
  year: number;
  modelYear?: number;
  price: number;
  mileageKm: number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Advertisement {
  advertisementId: string; // UUID v4
  vehicleId: string; // Foreign key to Vehicle.vehicleId
  title: string;
  description: string;
  price: number;
  promotionalPrice?: number | null;
  status: AdvertisementStatus;
  images: string[];
  isFeatured: boolean;
  isVisible: boolean;
  viewsCount?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface CustomerLead {
  leadId: string; // UUID v4
  customerName: string;
  email?: string;
  phone?: string;
  interestedVehicleId?: string | null;
  assignedUserId?: string | null;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  appointmentId: string; // UUID v4
  leadId?: string | null;
  customerName: string;
  vehicleId: string;
  assignedUserId?: string | null;
  scheduledTime: string;
  type: 'TEST_DRIVE' | 'VISIT' | 'DELIVERY';
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  saleId: string; // UUID v4
  vehicleId: string;
  advertisementId?: string | null;
  customerId: string;
  customerName: string;
  assignedUserId: string;
  saleAmount: number;
  paymentMethod: 'FINANCING' | 'CASH' | 'TRADE_IN' | 'CREDIT_CARD';
  status: SaleStatus;
  cancellationReason?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemUser {
  userId: string; // UUID v4
  name: string;
  email: string;
  role: 'ADMINISTRATOR' | 'COMMERCIAL' | 'ANALYST';
  status: 'ACTIVE' | 'INACTIVE';
  lastAccessAt?: string;
}
