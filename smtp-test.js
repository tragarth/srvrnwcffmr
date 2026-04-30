// smtp-test.js
const dns = require('dns').promises;
const net = require('net');

const HOST = 'smtp-relay.brevo.com';
const PORT = 465;

(async () => {
  console.log('--- DNS ---');
  const addrs = await dns.lookup(HOST, { all: true });
  console.log(addrs);

  console.log(`--- TCP connect test (${HOST}:${PORT}) ---`);
  const socket = new net.Socket();

  const timeoutMs = 10000;

  const result = await new Promise((resolve, reject) => {
    const onError = (e) => reject(e);
    const onTimeout = () => reject(new Error(`socket timeout after ${timeoutMs}ms`));
    const onConnect = () => resolve('connected');

    socket.once('error', onError);
    socket.once('timeout', onTimeout);
    socket.once('connect', onConnect);

    socket.setTimeout(timeoutMs);
    socket.connect(PORT, HOST);
  });

  console.log('Result:', result);
  socket.destroy();
})().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
