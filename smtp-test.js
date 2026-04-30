// smtp-test.js
const dns = require('dns').promises;
const net = require('net');

const HOST = 'smtp-relay.brevo.com';
const PORT = 587;

(async () => {
  console.log('--- DNS ---');
  const addrs = await dns.lookup(HOST, { all: true });
  console.log(addrs);

  console.log('--- TCP connect test ---');
  const socket = new net.Socket();

  const timeoutMs = 10000;

  const p = new Promise((resolve, reject) => {
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => resolve('connected'));
    socket.on('timeout', () => reject(new Error('socket timeout')));
    socket.on('error', (e) => reject(e));
  });

  socket.connect(PORT, HOST);

  const result = await p;
  console.log('Result:', result);
  socket.destroy();
})().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
