import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  parseImportFile,
  planImport,
  runImport,
  type ImportPlan,
  type ImportResult
} from '../lib/import'
import { BackBar, Sheet } from '../components/Layout'
import { Toggle } from '../components/Field'
import { IconCheck, IconSparkle } from '../components/icons'

/**
 * Importa de uma vez o catálogo que o Claude Code montou a partir de uma pasta
 * de fotos no computador. Evita pagar a API por 300 identificações.
 */
export default function Import() {
  const navigate = useNavigate()
  const jsonRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)

  const [wines, setWines] = useState<ImportPlan['wines'] | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [replace, setReplace] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(
    null
  )
  const [result, setResult] = useState<ImportResult | null>(null)

  const rebuildPlan = async (
    nextWines: ImportPlan['wines'] | null,
    nextFiles: File[]
  ) => {
    if (!nextWines) return
    setPlan(await planImport(nextWines, nextFiles))
  }

  const loadJson = async (file: File) => {
    setError('')
    try {
      const parsed = parseImportFile(JSON.parse(await file.text()))
      setWines(parsed)
      await rebuildPlan(parsed, files)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não consegui ler o arquivo.')
    }
  }

  const start = async () => {
    if (!plan) return
    setError('')
    setProgress({ done: 0, total: plan.wines.length, label: 'Começando…' })
    try {
      const done = await runImport(plan, { replace }, (d, total, label) =>
        setProgress({ done: d, total, label })
      )
      setResult(done)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'A importação falhou.')
    } finally {
      setProgress(null)
    }
  }

  if (result) {
    return (
      <Sheet>
        <BackBar title="Importar" to="/gestao" />
        <div className="card p-5 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-ok/50
            bg-ok/10 flex items-center justify-center text-ok">
            <IconCheck width={24} height={24} />
          </div>
          <div className="font-display text-2xl font-semibold mb-2">
            {result.wines} vinhos importados
          </div>
          <p className="text-[13px] text-muted leading-relaxed mb-5">
            {result.photos} foto{result.photos === 1 ? '' : 's'} guardada
            {result.photos === 1 ? '' : 's'}
            {result.cellars ? `, ${result.cellars} adega(s) criada(s)` : ''}.
            Numeração de <span className="code-tag">{result.firstCode}</span> a{' '}
            <span className="code-tag">{result.lastCode}</span>.
          </p>
          <div className="grid gap-2.5">
            <button className="btn-primary" onClick={() => navigate('/catalogo')}>
              Ver o catálogo
            </button>
            <button className="btn-ghost" onClick={() => navigate('/gestao/etiquetas')}>
              Imprimir as etiquetas
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet>
      <BackBar title="Importar em lote" to="/gestao" />

      <div className="card p-4 mb-5">
        <div className="flex items-start gap-3">
          <IconSparkle width={20} height={20} className="text-gold shrink-0 mt-0.5" />
          <p className="text-[13px] text-muted leading-relaxed">
            Para catalogar centenas de garrafas sem pagar a API por foto: deixe o
            Claude Code processar a pasta de fotos no computador e gerar um JSON.
            Aqui você junta esse JSON com as fotos. O passo a passo está no
            arquivo <span className="text-ink">CATALOGO-EM-LOTE.md</span> do
            repositório.
          </p>
        </div>
      </div>

      <div className="eyebrow mb-3">1 · Arquivo do catálogo</div>
      <button className="btn-ghost w-full mb-2" onClick={() => jsonRef.current?.click()}>
        {wines ? `${wines.length} vinhos no arquivo` : 'Escolher o JSON'}
      </button>
      <input
        ref={jsonRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void loadJson(file)
          e.target.value = ''
        }}
      />

      <div className="eyebrow mb-3 mt-6">2 · Fotos</div>
      <button
        className="btn-ghost w-full mb-2"
        onClick={() => photosRef.current?.click()}
      >
        {files.length ? `${files.length} fotos escolhidas` : 'Escolher as fotos'}
      </button>
      <p className="text-[12px] text-muted leading-relaxed">
        Abra a pasta das fotos e selecione todas (⌘A no Mac). Elas são
        comprimidas aqui mesmo, como as tiradas pela câmera.
      </p>
      <input
        ref={photosRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          setFiles(picked)
          void rebuildPlan(wines, picked)
          e.target.value = ''
        }}
      />

      {plan && (
        <>
          <div className="card p-4 mt-6">
            <div className="sys-label mb-3">Conferência</div>
            <Line label="Vinhos" value={String(plan.wines.length)} />
            <Line
              label="Fotos usadas"
              value={String(plan.photos.size - plan.unusedPhotos.length)}
            />
            {plan.missingPhotos.length > 0 && (
              <Line
                label="Fotos faltando"
                value={String(plan.missingPhotos.length)}
                tone="text-danger"
              />
            )}
            {plan.unusedPhotos.length > 0 && (
              <Line
                label="Fotos sem vinho"
                value={String(plan.unusedPhotos.length)}
                tone="text-muted"
              />
            )}
            {plan.cellarsToCreate.length > 0 && (
              <Line
                label="Adegas a criar"
                value={plan.cellarsToCreate.join(', ')}
              />
            )}
          </div>

          {plan.missingPhotos.length > 0 && (
            <p className="text-[12px] text-danger mt-3 leading-relaxed">
              Estas fotos estão no JSON mas não foram selecionadas:{' '}
              {plan.missingPhotos.slice(0, 6).join(', ')}
              {plan.missingPhotos.length > 6
                ? ` e mais ${plan.missingPhotos.length - 6}`
                : ''}
              . Os vinhos entram assim mesmo, só sem foto.
            </p>
          )}

          <div className="mt-4">
            <Toggle
              label="Substituir o catálogo atual"
              hint="Desligado, os vinhos são acrescentados e a numeração continua de onde parou."
              checked={replace}
              onChange={setReplace}
            />
          </div>

          <button
            className="btn-primary mt-5"
            onClick={start}
            disabled={progress !== null}
          >
            {progress
              ? `Importando ${progress.done} de ${progress.total}…`
              : `Importar ${plan.wines.length} vinhos`}
          </button>

          {progress && (
            <>
              <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-wine transition-all"
                  style={{
                    width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%`
                  }}
                />
              </div>
              <p className="text-[12px] text-muted mt-2 truncate">{progress.label}</p>
              <p className="text-[11px] text-muted/70 mt-1">
                Não feche esta tela. Comprimir centenas de fotos leva alguns minutos.
              </p>
            </>
          )}
        </>
      )}

      {error && <p className="text-danger text-[13px] mt-4 leading-relaxed">{error}</p>}
    </Sheet>
  )
}

function Line({
  label,
  value,
  tone = 'text-ink'
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="flex items-baseline gap-3 py-2 border-b border-border last:border-0">
      <span className="sys-label shrink-0 w-[112px]">{label}</span>
      <span className={`text-[14px] flex-1 min-w-0 ${tone}`}>{value}</span>
    </div>
  )
}
