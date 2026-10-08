# Shopify theme (code-first)

This repo holds your **Online Store theme** as files you edit locally: Liquid, CSS, JavaScript, and JSON templates. Shopify CLI syncs those files with a store.

The theme source lives in [`theme/`](theme/). The **Horizon** theme in `theme/` was pulled from the live **Riquenza** store (`riquenza.myshopify.com`, theme `gid://shopify/OnlineStoreTheme/187869921353`) via the Shopify connector and Admin GraphQL, replacing the earlier Skeleton starter.

## Prerequisites

- Node.js 18+
- A Shopify store you can access (dev store or merchant store)
- **Themes** permission (collaborator/staff) or store owner

Install dependencies once:

```bash
npm install
```

## Connect to your store

### Option A — You already have a theme on the store

Download it into this project (overwrites `theme/` unless you use another path):

```bash
npm run theme:pull -- --store YOUR-STORE.myshopify.com
```

Pick the theme from the list. The CLI opens a browser to log in if needed.

### Option B — Start from Skeleton (this repo) and upload

Keep editing `theme/`, then push to the store:

```bash
npm run theme:push -- --store YOUR-STORE.myshopify.com
```

Use `--unpublished` to create a draft theme instead of updating the live one:

```bash
npx shopify theme push --path theme --store YOUR-STORE.myshopify.com --unpublished
```

## Live preview while you code

From the repo root:

```bash
npm run theme:dev -- --store YOUR-STORE.myshopify.com
```

This uploads a **development theme** and gives you a preview URL with hot reload for sections and CSS (best in Chrome). Changes in `theme/` sync while the command runs.

Wrong Shopify account? Log out and run again:

```bash
npx shopify auth logout
```

## Where to edit UI

| Folder | Purpose |
|--------|---------|
| `theme/sections/` | Page modules (hero, product grid, header) + `{% schema %}` for theme editor settings |
| `theme/blocks/` | Smaller nestable components inside sections |
| `theme/snippets/` | Reusable partials (`{% render 'snippet' %}`) |
| `theme/templates/` | Which sections appear on each page type |
| `theme/layout/` | HTML shell (`theme.liquid`) |
| `theme/assets/` | Static CSS, JS, images |
| `theme/config/` | Global theme settings |
| `theme/locales/` | Translations |

Example: customize the header in `theme/sections/header.liquid`.

## Useful commands

```bash
npx shopify theme list --store YOUR-STORE.myshopify.com
npx shopify theme check --path theme
```

## Docs

- [Customize a merchant theme](https://shopify.dev/docs/storefronts/themes/getting-started/customize)
- [Theme architecture](https://shopify.dev/docs/storefronts/themes/architecture)
- [Shopify CLI — theme commands](https://shopify.dev/docs/api/shopify-cli/theme)
