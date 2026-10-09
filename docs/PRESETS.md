# Preset catalogue

Generated from `shared/presets/registry.js` by `node scripts/preset-docs.js`. **480 presets**: 120 visual style & layout, 120 3d scenes & animation, 120 interface motion & interaction, 120 backgrounds, textures & patterns.

Every preset has a stable ID, a name, a category, a renderer label, configurable parameters (validated and clamped on the server), recommended uses, a performance tier and a reduced-motion fallback. Previews render live in the dashboard (Design → Gallery). ★ = part of the default combination chosen for Via Pasta.

Renderer labels are literal: **webgl-3d** = real 3D geometry rendered with WebGL2; **css-depth** = perspective transforms (not real 3D); **css-2d** = 2D Web Animations; **view-transition** = browser page transitions; **svg-pattern** = static 2D SVG tiles; **css-layout** = layout/styling only.

## Visual style & layout (120)

| | ID | Name | Renderer | Perf | Parameters | Reduced motion |
|---|---|---|---|---|---|---|
| ★ | `vis-tile-counter-01` | Tile Counter: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-02` | Tile Counter: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-03` | Tile Counter: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-04` | Tile Counter: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-05` | Tile Counter: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-06` | Tile Counter: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-07` | Tile Counter: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-08` | Tile Counter: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-09` | Tile Counter: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-tile-counter-10` | Tile Counter: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-01` | Wax Paper: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-02` | Wax Paper: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-03` | Wax Paper: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-04` | Wax Paper: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-05` | Wax Paper: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-06` | Wax Paper: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-07` | Wax Paper: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-08` | Wax Paper: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-09` | Wax Paper: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-wax-paper-10` | Wax Paper: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-01` | Menu Board: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-02` | Menu Board: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-03` | Menu Board: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-04` | Menu Board: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-05` | Menu Board: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-06` | Menu Board: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-07` | Menu Board: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-08` | Menu Board: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-09` | Menu Board: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-menu-board-10` | Menu Board: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-01` | Night Shift: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-02` | Night Shift: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-03` | Night Shift: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-04` | Night Shift: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-05` | Night Shift: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-06` | Night Shift: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-07` | Night Shift: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-08` | Night Shift: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-09` | Night Shift: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-night-shift-10` | Night Shift: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-01` | Poster: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-02` | Poster: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-03` | Poster: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-04` | Poster: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-05` | Poster: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-06` | Poster: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-07` | Poster: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-08` | Poster: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-09` | Poster: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-poster-10` | Poster: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-01` | Receipt: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-02` | Receipt: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-03` | Receipt: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-04` | Receipt: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-05` | Receipt: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-06` | Receipt: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-07` | Receipt: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-08` | Receipt: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-09` | Receipt: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-receipt-10` | Receipt: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-01` | Neon Edge: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-02` | Neon Edge: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-03` | Neon Edge: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-04` | Neon Edge: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-05` | Neon Edge: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-06` | Neon Edge: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-07` | Neon Edge: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-08` | Neon Edge: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-09` | Neon Edge: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-neon-edge-10` | Neon Edge: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-01` | Street Sticker: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-02` | Street Sticker: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-03` | Street Sticker: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-04` | Street Sticker: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-05` | Street Sticker: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-06` | Street Sticker: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-07` | Street Sticker: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-08` | Street Sticker: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-09` | Street Sticker: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-street-sticker-10` | Street Sticker: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-01` | Editorial Stack: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-02` | Editorial Stack: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-03` | Editorial Stack: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-04` | Editorial Stack: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-05` | Editorial Stack: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-06` | Editorial Stack: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-07` | Editorial Stack: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-08` | Editorial Stack: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-09` | Editorial Stack: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-editorial-stack-10` | Editorial Stack: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-01` | Grid Market: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-02` | Grid Market: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-03` | Grid Market: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-04` | Grid Market: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-05` | Grid Market: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-06` | Grid Market: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-07` | Grid Market: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-08` | Grid Market: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-09` | Grid Market: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-grid-market-10` | Grid Market: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-01` | Minimal Counter: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-02` | Minimal Counter: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-03` | Minimal Counter: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-04` | Minimal Counter: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-05` | Minimal Counter: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-06` | Minimal Counter: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-07` | Minimal Counter: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-08` | Minimal Counter: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-09` | Minimal Counter: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-minimal-counter-10` | Minimal Counter: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-01` | Late Night Split: Printed rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-02` | Late Night Split: Two-up cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-03` | Late Night Split: Three-up compact | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-04` | Late Night Split: Price board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-05` | Late Night Split: Swipe shelves | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-06` | Late Night Split: Ticket stubs | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-07` | Late Night Split: Sticker rows | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-08` | Late Night Split: Tile cards | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-09` | Late Night Split: Quiet board | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |
|  | `vis-late-night-split-10` | Late Night Split: Outlined grid | css-layout | light | hero (6), menu (6), card (5), scale (3), density (3), radius (4), surface (3), accent (4), heroHeight 45–100 | Static layout — unaffected. |

## 3D scenes & animation (120)

| | ID | Name | Renderer | Perf | Parameters | Reduced motion |
|---|---|---|---|---|---|---|
|  | `3d-tilewave-01` | Ceramic tile wave: Storefront ripple | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-02` | Ceramic tile wave: Diagonal swell | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-03` | Ceramic tile wave: Radial breath | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-04` | Ceramic tile wave: Row cascade | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-05` | Ceramic tile wave: Noise field | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-06` | Ceramic tile wave: Column pulse | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-07` | Ceramic tile wave: Low angle ripple | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-08` | Ceramic tile wave: Brick diagonal | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-09` | Ceramic tile wave: Calm wall | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-tilewave-10` | Ceramic tile wave: Dense noise | webgl-3d | medium | wave (6), cols 8–40, rows 3–16, tile (3), amplitude 0–1, speed 0–2, camera (3), sign on/off, glowSweep on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-01` | Pasta bowl turntable: Alfredo spin | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
| ★ | `3d-pasta-02` | Pasta bowl turntable: Bowl hero three-quarter | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-03` | Pasta bowl turntable: Pesto three-quarter | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-04` | Pasta bowl turntable: Bolognese studio | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-05` | Pasta bowl turntable: Top-down bowl | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-06` | Pasta bowl turntable: Opened layers | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-07` | Pasta bowl turntable: Night turntable | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-08` | Pasta bowl turntable: Slow warm orbit | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-09` | Pasta bowl turntable: Floating layers | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-pasta-10` | Pasta bowl turntable: Still studio | webgl-3d | medium | recipe (4), camera (4), speed 0–2, explode 0–1, plate (3), light (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-01` | Plate build: Breathing plate | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-02` | Plate build: Drop in | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-03` | Plate build: Spiral build | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-04` | Plate build: Pop apart | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-05` | Plate build: Slice view | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-06` | Plate build: Low breathe | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-07` | Plate build: Fast drop | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-08` | Plate build: Wide spiral | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-09` | Plate build: Gentle pop | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-stack-10` | Plate build: Tall slice | webgl-3d | medium | mode (5), recipe (4), spacing 0.1–1.5, speed 0–2, camera (3) | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-01` | Floating forms: Sesame spheres | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-02` | Floating forms: Tile cubes | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-03` | Floating forms: Onion rings | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-04` | Floating forms: Mixed shelf | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-05` | Floating forms: Capsule drift | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-06` | Floating forms: Icosa tumble | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-07` | Floating forms: Dense spheres | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-08` | Floating forms: Floating cubes | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-09` | Floating forms: Metal rings | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-forms-10` | Floating forms: Sparse mixed | webgl-3d | light | shape (6), count 4–60, spread 1–6, drift (4), material (3), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-01` | Particle field: Grill embers | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-02` | Particle field: Steam | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-03` | Particle field: Sesame swirl | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-04` | Particle field: Dust drift | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-05` | Particle field: LED glow | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-06` | Particle field: Ember burst | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-07` | Particle field: Sesame fall | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-08` | Particle field: Glow swirl | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-09` | Particle field: Heavy steam | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-particles-10` | Particle field: Dense dust | webgl-3d | light | kind (5), count 50–3000, motion (5), size 1–12, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-01` | Logo sculpture: Sign block | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-02` | Logo sculpture: Turntable block | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-03` | Logo sculpture: Stacked blocks | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-04` | Logo sculpture: Ring of signs | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-05` | Logo sculpture: Sign grid | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-06` | Logo sculpture: Mirror pair | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-07` | Logo sculpture: Flip sign | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-08` | Logo sculpture: Still with light | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-09` | Logo sculpture: Floating stack | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-logo-10` | Logo sculpture: Grid float | webgl-3d | light | arrangement (5), motion (5), bevel 0–0.3, lightSweep on/off, tileBackdrop on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-01` | Wedges in motion: Falling wedges | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-02` | Wedges in motion: Wedge pile | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-03` | Wedges in motion: Spinning cup | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-04` | Wedges in motion: Wedge fountain | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-05` | Wedges in motion: Wedge orbit | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-06` | Wedges in motion: Light rain | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-07` | Wedges in motion: Big pile | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-08` | Wedges in motion: Slow spin | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-09` | Wedges in motion: Burst fountain | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-wedges-10` | Wedges in motion: Wide orbit | webgl-3d | medium | mode (5), count 10–300, speed 0–2, cup on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-01` | Material study: Glazed sphere | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-02` | Material study: Lacquer torus | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-03` | Material study: Steel knot | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-04` | Material study: Paper box | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-05` | Material study: Ceramic cylinder | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-06` | Material study: Lacquer knot | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-07` | Material study: Tile box | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-08` | Material study: Steel sphere | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-09` | Material study: Ceramic torus | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-material-10` | Material study: Paper cylinder | webgl-3d | light | geometry (5), material (5), lightOrbit 0–2, rim on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-01` | Light sweep: Wall scan | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-02` | Light sweep: Sign spotlight | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-03` | Light sweep: Counter glow | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-04` | Light sweep: Neon flicker | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-05` | Light sweep: Vertical wash | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-06` | Light sweep: Warm circle | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-07` | Light sweep: Twin scan | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-08` | Light sweep: Four corners | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-09` | Light sweep: Counter flicker | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-lights-10` | Light sweep: Slow wash | webgl-3d | medium | scene (3), lights 1–4, palette (3), sweep (4), speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-01` | Spatial menu cards: Card ring | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-02` | Spatial menu cards: Helix | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-03` | Spatial menu cards: Fan | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-04` | Spatial menu cards: Floating grid | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-05` | Spatial menu cards: Deck stack | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-06` | Spatial menu cards: Big ring | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-07` | Spatial menu cards: Tight helix | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-08` | Spatial menu cards: Wide fan | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-09` | Spatial menu cards: Tilted grid | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-cards-10` | Spatial menu cards: Tall stack | webgl-3d | medium | layout (5), cards 3–16, tilt 0–45, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-01` | Paper sheet: Gentle wave | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-02` | Paper sheet: Corner fold | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-03` | Paper sheet: Ripple | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-04` | Paper sheet: Flutter | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-05` | Paper sheet: Crumple | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-06` | Paper sheet: Plain wave | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-07` | Paper sheet: Deep fold | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-08` | Paper sheet: Fine ripple | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-09` | Paper sheet: Branded flutter | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-paper-10` | Paper sheet: Soft crumple | webgl-3d | light | mode (5), segments 8–80, amplitude 0–1, wordmark on/off, speed 0–2 | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-01` | Ingredient orbit: Penne ring | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-02` | Ingredient orbit: Tomato atom | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-03` | Ingredient orbit: Cheese spiral | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-04` | Ingredient orbit: Basil swarm | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-05` | Ingredient orbit: Mixed layers | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-06` | Ingredient orbit: Mixed swarm | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-07` | Ingredient orbit: Tomato ring | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-08` | Ingredient orbit: Penne spiral | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-09` | Ingredient orbit: Cheese layers | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |
|  | `3d-ingredients-10` | Ingredient orbit: Basil atom | webgl-3d | medium | set (5), orbit (5), count 4–80, speed 0–2, bowl on/off | Renders a single still frame; static CSS art if WebGL is unavailable or the device is low-power. |

## Interface motion & interaction (120)

| | ID | Name | Renderer | Perf | Parameters | Reduced motion |
|---|---|---|---|---|---|---|
|  | `mot-cartadd-01` | Add-to-cart feedback: Arc fly | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-02` | Add-to-cart feedback: Straight fly | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
| ★ | `mot-cartadd-03` | Add-to-cart feedback: Badge pop | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-04` | Add-to-cart feedback: Badge spin | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-05` | Add-to-cart feedback: Button check | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-06` | Add-to-cart feedback: Ripple | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-07` | Add-to-cart feedback: Count roll | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-08` | Add-to-cart feedback: Dot burst | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-09` | Add-to-cart feedback: Ticket drop | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-cartadd-10` | Add-to-cart feedback: Glow pulse | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Badge count updates instantly with no movement. |
|  | `mot-sheet-01` | Item sheet & drawer: Slide up | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
| ★ | `mot-sheet-02` | Item sheet & drawer: Spring up | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-03` | Item sheet & drawer: Scale fade | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-04` | Item sheet & drawer: From card | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-05` | Item sheet & drawer: Slide side | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-06` | Item sheet & drawer: Drop down | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-07` | Item sheet & drawer: Fade through | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-08` | Item sheet & drawer: Unfold | css-depth | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-09` | Item sheet & drawer: Clip reveal | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
|  | `mot-sheet-10` | Item sheet & drawer: Stack rise | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Appears instantly in place. |
| ★ | `mot-press-01` | Button press: Depress | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-02` | Button press: Squish | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-03` | Button press: Glow ring | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-04` | Button press: Underline | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-05` | Button press: Tilt press | css-depth | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-06` | Button press: Fill sweep | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-07` | Button press: Shadow drop | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-08` | Button press: Bounce | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-09` | Button press: Ink spread | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
|  | `mot-press-10` | Button press: Shrink snap | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No movement; focus ring and colour change only. |
| ★ | `mot-pricetick-01` | Price change: Roll up | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-02` | Price change: Roll down | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-03` | Price change: Crossfade | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-04` | Price change: Flip | css-depth | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-05` | Price change: Slide swap | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-06` | Price change: Scale swap | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-07` | Price change: Blink highlight | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-08` | Price change: Odometer | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-09` | Price change: Typewriter | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
|  | `mot-pricetick-10` | Price change: Fade color | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | New value replaces the old one instantly. |
| ★ | `mot-toast-01` | Toast message: Slide bottom | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-02` | Toast message: Slide side | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-03` | Toast message: Pop | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-04` | Toast message: Drop top | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-05` | Toast message: Ticket print | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-06` | Toast message: Fade | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-07` | Toast message: Spring bottom | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-08` | Toast message: Grow pill | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-09` | Toast message: Swing | css-depth | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
|  | `mot-toast-10` | Toast message: Rise stack | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Shown and hidden without movement. |
| ★ | `mot-tab-01` | Category tab indicator: Slide underline | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-02` | Category tab indicator: Pill morph | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-03` | Category tab indicator: Ink stretch | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-04` | Category tab indicator: Fade pill | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-05` | Category tab indicator: Dot follow | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-06` | Category tab indicator: Box slide | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-07` | Category tab indicator: Thick bar | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-08` | Category tab indicator: Glow line | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-09` | Category tab indicator: Grow center | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
|  | `mot-tab-10` | Category tab indicator: Jump pill | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Indicator jumps to the active tab. |
| ★ | `mot-loader-01` | Logo loader: Bar sweep | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-02` | Logo loader: Bar fill | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-03` | Logo loader: Tile fill | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-04` | Logo loader: Wordmark pulse | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-05` | Logo loader: Dots | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-06` | Logo loader: Ring | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-07` | Logo loader: Stripe scroll | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-08` | Logo loader: Block flip | css-depth | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-09` | Logo loader: Glow breathe | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-loader-10` | Logo loader: Letters | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static logo; removed as soon as the page is ready. |
|  | `mot-reveal-01` | Hero reveal: Fade up | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
| ★ | `mot-reveal-02` | Hero reveal: Clip wipe | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-03` | Hero reveal: Tile flip | css-depth | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-04` | Hero reveal: Mask slide | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-05` | Hero reveal: Scale in | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-06` | Hero reveal: Stagger up | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-07` | Hero reveal: Fade | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-08` | Hero reveal: Slide side | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-09` | Hero reveal: Rise rotate | css-depth | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
|  | `mot-reveal-10` | Hero reveal: Curtain | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Content is visible immediately. |
| ★ | `mot-hover-01` | Card hover: Lift | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-02` | Card hover: Tilt 3d | css-depth | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-03` | Card hover: Border glow | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-04` | Card hover: Art zoom | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-05` | Card hover: Shadow grow | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-06` | Card hover: Nudge | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-07` | Card hover: Underline name | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-08` | Card hover: Tint | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-09` | Card hover: Rotate art | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
|  | `mot-hover-10` | Card hover: Raise art | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | No hover movement. |
| ★ | `mot-page-01` | Page transition: Crossfade | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-02` | Page transition: Slide | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-03` | Page transition: Wipe | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-04` | Page transition: Scale | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-05` | Page transition: Fade up | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-06` | Page transition: Tile sweep | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-07` | Page transition: Instant | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-08` | Page transition: Split | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-09` | Page transition: Zoom out | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
|  | `mot-page-10` | Page transition: Push | view-transition | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Instant navigation. |
| ★ | `mot-status-01` | Order status steps: Fill line | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-02` | Order status steps: Check draw | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-03` | Order status steps: Pulse current | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-04` | Order status steps: Step pop | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-05` | Order status steps: Progress bar | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-06` | Order status steps: Dot chase | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-07` | Order status steps: Glow current | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-08` | Order status steps: Tick in | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-09` | Order status steps: Grow ring | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
|  | `mot-status-10` | Order status steps: Bounce current | css-2d | light | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Steps update without animation. |
| ★ | `mot-skeleton-01` | Loading placeholder: Shimmer | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-02` | Loading placeholder: Pulse | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-03` | Loading placeholder: Wave | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-04` | Loading placeholder: Tile shimmer | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-05` | Loading placeholder: Stripes | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-06` | Loading placeholder: Fade blocks | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-07` | Loading placeholder: Sweep diagonal | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-08` | Loading placeholder: Breathe | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-09` | Loading placeholder: Scan line | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |
|  | `mot-skeleton-10` | Loading placeholder: Dots | css-2d | light (loops only while visible) | duration 60–2400, easing (6), distance 0–48, intensity 0.1–1 | Static grey placeholders. |

## Backgrounds, textures & patterns (120)

| | ID | Name | Renderer | Perf | Parameters | Reduced motion |
|---|---|---|---|---|---|---|
| ★ | `pat-wordmark-01` | Wordmark paper: Wrapper brick | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-02` | Wordmark paper: Wrapper grid | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-03` | Wordmark paper: Diagonal stamp | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-04` | Wordmark paper: Full name rows | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-05` | Wordmark paper: Arabic brick | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-06` | Wordmark paper: Bilingual alternate | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-07` | Wordmark paper: Outline columns | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-08` | Wordmark paper: Micro grid | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-09` | Wordmark paper: Tilted alternate | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
|  | `pat-wordmark-10` | Wordmark paper: Poster sparse | svg-pattern | light | text (4), arrangement (5), size 8–48, gap 0.4–3, rotate -90–90, weight (3), outline on/off, color (9) | Static by design — nothing animates. |
| ★ | `pat-tile-01` | Glazed tile: Storefront stack | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-02` | Glazed tile: Running subway | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-03` | Glazed tile: Herringbone | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-04` | Glazed tile: Basketweave | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-05` | Glazed tile: Square stack | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-06` | Glazed tile: Third offset | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-07` | Glazed tile: Chevron | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
| ★ | `pat-tile-08` | Glazed tile: Vertical running | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-09` | Glazed tile: Maroon counter | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-tile-10` | Glazed tile: Large stack | svg-pattern | light | bond (8), tile 6–40, ratio 1–4, grout 0.5–4, glaze on/off, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-01` | Sesame scatter: Scattered seeds | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-02` | Sesame scatter: Dense seeds | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-03` | Sesame scatter: Seed clusters | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-04` | Sesame scatter: Seed rows | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-05` | Sesame scatter: Pepper dots | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-06` | Sesame scatter: Large dots | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-07` | Sesame scatter: Dashes | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-08` | Sesame scatter: Dash rows | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-09` | Sesame scatter: Crumbs | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-sesame-10` | Sesame scatter: Crumb clusters | svg-pattern | light | shape (4), density 4–60, size 1–6, jitter 0–180, layout (3), seed 1–999, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-01` | Halftone: Even square | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-02` | Halftone: Even hex | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-03` | Halftone: Linear fade | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-04` | Halftone: Hex linear | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-05` | Halftone: Radial spot | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-06` | Halftone: Hex radial | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-07` | Halftone: Wave | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-08` | Halftone: Hex wave | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-09` | Halftone: Fine pepper | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-halftone-10` | Halftone: Bold poster | svg-pattern | light | grid (2), gradient (4), spacing 6–24, dot 0.5–6, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-01` | Paper stripes: Even vertical | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-02` | Paper stripes: Pinstripe | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-03` | Paper stripes: Double line | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-04` | Paper stripes: Candy diagonal | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-05` | Paper stripes: Varied vertical | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-06` | Paper stripes: Awning | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-07` | Paper stripes: Horizontal even | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-08` | Paper stripes: Reverse diagonal pin | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-09` | Paper stripes: Horizontal double | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-stripes-10` | Paper stripes: Diagonal varied | svg-pattern | light | rhythm (6), angle -45–90, unit 2–24, color (9) | Static by design — nothing animates. |
|  | `pat-check-01` | Deli check: Checker small | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-02` | Deli check: Checker large | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-03` | Deli check: Gingham | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-04` | Deli check: Gingham large | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-05` | Deli check: Diamond | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-06` | Deli check: Diamond large | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-07` | Deli check: Windowpane | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-08` | Deli check: Windowpane large | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-09` | Deli check: Buffalo | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-check-10` | Deli check: Buffalo large | svg-pattern | light | kind (5), size 4–40, color (9) | Static by design — nothing animates. |
|  | `pat-rings-01` | Plate rings: Single ring grid | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-02` | Plate rings: Uneven rings | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-03` | Plate rings: Brick rings | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-04` | Plate rings: Quarter offset | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-05` | Plate rings: Target | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-06` | Plate rings: Irregular brick | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-07` | Plate rings: Fine grid | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-08` | Plate rings: Bold single | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-09` | Plate rings: Offset irregular | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-rings-10` | Plate rings: Large brick | svg-pattern | light | rings 1–6, cell 24–96, layout (4), stroke 0.5–4, irregular on/off, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-01` | Receipt edge: Zigzag rows | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-02` | Receipt edge: Fine zigzag | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-03` | Receipt edge: Scallop | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-04` | Receipt edge: Deep scallop | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
| ★ | `pat-receipt-05` | Receipt edge: Perforation | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-06` | Receipt edge: Wide perforation | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-07` | Receipt edge: Torn edge | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-08` | Receipt edge: Torn fine | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-09` | Receipt edge: Notched | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-receipt-10` | Receipt edge: Notched wide | svg-pattern | light | edge (5), wave 6–40, depth 2–16, rowGap 20–120, color (9) | Static by design — nothing animates. |
|  | `pat-icons-01` | Menu icons: Penne grid | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-02` | Menu icons: Farfalle grid | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-03` | Menu icons: Mixed brick | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-04` | Menu icons: Mixed tossed | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-05` | Menu icons: Fork diagonal | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-06` | Menu icons: Bowl brick | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-07` | Menu icons: Penne tossed | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-08` | Menu icons: Fine mixed grid | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-09` | Menu icons: Farfalle diagonal | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-icons-10` | Menu icons: Large mixed brick | svg-pattern | light | set (5), layout (4), size 12–48, gap 0.5–3, stroke 0.75–3, color (9) | Static by design — nothing animates. |
|  | `pat-grill-01` | Linen stripes: Diagonal grill | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-02` | Linen stripes: Cross hatch | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-03` | Linen stripes: Double line | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-04` | Linen stripes: Wavy grill | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-05` | Linen stripes: Char dashes | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-06` | Linen stripes: Wide diagonal | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-07` | Linen stripes: Fine cross | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-08` | Linen stripes: Heavy double | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-09` | Linen stripes: Fine wave | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-grill-10` | Linen stripes: Heavy char | svg-pattern | light | kind (5), spacing 8–40, thickness 1–8, color (9) | Static by design — nothing animates. |
|  | `pat-arches-01` | Arches: Arches | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-02` | Arches: Filled arches | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-03` | Arches: Scales | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-04` | Arches: Domes | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-05` | Arches: Filled domes | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-06` | Arches: Fan | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-07` | Arches: Waves | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-08` | Arches: Large arches | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-09` | Arches: Fine scales | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-arches-10` | Arches: Large fan | svg-pattern | light | kind (5), size 12–64, stroke 0.75–4, filled on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-01` | Neon grid: Neon square grid | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-02` | Neon grid: Neon dots | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-03` | Neon grid: Plus marks | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-04` | Neon grid: Isometric | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-05` | Neon grid: Diagonal lines | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-06` | Neon grid: Blueprint grid | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-07` | Neon grid: Sparse dots | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-08` | Neon grid: Plus glow | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-09` | Neon grid: Fine iso | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |
|  | `pat-neon-10` | Neon grid: Maroon diagonal | svg-pattern | light | kind (5), spacing 10–64, stroke 0.5–3, glow on/off, color (9) | Static by design — nothing animates. |

