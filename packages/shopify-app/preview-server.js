const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HTML_PATH = path.join(__dirname, '../../public/index.html');

const server = http.createServer((req, res) => {
  try {
    const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Security-Policy': 'frame-ancestors https://admin.shopify.com https://*.myshopify.com https://*.shopify.com;'
    });
    res.end(htmlContent);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error loading dashboard UI: ' + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 AEO Engine running at: http://localhost:${PORT}`);
});
