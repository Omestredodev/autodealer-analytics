export async function removeBusiness(path: string): Promise<void> {
  const result = await fetch(`/api${path}`, { method: 'DELETE', headers: { Accept: 'application/json' } })
  if (!result.ok) {
    const data = await result.json().catch(() => ({})) as { message?: string; error?: string }
    throw new Error(`HTTP ${result.status}: ${data.message ?? data.error ?? 'Falha ao excluir'}`)
  }
}
export function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Erro inesperado de comunicação'
}
