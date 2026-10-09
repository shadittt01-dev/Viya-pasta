# Design direction — "La Via"

Via Pasta has no public logo, photos or brand colours yet, so the identity starts from the name itself: *via* is Italian for "street". The site is built like an Italian street plaque and a trattoria table, not a generic red-checkered pizzeria.

- **The plaque**: the wordmark sits on a tomato-red sign with a thin cream inset line, set in serif capitals, like a Roman street sign. It appears in the header, the loader, the QR cards and as the app icon.
- **Cream paper** (`--paper`) for menu surfaces, with the wordmark printed faintly behind like a takeaway napkin.
- **Espresso brown** for arrival moments (header, hero, footer) and **basil green** as the secondary colour.
- **Tomato red** is reserved for the sign, primary actions and the cart count, so "Order" always looks like the sign.

The bold element is the hero: a real-time 3D pasta bowl on a wooden board, set beside the headline (mirrored for Arabic). It is stylised geometry, clearly not a photo of their food. Everything else is quiet.

## Tokens (public/css/site.css)

Token names are kept from the base system so every preset keeps working; only the values changed.

| Token | Value | Role |
|---|---|---|
| `--maroon` | `#A8322A` | tomato red: sign, primary actions |
| `--tile` / `--tile-deep` | `#2E5B3F` / `#1E3F2B` | basil green: secondary accent, tile patterns |
| `--night` | `#2A1B15` | espresso: header, hero, footer |
| `--glow` | `#E8B649` | parmesan gold: focus rings, live indicators |
| `--paper` / `--paper-2` | `#FBF6EE` / `#F2E9DA` | cream surfaces |
| `--ink` | `#2B201B` | text |

Type: Latin headings use a serif stack (Georgia / Times New Roman); body text is Readex Pro; Arabic uses Readex Pro / Noto Sans Arabic throughout. Menu descriptions are italic in English.

**Replace with the owner's real logo and colours** when supplied: Dashboard → Design (colours, presets), and upload the logo in Content.

## Default preset combination

| Slot | Preset | Why |
|---|---|---|
| Layout | `vis-tile-counter-01` | dark arrival hero, single-column menu rows that are fastest to scan on a phone |
| Hero 3D | `3d-pasta-02` Pasta bowl turntable: Bowl hero three-quarter | shows the product category at a glance |
| Menu pattern | `pat-wordmark-01` | faint "VIA PASTA" print behind the menu |

Menu illustrations (`shared/illustrations.js`) are flat vector art of each dish, colour-coded by sauce. Each one is replaced automatically when the owner uploads a photo.
