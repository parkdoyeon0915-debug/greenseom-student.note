const express = require('express');

// Render web services must expose the HTTP server on 0.0.0.0.
// Keep the existing app and all other fixes untouched; only supply the host
// when the application calls app.listen(port, callback) without one.
const originalListen = express.application.listen;

express.application.listen = function (port, ...args) {
  const isPort = typeof port === 'number' || (typeof port === 'string' && /^\d+$/.test(port));
  if (isPort && (args.length === 0 || typeof args[0] === 'function')) {
    return originalListen.call(this, port, '0.0.0.0', ...args);
  }
  return originalListen.call(this, port, ...args);
};

console.log('GREENSUM Render port binding fix loaded');
