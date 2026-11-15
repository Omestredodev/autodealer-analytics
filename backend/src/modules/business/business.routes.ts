import type { FastifyInstance } from 'fastify';
import { customerCrudRoutes } from './customers.routes';
import { inspectionsRoutes } from './inspections.routes';
import { favoritesRoutes } from './favorites.routes';
import { stockRoutes } from './stock.routes';
import { featuredAdminRoutes } from './featured-admin.routes';
import { vehicleRegistrationRoutes } from './vehicle-registration.routes';

/** Rotas comerciais adicionais para o ambiente demonstrativo local. */
export async function businessRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request, reply) => {
    if (request.url.split('?')[0] === '/crud/status') return;
    if (process.env.CRUD_DEMO_ENABLED !== 'true') {
      return reply.code(403).send({
        error: 'BUSINESS_DEMO_DISABLED',
        message: 'Defina CRUD_DEMO_ENABLED=true no backend/.env e reinicie a API (somente ambiente local)',
      });
    }
  });
  app.get('/status', async () => ({ enabled: process.env.CRUD_DEMO_ENABLED === 'true' }));
  await app.register(customerCrudRoutes);
  await app.register(inspectionsRoutes);
  await app.register(favoritesRoutes);
  await app.register(stockRoutes);
  await app.register(featuredAdminRoutes);
  await app.register(vehicleRegistrationRoutes);
}
