const fs = require('fs');
const path = require('path');

export const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-file-name');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Vercel functions are read-only filesystem, uploads not supported
  // Return a helpful message
  res.status(200).json({
    success: false,
    message: 'File upload is not supported in the deployed version. Please use the local server for uploads.'
  });
};
