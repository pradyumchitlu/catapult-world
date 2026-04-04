import dotenv from 'dotenv';
import path from 'path';

// Runs before other app modules: imports are hoisted above `dotenv.config()` in `index.ts`,
// so env must be loaded from a side-effect import listed first.
// Must run before any module that reads process.env at import time (e.g. lib/supabase.ts).
// Local Next-style convention: prefer .env.local, fall back to .env.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
