import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDirectMessageService } from '../src/lib/supabaseDirectMessageService.js';
const me = '11111111-1111-4111-8111-111111111111';
const friend = '22222222-2222-4222-8222-222222222222';
const messageId = '33333333-3333-4333-8333-333333333333';
function setup(error = null) {
  const calls = [];
  const query = {};
  for (const method of ['select', 'or', 'order', 'insert', 'update', 'eq', 'is', 'single', 'maybeSingle']) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  query.then = (resolve) => resolve({ data: [], error });
  const client = { from: (table) => { calls.push(['from', table]); return query; } };
  return { service: createDirectMessageService(client, me), calls };
}
test('send preserves UUID identity, trims content and rejects blank, oversized and self messages before requests', async () => {
  const { service, calls } = setup();
  for (const [receiver, text, error] of [[me, 'Hi', /CANNOT_MESSAGE_SELF/], [friend, ' ', /EMPTY_MESSAGE/], [friend, 'a'.repeat(3001), /MESSAGE_TOO_LONG/]]) {
    await assert.rejects(service.send(receiver, text), error);
  }
  assert.equal(calls.length, 0);
  await service.send(friend, ' Hello ');
  assert.deepEqual(calls.find(([method]) => method === 'insert'), ['insert', { sender_id: me, receiver_id: friend, content: 'Hello' }]);
});
test('inbox and conversation use existing participant-scoped history queries', async () => {
  const { service, calls } = setup();
  await service.inbox();
  assert.ok(calls.some((call) => call[0] === 'or' && call[1] === `sender_id.eq.${me},receiver_id.eq.${me}`));
  await service.conversation(friend);
  assert.ok(calls.some((call) => call[0] === 'or' && call[1] === `and(sender_id.eq.${me},receiver_id.eq.${friend}),and(sender_id.eq.${friend},receiver_id.eq.${me})`));
});
test('read updates target only the current receiver and unread rows', async () => {
  const { service, calls } = setup();
  await service.markRead(messageId);
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'receiver_id' && call[2] === me));
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'id' && call[2] === messageId));
  assert.ok(calls.some((call) => call[0] === 'is' && call[1] === 'read_at' && call[2] === null));
  calls.length = 0;
  await service.markConversationRead(friend);
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'sender_id' && call[2] === friend));
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'receiver_id' && call[2] === me));
});
test('backend authorization errors propagate without bypassing the service', async () => {
  const error = { code: '42501', message: 'Denied' };
  const { service } = setup(error);
  await assert.rejects(service.send(friend, 'Hi'), (actual) => actual === error);
});
