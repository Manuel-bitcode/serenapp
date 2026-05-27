/* SerenApp — base de datos local (Dexie / IndexedDB).
 * 100% en el dispositivo, sin sincronización en la nube (RNF3).
 */
import Dexie, { type Table } from 'dexie';
import type { Entry } from './types';

export class SerenDB extends Dexie {
  entries!: Table<Entry, number>;

  constructor() {
    super('serenapp');
    // index por createdAt para listar el historial en orden cronológico (RF3)
    this.version(1).stores({
      entries: '++id, type, createdAt',
    });
  }
}

export const db = new SerenDB();
