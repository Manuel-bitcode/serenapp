import 'fake-indexeddb/auto';
import { db } from '../data/db';
import {
  addTextEntry,
  addPhotoEntry,
  addTouchEntry,
  listEntries,
  getEntry,
  deleteEntry,
  clearAllEntries,
  entryCounts,
} from './entries';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeEach(async () => {
  await db.entries.clear();
});

describe('servicio de entradas (almacenamiento local)', () => {
  it('guarda los 3 tipos y los lista del más reciente al más antiguo', async () => {
    const a = await addTextEntry('¿Qué piensas?', 'hola');
    await wait(10);
    const b = await addPhotoEntry('data:image/png;base64,xxx', 'calma');
    await wait(10);
    const c = await addTouchEntry('bubbles', 3000);

    const list = await listEntries();
    expect(list.map((e) => e.id)).toEqual([c, b, a]);
  });

  it('getEntry y deleteEntry operan por id', async () => {
    const id = await addTextEntry('q', 'texto');
    expect((await getEntry(id))?.type).toBe('text');
    await deleteEntry(id);
    expect(await getEntry(id)).toBeUndefined();
  });

  it('entryCounts cuenta por tipo y total', async () => {
    await addTextEntry('q', 't1');
    await addTextEntry('q', 't2');
    await addPhotoEntry('data:img', 'enojo');
    await addTouchEntry('bubbles', 5000);

    expect(await entryCounts()).toEqual({ text: 2, photo: 1, touch: 1, total: 4 });
  });

  it('clearAllEntries deja el historial vacío', async () => {
    await addTextEntry('q', 't');
    await clearAllEntries();
    expect(await listEntries()).toHaveLength(0);
  });
});
