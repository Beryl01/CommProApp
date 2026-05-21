const http = require('http');

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    if (req.url === '/.netlify/functions/proxy') {
      try {
        JSON.parse(body);
      } catch {
        res.writeHead(400);
        // test expects body.error.message (nested.property)
        res.end(JSON.stringify({ error: { message: 'Invalid JSON body' } }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({
        role: 'assistant',
        content: [{ type: 'text', text: 'Mock Claude response.' }]
      }));

    } else if (req.url === '/.netlify/functions/slack') {
      try {
        JSON.parse(body);
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));

    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
});

server.listen(3001, () => console.log('Mock server on port 3001'));
