---
description: Set up an automatic keep-alive task for Supabase project
---

# Keep‑Alive Task for Supabase Project

This workflow shows how to create a tiny serverless function (Node.js) that periodically pings your Supabase project to register activity and prevent automatic pausing.

## Prerequisites
- Node.js ≥ 18 installed locally.
- A Supabase project URL (e.g., `https://YOUR-PROJECT.supabase.co`).
- An API key with `service_role` or `anon` permissions (you can use the `anon` public key for a simple GET request).
- A serverless platform account (Vercel, Netlify, or Cloudflare Workers). The steps below use **Vercel** as an example because it offers free cron‑job support.

## Step‑by‑Step

1. **Create a new folder for the function**
   ```bash
   mkdir -p scripts/keep-alive
   cd scripts/keep-alive
   ```

2. **Initialize a minimal Node project**
   ```bash
   npm init -y
   npm i node-fetch@3
   ```

3. **Add the keep‑alive script** (`keepAlive.ts`)
   ```typescript
   // keepAlive.ts
   import fetch from 'node-fetch';

   const SUPABASE_URL = process.env.SUPABASE_URL!; // e.g., https://YOUR-PROJECT.supabase.co
   const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!; // public anon key

   async function pingSupabase() {
     try {
       const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
         method: 'GET',
         headers: {
           apiKey: SUPABASE_ANON_KEY,
           Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
         },
       });
       console.log('Keep‑alive ping status:', response.status);
     } catch (err) {
       console.error('Keep‑alive error:', err);
     }
   }

   // Execute immediately when the function runs
   pingSupabase();
   ```

4. **Compile to JavaScript** (optional, Vercel can run TypeScript directly, but we compile for portability)
   ```bash
   npx tsc keepAlive.ts --module commonjs --target es2020 --outDir .
   ```
   This creates `keepAlive.js`.

5. **Create a Vercel serverless function**
   - In the root of your project, create a folder `api` if it doesn’t exist.
   - Add a file `keep-alive.ts` (or `.js` if you compiled) inside `api`:
   ```typescript
   // api/keep-alive.ts
   import { Handler } from '@vercel/node';
   import { execFile } from 'child_process';
   import path from 'path';

   const handler: Handler = async (req, res) => {
     const scriptPath = path.resolve(__dirname, '../../scripts/keep-alive/keepAlive.js');
     execFile('node', [scriptPath], (error, stdout, stderr) => {
       if (error) {
         console.error('Execution error:', error);
         res.status(500).send('Error');
         return;
       }
       console.log('Output:', stdout);
       res.status(200).send('Ping sent');
     });
   };

   export default handler;
   ```

6. **Deploy to Vercel**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   ```
   Follow the prompts; Vercel will detect the `api` folder and create a serverless endpoint like `https://your‑project.vercel.app/api/keep-alive`.

7. **Schedule the cron job**
   - In the Vercel dashboard, go to **Settings → Cron Jobs**.
   - Add a new cron job with:
     - **URL**: `https://your‑project.vercel.app/api/keep-alive`
     - **Schedule**: `0 */48 * * *` (every 48 hours – you can adjust to every 2 days or daily).
   - Save the job.

   Vercel will now automatically invoke the endpoint at the defined interval, which in turn runs the `keepAlive.js` script and pings Supabase, registering activity.

## Alternative: Netlify Functions + Netlify Scheduler

If you prefer Netlify, the steps are similar:
1. Create `netlify/functions/keep-alive.js` that contains the same ping logic.
2. Deploy with `netlify deploy`.
3. In Netlify dashboard, enable **Scheduled Functions** and set a cron expression (e.g., `@daily`).

## Quick Local Test (optional)
You can run the script locally to verify it works before deploying:
```bash
node scripts/keep-alive/keepAlive.js
```
You should see a status code (200 OK) printed.

---
**Summary**
- Add a tiny Node script that sends a GET request to your Supabase REST endpoint.
- Wrap it in a serverless function (Vercel or Netlify).
- Schedule the function to run every 1‑2 days.
- The ping counts as activity and prevents the automatic pause.

Feel free to ask for clarification on any step or for a ready‑to‑run script tailored to a specific platform.
