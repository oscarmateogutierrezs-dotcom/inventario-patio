import { useEffect, useState } from 'react';

const outboxKey = 'inventario-patio-outbox';
const outboxEvent = 'inventario-patio-outbox-actualizada';
const sheetUrl = import.meta.env.VITE_SHEETS_URL as string | undefined;
const retryMs = 30000;

export type InventorySyncRow = { codigo: string; nombre: string; lote: string; cantidad: number };

export type SyncJob = {
  uid: string;
  action: 'add' | 'delete' | 'inventory';
  entryId: string;
  data?: Record<string, string>;
  rows?: InventorySyncRow[];
};

const readOutbox = (): SyncJob[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(outboxKey) ?? '[]');
    return Array.isArray(parsed) ? (parsed as SyncJob[]) : [];
  } catch {
    return [];
  }
};

const writeOutbox = (jobs: SyncJob[]) => {
  localStorage.setItem(outboxKey, JSON.stringify(jobs));
  window.dispatchEvent(new Event(outboxEvent));
};

let flushing = false;

// Envía los pendientes en orden; un trabajo sólo se elimina tras la confirmación del servidor.
export const flushOutbox = async (): Promise<void> => {
  if (!sheetUrl || flushing) {
    return;
  }
  flushing = true;
  // Un envío de inventario fallido no debe bloquear las salidas: se omite y se reintenta en el siguiente ciclo.
  const skipped = new Set<string>();
  try {
    for (
      let job = readOutbox().find((candidate) => !skipped.has(candidate.uid));
      job;
      job = readOutbox().find((candidate) => !skipped.has(candidate.uid))
    ) {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(job)
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        console.error('La hoja de cálculo rechazó el envío.', result.error ?? response.status);
        if (job.action === 'inventory') {
          skipped.add(job.uid);
          continue;
        }
        break;
      }
      const sentUid = job.uid;
      writeOutbox(readOutbox().filter((pending) => pending.uid !== sentUid));
    }
  } catch (error) {
    console.error('No se pudo sincronizar con la hoja de cálculo.', error);
  } finally {
    flushing = false;
  }
};

export const enqueueSync = (job: Omit<SyncJob, 'uid'>): void => {
  writeOutbox([...readOutbox(), { ...job, uid: crypto.randomUUID() }]);
  void flushOutbox();
};

// El inventario se envía como foto completa; sólo importa la más reciente, así que reemplaza a la pendiente.
export const enqueueInventorySync = (rows: InventorySyncRow[]): void => {
  writeOutbox([
    ...readOutbox().filter((job) => job.action !== 'inventory'),
    { uid: crypto.randomUUID(), action: 'inventory', entryId: 'inventario', rows }
  ]);
  void flushOutbox();
};

const readEntryJobs = (): SyncJob[] => readOutbox().filter((job) => job.action !== 'inventory');

export const pendingSyncCount = (): number => readEntryJobs().length;

export const usePendingSyncEntryIds = (): ReadonlySet<string> => {
  const [entryIds, setEntryIds] = useState(() => new Set(readEntryJobs().map((job) => job.entryId)));
  useEffect(() => {
    const refresh = () => setEntryIds(new Set(readEntryJobs().map((job) => job.entryId)));
    window.addEventListener(outboxEvent, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(outboxEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return entryIds;
};

export const usePendingSyncCount = (): number => usePendingSyncEntryIds().size;

let pulling = false;

// Descarga el inventario de la hoja sólo si no hay nada pendiente por enviar, para no pisar cambios locales.
export const pullInventory = async (apply: (rows: InventorySyncRow[]) => void): Promise<void> => {
  if (!sheetUrl || pulling || flushing || readOutbox().length > 0) {
    return;
  }
  pulling = true;
  try {
    const response = await fetch(sheetUrl);
    const result = (await response.json()) as { ok?: boolean; rows?: unknown };
    // Se revisa de nuevo: pudo encolarse un cambio local mientras llegaba la respuesta.
    if (!response.ok || !result.ok || !Array.isArray(result.rows) || readOutbox().length > 0) {
      return;
    }
    apply(result.rows as InventorySyncRow[]);
  } catch (error) {
    console.error('No se pudo descargar el inventario de la hoja de cálculo.', error);
  } finally {
    pulling = false;
  }
};

export const startSheetSync = (applyInventory: (rows: InventorySyncRow[]) => void): void => {
  const sync = async () => {
    await flushOutbox();
    await pullInventory(applyInventory);
  };
  void sync();
  window.addEventListener('online', () => void sync());
  window.setInterval(() => void sync(), retryMs);
};
