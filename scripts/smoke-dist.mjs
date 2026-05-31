import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const host = '127.0.0.1';
const root = join(process.cwd(), 'dist');
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

function createPreviewServer() {
  return createServer((request, response) => {
    const url = new URL(request.url || '/', `http://${host}`);
    const requestedPath = normalize(decodeURIComponent(url.pathname))
      .replace(/^[/\\]+/, '')
      .replace(/^(\.\.[/\\])+/, '');
    const filePath = join(root, url.pathname === '/' ? 'index.html' : requestedPath);
    const fallbackPath = join(root, 'index.html');
    const resolvedPath = existsSync(filePath) ? filePath : fallbackPath;

    response.setHeader('Content-Type', types[extname(resolvedPath)] || 'application/octet-stream');
    createReadStream(resolvedPath)
      .on('error', () => {
        response.statusCode = 404;
        response.end('Not found');
      })
      .pipe(response);
  });
}

const server = createPreviewServer();
await new Promise((resolve) => server.listen(0, host, resolve));
const { port } = server.address();

try {
  const html = await fetch(`http://${host}:${port}/`).then((response) => response.text());
  const scriptPath = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
  if (!html.includes('<div id="root"></div>') || !scriptPath) {
    throw new Error('Built index.html does not include the app root and script asset.');
  }

  const assetUrl = new URL(scriptPath, `http://${host}:${port}/`);
  const assetResponse = await fetch(assetUrl);
  if (!assetResponse.ok) {
    throw new Error(`Built JS asset did not load: ${assetResponse.status}`);
  }

  console.log(`Smoke passed at http://${host}:${port}/`);
} finally {
  server.close();
}
