const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

function getDocumentList() {
  const docs = [];
  const searchDirs = [PUBLIC_DIR, path.join(PUBLIC_DIR, 'drive')];

  searchDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (['.pdf', '.docx'].includes(ext)) {
          const relativePath = path.relative(PUBLIC_DIR, path.join(dir, file)).replace(/\\/g, '/');
          const stats = fs.statSync(path.join(dir, file));
          docs.push({
            name: file,
            path: '/' + relativePath,
            size: stats.size,
            mtime: stats.mtime,
            category: relativePath.includes('SARCOF') ? 'SARCOF Report' :
                      relativePath.includes('UN') ? 'UN / Angola' :
                      relativePath.includes('FEWS') ? 'FEWS NET' : 'Document'
          });
        }
      });
    }
  });

  return docs;
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // API Endpoint: list available documents
  if (pathname === '/api/documents' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getDocumentList()));
    return;
  }

  // API Endpoint: file upload (simple binary / multipart file receiver)
  if (pathname === '/api/upload' && req.method === 'POST') {
    const filename = req.headers['x-file-name'] || `uploaded_${Date.now()}.pdf`;
    const targetPath = path.join(PUBLIC_DIR, 'drive', path.basename(filename));
    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'File uploaded successfully',
        path: '/drive/' + path.basename(filename),
        name: path.basename(filename)
      }));
    });
    req.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
    return;
  }

  // Default static file serving
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 File Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` El Niño WebGIS Server running at http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
