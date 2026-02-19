# WhenWhere

A fast, visual timezone comparison tool. Hover a city on the map, see its local time instantly, pin up to four cities side-by-side, and share the comparison via URL.

**[Live demo → whenwhere-time.vercel.app](https://whenwhere-time.vercel.app)**

## Why I built this

Every timezone tool I tried felt either clunky or was missing small things. [World Time Buddy](https://www.worldtimebuddy.com/) is great for hourly grids but doesn't give you a map view. [timeanddate.com](https://www.timeanddate.com/time/map/) has a map but buries the comparison behind clicks and page navigations. [tzexplorer.org](https://tzexplorer.org/) is minimal but limited.

I kept running into the same problem — someone says "let's meet at 3pm" and I'm mentally doing offset math across three timezones trying to figure out what time it actually is for everyone. I wanted something where I could just hover, pin, compare, and share a link. No sign-ups, no clutter, no page reloads.

So I built one.

## Features

- **Interactive world map** — hover any city dot to see its local time, click to pin it for comparison
- **Side-by-side comparison** — pin up to 4 cities with live analog clocks, UTC offsets, day/night indicators, and time difference from your home timezone
- **Shareable URLs** — pinned cities and home timezone sync to the URL automatically, e.g. `?compare=Tokyo,London&home=America/New_York`
- **Search by city or UTC offset** — type a city name or `UTC+1` / `GMT-5` to find all cities in that offset group
- **Home timezone picker** — set your reference timezone, everything else is calculated relative to it
- **Dark / light mode** — persisted in localStorage
- **Customisable map** — remove city dots you don't need, search brings them back
- **No accounts, no tracking** — runs entirely client-side

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## URL params

| Param     | Example                  | Description                                |
| --------- | ------------------------ | ------------------------------------------ |
| `compare` | `Tokyo,London,New York`  | Comma-separated city names to pin on load  |
| `home`    | `Europe/Sarajevo`        | IANA timezone to use as the home reference |

Example: `/?compare=Tokyo,London,New%20York&home=America/New_York`

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [Luxon](https://moment.github.io/luxon/) — timezone math and formatting
- [D3 geo](https://d3js.org/d3-geo) (`geoEqualEarth`) — map projection
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [Lucide React](https://lucide.dev/) — icons
- [Framer Motion](https://www.framer.com/motion/) — animations

## Scripts

| Command          | Description            |
| ---------------- | ---------------------- |
| `npm run dev`    | Start dev server       |
| `npm run build`  | Production build       |
| `npm run start`  | Serve production build |
| `npm run lint`   | Run ESLint             |

## Deployment

```bash
npx vercel
```

## License

MIT
