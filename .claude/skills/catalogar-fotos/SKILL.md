---
name: catalogar-fotos
description: Processa uma pasta de fotos de rótulos de vinho e gera o catalogo.json que o app Adega importa. Use quando o usuário pedir para catalogar fotos de vinhos em lote, processar a pasta fotos/, ou montar o catálogo da adega a partir de imagens.
---

# Catalogar fotos de vinho em lote

Transforma uma pasta de fotos de rótulos no arquivo `catalogo.json` que o app
Adega importa em **Gestão › Importar em lote**.

## Antes de começar

1. As fotos ficam em `fotos/` (ou na pasta que o usuário indicar).
2. Se existir `catalogo.json`, **leia primeiro**: as fotos já listadas em
   `vinhos[].fotos` estão prontas e **não devem ser reprocessadas**. Este
   trabalho é retomável e quase sempre leva várias sessões.
3. Diga ao usuário quantas fotos faltam e comece.

## Localização a partir das pastas

Se as fotos estiverem em subpastas, use os nomes como local da garrafa:

```
fotos/Adega principal/Prateleira 2/IMG_0042.jpg
      └── adega ──────┘└─ prateleira ┘
```

Um nível só de subpasta vira a **adega**, com a prateleira vazia. Fotos soltas
na raiz ficam sem adega nem prateleira — o usuário resolve isso depois no app.

## O laço

Trabalhe em **lotes de 10 fotos**. Para cada lote:

1. **Leia as imagens** com a ferramenta Read (ela enxerga imagens).
2. **Agrupe por garrafa.** O padrão é uma foto por garrafa. Duas fotos
   seguidas do mesmo rótulo (frente e contra-rótulo) são **uma** garrafa, com
   os dois nomes de arquivo em `fotos`. Na dúvida, trate como garrafas
   separadas e anote em `observacoes`.
3. **Pesquise cada vinho na web** para confirmar a identificação e levantar as
   notas. Busque pelo produtor + nome + safra. Procure nota do Vivino, e de
   Robert Parker, Wine Spectator, James Suckling ou Decanter quando houver.
4. **Escreva no `catalogo.json` ao terminar cada lote**, não no fim de tudo.
   Se a sessão acabar no meio, o trabalho feito está salvo.
5. Informe o progresso ao usuário a cada lote: quantas ficaram, o que está
   incerto.

## Regras que não se quebram

- **O rótulo manda.** O que está impresso na foto vale mais do que sua
  memória: produtor, nome, safra, denominação, teor alcoólico e volume
  costumam estar lá.
- **Nunca invente nota, número de avaliações ou preço.** Sem número confiável
  encontrado na busca, o campo fica ausente. Uma ficha com lacunas é útil; uma
  ficha com nota inventada envenena o catálogo inteiro.
- **Escala junto da nota.** Vivino é 0–5; os críticos são 0–100.
- Prefira a nota **da safra da garrafa**. Se só achar a nota geral do rótulo,
  deixe `safra` da avaliação como `null`.
- Rótulo ilegível ou vinho não identificado: registre assim mesmo, com o que
  dá para ler, `confianca` baixa e o motivo em `observacoes`. Não pule a foto
  — o usuário precisa saber que aquela garrafa existe.
- `descricaoCardapio`: uma frase curta e elegante (até 160 caracteres) para
  uma carta de vinhos, sem repetir o nome do produtor.

## Formato do arquivo

```json
{
  "app": "adega",
  "formato": "importacao",
  "versao": 1,
  "vinhos": [
    {
      "fotos": ["IMG_0042.jpg", "IMG_0043.jpg"],
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
      "prateleira": "Prateleira 2",
      "posicao": "",
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
      "precoPago": null,
      "descricaoCardapio": "Cabernet Franc de altitude, floral e de taninos finos.",
      "confianca": 0.92,
      "fontes": ["vivino.com", "robertparker.com"],
      "observacoes": "Não achei nota da safra 2018 no Wine Spectator."
    }
  ]
}
```

`tipo` aceita: `Tinto`, `Branco`, `Rosé`, `Espumante`, `Sobremesa`,
`Fortificado`, `Laranja`.

Campo sem informação: omita, ou use `null` nos numéricos. Nomes de arquivo em
`fotos` são só o nome, sem caminho.

## Ao terminar

Diga ao usuário:

- quantos vinhos entraram no arquivo;
- quantos ficaram com `confianca` abaixo de 0,6 — são os que ele deve conferir
  primeiro no app;
- quais não tiveram nenhuma nota encontrada.

Depois é só ele abrir o app em **Gestão › Importar em lote**, escolher o
`catalogo.json` e as fotos.
