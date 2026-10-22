# செலவு குறிப்பு (Expense Notes)

Static page (`index.html`) + one serverless function (`api/expenses.js`). Data is stored in Upstash Redis.

## Deploy on Vercel
1. Push this folder to a GitHub repo, then in Vercel: Add New > Project > import the repo (Framework Preset: Other).
2. In the project: Storage > Create/Connect > Upstash Redis (Marketplace). Connect it to the project. This adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars.
3. Settings > Environment Variables, add:
   - `EDIT_CODE`: your code (add, delete, view)
   - `VIEW_CODE`: appa's code (view only)
4. Deployments > Redeploy (so the env vars take effect).

Open the Vercel URL on both phones, enter your code once; the phone remembers it.
