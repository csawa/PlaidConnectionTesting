// server.js – Pure Node.js version without Express
require('dotenv').config();
const http = require('http');
const { parse } = require('url');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

// Session workaround using a simple in-memory store (just for demo!)
const sessions = {};

// Setup Plaid client
const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});
const client = new PlaidApi(config);
console.log('Client ID:', process.env["PLAID_CLIENT_ID"]);
console.log('Secret:', process.env["PLAID_SECRET"]);

// Helper to read POST body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => resolve(JSON.parse(body || '{}')));
    req.on('error', reject);
  });
}

// Server logic
const server = http.createServer(async (req, res) => {
  const parsedUrl = parse(req.url, true);
  const { pathname } = parsedUrl;
  const method = req.method;

  // Simple session using IP+timestamp as key (for demo only!)
  const sessionId = req.headers['x-session-id'] || req.socket.remoteAddress + '-' + Date.now();
  if (!sessions[sessionId]) sessions[sessionId] = {};

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*'); // for dev
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Create link token
  if (pathname === '/api/create_link_token' && method === 'POST') {
    const body = await getRequestBody(req);
    const address = body.address;

    const payload = {
      user: { client_user_id: sessionId },
      client_name: 'Plaid Tiny Quickstart - React Native',
      language: 'en',
      products: ['auth'],
      country_codes: ['US']
      //...(address === 'localhost'
      //  ? { redirect_uri: process.env.PLAID_SANDBOX_REDIRECT_URI }
      //  : { android_package_name: process.env.PLAID_ANDROID_PACKAGE_NAME }),
    };

    try {
      const tokenResponse = await client.linkTokenCreate(payload);
      res.end(JSON.stringify(tokenResponse.data));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }

  // Exchange public token
  } else if (pathname === '/api/exchange_public_token' && method === 'POST') {
    const body = await getRequestBody(req);

    try {
      const exchangeResponse = await client.itemPublicTokenExchange({
        public_token: body.public_token,
      });

      sessions[sessionId].access_token = exchangeResponse.data.access_token;
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }

  // Get balances
  } else if (pathname === '/api/balance' && method === 'POST') {
    const access_token = sessions[sessionId].access_token;

    if (!access_token) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Not authorized' }));
      return;
    }

    try {
      const balanceResponse = await client.accountsBalanceGet({ access_token });
      res.end(JSON.stringify({ Balance: balanceResponse.data }));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }

  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
});

// Start the server
const port = 8080;
server.listen(port, () => {
  console.log(`Pure Node.js server listening on port ${port}...`);
});