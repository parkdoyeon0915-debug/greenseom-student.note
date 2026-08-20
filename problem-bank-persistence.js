// Problem bank persistence is implemented in the server-authoritative core.
// Keep the original require path used by start.js and add the photo payload guard.
require('./problem-bank-photo-server-core.js');
require('./problem-bank-photo-payload-fix.js');
