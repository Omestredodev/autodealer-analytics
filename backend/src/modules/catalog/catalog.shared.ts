/**
 * AutoDealer Analytics - catálogo público de veículos.
 * PostgreSQL é a fonte de verdade para veículos/anúncios.
 * Não expor placa, chassi (VIN) ou dados de usuários nos endpoints públicos.
 */

export const CURRENT_ADS_CTE = `
WITH current_ads AS (
  SELECT DISTINCT ON (a.vehicle_id)
    a.id,
    a.vehicle_id,
    a.title,
    a.description,
    a.price,
    a.published_at,
    a.created_at AS advertisement_created_at
  FROM public.advertisements AS a
  WHERE a.status = 'PUBLISHED'
  ORDER BY a.vehicle_id,
           a.published_at DESC NULLS LAST,
           a.created_at DESC,
           a.id DESC
)
`;

export const PUBLIC_FROM = `
FROM public.vehicles AS v
INNER JOIN current_ads AS a ON a.vehicle_id = v.id
`;

export type SortKey = 'recent' | 'price_asc' | 'price_desc' | 'year_desc' | 'mileage_asc';

const ORDER_BY: Record<SortKey, string> = {
  recent: 'a.published_at DESC NULLS LAST, a.advertisement_created_at DESC, v.id DESC',
  price_asc: 'a.price ASC, v.id ASC',
  price_desc: 'a.price DESC, v.id DESC',
  year_desc: 'v.model_year DESC, v.id DESC',
  mileage_asc: 'v.mileage ASC NULLS LAST, v.id DESC',
};

const ALLOWED_KEYS = new Set([
  'page', 'limit', 'sort', 'make', 'model', 'search',
  'minPrice', 'maxPrice', 'minYear', 'maxYear',
]);

export type CatalogQuery = {
  page: number;
  limit: number;
  sort: SortKey;
  where: string;
  params: Array<string | number>;
};

export type ParseResult =
  | { ok: true; query: CatalogQuery }
  | { ok: false; message: string };

const fail = (message: string): ParseResult => ({ ok: false, message });

function scalar(raw: Record<string, unknown>, key: string): string | undefined | null {
  const value = raw[key];
  if (value === undefined) return undefined;
  return typeof value === 'string' ? value.trim() : null;
}

function positiveInteger(value: string | undefined | null, fallback: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (value === null || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= max ? parsed : null;
}

function nonnegativeMoney(value: string | undefined | null): string | undefined | null {
  if (value === undefined) return undefined;
  if (value === null || !/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed > 1_000_000_000_000) return null;
  return value;
}

function yearNumber(value: string | undefined | null): number | undefined | null {
  if (value === undefined) return undefined;
  if (value === null || !/^\d{4}$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= 1886 && parsed <= 2100 ? parsed : null;
}

export function parseCatalogQuery(input: unknown): ParseResult {
  const raw: Record<string, unknown> =
    input && typeof input === 'object' && !Array.isArray(input)
      ? input as Record<string, unknown>
      : {};

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) return fail(`Parâmetro desconhecido: ${key}`);
  }

  const page = positiveInteger(scalar(raw, 'page'), 1, 100_000);
  const limit = positiveInteger(scalar(raw, 'limit'), 20, 100);
  if (page === null) return fail('page deve ser inteiro entre 1 e 100000');
  if (limit === null) return fail('limit deve ser inteiro entre 1 e 100');

  const sortParam = scalar(raw, 'sort');
  if (sortParam === null) return fail('sort deve ser um texto válido');
  const requestedSort = sortParam ?? 'recent';
  if (!Object.prototype.hasOwnProperty.call(ORDER_BY, requestedSort)) {
    return fail('sort deve ser recent, price_asc, price_desc, year_desc ou mileage_asc');
  }
  const sort = requestedSort as SortKey;

  const make = scalar(raw, 'make');
  const model = scalar(raw, 'model');
  const search = scalar(raw, 'search');
  for (const [key, value] of [['make', make], ['model', model], ['search', search]] as const) {
    if (value === null || (value !== undefined && (value.length === 0 || value.length > 80))) {
      return fail(`${key} deve ter entre 1 e 80 caracteres`);
    }
  }

  const minPrice = nonnegativeMoney(scalar(raw, 'minPrice'));
  const maxPrice = nonnegativeMoney(scalar(raw, 'maxPrice'));
  if (minPrice === null || maxPrice === null) {
    return fail('minPrice e maxPrice devem ser valores não negativos, com até 2 casas decimais e ponto decimal');
  }
  if (minPrice !== undefined && maxPrice !== undefined && Number(minPrice) > Number(maxPrice)) {
    return fail('minPrice não pode ser maior que maxPrice');
  }

  const minYear = yearNumber(scalar(raw, 'minYear'));
  const maxYear = yearNumber(scalar(raw, 'maxYear'));
  if (minYear === null || maxYear === null) {
    return fail('minYear e maxYear devem ser anos entre 1886 e 2100');
  }
  if (minYear !== undefined && maxYear !== undefined && minYear > maxYear) {
    return fail('minYear não pode ser maior que maxYear');
  }

  const conditions = ["v.status = 'AVAILABLE'"];
  const params: Array<string | number> = [];
  const add = (sql: (slot: string) => string, value: string | number) => {
    params.push(value);
    conditions.push(sql(`$${params.length}`));
  };

  if (make != null) add(slot => `v.make ILIKE ${slot}`, make);
  if (model != null) add(slot => `v.model ILIKE ${slot}`, model);
  if (search != null) {
    add(slot => `CONCAT_WS(' ', v.make, v.model, v.version, a.title) ILIKE ${slot}`,
      `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  }
  if (minPrice !== undefined) add(slot => `a.price >= ${slot}::numeric`, minPrice);
  if (maxPrice !== undefined) add(slot => `a.price <= ${slot}::numeric`, maxPrice);
  if (minYear !== undefined) add(slot => `v.model_year >= ${slot}`, minYear);
  if (maxYear !== undefined) add(slot => `v.model_year <= ${slot}`, maxYear);

  return {
    ok: true,
    query: { page, limit, sort, where: `WHERE ${conditions.join(' AND ')}`, params },
  };
}

export function getOrderBy(sort: SortKey): string {
  return ORDER_BY[sort];
}

export function pagination(page: number, limit: number, total: number, returned: number) {
  return {
    page,
    limit,
    returned,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}
