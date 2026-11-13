import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStorage } from './storage';

for (const version of [999, -1]) {
 test(`refuses unsupported saved schema ${version} without changing the database`, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aquarium-version-'));
  try {
   const file = join(dir, 'aquarium.sqlite');
   const db = new DatabaseSync(file);
   db.exec(`CREATE TABLE keepsake (name TEXT); INSERT INTO keepsake VALUES ('saved fish'); PRAGMA user_version=${version}`);
   db.close();
   const before = await readFile(file);
   await assert.rejects(openStorage(dir), /saved data version.*not supported.*Keep your data folder/i);
   assert.deepEqual(await readFile(file), before);
   const check = new DatabaseSync(file);
   assert.equal(check.prepare('SELECT name FROM keepsake').get()!.name, 'saved fish');
   check.close();
  } finally { await rm(dir, { recursive: true, force: true }); }
 });
}
