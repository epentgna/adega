import { useEffect, useState } from 'react'
import { importFromRepo } from '../lib/repoCatalog'
import type { ImportResult } from '../lib/import'

const ULTIMA_KEY = 'adega:ultimaBusca'
// Instalado na tela de início, o app fica aberto por dias: uma checagem só
// por carregamento significa nunca mais checar. Recheca ao voltar ao primeiro
// plano, com um intervalo mínimo para não repetir a cada troca de aba. O
// arquivo tem poucos KB e só as fotos das garrafas novas são baixadas.
const INTERVALO_MS = 20 * 1000

let rodando = false
let ultima = 0

export function ultimaBusca(): number | null {
  try {
    const v = localStorage.getItem(ULTIMA_KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

export interface RepoImportState {
  running: boolean
  label: string
  result: ImportResult | null
  error: string
}

/**
 * Busca sozinho o que foi catalogado por conversa desde a última vez.
 * Falha em silêncio: sem rede, ou sem catálogo publicado, o app segue igual.
 */
export function useRepoImport(enabled: boolean) {
  const [state, setState] = useState<RepoImportState>({
    running: false,
    label: '',
    result: null,
    error: ''
  })

  useEffect(() => {
    if (!enabled) return
    let alive = true

    const buscar = async (forcar = false) => {
      if (rodando) return
      if (!forcar && Date.now() - ultima < INTERVALO_MS) return
      rodando = true
      ultima = Date.now()
      setState((s) => ({ ...s, running: true, error: '' }))
      try {
        const result = await importFromRepo((done, total, label) => {
          if (alive) setState((s) => ({ ...s, label: `${label} (${done}/${total})` }))
        })
        try {
          localStorage.setItem(ULTIMA_KEY, String(Date.now()))
        } catch {
          /* ignore */
        }
        // Sem garrafa nova nem ficha completada, não há o que avisar.
        const vale = result && (result.wines > 0 || result.updated > 0)
        if (alive)
          setState((s) => ({
            running: false,
            label: '',
            result: vale ? result : s.result,
            error: ''
          }))
      } catch (err) {
        if (alive)
          setState((s) => ({
            ...s,
            running: false,
            label: '',
            error: err instanceof Error ? err.message : String(err)
          }))
      } finally {
        rodando = false
      }
    }

    void buscar(true)

    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void buscar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('online', aoVoltar)
    window.addEventListener('focus', aoVoltar)

    return () => {
      alive = false
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('online', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
    }
  }, [enabled])

  return {
    ...state,
    dismiss: () => setState((s) => ({ ...s, result: null, error: '' }))
  }
}
