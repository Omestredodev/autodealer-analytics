import { useEffect, useState } from 'react'
import { asList, getJson, type ApiList, type ApiRow } from './api'

export function useResource(path: string, revision = 0) {
  const [data, setData] = useState<ApiList<ApiRow>>({ data: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getJson<unknown>(path, controller.signal)
      .then(payload => setData(asList<ApiRow>(payload)))
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Erro desconhecido') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [path, revision])
  return { ...data, loading, error }
}
