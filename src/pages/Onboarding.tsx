import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, updateSettings } from '../db/db'
import { CURRENCIES } from '../types'
import { Sheet } from '../components/Layout'
import { SelectField, TagField, TextField } from '../components/Field'
import { IconGlass } from '../components/icons'

const DEFAULT_SHELVES = ['Prateleira 1', 'Prateleira 2', 'Prateleira 3', 'Prateleira 4']

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('BRL')
  const [prefix, setPrefix] = useState('AD')
  const [cellarName, setCellarName] = useState('Adega principal')
  const [location, setLocation] = useState('')
  const [shelves, setShelves] = useState<string[]>(DEFAULT_SHELVES)
  const [saving, setSaving] = useState(false)

  const finish = async () => {
    setSaving(true)
    await db.cellars.add({
      name: cellarName.trim() || 'Adega principal',
      location: location.trim(),
      shelves: shelves.length ? shelves : DEFAULT_SHELVES,
      capacityPerShelf: null
    })
    await updateSettings({
      ownerName: name.trim(),
      currency,
      codePrefix: prefix.trim().toUpperCase(),
      onboarded: true
    })
    navigate('/', { replace: true })
  }

  return (
    <Sheet className="flex flex-col justify-center min-h-screen">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl border border-wine/60
          bg-wine/15 flex items-center justify-center text-wine shadow-glow">
          <IconGlass width={28} height={28} />
        </div>
        <h1 className="font-display text-4xl font-semibold">Adega</h1>
        <p className="text-sm text-muted mt-2">
          Catálogo, gestão e cardápio da sua coleção.
        </p>
      </div>

      {step === 0 && (
        <div className="card p-5">
          <div className="eyebrow mb-4">Passo 1 de 2 · Você</div>
          <TextField
            label="Seu nome"
            value={name}
            onChange={setName}
            placeholder="Como quer ser chamado"
            autoFocus
          />
          <SelectField
            label="Moeda"
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES.map((c) => ({ value: c as string, label: c }))}
          />
          <TextField
            label="Prefixo da numeração"
            value={prefix}
            onChange={(v) => setPrefix(v.toUpperCase().slice(0, 4))}
            hint={`Cada garrafa ganha um número único: ${
              prefix ? `${prefix}-0001` : '0001'
            }, ${prefix ? `${prefix}-0002` : '0002'}…`}
          />
          <button className="btn-primary mt-2" onClick={() => setStep(1)}>
            Continuar
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="card p-5">
          <div className="eyebrow mb-4">Passo 2 de 2 · Onde guarda</div>
          <TextField
            label="Nome da adega"
            value={cellarName}
            onChange={setCellarName}
            placeholder="Adega principal"
            autoFocus
          />
          <TextField
            label="Onde fica"
            value={location}
            onChange={setLocation}
            placeholder="Sala de jantar, garagem…"
          />
          <TagField
            label="Prateleiras"
            values={shelves}
            onChange={setShelves}
            placeholder="Nome da prateleira"
            hint="Enter ou vírgula para adicionar. Dá para criar mais adegas depois."
          />
          <div className="grid grid-cols-[auto,1fr] gap-3 mt-2">
            <button className="btn-ghost" onClick={() => setStep(0)}>
              Voltar
            </button>
            <button className="btn-primary" onClick={finish} disabled={saving}>
              {saving ? 'Criando…' : 'Abrir a adega'}
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
        Tudo fica guardado só neste aparelho. Nada é enviado para lugar nenhum
        até você configurar a chave da IA em Gestão › Configurações.
      </p>
    </Sheet>
  )
}
