---
name: catalogar
description: Cataloga garrafas de vinho a partir de fotos enviadas na conversa e publica no app Adega. Use quando o usuário mandar foto de rótulo de vinho, disser que quer catalogar uma garrafa, ou citar prateleira/adega junto de uma foto.
---

# Catalogar uma garrafa pela conversa

O usuário manda a foto do rótulo e diz onde a garrafa está. Você identifica o
vinho, pesquisa as notas, grava no repositório e faz o push. O app busca sozinho
na próxima vez que abrir.

**Você é a IA da catalogação.** Não existe chamada de API aqui — o trabalho é
seu, nesta conversa. É justamente isso que torna o fluxo barato.

## O laço

### 1. Descobrir onde a garrafa vai

Se o usuário disse a prateleira e/ou a adega, use. Se não disse:

- **Só uma adega cadastrada e ele citou só a prateleira** → use aquela adega.
- **Não disse nada sobre o local** → pergunte, em uma linha só: *"Qual
  prateleira?"*. Não interrogue sobre o resto.
- Ele pode dizer **"mesma de antes"** ou mandar várias fotos seguidas: mantenha
  o último local usado até ele mudar.

As adegas e prateleiras que já existem estão em `public/catalogo.json` e em
`public/adegas.json`, se houver. Nome novo de adega ou prateleira é criado pelo
app na importação — não precisa pedir permissão.

### 2. Identificar e pesquisar

Leia a foto com a ferramenta Read. Depois pesquise na web pelo produtor + nome
+ safra.

**O rótulo manda.** O que está impresso vale mais que sua memória: produtor,
nome, safra, denominação, teor alcoólico e volume costumam estar lá.

**Nunca invente nota, número de avaliações ou preço.** Sem número encontrado na
busca, o campo fica de fora. Uma ficha com lacuna é útil; uma ficha com nota
inventada envenena o catálogo. Vivino é escala 5; Parker, Wine Spectator,
Suckling e Decanter são escala 100. Prefira a nota da safra da garrafa; se só
achar a do rótulo em geral, deixe `safra` da avaliação como `null`.

Rótulo ilegível: cadastre assim mesmo com o que dá para ler, `confianca` baixa
e o motivo em `observacoes`. O usuário precisa saber que a garrafa existe.

### 3. Gravar

1. Leia `public/catalogo.json` e descubra o **maior código** já usado. O próximo
   é `AD-` seguido de 4 dígitos (`AD-0001`, `AD-0002`…). Se o arquivo estiver
   vazio, comece em `AD-0001`.
2. Otimize as fotos, na ordem frente → verso:
   ```bash
   node scripts/adicionar-fotos.mjs AD-0042 /caminho/da/foto1.jpg /caminho/da/foto2.jpg
   ```
   O comando imprime os nomes gerados e grava em `public/fotos/`.
3. Acrescente o vinho ao array `vinhos` de `public/catalogo.json`, no formato
   abaixo.
4. Commit e push na `main`. Mensagem curta: `Cataloga AD-0042 Gran Enemigo 2018`.

### 4. Responder

Uma resposta curta, em português, com:

- o código atribuído e o vinho identificado;
- a nota encontrada (e a fonte), ou que não achou nota;
- o que ficou incerto, se algo ficou;
- nada mais. Sem repetir a ficha inteira.

Ele confere depois no app. Se mandar outra foto em seguida, repita o laço
mantendo o mesmo local.

## Formato de cada vinho

```json
{
  "codigo": "AD-0042",
  "fotos": ["AD-0042-1.webp", "AD-0042-2.webp"],
  "nome": "Gran Enemigo Single Vineyard Gualtallary",
  "produtor": "Aleanna",
  "safra": 2018,
  "tipo": "Tinto",
  "uvas": ["Cabernet Franc"],
  "pais": "Argentina",
  "regiao": "Mendoza",
  "subRegiao": "Gualtallary",
  "teorAlcoolico": 14.5,
  "volumeMl": 750,
  "adega": "Adega principal",
  "prateleira": "Prateleira 1",
  "garrafas": 1,
  "notasDegustacao": "…",
  "harmonizacoes": ["Cordeiro", "Queijos curados"],
  "guardaDe": 2024,
  "guardaAte": 2038,
  "temperatura": "16–18 °C",
  "decantarMin": 60,
  "avaliacoes": [
    { "fonte": "Vivino", "nota": 4.4, "escala": 5, "votos": 1820, "safra": 2018 },
    { "fonte": "Robert Parker", "nota": 97, "escala": 100, "safra": 2018 }
  ],
  "precoMercado": 890,
  "descricaoCardapio": "Cabernet Franc de altitude, floral e de taninos finos.",
  "confianca": 0.92,
  "fontes": ["vivino.com", "robertparker.com"],
  "observacoes": ""
}
```

`tipo` aceita: `Tinto`, `Branco`, `Rosé`, `Espumante`, `Sobremesa`,
`Fortificado`, `Laranja`. Campo sem informação: omita, ou `null` nos numéricos.
`descricaoCardapio` é uma frase curta e elegante (até 160 caracteres) para a
carta, sem repetir o produtor.

## Regras

- **Nunca reaproveite um código.** Cada garrafa tem o seu, para sempre; o
  usuário cola a etiqueta na garrafa.
- **Uma garrafa por vez, um commit por garrafa.** Se ele mandar 10 fotos de uma
  vez, processe todas e faça um commit por garrafa — assim nada se perde se a
  conversa acabar no meio.
- **Nunca edite garrafa que já está no arquivo** sem ele pedir. O app ignora
  código repetido, então corrigir exige mexer no app ou trocar o código.
- Se o push falhar, diga — senão ele espera uma garrafa que nunca chega.
