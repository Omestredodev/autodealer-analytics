import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';
import { deliverAuditBatch, enqueueAudit } from '../operations/audit-outbox';

type Input = Record<string, unknown>;
type VehicleCreated = {
  id: string;
  make: string;
  model: string;
  version: string | null;
  manufacturing_year: number;
  model_year: number;
  status: string;
  specification_verified: boolean;
};

const catalogKeys = new Set(['catalogId', 'mileage', 'color', 'licensePlate', 'vin']);
const manualKeys = new Set(['make', 'model', 'version', 'manufacturingYear', 'modelYear', 'mileage', 'color', 'licensePlate', 'vin']);

function asObject(input: unknown): Input | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  return input as Input;
}
function textField(input: unknown, max: number, required: boolean): string | null | undefined {
  if (input === undefined || input === null || input === '') return required ? undefined : null;
  if (typeof input !== 'string') return undefined;
  const value = input.trim();
  if (!value || value.length > max) return required ? undefined : (value ? undefined : null);
  return value;
}
function wholeNumber(input: unknown, min: number, max: number): number | null {
  if (typeof input !== 'number' || !Number.isInteger(input) || input < min || input > max) return null;
  return input;
}

type Parsed = {
  catalogId: string | null;
  make: string | null;
  model: string | null;
  version: string | null;
  manufacturingYear: number | null;
  modelYear: number | null;
  mileage: number;
  color: string | null;
  licensePlate: string | null;
  vin: string | null;
};
function parseVehicle(input: unknown): { data?: Parsed; error?: string } {
  const obj = asObject(input);
  if (!obj) return { error: 'Envie um objeto JSON' };
  const withCatalog = obj.catalogId !== undefined;
  const accepted = withCatalog ? catalogKeys : manualKeys;
  if (Object.keys(obj).some(k => !accepted.has(k))) return { error: 'Campos inesperados para o tipo de cadastro' };
  if (withCatalog && (typeof obj.catalogId !== 'string' || !isUuid(obj.catalogId))) {
    return { error: 'catalogId deve ser UUID válido' };
  }
  const mileage = wholeNumber(obj.mileage, 0, 2147483647);
  if (mileage === null) return { error: 'mileage deve ser inteiro não negativo' };
  const color = textField(obj.color, 50, false);
  const licensePlate = textField(obj.licensePlate, 10, false);
  const vin = textField(obj.vin, 30, false);
  if (color === undefined || licensePlate === undefined || vin === undefined) {
    return { error: 'color, licensePlate ou vin inválido' };
  }
  if (vin && !/^[A-HJ-NPR-Z0-9]{8,30}$/i.test(vin)) {
    return { error: 'vin deve conter somente letras e números, com 8 a 30 caracteres' };
  }
  let make: string | null = null, model: string | null = null, version: string | null = null;
  let manufacturingYear: number | null = null, modelYear: number | null = null;
  if (!withCatalog) {
    const m = textField(obj.make, 80, true), mo = textField(obj.model, 100, true);
    const v = textField(obj.version, 100, false);
    const fy = wholeNumber(obj.manufacturingYear, 1900, 2100);
    const my = wholeNumber(obj.modelYear, 1900, 2100);
    if (!m || !mo || v === undefined || fy === null || my === null) {
      return { error: 'Informe marca, modelo e anos de fabricação/modelo válidos' };
    }
    make = m; model = mo; version = v; manufacturingYear = fy; modelYear = my;
  }
  return {
    data: {
      catalogId: withCatalog ? obj.catalogId as string : null,
      make, model, version, manufacturingYear, modelYear,
      mileage, color, licensePlate: licensePlate?.toUpperCase() ?? null,
      vin: vin?.toUpperCase() ?? null,
    },
  };
}

export async function vehicleRegistrationRoutes(app: FastifyInstance): Promise<void> {
  /** Catálogo de configurações técnicas já existentes, sem criar especificações fictícias. */
  app.get('/stock/vehicle-catalog', async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    if (Object.keys(raw).some(k => !['search', 'limit'].includes(k))) return reply.code(400).send({ error: 'INVALID_QUERY' });
    const search = raw.search ?? '';
    const limit = raw.limit ?? '25';
    if (typeof search !== 'string' || search.length > 80 || typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit) || Number(limit) > 50) {
      return reply.code(400).send({ error: 'INVALID_QUERY' });
    }
    const filter = search.trim() ? `%${search.trim().replace(/[\\%_]/g, '\\$&')}%` : null;
    const result = await postgres.query(
      `SELECT id, make, model, version, manufacturing_year, model_year, engine, fuel_type, transmission,
              specification_source, specification_verified
       FROM public.vehicle_catalog
       WHERE ($1::text IS NULL OR CONCAT_WS(' ',make,model,version,manufacturing_year::text,model_year::text) ILIKE $1)
       ORDER BY make,model,version,model_year DESC LIMIT $2`, [filter, Number(limit)],
    );
    return { data: result.rows, returned: result.rows.length };
  });

  /** Somente veículos disponíveis que ainda não possuem anúncio publicado. */
  app.get('/stock/advertisable-vehicles', async (request, reply) => {
    const raw = request.query as Record<string, unknown>;
    if (Object.keys(raw).some(k => !['search', 'limit'].includes(k))) return reply.code(400).send({ error: 'INVALID_QUERY' });
    const search = raw.search ?? '', limit = raw.limit ?? '25';
    if (typeof search !== 'string' || search.length > 80 || typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit) || Number(limit) > 50) {
      return reply.code(400).send({ error: 'INVALID_QUERY' });
    }
    const filter = search.trim() ? `%${search.trim().replace(/[\\%_]/g, '\\$&')}%` : null;
    const result = await postgres.query(
      `SELECT v.id,v.make,v.model,v.version,v.model_year,v.mileage,v.status,0::int AS published_ads
       FROM public.vehicles v
       WHERE v.status='AVAILABLE'
         AND NOT EXISTS (SELECT 1 FROM public.advertisements a WHERE a.vehicle_id=v.id AND a.status='PUBLISHED')
         AND ($1::text IS NULL OR CONCAT_WS(' ',v.make,v.model,v.version,v.vin,v.id::text) ILIKE $1)
       ORDER BY v.created_at DESC,v.id DESC LIMIT $2`, [filter, Number(limit)],
    );
    return { data: result.rows, returned: result.rows.length };
  });

  /** Cadastra uma unidade em estoque sem anúncio. O preço pertence ao anúncio, não ao veículo. */
  app.post('/stock/vehicles', async (request, reply) => {
    const parsed = parseVehicle(request.body);
    if (!parsed.data) return reply.code(400).send({ error: 'INVALID_BODY', message: parsed.error });
    const b = parsed.data;
    const client = await postgres.connect();
    try {
      await client.query('BEGIN');
      const result = b.catalogId
        ? await client.query<VehicleCreated>(
          `INSERT INTO public.vehicles (
              catalog_id,make,model,version,manufacturing_year,model_year,
              color,mileage,license_plate,vin,
              engine,engine_displacement_cc,engine_cylinders,engine_power_cv,engine_torque_nm,
              fuel_type,propulsion_type,transmission,specification_source,specification_verified,status
            )
            SELECT id,make,model,version,manufacturing_year,model_year,
              $2::varchar(50),$3::integer,$4::varchar(10),$5::varchar(30),
              engine,engine_displacement_cc,engine_cylinders,engine_power_cv,engine_torque_nm,
              fuel_type,propulsion_type,transmission,specification_source,specification_verified,'AVAILABLE'
            FROM public.vehicle_catalog WHERE id=$1
            RETURNING id,make,model,version,manufacturing_year,model_year,status,specification_verified`,
          [b.catalogId, b.color, b.mileage, b.licensePlate, b.vin],
        )
        : await client.query<VehicleCreated>(
          `INSERT INTO public.vehicles (
             make,model,version,manufacturing_year,model_year,
             color,mileage,license_plate,vin,status,specification_verified
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'AVAILABLE',FALSE)
           RETURNING id,make,model,version,manufacturing_year,model_year,status,specification_verified`,
          [b.make, b.model, b.version, b.manufacturingYear, b.modelYear,
            b.color, b.mileage, b.licensePlate, b.vin],
        );
      const vehicle = result.rows[0];
      if (!vehicle) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ error: 'CATALOG_NOT_FOUND', message: 'Configuração técnica não encontrada' });
      }
      const eventId = await enqueueAudit(client, {
        eventType: 'VEHICLE_CREATED', entityType: 'vehicle', entityId: vehicle.id,
        previousValues: {},
        newValues: {
          make: vehicle.make, model: vehicle.model, version: vehicle.version,
          modelYear: vehicle.model_year, status: 'AVAILABLE',
          specificationVerified: vehicle.specification_verified,
        },
        correlationId: randomUUID(),
      });
      await client.query('COMMIT');
      const audit = await deliverAuditBatch([eventId]);
      return reply.code(201).send({ data: vehicle, audit });
    } catch (error: unknown) {
      await client.query('ROLLBACK').catch(() => {});
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        return reply.code(409).send({ error: 'DUPLICATE_VIN', message: 'Chassi já cadastrado' });
      }
      throw error;
    } finally {
      client.release();
    }
  });
}
