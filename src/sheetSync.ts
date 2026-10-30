import { useEffect, useState } from 'react';

const outboxKey = 'inventario-patio-outbox';
const outboxEvent = 'inventario-patio-outbox-actualizada';
const sheetUrl = import.meta.env.VITE_SHEETS_URL as string | undefined;
const retryMs = 30000;

export type SyncJob = { uid: string; action: 'add' | 'delete'; entryId: string; data?: Record<string, string> };

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
  try {
    for (let jobs = readOutbox(); jobs.length > 0; jobs = readOutbox()) {
      const response = await fetch(sheetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(jobs[0])
      });
      const result = (await response.json()) as { ok?: boolean };
      if (!response.ok || !result.ok) {
        break;
      }
      writeOutbox(readOutbox().filter((job) => job.uid !== jobs[0].uid));
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

export const pendingSyncCount = (): number => readOutbox().length;

export const usePendingSyncCount = (): number => {
  const [count, setCount] = useState(pendingSyncCount);
  useEffect(() => {
    const refresh = () => setCount(pendingSyncCount());
    window.addEventListener(outboxEvent, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(outboxEvent, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  return count;
};

export const startSheetSync = (): void => {
  void flushOutbox();
  window.addEventListener('online', () => void flushOutbox());
  window.setInterval(() => {
    if (pendingSyncCount() > 0) {
      void flushOutbox();
    }
  }, retryMs);
};
