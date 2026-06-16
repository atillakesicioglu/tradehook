import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load the shared monorepo .env so NEXT_PUBLIC_* vars are available to Next.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The monorepo root, so Next traces files from the right place.
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
};

export default nextConfig;
