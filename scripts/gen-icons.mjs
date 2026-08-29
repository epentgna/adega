// Gera os ícones do PWA sem dependências: um PNG com a taça da Adega.
// Uso: node scripts/gen-icons.mjs  (os arquivos já estão commitados em public/)
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [15, 10, 12]
const WINE = [194, 64, 92]
const GOLD = [216, 166, 87]

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Distância de um ponto ao segmento AB — usada para desenhar a haste. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

function render(size) {
  const rows = []
  const c = size / 2
  const bowlY = size * 0.36
  const bowlR = size * 0.24

  for (let y = 0; y < size; y++) {
    const row = [0]
    for (let x = 0; x < size; x++) {
      let color = BG

      // Taça: meia elipse (só a metade de baixo) + haste + base.
      const dx = (x - c) / bowlR
      const dy = (y - bowlY) / (bowlR * 1.05)
      const inBowl = dx * dx + dy * dy <= 1 && y >= bowlY - bowlR * 0.05

      const stem = distToSegment(x, y, c, bowlY + bowlR, c, size * 0.78) < size * 0.022
      const foot =
        Math.abs(y - size * 0.79) < size * 0.022 && Math.abs(x - c) < size * 0.14

      if (inBowl) {
        // Vinho preenche a taça de baixo para cima.
        color = y > bowlY + bowlR * 0.15 ? WINE : GOLD
      } else if (stem || foot) {
        color = GOLD
      }

      row.push(color[0], color[1], color[2], 255)
    }
    rows.push(Buffer.from(row))
  }

  const raw = Buffer.concat(rows)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

for (const [name, size] of [
  ['public/icon-192.png', 192],
  ['public/icon-512.png', 512],
  ['public/apple-touch-icon.png', 180]
]) {
  writeFileSync(name, render(size))
  console.log('gerado', name)
}

writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0F0A0C"/>
  <path d="M20 14h24l-2 14a10 10 0 0 1-20 0L20 14Z" fill="#C2405C"/>
  <path d="M20 14h24l-.6 4H20.6L20 14Z" fill="#D8A657"/>
  <path d="M32 38v10M25 48h14" stroke="#D8A657" stroke-width="3" stroke-linecap="round"/>
</svg>
`
)
console.log('gerado public/favicon.svg')
