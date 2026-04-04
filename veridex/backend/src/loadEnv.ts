import dotenv from 'dotenv';
import path from 'path';

// Runs before other app modules: imports are hoisted above `dotenv.config()` in `index.ts`,
// so env must be loaded from a side-effect import listed first.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
