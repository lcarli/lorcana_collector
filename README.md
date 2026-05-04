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
  pins.json            # 36 pins extraídos de lorcanaplayer.com
  lore-counters.json
  promo-cards.json     # itens com campo "number" para o número da carta
  sleeves.json
  stickers.json
  boxes.json
  book.json
  others.json
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

## Build do `pins.json`

A lista inicial veio de [lorcanaplayer.com/disney-lorcana-pins](https://lorcanaplayer.com/disney-lorcana-pins/).
O script `build_pins.py` (não versionado) regera o JSON a partir de uma cópia local da página.

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
