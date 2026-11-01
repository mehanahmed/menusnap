import { spawn } from 'child_process';
import net from 'net';
import path from 'path';

const checkPort = (port) => new Promise((resolve) => {
  const socket = new net.Socket();
  socket.setTimeout(400);
  socket.on('connect', () => {
    socket.destroy();
    resolve(true);
  });
  socket.on('timeout', () => {
    socket.destroy();
    resolve(false);
  });
  socket.on('error', () => {
    resolve(false);
  });
  socket.connect(port, '127.0.0.1');
});

async function main() {
  const isSocketRunning = await checkPort(1234);

  if (!isSocketRunning) {
    console.log('⚡ [Dev Runner] Starting Socket.io server on port 1234...');
    try {
      await import('./socket-server.mjs');
    } catch (err) {
      console.error('Failed to start socket-server:', err);
    }
  } else {
    console.log('⚡ [Dev Runner] Socket.io server is already active on port 1234.');
  }

  console.log('🚀 [Dev Runner] Starting Next.js dev server on port 9002...');
  const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');

  const nextProcess = spawn(process.execPath, [nextBin, 'dev', '--webpack', '-p', '9002'], {
    stdio: 'inherit',
    env: process.env,
  });

  const cleanup = () => {
    try { nextProcess.kill(); } catch (_) {}
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  nextProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main();
