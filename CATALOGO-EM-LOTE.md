# Catalogar 300 garrafas sem pagar a API por foto

O preenchimento por IA dentro do app cobra da sua conta da Anthropic a cada
rótulo. Para a carga inicial do acervo inteiro, sai muito mais barato deixar o
**Claude Code** processar a pasta de fotos no seu computador — aí o consumo é
o da sua assinatura, não crédito de API.

O caminho é: **fotografar → Claude Code monta o JSON → app importa → nuvem
leva para o iPhone**.

---

## 1. No computador

```bash
git clone https://github.com/epentgna/adega.git
cd adega
mkdir fotos
```

Copie as fotos dos rótulos para `fotos/`. Se quiser que o local da garrafa já
venha preenchido, use subpastas com o nome da adega e da prateleira:

```
fotos/
  Adega principal/
    Prateleira 1/
      IMG_0042.jpg
      IMG_0043.jpg     ← contra-rótulo da mesma garrafa
    Prateleira 2/
      IMG_0044.jpg
```

Fotos soltas na raiz funcionam também — os vinhos entram sem local, e você
acerta depois no app (dá para filtrar por "sem adega" e mover em bloco).

A pasta `fotos/` está no `.gitignore`: suas fotos não vão para o GitHub.

## 2. Rodar o Claude Code

Na pasta do projeto, abra o Claude Code (terminal ou extensão do VS Code) e
peça:

```
/catalogar-fotos
```

Ele lê as fotos em lotes de 10, pesquisa cada vinho na web e vai escrevendo
`catalogo.json`. **É retomável**: pode fechar e voltar depois que ele pula o
que já está pronto. Com 300 garrafas, conte com algumas sessões — vai esbarrar
no limite de uso da assinatura antes de acabar.

Ao final ele diz quais vinhos ficaram com confiança baixa. Esses são os que
valem conferir.

## 3. Importar no app

Abra **https://epentgna.github.io/adega/** no navegador **do computador** (as
fotos estão lá) e vá em **Gestão → Importar em lote**:

1. Escolha o `catalogo.json`
2. Escolha as fotos — abra a pasta e selecione todas (⌘A)
3. Confira o resumo (vinhos, fotos usadas, fotos faltando, adegas a criar)
4. **Importar**

As fotos são comprimidas no próprio navegador, do mesmo jeito que as tiradas
pela câmera. Centenas de fotos levam alguns minutos; não feche a aba.

A numeração é atribuída na hora, em sequência, a partir de onde o catálogo
parou. No fim o app mostra o intervalo (ex.: `AD-0001` a `AD-0312`) e oferece
a folha de etiquetas para imprimir.

## 4. Levar para o iPhone

Com a sincronização ligada (veja [SUPABASE.md](SUPABASE.md)), entre na mesma
conta no computador e no iPhone. O catálogo sobe e desce sozinho; as fotos
chegam ao iPhone conforme você navega.

Sem sincronização, o caminho é **Backup completo** no computador e
**Restaurar** no iPhone — mas um arquivo com 300 fotos em base64 fica grande e
o Safari do iPhone pode sofrer. Para esse volume, a nuvem é o caminho.

---

## Quando ainda vale usar a IA dentro do app

Depois da carga inicial, para a garrafa avulsa que você compra: fotografar e
tocar em *Preencher com IA* custa centavos e resolve em 20 segundos. O lote é
para o acervo que já está na adega.
