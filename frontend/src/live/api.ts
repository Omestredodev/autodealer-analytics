export type ApiRow = Record<string, unknown>

export interface Pagination {
  page: number
  limit: number
  returned: number
  total: number
  totalPages: number
}
export interface ApiList<T = ApiRow> {
  data: T[]
  pagination?: Pagination
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    let details = raw
    try {
      const parsed = JSON.parse(raw) as { message?: string; error?: string }
      details = parsed.message ?? parsed.error ?? raw
    } catch { /* erro textual */ }
    throw new Error(`API HTTP ${response.status}${details ? `: ${details.slice(0, 220)}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function getJson<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  return parseResponse<T>(await fetch(`/api${endpoint}`, { signal, headers: { Accept: 'application/json' } }))
}

export async function patchJson<T>(endpoint: string, body: unknown): Promise<T> {
  return parseResponse<T>(await fetch(`/api${endpoint}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  }))
}

export async function postJson<T>(endpoint: string, body: unknown): Promise<T> {
  return parseResponse<T>(await fetch(`/api${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  }))
}

export function money(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  const n = Number(value)
  return Number.isFinite(n) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n) : '—'
}
export function dateBR(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-BR') : '—'
}
export function cellText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function asList<T = ApiRow>(payload: unknown): ApiList<T> {
  if (Array.isArray(payload)) return { data: payload as T[] }
  if (payload && typeof payload === 'object') {
    const object = payload as Record<string, unknown>
    for (const key of ['data', 'events', 'items', 'results']) {
      if (Array.isArray(object[key])) return { data: object[key] as T[], pagination: object.pagination as Pagination | undefined }
    }
  }
  return { data: [] }
}
