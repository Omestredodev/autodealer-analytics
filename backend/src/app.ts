import Fastify from 'fastify';
import { checkPostgresConnection } from './database/postgresql';
import { checkMongoConnection, closeMongoConnection } from './database/mongodb';
import { checkCassandraConnection, closeCassandraConnection } from './database/cassandra';
import { vehiclesRoutes } from './modules/vehicles/vehicles.routes';
import { advertisementsRoutes } from './modules/advertisements/advertisements.routes';
import { featuredRoutes } from './modules/advertisements/featured.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { activityRoutes } from './modules/activity/activity.routes';
import { operationsRoutes } from './modules/operations/operations.routes';
import { businessRoutes } from './modules/business/business.routes';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get('/health', async (_request, reply) => {
    const [pg, mongo, cassandra] = await Promise.all([
      checkPostgresConnection(), checkMongoConnection(), checkCassandraConnection(),
    ]);
    const ready = pg && mongo && cassandra;
    return reply.code(ready ? 200 : 503).send({
      status: ready ? 'ok' : 'degraded',
      service: 'autodealer-backend',
      databases: {
        postgresql: pg ? 'connected' : 'unavailable',
        mongodb: mongo ? 'connected' : 'unavailable',
        cassandra: cassandra ? 'connected' : 'unavailable',
      },
    });
  });

  app.register(vehiclesRoutes);
  app.register(advertisementsRoutes);
  app.register(featuredRoutes);
  app.register(auditRoutes);
  app.register(activityRoutes);
  app.register(operationsRoutes);
  app.register(businessRoutes, { prefix: '/crud' });

  app.addHook('onClose', async () => {
    await Promise.allSettled([closeMongoConnection(), closeCassandraConnection()]);
  });
  return app;
}
