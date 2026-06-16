import * as path from 'node:path';
import * as dotenv from 'dotenv';

// The whole monorepo shares a single .env at the repository root. Apps run with
// their own package directory as cwd, so the root file is two levels up.
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
// Allow a per-app .env to override during local experiments (optional).
dotenv.config();
