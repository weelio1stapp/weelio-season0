# Weelio – Season 0

Web aplikace pro objevování a sdílení unikátních míst v České republice.

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Auth + Database)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Vytvoř soubor `.env.local` v root složce projektu a přidej:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Kde najít tyto hodnoty:**
1. Otevři Supabase Dashboard → Settings → API
2. Zkopíruj `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
3. Zkopíruj `anon public` klíč → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Supabase Auth Configuration

V Supabase Dashboard → Authentication → URL Configuration:

**Redirect URLs:**
- Development: `http://localhost:3000/auth/callback`
- Production: `https://your-domain.com/auth/callback`

**Enabled Providers:**
- Google OAuth (musí být zapnutý)

### 4. Run Development Server

```bash
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000)

## Project Structure

```
weelio1stapp/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Global layout
│   ├── page.tsx           # Homepage
│   ├── places/            # Places listing
│   ├── p/[slug]/          # Place detail
│   ├── leaderboard/       # Leaderboard
│   ├── create-place/      # Create place (protected)
│   └── auth/callback/     # OAuth callback
├── components/            # Reusable components
├── lib/
│   ├── supabase/         # Supabase clients
│   └── mockData.ts       # Mock data
└── ...
```

## Authentication

- **Provider:** Google OAuth (via Supabase)
- **Protected Routes:** `/create-place`
- **Session:** Cookie-based (SSR compatible)

## Development

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

ISC
