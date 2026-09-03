const { createServer } = require('http');
const next = require('next');
const app = next({ dev: false });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3001;

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port, '127.0.0.1', (err) => {
    if (err) throw err;
    console.log(`> Ready on http://127.0.0.1:${port}`);
  });
});
