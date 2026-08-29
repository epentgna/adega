import { db, getSettings } from '../db/db'
import type { Settings } from '../types'

export function formatCode(prefix: string, digits: number, seq: number): string {
  const n = String(seq).padStart(Math.max(1, digits), '0')
  return prefix ? `${prefix}-${n}` : n
}

/**
 * Próximo número livre da adega. Usa o maior `seq` já gravado + 1, então
 * apagar um vinho não recicla o número (a etiqueta na garrafa é definitiva).
 */
export async function nextCode(
  settings?: Settings
): Promise<{ code: string; seq: number }> {
  const s = settings ?? (await getSettings())
  const last = await db.wines.orderBy('seq').last()
  const seq = (last?.seq ?? 0) + 1
  return { code: formatCode(s.codePrefix, s.codeDigits, seq), seq }
}

/** Extrai o número de um código digitado ("AD-0042" ou "42" → 42). */
export function parseSeq(code: string): number | null {
  const m = code.match(/(\d+)\s*$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}
