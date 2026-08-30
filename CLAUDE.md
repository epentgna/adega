# Adega

App de adega pessoal. O catálogo publicado é `public/catalogo.json`; o app o
busca sozinho e importa o que é novo.

## Como se refere a um vinho — regra do dono, vale em todo lugar

**Sempre `produtor · nome · uva`, nesta ordem.** Em toda menção, em todo lugar:
resposta na conversa, tabela, relatório, página de conferência, commit, ficha.

Nunca cite um vinho só pelo nome. Metade dos rótulos da casa se chama "Touriga
Franca", "Vintage", "Grand Brut" ou "Malbec" — sem o produtor, o dono não sabe
de qual garrafa você está falando, e já perdeu tempo procurando na adega por
causa disso.

    ✅ Quinta do Crasto · Touriga Franca 2017 · Touriga Franca
    ✅ Viña Cobos · Bramare Marchiori Vineyard 2013 · Malbec
    ❌ Touriga Franca 2017
    ❌ Bramare Marchiori 2013

Quando a uva não estiver declarada no rótulo e não tiver sido registrada, diga
isso em vez de omitir em silêncio.

O mesmo vale para qualquer interface: **o produtor nunca pode ser escondido**,
nem por falta de espaço, nem em tela pequena. Se não couber tudo, corte outra
coisa.

## Outras regras da casa

- **O rótulo manda.** O que está impresso vale mais que a memória e mais que
  fonte secundária.
- **Nunca invente** nota, número de avaliações ou preço. Lacuna com motivo
  escrito vale mais que número inventado.
- **Preço em moeda estrangeira dobra** na conversão para real, por impostos.
  Preço de loja brasileira nunca dobra.
- **Volume não se assume.** Se o contrarrótulo não veio na foto, pergunte ou
  deixe registrado que é suposição — três garrafas já foram catalogadas como
  750 ml quando eram magnum.
- O mesmo vinho em local diferente, ou em formato diferente, é **entrada
  própria**, para o mapa de ocupação continuar verdadeiro.
- Interface e resposta sempre em **pt-BR**.

Detalhe do fluxo de catalogação em `.claude/skills/catalogar/SKILL.md`.
