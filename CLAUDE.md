# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development**:
- `npm run dev` - Start Vite dev server on port 8080
- `npm run build` - Production build
- `npm run build:dev` - Development mode build
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

**Deployment**: Frontend deploys to Vercel. Supabase edge functions deploy via `supabase functions deploy`.

**Supabase**: Edge functions in `supabase/functions/` are Deno-style. Config in `supabase/config.toml`. Requires `GOOGLE_AI_API_KEY` environment variable.

## Architecture

### Frontend (React + TypeScript + Vite)
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Routing**: React Router with protected routes (auth required for `/dashboard`, `/game/*`, `/lobby/*`)
- **State**: React Query for server state, local state with hooks
- **Styling**: Use design token classes (`bg-primary`, `text-foreground`) rather than raw Tailwind colors

### AI Layer (Multi-Phase Story Generation)
Located in `src/ai/`, organized into 4 subsystems:

1. **Flows** (`src/ai/flows/`): Orchestration logic for each generation phase
   - Phase 1: Story Overview (setting, locations, tone, hooks)
   - Phase 2: Characters (PCs, bonds)
   - Phase 3: Factions & Project Clocks
   - Phase 4: Story Nodes & Scenes
   - Phase 5: Campaign Arcs & Beats
   - Phase 6: Resolutions & Epilogues

2. **Prompts** (`src/ai/prompts/`): Versioned templates using pattern `phaseX/role@vY`
   - Registry: `src/ai/prompts/index.ts` maps template IDs to file content
   - System prompts: `.v1.md`, `.v2.md` files
   - User prompts: `.v1.hbs`, `.v2.hbs` (Handlebars templates)
   - Repair prompts: `.repair.v1.md` for JSON validation failures
   - Regen/Remix: Specialized templates in `regen/` and `remix/` subdirectories

3. **Schemas** (`src/ai/schemas/`): Zod schemas validate all AI outputs
   - `phase3.ts`: `FactionSchema`, `ProjectClockSchema`, `RelationshipSchema`
   - `phase4.ts`: Story nodes and scenes
   - `phase5.ts`: Campaign arcs and beats
   - `phase6.ts`: Resolution branches and epilogues
   - **CRITICAL**: Always update schemas and prompts together

4. **Template Rendering** (`src/ai/templateRenderer.ts`): Handlebars rendering for prompt templates

### Backend (Supabase Edge Functions)
Located in `supabase/functions/`:
- `generate-story/` - Phase 1 story generation
- `generate-characters/` - Phase 2 character generation
- `ip-sanitizer/` - Content safety validation

**CRITICAL RULES** (from edge functions):
- All LLM outputs MUST be strict JSON (no quotes, ellipses, or placeholder text)
- System prompts enforce: "Return ONLY valid JSON"
- All user-provided text must pass through IP sanitization before LLM calls

### Database (Supabase)
- Client: `src/integrations/supabase/client.ts` (auto-generated, avoid editing)
- Migrations: `supabase/migrations/*.sql`
- Services: `src/services/` handle business logic and data access

## Key Patterns

### Prompt Template System
Templates use versioned naming: `phase3/system@v1`, `phase3/regen/clock@v1`

Example from `src/ai/prompts/index.ts`:
```typescript
'phase3/system@v1': loadPrompt('phase3-factions/system.v1.md'),
'phase3/user@v1': loadPrompt('phase3-factions/user.v1.hbs'),
'phase3/regen/faction@v1': loadPrompt('phase3-factions/regen/faction.v1.hbs'),
```

### AI Generation Contract
All generation flows follow this pattern:
- **Input**: JSON seed + `seedId` + `type` ('initial' | 'regen' | 'remix') + optional `remixBrief`
- **Output**: Strict JSON matching phase-specific Zod schema
- **Error Handling**: Non-JSON text, rate limits, sanitization failures, timeouts
- **Validation**: Always validate with Zod and return structured errors

### IP Sanitization (NEVER BYPASS)
- Service: `src/services/ipSanitizer.ts`
- Edge Function: `supabase/functions/ip-sanitizer/`
- All user creative input must be sanitized before AI generation
- If adding new user input surfaces, wire through sanitization

### Type Safety
- Story types: `src/types/storyOverview.ts`
- Generation contracts: `AIGenerationRequest`, `AIGenerationResponse`
- Faction types: Inferred from Zod schemas (`type Faction = z.infer<typeof FactionSchema>`)

## Critical Files Reference

**AI System**:
- Prompt registry: `src/ai/prompts/index.ts`
- Flow orchestration: `src/ai/flows/phase{1-6}-{name}.ts`
- Schemas: `src/ai/schemas/phase{3-6}.ts`
- Template renderer: `src/ai/templateRenderer.ts`

**Services**:
- Story builder: `src/services/storyBuilder.ts`
- Character service: `src/services/characterService.ts`
- Campaign builder: `src/services/campaignBuilder.ts`
- Prompt seed builder: `src/services/promptSeedBuilder.ts`
- IP sanitizer: `src/services/ipSanitizer.ts`

**Edge Functions**:
- `supabase/functions/generate-story/index.ts`
- `supabase/functions/generate-characters/index.ts`
- `supabase/functions/ip-sanitizer/index.ts`

**UI Components**:
- Main screens: `src/components/*.tsx`
- Campaign flow: `src/components/campaign/Phase{3-6}*.tsx`
- shadcn components: `src/components/ui/*.tsx`

**Config**:
- Vite: `vite.config.ts` (note: `assetsInclude: ['**/*.md', '**/*.hbs']`)
- Supabase: `supabase/config.toml`
- TypeScript: `tsconfig.json`

## Safety Rails

1. **DO NOT** modify auto-generated Supabase files without running migration checks
2. **DO NOT** bypass IP sanitization flow (wire all new user inputs through `src/services/ipSanitizer.ts`)
3. **DO NOT** assume models respect format - always parse and validate with Zod
4. **DO NOT** use hardcoded styling tokens (`bg-red-500`) - use design tokens (`bg-primary`)
5. **DO NOT** change prompts without updating corresponding schemas
6. **ALWAYS** ensure edge function system prompts enforce strict JSON output

## Schema/Prompt Edit Checklist

When modifying AI generation:
1. Read the current prompt templates for the phase
2. Read the current Zod schema for the phase
3. Update both prompt and schema together
4. Test with repair prompt to handle invalid JSON
5. Validate edge function enforces strict JSON rules
6. Check that frontend UI can display new fields
