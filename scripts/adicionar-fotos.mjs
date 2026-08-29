// Otimiza as fotos de uma garrafa e grava em public/fotos/, prontas para o app.
//
//   node scripts/adicionar-fotos.mjs AD-0042 /caminho/frente.jpg /caminho/verso.jpg
//
// Imprime os nomes gerados, na ordem — é o que vai no campo "fotos" do
// catalogo.json. A primeira é a capa.
import { mkdirSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'

const [code, ...inputs] = process.argv.slice(2)

if (!code || inputs.length === 0) {
  console.error('uso: node scripts/adicionar-fotos.mjs <CODIGO> <foto...>')
  process.exit(1)
}

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error('sharp não instalado. Rode: npm install')
  process.exit(1)
}

mkdirSync('public/fotos', { recursive: true })

const nomes = []
for (const [i, input] of inputs.entries()) {
  const nome = `${code}-${i + 1}.webp`
  try {
    const buffer = await sharp(input)
      // Mesmo tamanho e qualidade que o app usa na câmera.
      .rotate()
      .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    writeFileSync(`public/fotos/${nome}`, buffer)
    nomes.push(nome)
    console.log(`${nome}  ${Math.round(buffer.length / 1024)} KB  ← ${basename(input)}`)
  } catch (err) {
    console.error(`falhou em ${input}: ${err.message}`)
    process.exit(1)
  }
}

console.log('\n"fotos": ' + JSON.stringify(nomes))
