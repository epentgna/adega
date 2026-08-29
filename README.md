# Adega

PWA pessoal e **offline** para catalogar, gerenciar e servir uma coleção de vinhos.
Cada garrafa ganha uma **numeração única**, uma **foto do rótulo** e uma **ficha
pesquisada por IA** — e a coleção vira um **cardápio** pronto para imprimir.

Sem backend, sem login: todos os dados ficam no seu aparelho (IndexedDB).

## Os três módulos

- **Catálogo** — busca por qualquer campo (nome, uva, região, número da garrafa),
  filtros por tipo/país/uva/adega/prateleira/nota, e ordenação por número, nota,
  safra, preço ou local.
- **Gestão** — adegas e prateleiras, mapa de ocupação, valor investido × valor
  atual, histórico de consumo, folha de etiquetas para imprimir, backup.
- **Cardápio** — carta agrupada por tipo e ordenada por região, com descrição,
  notas e preço opcionais. O botão de impressão gera um PDF limpo em papel branco.

## Catalogação com IA

O fluxo por garrafa é: **fotografar o rótulo → tocar em "Preencher com IA" →
revisar → escolher adega e prateleira → salvar**.

O app manda a foto para a API da Anthropic. O modelo lê o rótulo, **pesquisa na
web** (ferramenta de busca do servidor) e devolve a ficha: produtor, uvas, região,
safra, teor alcoólico, notas de degustação, harmonizações, janela de guarda,
temperatura de serviço, faixa de preço, uma frase para o cardápio e as
**avaliações que encontrou** (Vivino na escala 5; Parker, Wine Spectator,
Suckling e Decanter na escala 100).

Detalhes que importam:

- A **chave da API é sua** e fica só neste aparelho — nunca entra no backup.
  Pegue em `console.anthropic.com` e configure em **Gestão › Configurações**.
- Custo por vinho: alguns centavos de dólar no Opus 5 com busca na web, menos no
  Sonnet 5. Cobrado direto pela Anthropic.
- **O Vivino não tem API pública.** A nota vem da pesquisa do modelo, é marcada
  como pesquisada (✨) e pode ser de outra safra. O app mostra a confiança da
  identificação e as fontes consultadas — **revise antes de salvar**.
- O que você digitou à mão nunca é sobrescrito pela IA.
- Sem chave configurada, o app funciona inteiro — só o preenchimento é manual.

## Catalogar o acervo inteiro de uma vez

Preencher 300 garrafas uma a uma pelo app consome crédito de API a cada rótulo.
Para a carga inicial sai muito mais barato deixar o **Claude Code** processar a
pasta de fotos no computador (consumo da assinatura, não da API) e importar o
resultado em **Gestão › Importar em lote**. Passo a passo em
[CATALOGO-EM-LOTE.md](CATALOGO-EM-LOTE.md); a skill que faz o trabalho está em
`.claude/skills/catalogar-fotos/`.

## Numeração

Cada garrafa recebe um código sequencial (`AD-0001`, `AD-0002`…) reservado assim
que a tela de catalogação abre, para você já etiquetar a garrafa. Apagar um vinho
**não** recicla o número: a etiqueta colada é definitiva. Prefixo e número de
dígitos são configuráveis.

## Fotos

Cada foto é redimensionada para 1400px e recomprimida em WebP (~120 KB) antes de
ir para o IndexedDB — 300+ garrafas com 2 fotos cada ficam em torno de 70 MB.
A primeira foto é a capa.

## Rodar localmente

```bash
npm install
npm run dev
```

Outros comandos:

```bash
npm run build     # type-check + build de produção (gera o service worker)
npm run preview   # serve o build de produção
npm run lint      # só o type-check
```

Os ícones do PWA são gerados por `node scripts/gen-icons.mjs` (sem dependências;
já commitados em `public/`).

## Instalar no iPhone

O iOS só instala PWAs pelo **Safari**:

1. Faça o deploy (o workflow em `.github/workflows/deploy.yml` publica no GitHub
   Pages a cada push na `main`) e abra a URL **no Safari**.
2. **Compartilhar → Adicionar à Tela de Início**.
3. O Adega abre em tela cheia e funciona **offline** depois do primeiro
   carregamento — inclusive a câmera e o catálogo inteiro.

> O preenchimento por IA é a única parte que precisa de internet.

## Sincronização em nuvem (opcional)

Sem login o app funciona inteiro, só não sincroniza. Entrando com Google (ou
link por e-mail) em **Gestão › Configurações › Conta e sincronização**, a adega
passa a acompanhar você entre iPhone, iPad e Mac e sobrevive à troca de
aparelho: a ficha dos vinhos vai para uma linha `jsonb` no Supabase e as fotos
para o Storage, baixadas sob demanda.

O passo a passo de configuração (tabelas, bucket e URL de retorno) está em
[SUPABASE.md](SUPABASE.md). A chave da API **nunca** sai do aparelho.

## Backup

Mesmo com a nuvem ligada, vale ter o arquivo. Em **Gestão › Configurações**:

- **Backup dos dados** (JSON leve, sem fotos)
- **Backup completo** (JSON com as fotos em base64)
- **Planilha CSV** (uma linha por vinho, separador `;`, pronta para o Excel)
- **Restaurar** substitui tudo o que está no aparelho

## Stack

React 18 · Vite · TypeScript · Tailwind CSS · Dexie (IndexedDB) ·
dexie-react-hooks · react-router-dom · vite-plugin-pwa · `@anthropic-ai/sdk`
(chamado direto do navegador, com a chave do próprio dono do aparelho).
Interface em Português (Brasil).
