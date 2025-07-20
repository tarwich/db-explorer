import { spawn } from 'child_process';

export async function* startNextServer() {
  // Run the next server in a loop. If it dies, run it again.
  while (true) {
    const { server, port, address } = await runNewServer();

    yield { port, address };

    await server;
  }
}

async function runNewServer() {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['next', 'dev', '--port', '0']);

    const serverIsRunningPromise = new Promise((resolve) => {
      child.on('close', (code) => {
        resolve(false);
      });
      child.on('exit', (code) => {
        resolve(false);
      });
      child.on('disconnect', (code) => {
        resolve(false);
      });
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data.toString());

      const match = data.toString().match(/local:.*?(http:.*?:(\d*))/i);

      if (match) {
        resolve({
          server: serverIsRunningPromise,
          address: match[1],
          port: Number(match[2]),
        });
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}
