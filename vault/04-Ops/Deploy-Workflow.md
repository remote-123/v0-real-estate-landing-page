# Deploy Workflow

## Git Accounts
Two GitHub accounts on this machine:
- `remote-123` (primary for this repo)
- `hashdx` (other account)

Switch before pushing:
```bash
gh auth switch --user remote-123
```

## Deploy
Vercel auto-deploys on push to `main`.
No manual deploy step needed.

## Domains
Both domains on same Vercel project:
- `northcapitaldxb.com` → main site
- `thecityregistry.com` → terminal brand (middleware splits)

## Vercel CLI
Available in terminal. Use for:
- DNS record management: `vercel dns add <domain> @ TXT "..."`
- Env var inspection (don't log secrets)
- Domain management

## Build
```bash
npm run build   # must pass before commit
npm run lint    # check types + lint
```
