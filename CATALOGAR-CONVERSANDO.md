# Catalogar conversando

O jeito mais simples de cadastrar as garrafas: você fotografa e fala. Sem
gastar crédito de API, porque quem identifica o vinho é o Claude da conversa,
pela sua assinatura.

## Como se usa

Abra uma sessão do Claude neste repositório (`epentgna/adega`) e mande:

> *[foto do rótulo]*
> Prateleira 1, adega principal

Pronto. O Claude identifica o vinho, pesquisa as notas do Vivino e dos
críticos, atribui o próximo número (`AD-0007`), guarda a foto e faz o push.
Responde algo como:

> **AD-0007** · Gran Enemigo Single Vineyard Gualtallary 2018, Aleanna
> Vivino 4,4 · Parker 97. Guarda até 2038.

Da segunda garrafa em diante, é só mandar a foto — o local anterior continua
valendo até você dizer outro. Se você não disser nada sobre o local na
primeira, ele pergunta a prateleira e só isso.

Mande várias fotos de uma vez se quiser: ele processa uma por uma.

## Como chega no app

Abra o app. **Ele busca sozinho** e mostra um aviso: *"3 garrafas novas"*.

O app lê o `catalogo.json` publicado junto com o site e traz só o que ainda não
tem — não rebaixa nada. Dá para forçar em **Gestão → Importar em lote →
Buscar garrafas novas**, e desligar a busca automática em Configurações.

Leva um ou dois minutos entre o push e o app enxergar: é o tempo do deploy do
GitHub Pages rodar.

## O que fica público

As fotos vão para `public/fotos/` neste repositório, que é **público** (é o
que permite o GitHub Pages grátis). São fotos de rótulo, mas vale você saber.

Se preferir que não fiquem públicas, o caminho é fotografar pelo próprio app
(a foto fica só no seu aparelho) e usar a conversa só quando não se importar.

## Corrigir alguma coisa

O app ignora código repetido, então mandar de novo não corrige. Para ajustar
uma ficha, edite direto no app — em **Editar**, na tela do vinho. É mais rápido
que mexer no arquivo, e o que você digita à mão nunca é sobrescrito.
