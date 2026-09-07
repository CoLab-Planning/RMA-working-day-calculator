# Hosting and release notes

Verified 7 September 2026:

- Production: https://rmacalculator.colabplanning.co.nz/
- Host: **Vercel**. DNS CNAME is `cname.vercel-dns.com`; HTTPS responses contain `server: Vercel`, `x-vercel-id` and `x-vercel-cache` headers.
- Repository: https://github.com/CoLab-Planning/RMA-working-day-calculator
- Framework: client-side React/TypeScript, built by Vite. No application backend or database was found in this repository.
- Vercel config: `vercel.json` supplies response/security headers. Standard build is `npm run build`, output `dist`.
- The separate OneDrive “Working Day Calculator” folder contains an older Python/Tkinter desktop application and spreadsheet. Those original files were not modified.

The repository and public DNS do not identify the owning Vercel team/account or establish the current Git integration. No Azure deployment configuration was found. In the Vercel dashboard, locate the project whose Domains includes `rmacalculator.colabplanning.co.nz`; inspect Settings → Git and its production branch before releasing.

This work is prepared on `codex/calculator-testing-and-s107g`. Production deployment has not been requested or performed. Review the branch/PR and the local preview first. If the Vercel project is linked to the production branch, merging may automatically deploy; confirm that mapping before merging. Use Node 24 for builds. Rollback can redeploy the previous successful Vercel deployment.
