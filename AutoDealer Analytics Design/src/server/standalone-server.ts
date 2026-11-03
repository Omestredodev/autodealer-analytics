/**
 * AutoDealer Analytics — Servidor Standalone Node.js (TypeScript)
 * Executável via tsx/node para rodar o backend de integração em porta dedicada.
 */

import http from 'node:http';
import { handleApiRequest } from './routes/api-handler';
import { mongoAudit } from './db/mongo';

const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 4000;

const server = http.createServer(async (req, res) => {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-ID');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Coletar body se existir
  let bodyBuffer = '';
  req.on('data', chunk => { bodyBuffer += chunk; });
  req.on('end', async () => {
    let body: any = null;
    if (bodyBuffer) {
      try {
        body = JSON.parse(bodyBuffer);
      } catch {
        body = bodyBuffer;
      }
    }

    const apiRes = await handleApiRequest({
      method: req.method || 'GET',
      url: req.url || '/',
      body
    });

    res.writeHead(apiRes.status, { 'Content-Type': 'application/json', ...apiRes.headers });
    res.end(JSON.stringify(apiRes.data));
  });
});

async function startServer() {
  await mongoAudit.tryConnectLiveMongo();
  server.listen(PORT, () => {
    console.log(`[AutoDealer Backend] Servidor de integração ativo na porta ${PORT}`);
    console.log(`[AutoDealer Backend] Conexão MongoDB: ${mongoAudit.getStatus().connected ? 'CONECTADO AO REPLICA SET' : 'MODO EM-MEMÓRIA / RESILIENTE'}`);
  });
}

if (typeof process !== 'undefined' && process.env?.RUN_STANDALONE) {
  startServer();
}

export { server, startServer };
