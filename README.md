# Lorcana Collection Tracker

Página simples para acompanhar a minha coleção de Disney Lorcana (pins, lore counters, cartas promo, sleeves, stickers, boxes, book, outros).

🌐 **Live:** https://lcarli.github.io/lorcana_collector/

## Como funciona

- Cada aba lista os itens com imagem e nome (cartas também mostram o número).
- Clique em um card para alternar entre **possuído** ✓ e **faltando**.
- O estado é salvo no `localStorage` do navegador.
- Botões **Exportar** / **Importar** permitem backup do JSON da coleção.
- A barra de progresso mostra `possuídos / total` por aba.

## Estrutura

```
index.html       # página principal com tabs
styles.css       # estilos
app.js           # lógica de render + persistência local
data/
  pins.json            # 36 pins
  playmats.json        # tapetes de jogo
  lore-counters.json   # lore counters / lore trackers
  promo-cards.json     # cartas promo (campo "number" para o número da carta)
  sleeves.json         # card sleeves
  stickers.json        # stickers
  deck-box.json        # deck boxes / deck cases
  boxes.json           # storage boxes
  portfolio.json       # portfolios / folios
  others.json          # notebook, premium deck box, magnetic case, collector's guide
```

### Formato de cada item

```json
{
  "id": "slug-unico",
  "name": "Nome do item",
  "image": "https://.../imagem.jpg",
  "set": "Nome do set / categoria",
  "number": "150/204"   // opcional, usado para cartas promo
}
```

## Build dos JSONs

Os dados vêm de [lorcanaplayer.com](https://lorcanaplayer.com):

- `build_pins.py` — gera `data/pins.json` a partir de `https://lorcanaplayer.com/disney-lorcana-pins/`.
- `build_products.py` — gera as demais categorias a partir de `https://lorcanaplayer.com/products/`.

Ambos os scripts (e suas páginas HTML baixadas localmente) ficam fora do versionamento via `.gitignore`.

## Deploy (GitHub Pages)

1. Push para `main`.
2. Em **Settings → Pages**, selecionar:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` / root (`/`)
3. Aguardar alguns segundos e acessar o link gerado.

Como tudo é estático (HTML + CSS + JS + JSON), nenhum build é necessário.

## Crédito / Disclaimer

Imagens dos pins via [Lorcana Player](https://lorcanaplayer.com/disney-lorcana-pins/).
Projeto de fã, sem afiliação com Disney ou Ravensburger.
