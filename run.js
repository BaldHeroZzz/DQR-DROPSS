const { spawn } = require('node:child_process');
const path = require('node:path');

const children = [
  spawn(process.execPath, [path.join(__dirname, 'server.js')], { stdio: 'inherit' }),
  spawn(process.execPath, [path.join(__dirname, 'bot.js')], { stdio: 'inherit' })
];

let stopping = false;
function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`Received ${signal}; stopping website and Discord monitor...`);
  for (const child of children) if (!child.killed) child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping && code !== 0) {
      console.error(`A child process exited (code=${code}, signal=${signal}).`);
      process.exit(1);
    }
  });
}
