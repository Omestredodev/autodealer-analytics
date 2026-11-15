import { useEffect, useState } from 'react'
import { getJson } from './api'
import { LiveVehicleRegistration } from './LiveVehicleRegistration'
import './live-business.css'

export type VehicleSelection = { id: string; make: string; model: string; version: string | null; model_year: number }

/** Formulário real na aba Cadastro de veículo, separado da listagem de estoque. */
export function LiveRegistrationPage({ onRegistered }: { onRegistered: (vehicle: VehicleSelection) => void }) {
  const [enabled, setEnabled] = useState(false)
  const [write, setWrite] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getJson<{ enabled: boolean }>('/crud/status', controller.signal)
      .then(result => { if (!controller.signal.aborted) setEnabled(result.enabled) })
      .catch(() => { if (!controller.signal.aborted) setError('Não foi possível conferir o modo de demonstração da API.') })
    return () => controller.abort()
  }, [])
  return <section className="business-panel">
    <div className="business-head"><div><h2>Cadastrar veículo no estoque</h2>
      <p>Após salvar, você será encaminhado para Anúncios com o veículo selecionado.</p></div>
      <span className="business-badge">PostgreSQL</span></div>
    {error && <p className="business-alert" role="alert">{error}</p>}
    {!enabled && <p className="business-alert">Cadastro desabilitado: habilite CRUD_DEMO_ENABLED=true apenas no ambiente local.</p>}
    {enabled && <label className="stock-toggle"><input type="checkbox" checked={write} onChange={e=>setWrite(e.target.checked)}/>
      Habilitar alterações neste ambiente local</label>}
    <LiveVehicleRegistration canWrite={enabled && write && import.meta.env.DEV} onRegistered={onRegistered}/>
  </section>
}
