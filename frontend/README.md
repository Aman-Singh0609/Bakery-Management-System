# Sweet Dreams Bakery storefront

React 19 + Vite storefront and staff dashboard. Setup, architecture and API docs are in the
[project README](../README.md).

```bash
npm install
npm run dev     # http://localhost:3000, proxies /api to http://localhost:8000
npm run lint
npm run build
```

Shop details (name, address, phone, hours) are in `src/lib/store.js`. Colours and fonts are
defined in `tailwind.config.js` and `src/index.css`.
