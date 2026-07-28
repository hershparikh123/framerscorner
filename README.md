# Framer's Corner

Static marketing site for Framer's Corner — custom picture framing, 22 US-46 West, Pine Brook NJ.

No build step. Three files do the work:

```
index.html          markup
assets/styles.css   all styling, tokens at the top
assets/main.js      hours, menu, parallax, carousel, map
assets/favicon.svg
vercel.json         clean URLs + security headers
```

## Run it locally

```bash
npx serve . -l 4321
```

Then open http://localhost:4321. Any static server works — the only requirement is
serving from the project root, since assets are referenced from `/assets/…`.

## Deploy to Vercel

First time, from this folder:

```bash
npx vercel
```

Answer the prompts (link to your account, accept the defaults — it's a static site,
no framework preset needed). Then push it live:

```bash
npx vercel --prod
```

Alternatively, push this folder to a Git repo and import it at vercel.com/new. Vercel
serves it as static output with no configuration.

## How the parallax works

One scroll listener feeds a lerped value (`current` chases `target`) into a single
`apply()` pass in `assets/main.js`. Everything reads from that one value:

- **Hero teardown** — the five `.layer` elements spread along `SPREAD`, scaled by the
  stack's actual height so a phone gets the same gesture as a desktop, not a smaller one.
- **On phones**, the hero copy fades out over the first third of the scroll and the frame
  rises to centre itself in the freed space. Without this the layers have nowhere to fly
  and collide with the headline.
- **Review band** — the corner-field artwork drifts behind the header.
- **Gallery wall** — each `.piece` moves at its own `data-speed`.

Positions are cached in `measure()` and only recomputed on resize, so no layout is
forced during scroll.

`prefers-reduced-motion: reduce` disables the whole engine and flattens the hero into a
normal stacked section. The reveal animations are scoped to `.js`, so the page renders
fully without JavaScript.

## Notes before launch

- Gallery wall art is placeholder SVG — swap in real shop photography.
- The footer still says "Design mockup — not the shop's live site." Remove that line
  when this goes live.
- Hours live in two places that must agree: the `HOURS` map in `assets/main.js`
  (drives the open/closed indicator) and the table in `index.html`.
- Map tiles come from OpenStreetMap via Leaflet, both loaded from cdnjs. If either
  fails the map degrades to an address block with a Google Maps link.
