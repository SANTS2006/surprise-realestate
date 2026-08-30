import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { disconnectDatabase } from './config/database.js';
import { closeSessionStore } from './config/session.js';
import { ensurePermissionCatalogSeeded } from './services/permission.service.js';

const app = createApp();

let server;
ensurePermissionCatalogSeeded()
  .then(() => {
    server = app.listen(env.PORT, () => {
      logger.info(`Surprise Real Estate API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to seed permission catalog — refusing to start');
    process.exit(1);
  });

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);
  const closeAndExit = async () => {
    try {
      await disconnectDatabase();
      await closeSessionStore();
      logger.info('Shutdown complete.');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  if (server) server.close(closeAndExit);
  else await closeAndExit();

  // Force-exit if connections don't close within a reasonable window.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});
