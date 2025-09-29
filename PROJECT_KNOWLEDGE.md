# RoleplAI GM - Project Knowledge Base

## Project Overview
RoleplAI GM is a tabletop RPG assistant that helps game masters run immersive role-playing sessions with AI-powered storytelling and character management.

## Brand Identity
- **Primary Brand Color**: Crimson Red (#DC143C) - CEO's favorite color
- **Theme**: Dark crimson dice aesthetic with hooded/mysterious branding
- **Logo**: Red hooded dice logo (stored in `src/assets/logo.svg`)

## Design System
All colors use CSS variables defined in `src/index.css` and `tailwind.config.ts`:
- Never use hardcoded colors in components
- Always use semantic tokens: `bg-primary`, `text-foreground`, etc.
- Brand palette: Crimson red primary, warm gold accent, dark background

### Color Variables
```css
--primary: 351 89% 44%;           /* Crimson red */
--accent: 45 76% 58%;             /* Warm gold */
--background: 0 0% 3%;            /* Deep dark */
--sidebar-background: 0 15% 8%;   /* Sidebar dark */
```

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase integration)
- **Authentication**: Supabase Auth with Google OAuth
- **State Management**: React hooks and context
- **UI Components**: shadcn/ui with custom design system

## Features
- [ ] User Authentication (Google OAuth)
- [ ] Adventure Creation & Management
- [ ] Character Management
- [ ] AI-Powered Game Master
- [ ] Real-time Game Interface
- [ ] Campaign Persistence

## File Structure
```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── AppSidebar.tsx     # Main navigation sidebar
│   ├── AuthPage.tsx       # Authentication forms
│   ├── Dashboard.tsx      # Main dashboard container
│   ├── LandingPage.tsx    # Landing page
│   └── ...
├── assets/                # Static assets (images, logos)
├── integrations/          # Supabase client (auto-generated)
└── lib/                   # Utility functions
```

## Technical Guidelines

### Component Creation
- Create focused, single-responsibility components
- Use semantic CSS variables for styling
- Implement proper TypeScript interfaces
- Follow the established design system

### Database Design
- Use Row Level Security (RLS) policies
- Create user-specific data with `user_id` references
- Never reference `auth.users` table directly
- Use profiles table for additional user data

### Authentication
- Always implement standard signup/login forms
- Enable auto-confirm email signups
- Never use anonymous signups
- Implement proper error handling

## Development Notes

### Current Issues
- None currently identified

### Recent Changes
- Implemented Google OAuth authentication
- Updated design system with unified color palette
- Added sidebar with brand logo integration
- Centralized all colors to CSS variables

### Future Enhancements
- [ ] Add campaign management features
- [ ] Implement real-time game sessions
- [ ] Add AI character generation
- [ ] Create adventure templates
- [ ] Add file upload for character sheets

## AI Architecture & Integration

### AI Flow Overview (Provider-Agnostic)

The project implements a three-part methodology for AI integration: **schemas → prompts → flows**.

#### Architecture Components
- **Schemas**: Zod for IO validation and type safety
- **Prompts**: Handlebars/TS template strings for dynamic content generation
- **Flows**: Server-side TypeScript functions that:
  1. Render prompts with context
  2. Call `callLlm()` (provider-agnostic layer)
  3. Parse/validate JSON output via Zod schemas
  4. Return strongly typed results

#### Directory Structure
```
src/
├── ai/
│   ├── flows/       # Orchestration per AI task
│   ├── prompts/     # Text templates for AI interactions
│   ├── schemas/     # Zod schemas for validation
│   └── llm/         # Provider-agnostic LLM layer
│       ├── providers/   # openai.ts, anthropic.ts, google.ts, groq.ts
│       ├── router.ts    # Provider selection logic
│       ├── types.ts     # LLM type definitions
│       ├── usage.ts     # Usage tracking
│       └── index.ts     # Main exports
```

#### Provider Selection
Each AI flow can specify a **policy** including:
- Default provider/model preferences
- Required capabilities (JSON schema, long context, parallel calls)
- Token limits (hard/soft boundaries)

The `callLlm()` function automatically selects the best available provider/model based on requirements.

#### Error Handling & Reliability
- **Automatic retries**: 429/5xx errors with exponential backoff and jitter
- **Schema re-ask**: If JSON parsing fails, router requests format correction
- **Normalized metrics**: Consistent usage tracking across all providers
- **Graceful degradation**: Fallback to alternative providers when needed

### Lovable AI Gateway
Primary integration for AI features:
- `google/gemini-2.5-pro` - Complex reasoning and multimodal tasks
- `google/gemini-2.5-flash` - Balanced performance (default)
- `openai/gpt-5` - Premium reasoning and context understanding
- `openai/gpt-5-mini` - Cost-effective general purpose

### External APIs
- Google OAuth for authentication
- Multiple LLM providers via abstraction layer
- (Additional integrations to be documented as implemented)

## Testing Guidelines
- Test authentication flows thoroughly
- Verify responsive design on mobile/desktop
- Check color consistency across all components
- Validate database RLS policies

## Deployment
- Project deploys automatically via Lovable
- Uses Lovable Cloud for backend services
- Domain configuration available in project settings

## AI GM Persona & Guidelines

See [AI_GM_GUIDE.md](./AI_GM_GUIDE.md) for detailed AI Game Master persona, voice, tone, narrative style, mechanics, and implementation guidelines.

---

## Instructions for AI Assistant

When working on this project:

1. **Always reference this file** for project context and guidelines
2. **Follow the design system** - never use hardcoded colors
3. **Maintain brand consistency** with the crimson/hooded dice theme
4. **Use semantic tokens** for all styling
5. **Create focused components** rather than monolithic files
6. **Implement proper RLS** for any database changes
7. **Test authentication flows** after any auth-related changes

### Common Patterns
- Import design tokens: `className="bg-primary text-primary-foreground"`
- Sidebar theming: `className="bg-sidebar text-sidebar-foreground"`
- Interactive elements: Use hover states with design system colors
- Form validation: Implement with proper error handling

### Don't Do
- Hardcode colors like `bg-red-500` or `text-white`
- Create components without TypeScript interfaces
- Modify auto-generated Supabase files
- Use anonymous authentication
- Reference `auth.users` table directly

---

*Last Updated: [Current Date]*
*Maintainer: AI Assistant*