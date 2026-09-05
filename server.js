const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3001', 10);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    // Apache / Hostinger DirectoryIndex fix:
    // If Apache converted '/' to '/index.html', '/index.php', or stripped trailing slash
    if (req.url) {
      if (req.url === '/index.html' || req.url === '/index.php' || req.url === '/index' || req.url === '') {
        req.url = '/';
      } else if (req.url.startsWith('/index.html?') || req.url.startsWith('/index.php?')) {
        req.url = '/' + req.url.slice(req.url.indexOf('?'));
      }
    }

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> Ready on http://0.0.0.0:${port}`);
  });
});

