import type { FastifyInstance } from 'fastify';
import { postgres } from '../../database/postgresql';
import { isUuid } from '../catalog/catalog.shared';

type CustomerInput = { full_name?: string; email?: string | null; phone?: string | null; document_number?: string | null };
const ALLOWED = ['full_name', 'email', 'phone', 'document_number'] as const;
const LENGTHS: Record<(typeof ALLOWED)[number], number> = {
  full_name: 150, email: 255, phone: 30, document_number: 30,
};

function parseCustomer(input: unknown, creating: boolean): { data?: CustomerInput; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Envie um objeto JSON' };
  const object = input as Record<string, unknown>;
  const keys = Object.keys(object);
  if (!keys.length || keys.some(key => !ALLOWED.includes(key as (typeof ALLOWED)[number]))) {
    return { error: 'Campos permitidos: full_name, email, phone, document_number' };
  }
  if (creating && !keys.includes('full_name')) return { error: 'full_name é obrigatório' };
  const data: Record<string, string | null> = {};
  for (const key of keys) {
    const raw = object[key];
    if (raw === null && key !== 'full_name') { data[key] = null; continue; }
    if (typeof raw !== 'string' || raw.trim().length > LENGTHS[key as (typeof ALLOWED)[number]]) {
      return { error: `${key} inválido ou acima do tamanho máximo` };
    }
    const value = raw.trim();
    if (key === 'full_name' && !value) return { error: 'full_name não pode estar vazio' };
    if (key === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { error: 'email inválido' };
    data[key] = value || null;
  }
  return { data: data as CustomerInput };
}

function isConflict(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code);
}

export async function customerCrudRoutes(app: FastifyInstance): Promise<void> {
  app.get('/customers', async (request, reply) => {
    const q = request.query as Record<string, unknown>;
    if (Object.keys(q).some(key => !['limit', 'page', 'search'].includes(key))) return reply.code(400).send({ error: 'INVALID_QUERY' });
    const limit = q.limit ?? '20';
    const page = q.page ?? '1';
    if (typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit) || Number(limit) > 50 ||
        typeof page !== 'string' || !/^[1-9]\d*$/.test(page) || Number(page) > 100000) {
      return reply.code(400).send({ error: 'INVALID_PAGINATION' });
    }
    const search = q.search ?? '';
    if (typeof search !== 'string' || search.trim().length > 80) return reply.code(400).send({ error: 'INVALID_SEARCH' });
    const filter = search.trim() ? `%${search.trim().replace(/[\\%_]/g, '\\$&')}%` : null;
    const where = filter ? 'WHERE full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1' : '';
    const params = filter ? [filter] : [];
    const [count, records] = await Promise.all([
      postgres.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM public.customers ${where}`, params),
      postgres.query(`SELECT id, full_name, email, phone, document_number, created_at, updated_at FROM public.customers ${where}
        ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), (Number(page) - 1) * Number(limit)]),
    ]);
    const total = count.rows[0]?.total ?? 0;
    return { data: records.rows, pagination: {
      page: Number(page), limit: Number(limit), returned: records.rows.length,
      total, totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    } };
  });

  app.get<{ Params: { id: string } }>('/customers/:id', async (request, reply) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const result = await postgres.query('SELECT * FROM public.customers WHERE id = $1', [request.params.id]);
    if (!result.rows[0]) return reply.code(404).send({ error: 'NOT_FOUND' });
    return { data: result.rows[0] };
  });

  app.post('/customers', async (request, reply) => {
    const parsed = parseCustomer(request.body, true);
    if (!parsed.data) return reply.code(400).send({ error: 'INVALID_BODY', message: parsed.error });
    const { full_name, email, phone, document_number } = parsed.data;
    try {
      const result = await postgres.query(
        `INSERT INTO public.customers (full_name, email, phone, document_number)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [full_name, email ?? null, phone ?? null, document_number ?? null],
      );
      return reply.code(201).send({ data: result.rows[0] });
    } catch (error) {
      if (isConflict(error, '23505')) return reply.code(409).send({ error: 'DUPLICATE_CUSTOMER' });
      throw error;
    }
  });

  app.patch<{ Params: { id: string } }>('/customers/:id', async (request, reply) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error: 'INVALID_ID' });
    const parsed = parseCustomer(request.body, false);
    if (!parsed.data) return reply.code(400).send({ error: 'INVALID_BODY', message: parsed.error });
    const entries = Object.entries(parsed.data);
    const setters = entries.map(([key], i) => `${key} = $${i + 2}`);
    try {
      const result = await postgres.query(
        `UPDATE public.customers SET ${setters.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [request.params.id, ...entries.map(([, value]) => value)],
      );
      if (!result.rows[0]) return reply.code(404).send({ error: 'NOT_FOUND' });
      return { data: result.rows[0] };
    } catch (error) {
      if (isConflict(error, '23505')) return reply.code(409).send({ error: 'DUPLICATE_CUSTOMER' });
      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>('/customers/:id', async (request, reply) => {
    if (!isUuid(request.params.id)) return reply.code(400).send({ error: 'INVALID_ID' });
    try {
      const result = await postgres.query('DELETE FROM public.customers WHERE id = $1 RETURNING id', [request.params.id]);
      if (!result.rows[0]) return reply.code(404).send({ error: 'NOT_FOUND' });
      return reply.code(204).send();
    } catch (error) {
      if (isConflict(error, '23503')) return reply.code(409).send({ error: 'CUSTOMER_IN_USE', message: 'Cliente referenciado por outra operação' });
      throw error;
    }
  });
}
