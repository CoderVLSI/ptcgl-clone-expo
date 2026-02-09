---
name: pokemon_tcg_images
description: Instructions for constructing Pokémon TCG image URLs from pokemontcg.io
---

# Pokémon TCG Image URL Patterns

When working with Pokémon TCG card data, image URLs from `pokemontcg.io` follow a consistent RESTful pattern based on the set ID and card number.

## URL Structure

### Small Image (Standard)
```
https://images.pokemontcg.io/{set_id}/{card_number}.png
```
- **Example:** `https://images.pokemontcg.io/me1/74.png` (Lunatone from ME1 set)

### Large Image (High Resolution)
```
https://images.pokemontcg.io/{set_id}/{card_number}_hires.png
```
- **Example:** `https://images.pokemontcg.io/me1/74_hires.png` (Lunatone from ME1 set)

## Set IDs
- `me1`: Pokémon TCG 151
- `sv3`: Obsidian Flames
- `swsh12`: Silver Tempest
- `A1`: Genetic Apex (Pokémon TCG Pocket)

## Usage Tips
1.  **Card Numbers:** Some sets use alphanumeric numbers (e.g., `SV86`, `TG23`). These are used as-is in the URL.
2.  **File Format:** Almost always `.png`.
3.  **Hires Suffix:** The `_hires` suffix is standard for the larger detailed versions.
