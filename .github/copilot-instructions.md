## Quick context for AI coding agents

This repository is an AI-driven tabletop RPG project (RoleplAI GM / Fable Engine). The app is a React + TypeScript frontend (Vite + Tailwind + shadcn/ui) with server-side AI logic implemented as Supabase edge functions and an LLM router in `src/ai/llm`.

Keep guidance below short, precise, and tied to files so agents can edit code safely and predictably.

## Big-picture architecture (what to know first)
- Frontend: `src/` — React + TypeScript components, shadcn UI tokens (use design token classes like `bg-primary` rather than raw Tailwind colors).
- AI layer: `src/ai/` — 4 sub-areas: `flows/` (orchestration per task), `prompts/` (text templates), `schemas/` (Zod schemas), `llm/` (provider-agnostic router + providers).
- Edge functions: `supabase/functions/` — Deno-style functions (generate-characters, generate-story, ip-sanitizer) that call the Lovable AI gateway; environment variables like `LOVABLE_API_KEY` are required.
- Persistence: Supabase (auto-generated client in `src/integrations/supabase/` + SQL migrations under `supabase/migrations`).

## Developer workflows and commands
- Start dev frontend: `npm run dev` (Vite). See `package.json` scripts.
- Build production: `npm run build` or `npm run build:dev` for development-mode build.
- Lint: `npm run lint`.
- Preview a built site: `npm run preview`.
- Deployment: project uses Lovable Cloud (see `README.md` / `PROJECT_KNOWLEDGE.md`) — the project may be published via the Lovable dashboard.

If you need to run or test Supabase functions locally, follow the repo's Supabase config (`supabase/config.toml`) and environment conventions — do NOT edit auto-generated Supabase client code unless necessary.

## Project-specific conventions and patterns
- Prompts registry: `src/ai/prompts/index.ts` maps prompt IDs -> file content. Template IDs use this pattern: `phaseX/<role>@vY` or namespaced paths like `phase3/regen/clock@v1`.
- Prompt files: under `src/ai/prompts/` — `system.v1.md`, `user.v1.hbs`, `repair.v1.md`, etc. Editing templates changes how the AI behaves; keep versions consistent.
- Zod schemas: all AI outputs must validate against Zod schemas in `src/ai/schemas/`. Example: `src/ai/schemas/phase3.ts` defines `FactionSchema`, `ProjectClockSchema`, etc. Always update schemas and prompts together.
- Strict JSON rule: many system prompts (and Supabase functions) require the model to "Return ONLY valid JSON". Example: see `supabase/functions/generate-characters/index.ts` where the system prompt demands pure JSON and forbids quotes/placeholder text.
- Sanitization: `supabase/functions/ip-sanitizer` and `src/services/ipSanitizer.ts` handle IP safety. All user-provided creative text must be sanitized before being passed to generation flows.
- LLM routing: flows call `src/ai/llm/router.ts` (or similar) via `callLlm()` with a policy (model capabilities, JSON schema enforcement). Respect `policy` when adding new flows.

## Typical LLM task contract (short)
- Inputs: a JSON seed (see `src/types/storyOverview.ts` for shapes), `seedId`, `type` ('initial'|'regen'|'remix'), optional `remixBrief`.
- Expected output: strict JSON matching the Zod schema for that phase (failure mode: non-JSON text or schema mismatch).
- Errors to handle: model returns text, rate-limits, sanitization required, provider timeouts. Flows must validate with Zod and return structured errors for the UI.

## Key files & where to look (examples)
- AI orchestration & prompts: `src/ai/flows/`, `src/ai/prompts/`, `src/ai/prompts/index.ts` (registry)
- Schemas: `src/ai/schemas/*.ts` (zod schemas per phase)
- LLM providers/router: `src/ai/llm/providers/*` and `src/ai/llm/router.ts` (provider selection & callLlm)
- Supabase functions: `supabase/functions/generate-characters/index.ts`, `supabase/functions/generate-story/index.ts`, `supabase/functions/ip-sanitizer/index.ts` (strict prompt rules live here)
- Frontend integrations: `src/services/promptSeedBuilder.ts`, `src/services/ipSanitizer.ts`, `src/integrations/supabase/client.ts`
- Types & contracts: `src/types/storyOverview.ts`, `src/types/*`
- Project docs: `PROJECT_KNOWLEDGE.md`, `AI_GM_GUIDE.md`, `README.md` — use these as single sources of truth for voice/persona and architecture notes.

## Safety rails and "don'ts"
- Do not modify auto-generated Supabase files or migrations without running DB migration checks and validating RLS policies.
- Never bypass the IP sanitization flow. If you add a new UI surface that accepts free-text seeds, wire it to `src/services/ipSanitizer.ts`.
- Do not assume models will respect format — always parse and validate outputs with the appropriate Zod schema.
- Avoid hardcoded styling tokens (e.g., `bg-red-500`). Use design-token classes (e.g., `bg-primary`).

## Quick examples to copy from
- Prompt ID example: in `src/ai/prompts/index.ts` you'll find keys like `"phase3/system@v1": loadPrompt('phase3-factions/system.v1.md')`.
- Schema example: `src/ai/schemas/phase3.ts` defines `FactionSchema` with `id`, `name`, `leader`, `projects` and `ProjectClockSchema` (`clockSize` enum: 4, 6, 8).
- System rule example: `supabase/functions/generate-characters/index.ts` contains the line: `CRITICAL RULES: - NO quotation marks, ellipses, or placeholder text in the JSON - ALL fields must be complete and ready to use` — keep this behavior when changing generation logic.

## When you need clarification
- If a change touches AI prompts, schemas, or supabase functions, ask the maintainer or request a small sample run: which prompt/template and schema should be used, and which env vars (e.g., `LOVABLE_API_KEY`) are available.

---
If any of these sections are unclear or you'd like me to include a short checklist for making safe schema/prompt edits, tell me which area to expand and I'll iterate.
