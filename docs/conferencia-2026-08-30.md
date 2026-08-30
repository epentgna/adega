# Conferência de inventário — 30/08/2026

Conferência física conduzida pelo dono, prateleira a prateleira, pela página de
conferência. Cobriu a **Adega principal por inteiro** (75 rótulos). A Geladeira
externa e o Armário ficaram para outra rodada — 35 rótulos não conferidos.

**Acervo: 311 → 310 garrafas.**

## Quantidades alteradas

| Código | Vinho | Antes | Depois | Onde |
|---|---|---|---|---|
| AD-0001 | Pêra-Manca Branco 2018 | 1 | **0** | Prateleira 1 |
| AD-0002 | Parcela Nicola Catena Bonarda | 1 | **0** | Prateleira 1 |
| AD-0004 | Veuve Clicquot Brut Yellow Label | 1 | **0** | Prateleira 1 |
| AD-0006 | Ornellaia Bolgheri Superiore 2014 | 1 | **0** | Prateleira 1 |
| AD-0073 | Batuta 2019 | 1 | **3** | Prateleira 9 |
| AD-0091 | Cobos Malbec Chañares Vineyard 2014 | 4 | **5** | Prateleira 12 |

As quatro zeradas foram marcadas como divergência sem motivo escrito. As fichas
foram mantidas inteiras — código, fotos e pesquisa — como histórico. **Falta
saber se foram bebidas, movidas ou dadas.**

## Dados técnicos preenchidos pela conferência

| Código | Campo | Valor | Origem |
|---|---|---|---|
| AD-0038 | teor alcoólico | 14,1% | lido no AD-0072, mesmo vinho e safra |
| AD-0072 | teor alcoólico | 14,1% | rótulo |
| AD-0059 | teor alcoólico | 20% | contrarrótulo |
| AD-0093 | teor alcoólico | 15% | rótulo ("15% pra todos") |
| AD-0094 | teor alcoólico | 15% | idem |
| AD-0095 | teor alcoólico | 15% | idem |
| AD-0083 | teor alcoólico | 19,5% **confirmado** | ressalva removida |
| AD-0061 | engarrafamento | 2013 | rótulo gasto, registrado em observações |
| AD-0079 | **safra** | **2017** | rótulo |

### AD-0079 destravado

A safra 2017 completou a ficha mais capenga da adega principal: entraram James
Suckling 97, Robert Parker 95 e Wine Spectator 94, janela 2021–2040, e o preço
caiu de R$ 1.200 para R$ 1.180 (mediana de R$ 1.160 no Mercado Livre para a
safra 2017 e R$ 1.201,75 na Oásis).

Descartado: o 100 de James Suckling que a busca devolve é do **Adrianna Vineyard
River Stones 2017**, outro vinho. Descartados também os preços de R$ 121 a
R$ 228 em marketplace, que são do Catena Malbec de entrada.

## Capacidade livre observada

Não há campo de capacidade por prateleira no catálogo. Registrado aqui:

- **Prateleira 3** — cabe 1 garrafa
- **Prateleira 4** — cabe 1 garrafa, apertado
- **Prateleira 5** — cabem 3 ou 4 garrafas
- **Prateleira 14** — vazia, a encher

## Pendências abertas por esta conferência

1. **Motivo das quatro baixas na Prateleira 1** (AD-0001, AD-0002, AD-0004, AD-0006).
2. **Batuta na Prateleira 9** — a ficha AD-0073 é 2019 e foi para 3 garrafas, mas a
   observação diz "tem 3 Batuta 2017". Ou são seis garrafas em duas safras, ou a
   safra da ficha está errada. Foto prometida.
3. ~~Quinta da Leda 2015 em magnum, Prateleira 15~~ — **resolvido**: catalogado como
   **AD-0111**, 1 garrafa. Primeiro rótulo que entra no acervo por conferência física
   em vez de catalogação. Acervo: 310 → 311 garrafas, 111 rótulos.
4. ~~Geladeira externa e Armário~~ — **conferidos na segunda rodada**. Conferência
   completa: 110 de 110 rótulos.
5. **AD-0028, AD-0029 e AD-0030 não foram encontrados** no Armário. Marcados como
   divergência, quantidade preservada em 1 cada. Na mesma observação o dono relata
   **três magnums de Quinta do Crasto** no armário. Hipótese principal: são as mesmas
   garrafas, e o erro é do catálogo — as três fichas têm só foto de frente e o volume
   de 750 ml foi assumido, nunca lido. Foto prometida; nada criado até lá.
6. **"Rita 89" do relatório é o Ruta 89 (AD-0105)**, que está no Armário e no catálogo
   desde 30/08. Não é garrafa fora da lista.
7. **AD-0014** ganhou teor alcoólico 12%, da anotação da Prateleira 3 da Geladeira.
   O AD-0019 continua sem teor — está na Prateleira 4, que não teve anotação.

## Sincronia com o app

Nenhuma destas alterações chega ao aparelho pela busca de catálogo: o
`mergeRepoEntry` (`src/lib/import.ts:344`) só preenche campos vazios de uma lista
fixa, e `quantity`, `cellarId` e `shelf` não estão nela — por decisão de projeto,
para não sobrescrever o uso do dia a dia. Os teores alcoólicos e a safra do
AD-0079 **chegam**, porque preenchem campos vazios. As **quantidades não**.

Mecanismo de revisão de inventário datada: a construir.
