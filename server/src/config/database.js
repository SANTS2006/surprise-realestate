import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { env, isProduction } from './env.js';
import { logger } from './logger.js';

// Neon's serverless driver uses WebSockets under the hood; in Node (as
// opposed to an edge runtime) it needs a ws implementation supplied.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({
  adapter,
  log: isProduction
    ? [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }]
    : [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }, { emit: 'event', level: 'query' }],
});

// Route Prisma's own event log through the structured logger instead of
// letting it write to stdout directly — keeps log shape consistent and lets
// us redact if a query ever includes sensitive params in dev.
prisma.$on('error', (e) => logger.error({ err: e }, 'prisma error'));
prisma.$on('warn', (e) => logger.warn({ warning: e }, 'prisma warning'));
if (!isProduction) {
  prisma.$on('query', (e) => logger.debug({ duration: e.duration }, `query: ${e.query}`));
}

export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    logger.error({ err }, 'database connectivity check failed');
    return false;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  await pool.end();
}
