Supabase local setup (developer quickstart)

This repo contains Supabase edge functions and expects a Supabase project for local development. Follow one of the options below.

1) Install Supabase CLI (recommended)

- macOS / Linux (Homebrew):
  brew install supabase/tap/supabase

- Linux (install script):
  curl -sL https://supabase.com/cli/install | sh

See the official install docs for other platforms: https://github.com/supabase/cli#install-the-cli

After installing the CLI, run:

```bash
supabase login
supabase init        # if you don't have a local project yet
supabase start       # starts local Postgres + Studio + Functions
```

2) Docker alternative

If you can't install the CLI, install Docker (or Podman) and use the Supabase Docker image per their docs. Example (simplified):

```bash
docker run --rm -p 5432:5432 -p 8000:8000 -p 54321:54321 supabase/postgres:latest
# then run any migration commands you need via psql/pgadmin
```

3) Environment files

- Copy `.env.example` -> `.env.local` and fill `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` for the frontend.
- Copy `supabase/.env.example` -> `supabase/.env` and populate `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, and `AI_LOG_SALT` for functions.

4) Running functions locally

With the Supabase CLI installed you can run functions from the repo root:

```bash
cd supabase/functions
supabase functions start
```

Or use `supabase functions deploy` to deploy to your Supabase project.

Notes
- Do not commit secret keys to git. Use `.env` or CI secrets.
- If you plan to run migrations, check `supabase/migrations` in this repo.
