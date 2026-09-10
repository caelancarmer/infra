import http from 'node:http';

import { LocalRuntimeError, LocalWorkService } from './local-work-service.mjs';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

function json(response, statusCode, value) {
  const body = JSON.stringify(value, null, 2);
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store'
  });
  response.end(body);
}

async function readJson(request, limitBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limitBytes) throw new LocalRuntimeError('Request body exceeds 1 MiB', 413, 'body-too-large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new LocalRuntimeError('Request body must be valid JSON', 400, 'invalid-json');
  }
}

function workRoute(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'v1' || parts[1] !== 'work') return null;
  return {
    workId: parts[2] ? decodeURIComponent(parts[2]) : null,
    action: parts[3] || null,
    partCount: parts.length
  };
}

export function createLocalHttpServer({ logPath = '.infra/events.jsonl', host = '127.0.0.1', bodyLimitBytes } = {}) {
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new LocalRuntimeError('Local runtime can bind only to a loopback host', 400, 'non-loopback-host');
  }
  const service = new LocalWorkService({ logPath });
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${host}`);
      if (request.method === 'GET' && url.pathname === '/health') {
        return json(response, 200, { ok: true, runtime: 'infra-local', storage: 'jsonl' });
      }
      const route = workRoute(url.pathname);
      if (!route) throw new LocalRuntimeError('Route not found', 404, 'route-not-found');

      if (request.method === 'POST' && route.partCount === 2) {
        return json(response, 201, service.create(await readJson(request, bodyLimitBytes)));
      }
      if (!route.workId) throw new LocalRuntimeError('work_id is required', 400, 'missing-work-id');

      if (request.method === 'GET' && !route.action) return json(response, 200, service.get(route.workId));
      if (request.method === 'DELETE' && !route.action) return json(response, 200, service.delete(route.workId));
      if (request.method === 'POST' && route.action === 'checkpoint') {
        return json(response, 200, service.checkpoint(route.workId, await readJson(request, bodyLimitBytes)));
      }
      if (request.method === 'POST' && route.action === 'events') {
        return json(response, 202, service.captureEvent(route.workId, await readJson(request, bodyLimitBytes)));
      }
      if (request.method === 'GET' && route.action === 'resume-package') {
        return json(response, 200, service.resumePackage(route.workId, {
          target_agent: url.searchParams.get('agent') || 'generic',
          target_model: url.searchParams.get('model') || null
        }));
      }
      if (request.method === 'GET' && route.action === 'history') return json(response, 200, service.history(route.workId));
      if (request.method === 'GET' && route.action === 'export') return json(response, 200, service.export(route.workId));
      throw new LocalRuntimeError('Route not found', 404, 'route-not-found');
    } catch (error) {
      const statusCode = Number(error.statusCode) || 500;
      json(response, statusCode, {
        error: statusCode === 500 ? 'internal-error' : error.code || 'request-error',
        message: statusCode === 500 ? 'Unexpected local runtime error' : error.message
      });
    }
  });
  return { server, service, host };
}

export async function startLocalHttpServer(options = {}) {
  const { server, service, host } = createLocalHttpServer(options);
  const port = Number(options.port ?? 4317);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new LocalRuntimeError('port must be an integer between 0 and 65535', 400, 'invalid-port');
  }
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return { server, service, host, port: server.address().port };
}

