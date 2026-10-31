import { useEffect, useState } from 'react';
import inventoryData from '../data/inventario.json';

export type InventoryProduct = {
  codigo: string;
  item: string;
  cantidad: number;
};

type InventoryProductsState = {
  products: InventoryProduct[];
  error: string | null;
};

export const storageKey = 'inventario-patio-productos';
const updateEvent = 'inventario-patio-productos-actualizados';
export const initialProducts: InventoryProduct[] = inventoryData.items.map((product) => ({
  ...product
}));

const isInventoryProductList = (value: unknown): value is InventoryProduct[] =>
  Array.isArray(value) &&
  value.every(
    (product) =>
      typeof product === 'object' &&
      product !== null &&
      'codigo' in product &&
      typeof product.codigo === 'string' &&
      product.codigo.trim() !== '' &&
      'item' in product &&
      typeof product.item === 'string' &&
      product.item.trim() !== '' &&
      'cantidad' in product &&
      typeof product.cantidad === 'number' &&
      Number.isFinite(product.cantidad) &&
      product.cantidad >= 0
  ) &&
  new Set(value.map((product) => product.codigo)).size === value.length;

const loadProducts = (): InventoryProductsState => {
  try {
    const savedProducts = localStorage.getItem(storageKey);
    if (savedProducts === null) {
      return { products: initialProducts, error: null };
    }

    const parsedProducts: unknown = JSON.parse(savedProducts);
    if (!isInventoryProductList(parsedProducts)) {
      throw new Error('El formato de la lista de productos guardada no es válido.');
    }
    return { products: parsedProducts, error: null };
  } catch (error) {
    console.error('No se pudo cargar la lista de productos.', error);
    return {
      products: initialProducts,
      error: 'No se pudo cargar la lista guardada. Se muestran los productos iniciales.'
    };
  }
};

export const quantityStorageKey = 'inventario-patio-cantidades';
const quantityUpdateEvent = 'inventario-patio-cantidades-actualizadas';

export const readSavedQuantities = (): Record<string, number> => {
  try {
    const savedQuantities = localStorage.getItem(quantityStorageKey);
    const parsedQuantities: unknown = savedQuantities ? JSON.parse(savedQuantities) : {};
    if (typeof parsedQuantities !== 'object' || parsedQuantities === null || Array.isArray(parsedQuantities)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsedQuantities).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0
      )
    );
  } catch {
    return {};
  }
};

export const useSavedQuantities = () => {
  const [quantities, setQuantities] = useState(readSavedQuantities);

  useEffect(() => {
    const refreshQuantities = () => setQuantities(readSavedQuantities());
    window.addEventListener(quantityUpdateEvent, refreshQuantities);
    window.addEventListener('storage', refreshQuantities);
    return () => {
      window.removeEventListener(quantityUpdateEvent, refreshQuantities);
      window.removeEventListener('storage', refreshQuantities);
    };
  }, []);

  return quantities;
};

export const onQuantitiesChanged = (listener: () => void) => {
  window.addEventListener(quantityUpdateEvent, listener);
  return () => window.removeEventListener(quantityUpdateEvent, listener);
};

// Suma (delta positivo) o resta (delta negativo) existencias; falla si el resultado sería negativo.
export const adjustProductStock = (
  products: InventoryProduct[],
  codigo: string,
  delta: number
): boolean => {
  const product = products.find((currentProduct) => currentProduct.codigo === codigo);
  if (!product) {
    return false;
  }

  const savedQuantities = readSavedQuantities();
  const nextQuantity = (savedQuantities[codigo] ?? product.cantidad) + delta;
  if (nextQuantity < 0) {
    return false;
  }

  try {
    localStorage.setItem(quantityStorageKey, JSON.stringify({ ...savedQuantities, [codigo]: nextQuantity }));
    window.dispatchEvent(new Event(quantityUpdateEvent));
    return true;
  } catch (error) {
    console.error('No se pudo actualizar la cantidad del inventario.', error);
    return false;
  }
};

export const useInventoryProducts = () => {
  const [state, setState] = useState<InventoryProductsState>(loadProducts);

  useEffect(() => {
    const refreshProducts = () => setState(loadProducts());
    window.addEventListener(updateEvent, refreshProducts);
    window.addEventListener('storage', refreshProducts);
    return () => {
      window.removeEventListener(updateEvent, refreshProducts);
      window.removeEventListener('storage', refreshProducts);
    };
  }, []);

  const saveProducts = (products: InventoryProduct[]): boolean => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(products));
      setState({ products, error: null });
      window.dispatchEvent(new Event(updateEvent));
      return true;
    } catch (error) {
      console.error('No se pudo guardar la lista de productos.', error);
      setState((currentState) => ({
        ...currentState,
        error: 'No se pudieron guardar los cambios de productos en este dispositivo.'
      }));
      return false;
    }
  };

  const addProduct = (product: InventoryProduct): boolean => {
    if (state.products.some((currentProduct) => currentProduct.codigo === product.codigo)) {
      return false;
    }
    return saveProducts([...state.products, product]);
  };

  const removeProduct = (codigo: string): boolean =>
    saveProducts(state.products.filter((product) => product.codigo !== codigo));

  return { ...state, addProduct, removeProduct };
};
