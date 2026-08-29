import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useSyncState } from '../hooks/useSyncState'
import { resolveConflict, resyncNow } from '../lib/sync'
import { downloadAllPhotos } from '../lib/photoSync'
import { GoogleGlyph } from './GoogleGlyph'
import { Confirm } from './BottomSheet'
import { IconCheck, IconX } from './icons'

const STATUS_LABEL = {
  idle: 'Sem sincronizar',
  syncing: 'Sincronizando…',
  synced: 'Tudo sincronizado',
  error: 'Falha ao sincronizar'
} as const

/** Conta e sincronização em nuvem. Sem login, o app segue funcionando local. */
export function AccountPanel() {
  const { configured, ready, user, signInGoogle, signInEmail, signOut } = useAuth()
  const { status, lastSyncedAt, conflict, error } = useSyncState()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [busy, setBusy] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [confirmOut, setConfirmOut] = useState(false)
  const [photoProgress, setPhotoProgress] = useState('')

  if (!configured) {
    return (
      <div className="card p-4">
        <p className="text-[13px] text-muted leading-relaxed">
          Sincronização em nuvem não configurada nesta versão.
        </p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="card p-4">
        <p className="text-[13px] text-muted">Verificando a sessão…</p>
      </div>
    )
  }

  // Conflito trava a sincronização até você escolher um lado: os dois têm
  // catálogo e descartar o errado significaria perder garrafas catalogadas.
  if (conflict) {
    return (
      <div className="card p-4 border-danger/50">
        <div className="eyebrow text-danger mb-2">Conflito</div>
        <p className="text-[13px] leading-relaxed mb-4">
          Este aparelho tem <strong>{conflict.localWines}</strong> rótulo
          {conflict.localWines === 1 ? '' : 's'} e a nuvem desta conta tem{' '}
          <strong>{conflict.remoteWines}</strong>. Não dá para juntar os dois
          automaticamente sem inventar dado — escolha qual catálogo continua.
          O outro é descartado.
        </p>
        <div className="grid gap-2.5">
          <button className="btn-ghost" onClick={() => resolveConflict('local')}>
            Manter o deste aparelho ({conflict.localWines})
          </button>
          <button className="btn-ghost" onClick={() => resolveConflict('remote')}>
            Manter o da nuvem ({conflict.remoteWines})
          </button>
        </div>
        <p className="text-[11px] text-muted mt-3 leading-relaxed">
          Na dúvida, faça antes um backup completo (logo abaixo) — ele salva o
          estado deste aparelho num arquivo, aconteça o que acontecer.
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="card p-4">
        <p className="text-[13px] text-muted leading-relaxed mb-4">
          Entrando com uma conta, a adega passa a sincronizar entre iPhone, iPad
          e Mac, e sobrevive à troca de aparelho. As fotos vão para o
          armazenamento da sua conta; a chave da API nunca sai daqui.
        </p>

        {sent ? (
          <div className="flex items-start gap-2.5 text-[13px] text-ok">
            <IconCheck width={17} height={17} className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Link enviado para <strong>{sent}</strong>. Abra o e-mail neste
              aparelho para entrar.
            </span>
          </div>
        ) : (
          <>
            <button
              className="btn-ghost w-full mb-3"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setLoginError('')
                const { error: err } = await signInGoogle()
                if (err) {
                  setLoginError(err)
                  setBusy(false)
                }
                // Em caso de sucesso o navegador vai para o Google.
              }}
            >
              <GoogleGlyph />
              Entrar com Google
            </button>

            <div className="flex items-center gap-3 my-3">
              <span className="h-px flex-1 bg-border" />
              <span className="sys-label">ou por e-mail</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="flex gap-2">
              <input
                className="field flex-1"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                aria-label="E-mail para receber o link de acesso"
              />
              <button
                className="btn-ghost px-5"
                disabled={busy || !email.trim()}
                onClick={async () => {
                  setBusy(true)
                  setLoginError('')
                  const { error: err } = await signInEmail(email.trim())
                  setBusy(false)
                  if (err) setLoginError(err)
                  else setSent(email.trim())
                }}
              >
                Enviar
              </button>
            </div>
          </>
        )}

        {loginError && (
          <p className="text-danger text-[13px] mt-3 leading-relaxed">{loginError}</p>
        )}
      </div>
    )
  }

  const tone =
    status === 'error' ? 'text-danger' : status === 'synced' ? 'text-ok' : 'text-muted'

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-[15px] truncate">{user.email ?? 'Conta conectada'}</div>
          <div className={`text-[12px] ${tone}`}>
            {STATUS_LABEL[status]}
            {lastSyncedAt && status === 'synced'
              ? ` · ${new Date(lastSyncedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}`
              : ''}
          </div>
        </div>
        <span
          className={`h-2.5 w-2.5 rounded-full shrink-0 mt-2 ${
            status === 'error'
              ? 'bg-danger'
              : status === 'synced'
                ? 'bg-ok'
                : 'bg-muted animate-pulse'
          }`}
          aria-hidden
        />
      </div>

      {error && (
        <p className="text-danger text-[12px] leading-relaxed mb-3">{error}</p>
      )}

      <div className="grid gap-2.5">
        <button className="btn-ghost" onClick={() => void resyncNow()}>
          Sincronizar agora
        </button>
        <button
          className="btn-ghost"
          onClick={async () => {
            setPhotoProgress('Baixando…')
            const { ok, failed } = await downloadAllPhotos((done, total) =>
              setPhotoProgress(`Baixando ${done} de ${total}…`)
            )
            setPhotoProgress(
              failed
                ? `${ok} fotos baixadas, ${failed} falharam.`
                : ok
                  ? `${ok} fotos baixadas.`
                  : 'Todas as fotos já estão neste aparelho.'
            )
          }}
        >
          Baixar todas as fotos
        </button>
        <button className="btn-ghost" onClick={() => setConfirmOut(true)}>
          <IconX width={17} height={17} />
          Sair da conta
        </button>
      </div>

      {photoProgress && (
        <p className="text-[12px] text-muted mt-3">{photoProgress}</p>
      )}

      <Confirm
        open={confirmOut}
        title="Sair da conta?"
        message="A adega continua neste aparelho e para de sincronizar. Ao entrar de novo, o estado da nuvem é comparado com o daqui."
        confirmLabel="Sair"
        onCancel={() => setConfirmOut(false)}
        onConfirm={async () => {
          setConfirmOut(false)
          await signOut()
        }}
      />
    </div>
  )
}
