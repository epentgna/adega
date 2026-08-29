import { useState } from 'react'
import { parseNumber } from '../lib/format'
import { IconX } from './icons'

export function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block mb-4">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted mt-1.5">{hint}</span>}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  autoFocus,
  type = 'text'
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  multiline?: boolean
  autoFocus?: boolean
  type?: string
}) {
  return (
    <Field label={label} hint={hint}>
      {multiline ? (
        <textarea
          className="field min-h-[96px] resize-y"
          value={value}
          rows={4}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="field"
          type={type}
          value={value}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}

/** Campo numérico que aceita vírgula (2,5) e devolve null quando vazio. */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  suffix
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  hint?: string
  suffix?: string
}) {
  const [text, setText] = useState(value === null ? '' : String(value))
  return (
    <Field label={label} hint={hint}>
      <div className="field flex items-center gap-2">
        <input
          className="flex-1 min-w-0"
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            onChange(parseNumber(e.target.value))
          }}
        />
        {suffix && <span className="text-muted text-sm shrink-0">{suffix}</span>}
      </div>
    </Field>
  )
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        className="field appearance-none"
        value={String(value)}
        onChange={(e) => {
          const found = options.find((o) => String(o.value) === e.target.value)
          if (found) onChange(found.value)
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Lista de tags (uvas, harmonizações) com entrada por vírgula ou Enter. */
export function TagField({
  label,
  values,
  onChange,
  placeholder,
  hint
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  hint?: string
}) {
  const [draft, setDraft] = useState('')

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !values.includes(s))
    if (parts.length) onChange([...values, ...parts])
    setDraft('')
  }

  return (
    <Field label={label} hint={hint}>
      <div className="field flex flex-wrap gap-2 items-center min-h-[48px] py-2.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-lg border border-border
              bg-white/[0.04] px-2 py-1 text-[13px]"
          >
            {v}
            <button
              type="button"
              aria-label={`Remover ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="text-muted"
            >
              <IconX width={13} height={13} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[110px]"
          value={draft}
          placeholder={values.length ? '' : placeholder}
          onChange={(e) => {
            if (e.target.value.includes(',')) commit(e.target.value)
            else setDraft(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(draft)
            }
            if (e.key === 'Backspace' && !draft && values.length) {
              onChange(values.slice(0, -1))
            }
          }}
          onBlur={() => draft && commit(draft)}
        />
      </div>
    </Field>
  )
}

export function Toggle({
  label,
  hint,
  checked,
  onChange
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-4 py-3.5 text-left"
      role="switch"
      aria-checked={checked}
    >
      <span className="min-w-0">
        <span className="block text-[15px]">{label}</span>
        {hint && <span className="block text-[12px] text-muted mt-0.5">{hint}</span>}
      </span>
      <span
        className={`shrink-0 w-12 h-7 rounded-full border transition-colors relative ${
          checked ? 'bg-wine/40 border-wine/70' : 'bg-white/[0.03] border-border'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${
            checked ? 'left-6' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
