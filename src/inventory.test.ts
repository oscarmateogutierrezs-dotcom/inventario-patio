import { applySheetInventory, storageKey } from './inventory';

beforeEach(() => {
  localStorage.clear();
});

test('replaces the local inventory with valid sheet rows grouped by product', () => {
  applySheetInventory([
    { codigo: '2009', nombre: 'Bloque 4', lote: 'L-1', cantidad: 10 },
    { codigo: '2009', nombre: 'Bloque 4', lote: 'L-2', cantidad: '5' },
    { codigo: '', nombre: 'Sin código', lote: 'L-3', cantidad: 1 },
    { codigo: '2010', nombre: 'Bloque 5', lote: 'L-1', cantidad: -3 }
  ]);

  expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')).toEqual([
    { codigo: '2009', item: 'Bloque 4', lotes: [{ lote: 'L-1', cantidad: 10 }, { lote: 'L-2', cantidad: 5 }] }
  ]);
});

test('keeps the local inventory when the sheet has no valid rows', () => {
  localStorage.setItem(storageKey, '[{"codigo":"1","item":"A","lotes":[{"lote":"L","cantidad":1}]}]');
  applySheetInventory([]);

  expect(localStorage.getItem(storageKey)).toContain('"codigo":"1"');
});
