import { useEffect, useState } from 'react';
import driversData from '../data/conductores.json';

export type Driver = {
  nombre: string;
  placa: string;
};

type DriversState = {
  drivers: Driver[];
  error: string | null;
};

const storageKey = 'inventario-patio-conductores';
const updateEvent = 'inventario-patio-conductores-actualizados';
const initialDrivers: Driver[] = driversData.conductores;

const isDriverList = (value: unknown): value is Driver[] =>
  Array.isArray(value) &&
  value.every(
    (driver) =>
      typeof driver === 'object' &&
      driver !== null &&
      'nombre' in driver &&
      typeof driver.nombre === 'string' &&
      'placa' in driver &&
      typeof driver.placa === 'string'
  );

const loadDrivers = (): DriversState => {
  try {
    const savedDrivers = localStorage.getItem(storageKey);
    if (savedDrivers === null) {
      return { drivers: initialDrivers, error: null };
    }

    const parsedDrivers: unknown = JSON.parse(savedDrivers);
    if (!isDriverList(parsedDrivers)) {
      throw new Error('El formato de la lista de conductores guardada no es válido.');
    }
    return { drivers: parsedDrivers, error: null };
  } catch (error) {
    console.error('No se pudo cargar la lista de conductores.', error);
    return {
      drivers: initialDrivers,
      error: 'No se pudo cargar la lista guardada. Se muestran los conductores iniciales.'
    };
  }
};

export const useDrivers = () => {
  const [state, setState] = useState<DriversState>(loadDrivers);

  useEffect(() => {
    const refreshDrivers = () => setState(loadDrivers());
    window.addEventListener(updateEvent, refreshDrivers);
    window.addEventListener('storage', refreshDrivers);
    return () => {
      window.removeEventListener(updateEvent, refreshDrivers);
      window.removeEventListener('storage', refreshDrivers);
    };
  }, []);

  const saveDrivers = (drivers: Driver[]): boolean => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(drivers));
      setState({ drivers, error: null });
      window.dispatchEvent(new Event(updateEvent));
      return true;
    } catch (error) {
      console.error('No se pudo guardar la lista de conductores.', error);
      setState((currentState) => ({
        ...currentState,
        error: 'No se pudieron guardar los cambios de conductores en este dispositivo.'
      }));
      return false;
    }
  };

  return { ...state, saveDrivers };
};
