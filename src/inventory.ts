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

const storageKey = 'inventario-patio-productos';
const updateEvent = 'inventario-patio-productos-actualizados';
const initialProducts: InventoryProduct[] = inventoryData.items.map((product) => ({
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
