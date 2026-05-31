import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const host = '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const root = join(process.cwd(), 'dist');

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
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
}).listen(port, host, () => {
  console.log(`Preview server listening at http://${host}:${port}/`);
});
