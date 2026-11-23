import assert from 'node:assert/strict';
import test from 'node:test';
import { FirestoreStore } from '../server/firestore-store.mjs';
import { MemoryFirestore } from './helpers/memory-firestore.mjs';

test('saved keys survive restart, stay with the instructor and can be replaced or removed', async () => {
  const db = new MemoryFirestore(), teacher = {id:'teacher',role:'instructor'};
  const other = {id:'other',role:'instructor'}, student = {id:'student',role:'student'};
  let store = new FirestoreStore(db);
  const save = (provider, model, key) => store.aiSettings(teacher,{provider,model,key});
  await save('openai','first','fixture-key');
  await save('anthropic','second','fixture-two');
  store = new FirestoreStore(db);
  assert.deepEqual(await store.aiSettings(teacher),{defaultProvider:'anthropic',models:{openai:'first',anthropic:'second'}});
  await save('openai','updated','');
  assert.equal(await store.savedProviderKey(teacher,'openai'),'fixture-key');
  await save('openai','updated','replacement');
  assert.equal(await store.savedProviderKey(teacher,'openai'),'replacement');
  assert.equal(await store.savedProviderKey(other,'openai'),undefined);
  await assert.rejects(store.savedProviderKey(student,'openai'),/Instructor/);
  await assert.rejects(store.aiSettings(student,{provider:'openai',remove:true}),/Instructor/);
  await store.aiSettings(teacher,{provider:'openai',remove:true});
  assert.deepEqual(await store.aiSettings(teacher),{defaultProvider:'',models:{anthropic:'second'}});
  assert.equal(await store.savedProviderKey(teacher,'openai'),undefined);
});
