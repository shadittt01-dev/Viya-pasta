// In-process event bus for live dashboard updates (Server-Sent Events).
// Events are broadcast only after the database transaction commits.
import { EventEmitter } from 'node:events';
import { afterCommit } from '../db/db.js';

export const bus = new EventEmitter();
bus.setMaxListeners(200);

export function publish(evt) {
  afterCommit(() => bus.emit('event', { ...evt, at: Date.now() }));
}
