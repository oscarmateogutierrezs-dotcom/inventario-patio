import { initialDrivers, storageKey as driversKey } from './drivers';
import { initialProducts, storageKey as productsKey } from './inventory';

const seedIfMissing = (key: string, value: unknown) => {
  if (localStorage.getItem(key) === null) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Guarda las bases iniciales en el dispositivo y pide al navegador que no borre los datos.
export const initPersistentStorage = async () => {
  try {
    seedIfMissing(productsKey, initialProducts);
    seedIfMissing(driversKey, initialDrivers);
  } catch (error) {
    console.error('No se pudieron guardar las bases de datos iniciales.', error);
  }

  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.error('No se pudo solicitar almacenamiento persistente.', error);
  }
};
