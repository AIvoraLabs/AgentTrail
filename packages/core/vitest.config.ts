import { defineConfig } from 'vitest/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (zero-dependency approach)
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

export default defineConfig({
  resolve: {
    alias: {
      // Allow test files to dynamically import @aivoralabs/agenttrail-openai
      // without requiring it as a dependency (avoids circular build dependency).
      // Imports resolve to the source file at test runtime via Vite.
      '@aivoralabs/agenttrail-openai': path.resolve(__dirname, '../openai/src/index.ts'),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
