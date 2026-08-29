import { db } from '../db/db'
import {
  mergeRepoEntry,
  parseImportFile,
  planImport,
  runImport,
  type ImportResult,
  type ImportWine,
  type NamedPhoto
} from './import'

/**
 * Catálogo publicado junto com o app. É por aqui que as garrafas catalogadas
 * numa conversa com o Claude chegam ao aparelho: a sessão grava o vinho e a
 * foto no repositório, o deploy publica, e o app busca o que é novo.
 */
const CATALOG_URL = `${import.meta.env.BASE_URL}catalogo.json`
const PHOTO_BASE = `${import.meta.env.BASE_URL}fotos/`

export interface RepoCheck {
  /** Garrafas do arquivo que ainda não estão neste aparelho. */
  novos: number
  total: number
}

async function fetchCatalog() {
  const res = await fetch(CATALOG_URL, { cache: 'no-cache' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Não consegui buscar o catálogo (${res.status}).`)
  return parseImportFile(await res.json())
}

/** Quantas garrafas novas existem lá, sem importar nada. */
export async function checkRepoCatalog(): Promise<RepoCheck | null> {
  const wines = await fetchCatalog()
  if (!wines) return null
  const taken = new Set((await db.wines.toArray()).map((w) => w.code))
  const novos = wines.filter((w) => !w.codigo || !taken.has(w.codigo.trim()))
  return { novos: novos.length, total: wines.length }
}

/**
 * Traz as garrafas que faltam. Só as fotos das garrafas novas são baixadas —
 * rodar isso de novo depois de 300 vinhos não rebaixa 40 MB.
 */
export async function importFromRepo(
  onProgress?: (done: number, total: number, label: string) => void
): Promise<ImportResult | null> {
  const all = await fetchCatalog()
  if (!all) return null

  const local = await db.wines.toArray()
  const byCode = new Map(local.map((w) => [w.code, w]))
  const wines = all.filter((w) => !w.codigo || !byCode.has(w.codigo.trim()))

  // Garrafa que já está aqui não entra de novo, mas pode ter ganhado campos
  // novos no catálogo (a história, por exemplo) depois de importada.
  const updated = await completarExistentes(all, byCode)

  if (wines.length === 0) {
    return updated > 0
      ? {
          wines: 0,
          photos: 0,
          cellars: 0,
          updated,
          firstCode: '',
          lastCode: ''
        }
      : null
  }

  const wanted = new Set<string>()
  for (const wine of wines) for (const name of wine.fotos ?? []) wanted.add(name)

  const photos: NamedPhoto[] = []
  let done = 0
  for (const name of wanted) {
    onProgress?.(done, wanted.size, `Baixando ${name}`)
    try {
      const res = await fetch(PHOTO_BASE + encodeURIComponent(name), {
        cache: 'no-cache'
      })
      if (res.ok) photos.push({ name, blob: await res.blob() })
    } catch (err) {
      // Foto que não desce não impede a garrafa de entrar.
      console.error('[repo] foto falhou', name, err)
    }
    done++
  }

  const plan = await planImport(wines, photos)
  const result = await runImport(plan, { replace: false }, onProgress)
  return { ...result, updated }
}

/** Preenche o que estava em branco nas garrafas já importadas. */
async function completarExistentes(
  all: ImportWine[],
  byCode: Map<string, { id?: number } & Parameters<typeof mergeRepoEntry>[0]>
): Promise<number> {
  let n = 0
  for (const entry of all) {
    const code = entry.codigo?.trim()
    if (!code) continue
    const wine = byCode.get(code)
    if (!wine?.id) continue
    const patch = mergeRepoEntry(wine, entry)
    if (patch) {
      await db.wines.update(wine.id, patch)
      n++
    }
  }
  return n
}
