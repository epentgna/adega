import { useEffect, useState } from 'react'
import { importFromRepo } from '../lib/repoCatalog'
import type { ImportResult } from '../lib/import'

// Uma checagem por carregamento do app (o StrictMode monta a tela duas vezes).
let ranThisLoad = false

export interface RepoImportState {
  running: boolean
  label: string
  result: ImportResult | null
  error: string
}

/**
 * Busca sozinho as garrafas catalogadas por conversa desde a última vez.
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
    if (!enabled || ranThisLoad) return
    ranThisLoad = true
    let alive = true

    void (async () => {
      setState((s) => ({ ...s, running: true }))
      try {
        const result = await importFromRepo((done, total, label) => {
          if (alive) setState((s) => ({ ...s, label: `${label} (${done}/${total})` }))
        })
        // Sem garrafa nova nem ficha completada, não há o que avisar.
        const vale = result && (result.wines > 0 || result.updated > 0)
        if (alive)
          setState({ running: false, label: '', result: vale ? result : null, error: '' })
      } catch (err) {
        if (alive)
          setState({
            running: false,
            label: '',
            result: null,
            error: err instanceof Error ? err.message : String(err)
          })
      }
    })()

    return () => {
      alive = false
    }
  }, [enabled])

  return {
    ...state,
    dismiss: () => setState((s) => ({ ...s, result: null, error: '' }))
  }
}
