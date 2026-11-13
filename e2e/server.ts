// Never point browser smoke tests at the user's saved aquarium data.
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAquariumServer} from '../standalone/server';
const dataDir = await mkdtemp(join(tmpdir(), 'aquarium-e2e-'));
const {server} = await createAquariumServer({port: 4391, dataDir});
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  server.close(async () => {await rm(dataDir, {recursive: true, force: true}); process.exit(0);});
  server.closeAllConnections();
}
server.once('error', async error => {
  console.error(error);
  await rm(dataDir, {recursive: true, force: true});
  process.exit(1);
});
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.listen(4391, '127.0.0.1');
