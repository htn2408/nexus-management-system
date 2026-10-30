# Nexus frontend (React)

Official React frontend for Nexus System, built in plain JavaScript (React 19, Vite, Tailwind CSS, React Router, Socket.IO client). Complete dashboards for Customer, Retail, Technical, Accounts, and Executive Admin.

Stack: React 19, React Router 7, Vite, Tailwind CSS, Socket.IO client, sonner (toasts), lucide-react (icons), jsPDF / pdf-lib (invoice PDFs).

```bash
pnpm install
pnpm dev        # http://localhost:3000, calls the API at http://localhost:5105
pnpm lint
pnpm build
```

To use the dev server against the demo stack (`npm run demo:up` in the repo root), let Vite proxy the API so the browser stays on one origin:

```bash
VITE_API_URL= API_PROXY_TARGET=http://localhost:5205 pnpm dev
```

## Layout

| Folder | Contents |
|---|---|
| `src/pages`, `src/components` | React components |
| `src/context` | App state (auth, orders and customers, notifications, language, theme), shared by every page |
| `src/lib/store.js` | Small store (`writable`, `derived`, `get`) plus the `useStore` hook that lets a component re-render when a store changes |
| `src/lib/router.js` | `navigate`, `navigateTo`, `queryParam` helpers over React Router |
| `src/lib/api.js`, `technicalApi.js` | Calls to the Node.js API |
| `src/locales` | English and Vietnamese UI text |
