const express = require('express');
const originalJson = express.response.json;

function stripBinary(value) {
  if (Array.isArray(value)) return value.map(stripBinary);
  if (!value || typeof value !== 'object') return value;
  if (Buffer.isBuffer(value)) return undefined;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (key === 'photo_data') continue;
    out[key] = stripBinary(val);
  }
  return out;
}

express.response.json = function safeJson(body) {
  return originalJson.call(this, stripBinary(body));
};
