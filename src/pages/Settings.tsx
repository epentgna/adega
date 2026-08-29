import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, updateSettings, wipeDatabase } from '../db/db'
import { CURRENCIES, MODELS, WEB_SEARCH_MODELS } from '../types'
import { formatCode } from '../lib/code'
import { ultimaBusca } from '../hooks/useRepoImport'
import { testApiKey } from '../lib/enrich'
import { downloadBackup, downloadCSV, importBundle, toCSV } from '../lib/export'
import { BackBar, Sheet } from '../components/Layout'
import { NumberField, SelectField, TextField, Toggle } from '../components/Field'
import { Confirm } from '../components/BottomSheet'
import { AccountPanel } from '../components/AccountPanel'
import { IconDownload, IconSparkle } from '../components/icons'

export default function Settings() {
  const navigate = useNavigate()
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const wines = useLiveQuery(() => db.wines.toArray(), [])
  const cellars = useLiveQuery(() => db.cellars.toArray(), [])
  const fileRef = useRef<HTMLInputElement>(null)

  const [keyDraft, setKeyDraft] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [keyStatus, setKeyStatus] = useState<{ ok: boolean; message: string } | null>(
    null
  )
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [importing, setImporting] = useState('')

  if (!settings) return <Sheet>Carregando…</Sheet>

  const apiKey = keyDraft ?? settings.apiKey
  const masked =
    settings.apiKey && keyDraft === null
      ? `${settings.apiKey.slice(0, 11)}…${settings.apiKey.slice(-4)}`
      : apiKey

  const saveKey = async () => {
    const value = (keyDraft ?? '').trim()
    setTesting(true)
    setKeyStatus(null)
    try {
      if (value) await testApiKey(value, settings.model)
      await updateSettings({ apiKey: value })
      setKeyDraft(null)
      setKeyStatus({
        ok: true,
        message: value ? 'Chave válida e salva.' : 'Chave removida.'
      })
    } catch (err) {
      setKeyStatus({
        ok: false,
        message: err instanceof Error ? err.message : String(err)
      })
    } finally {
      setTesting(false)
    }
  }

  const restore = async (file: File) => {
    setImporting('Lendo o arquivo…')
    try {
      const bundle = JSON.parse(await file.text())
      await importBundle(bundle)
      setImporting('Backup restaurado.')
    } catch (err) {
      setImporting(err instanceof Error ? err.message : 'Arquivo inválido.')
    }
  }

  const exportCSV = () => {
    const names = new Map((cellars ?? []).map((c) => [c.id!, c.name]))
    downloadCSV(
      toCSV(wines ?? [], names),
      `adega-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <Sheet>
      <BackBar title="Configurações" to="/gestao" />

      <Section title="Conta e sincronização" />
      <AccountPanel />

      <Section title="Preenchimento por IA" />
      <div className="card p-4 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <IconSparkle width={20} height={20} className="text-gold shrink-0 mt-0.5" />
          <p className="text-[13px] text-muted leading-relaxed">
            Com uma chave da API da Anthropic, a foto do rótulo vira ficha completa.
            A chave fica só neste aparelho e nunca entra no backup. Pegue a sua em{' '}
            <span className="text-ink">console.anthropic.com</span>.
          </p>
        </div>

        <span className="field-label">Chave da API</span>
        <input
          className="field font-mono text-[13px] mb-3"
          type="password"
          autoComplete="off"
          value={masked}
          onChange={(e) => setKeyDraft(e.target.value)}
          onFocus={() => keyDraft === null && setKeyDraft('')}
          placeholder="sk-ant-…"
          aria-label="Chave da API da Anthropic"
        />

        {keyDraft !== null && (
          <button className="btn-ghost w-full mb-3" onClick={saveKey} disabled={testing}>
            {testing ? 'Testando…' : 'Testar e salvar'}
          </button>
        )}

        {keyStatus && (
          <p
            className={`text-[13px] mb-3 leading-relaxed ${
              keyStatus.ok ? 'text-ok' : 'text-danger'
            }`}
          >
            {keyStatus.message}
          </p>
        )}

        <SelectField
          label="Modelo"
          value={settings.model}
          onChange={(model) => updateSettings({ model })}
          options={MODELS.map((m) => ({ value: m.id, label: m.label }))}
          hint={MODELS.find((m) => m.id === settings.model)?.hint}
        />

        <Toggle
          label="Pesquisar na web"
          hint={
            WEB_SEARCH_MODELS.has(settings.model)
              ? 'Busca as notas do Vivino e dos críticos. Custa mais por vinho, mas é o que traz dado de verdade.'
              : 'O modelo escolhido não faz busca na web.'
          }
          checked={settings.webSearch && WEB_SEARCH_MODELS.has(settings.model)}
          onChange={(webSearch) => updateSettings({ webSearch })}
        />

        <p className="text-[11px] text-muted leading-relaxed mt-3">
          Custo aproximado por vinho com busca na web: alguns centavos de dólar no
          Opus 5, menos no Sonnet 5. Cobrado direto pela Anthropic, na sua conta.
        </p>
      </div>

      <Section title="Você" />
      <TextField
        label="Seu nome"
        value={settings.ownerName}
        onChange={(ownerName) => updateSettings({ ownerName })}
      />
      <SelectField
        label="Moeda"
        value={settings.currency}
        onChange={(currency) => updateSettings({ currency })}
        options={CURRENCIES.map((c) => ({ value: c as string, label: c }))}
      />

      <Toggle
        label="Buscar garrafas novas ao abrir"
        hint="Traz sozinho o que você catalogou conversando com o Claude."
        checked={settings.autoRepoImport ?? true}
        onChange={(autoRepoImport) => updateSettings({ autoRepoImport })}
      />

      <Section title="Numeração" />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Prefixo"
          value={settings.codePrefix}
          onChange={(v) => updateSettings({ codePrefix: v.toUpperCase().slice(0, 4) })}
        />
        <NumberField
          label="Dígitos"
          value={settings.codeDigits}
          onChange={(v) =>
            updateSettings({ codeDigits: Math.min(6, Math.max(1, Math.round(v ?? 4))) })
          }
        />
      </div>
      <p className="text-[12px] text-muted -mt-2 mb-5">
        Próximas garrafas sairão como{' '}
        <span className="code-tag">
          {formatCode(settings.codePrefix, settings.codeDigits, (wines?.length ?? 0) + 1)}
        </span>
        . Mudar isso não renumera o que já está catalogado.
      </p>

      <Section title="Backup" />
      <div className="grid gap-2.5 mb-4">
        <button
          className="btn-ghost"
          onClick={async () => {
            await downloadBackup(false)
            setImporting('Backup dos dados baixado.')
          }}
        >
          <IconDownload />
          Backup dos dados (sem fotos)
        </button>
        <button
          className="btn-ghost"
          onClick={async () => {
            setImporting('Montando o backup…')
            const missing = await downloadBackup(true)
            setImporting(
              missing
                ? `Backup baixado, mas ${missing} foto(s) não desceram da nuvem e ficaram de fora.`
                : 'Backup completo baixado.'
            )
          }}
        >
          <IconDownload />
          Backup completo (com fotos)
        </button>
        <button className="btn-ghost" onClick={exportCSV}>
          <IconDownload />
          Exportar planilha CSV
        </button>
        <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
          Restaurar de um backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void restore(file)
            e.target.value = ''
          }}
        />
      </div>
      {importing && <p className="text-[13px] text-muted mb-4">{importing}</p>}
      <p className="text-[12px] text-muted leading-relaxed mb-6">
        Tudo mora no navegador deste aparelho. Limpar os dados do site apaga a
        adega — faça o backup completo de vez em quando e guarde no iCloud/Drive.
        Restaurar substitui tudo o que está aqui.
      </p>

      <Section title="Versão do app" />
      <div className="card p-4 mb-4">
        <Linha label="Build" value={__BUILD__} />
        <Linha
          label="Última busca"
          value={
            ultimaBusca()
              ? new Date(ultimaBusca()!).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'nunca'
          }
        />
        <p className="text-[12px] text-muted leading-relaxed mt-3">
          Instalado na tela de início, o app pode ficar preso numa versão antiga
          por causa do cache offline. Se algo que eu disse estar pronto não
          aparece, force a atualização aqui.
        </p>
        <button
          className="btn-ghost w-full mt-3"
          onClick={async () => {
            setImporting('Atualizando…')
            try {
              const regs = await navigator.serviceWorker?.getRegistrations?.()
              await Promise.all((regs ?? []).map((r) => r.unregister()))
              if (window.caches) {
                const nomes = await caches.keys()
                await Promise.all(nomes.map((n) => caches.delete(n)))
              }
            } catch {
              /* segue mesmo assim: o reload já ajuda */
            }
            window.location.reload()
          }}
        >
          Forçar atualização do app
        </button>
        <p className="text-[11px] text-muted/70 mt-2 leading-relaxed">
          Só recarrega o programa. Seus vinhos, fotos e a chave da API não são
          tocados.
        </p>
      </div>

      <Section title="Zona de risco" />
      <button className="btn-danger w-full" onClick={() => setConfirmWipe(true)}>
        Apagar tudo
      </button>

      <Confirm
        open={confirmWipe}
        title="Apagar toda a adega?"
        message="Vinhos, fotos, adegas e histórico somem deste aparelho. Não dá para desfazer."
        confirmLabel="Apagar tudo"
        danger
        onCancel={() => setConfirmWipe(false)}
        onConfirm={async () => {
          await wipeDatabase()
          navigate('/', { replace: true })
        }}
      />

      <p className="text-center text-[10px] text-muted/60 font-mono tracking-[0.14em] mt-10">
        ADEGA · {wines?.length ?? 0} RÓTULOS
      </p>
    </Sheet>
  )
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 py-1.5 border-b border-border last:border-0">
      <span className="sys-label shrink-0 w-[104px]">{label}</span>
      <span className="font-mono text-[12px] flex-1 min-w-0">{value}</span>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mt-7 mb-4 first:mt-0">
      <span className="eyebrow">{title}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
