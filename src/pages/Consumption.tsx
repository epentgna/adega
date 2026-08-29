import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import { dateBR } from '../lib/format'
import { BackBar, Empty, Sheet } from '../components/Layout'
import { StarRating } from '../components/StarRating'

export default function Consumption() {
  const logs = useLiveQuery(
    () => db.consumption.orderBy('drankAt').reverse().toArray(),
    []
  )

  const byMonth = new Map<string, typeof logs>()
  for (const log of logs ?? []) {
    const key = new Date(log.drankAt).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    })
    byMonth.set(key, [...(byMonth.get(key) ?? []), log])
  }

  return (
    <Sheet>
      <BackBar title="Consumo" to="/gestao" />

      {(logs?.length ?? 0) === 0 ? (
        <Empty
          title="Nenhuma garrafa aberta ainda"
          hint="Toda vez que você abrir um vinho pela ficha dele, o registro cai aqui."
        />
      ) : (
        [...byMonth.entries()].map(([month, entries]) => (
          <section key={month} className="mb-6">
            <div className="sys-label mb-3 capitalize">
              {month} · {entries?.length}
            </div>
            <div className="grid gap-2.5">
              {entries?.map((log) => (
                <Link
                  key={log.id}
                  to={`/vinho/${log.wineId}`}
                  className="card p-4 active:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="code-tag mb-1">{log.wineCode}</div>
                      <div className="font-display text-[17px] leading-tight truncate">
                        {log.wineName}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-muted shrink-0">
                      {dateBR(log.drankAt)}
                    </span>
                  </div>

                  {log.rating !== null && (
                    <div className="mt-2">
                      <StarRating value={log.rating} size={16} />
                    </div>
                  )}

                  {(log.occasion || log.withWhom) && (
                    <div className="text-[12px] text-muted mt-2">
                      {[log.occasion, log.withWhom].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {log.notes && (
                    <p className="text-[13px] text-ink/80 mt-1.5 leading-relaxed">
                      {log.notes}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </Sheet>
  )
}
