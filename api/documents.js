const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const PUBLIC_DIR = path.join(__dirname, '..');
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

  res.status(200).json(docs);
};
