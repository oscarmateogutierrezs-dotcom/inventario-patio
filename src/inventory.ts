import { useEffect, useState } from 'react';
import inventoryData from '../data/inventario.json';

export type InventoryProduct = {
  codigo: string;
  item: string;
  lotes: InventoryLot[];
};

export type InventoryLot = {
  lote: string;
  cantidad: number;
};

type StoredInventoryProduct = {
  codigo: string;
  item: string;
  cantidad?: number;
  lotes?: Array<string | InventoryLot>;
};

type InventoryProductsState = {
  products: InventoryProduct[];
  error: string | null;
};

export const storageKey = 'inventario-patio-productos';
const updateEvent = 'inventario-patio-productos-actualizados';
const legacyQuantityStorageKey = 'inventario-patio-cantidades';
export const initialProducts: InventoryProduct[] = inventoryData.items.map((product) => ({
  codigo: product.codigo,
  item: product.item,
  lotes: [{ lote: 'Sin lote', cantidad: product.cantidad }]
}));

const isInventoryLot = (value: unknown): value is InventoryLot =>
  typeof value === 'object' &&
  value !== null &&
  'lote' in value &&
  typeof value.lote === 'string' &&
  value.lote.trim() !== '' &&
  'cantidad' in value &&
  typeof value.cantidad === 'number' &&
  Number.isFinite(value.cantidad) &&
  value.cantidad >= 0;

const isStoredInventoryProductList = (value: unknown): value is StoredInventoryProduct[] =>
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
      (!('cantidad' in product) ||
        (typeof product.cantidad === 'number' && Number.isFinite(product.cantidad) && product.cantidad >= 0)) &&
      (!('lotes' in product) ||
        (Array.isArray(product.lotes) &&
          product.lotes.every((lot: unknown) => typeof lot === 'string' || isInventoryLot(lot))))
  ) &&
  new Set(value.map((product) => product.codigo)).size === value.length;

const readLegacyQuantities = (): Record<string, number> => {
  try {
    const savedQuantities = localStorage.getItem(legacyQuantityStorageKey);
    if (!savedQuantities) {
      return {};
    }
    const parsed: unknown = JSON.parse(savedQuantities);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('El formato de las cantidades guardadas no es válido.');
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0
      )
    );
  } catch (error) {
    console.error('No se pudieron migrar las cantidades antiguas del inventario.', error);
    return {};
  }
};

const normalizeStoredProducts = (
  products: StoredInventoryProduct[],
  legacyQuantities: Record<string, number>
): InventoryProduct[] =>
  products.map((product) => {
    const lots = product.lotes ?? [];
    if (lots.length > 0 && lots.every(isInventoryLot)) {
      return {
        codigo: product.codigo,
        item: product.item,
        lotes: Array.from(
          new Map(lots.map((lot) => [lot.lote.trim(), { lote: lot.lote.trim(), cantidad: lot.cantidad }])).values()
        )
      };
    }

    const oldQuantity = legacyQuantities[product.codigo] ?? product.cantidad ?? 0;
    const migratedLots = lots
      .filter((lot): lot is string => typeof lot === 'string')
      .map((lote) => ({ lote: lote.trim(), cantidad: 0 }))
      .filter((lot) => lot.lote !== '');
    const unassignedLot = migratedLots.find((lot) => lot.lote === 'Sin lote');
    if (unassignedLot) {
      unassignedLot.cantidad = oldQuantity;
    } else if (oldQuantity > 0 || migratedLots.length === 0) {
      migratedLots.unshift({ lote: 'Sin lote', cantidad: oldQuantity });
    }
    return { codigo: product.codigo, item: product.item, lotes: migratedLots };
  });

const needsInventoryMigration = (products: StoredInventoryProduct[]) =>
  products.some(
    (product) =>
      'cantidad' in product ||
      !Array.isArray(product.lotes) ||
      product.lotes.some((lot) => typeof lot === 'string')
  );

const initialProductList = inventoryData.items.map((product) => ({ ...product }));

const loadProducts = (): InventoryProductsState => {
  try {
    const savedProducts = localStorage.getItem(storageKey);
    const legacyQuantities = readLegacyQuantities();
    const parsedProducts: unknown = savedProducts === null ? initialProductList : JSON.parse(savedProducts);
    if (!isStoredInventoryProductList(parsedProducts)) {
      throw new Error('El formato de la lista de productos guardada no es válido.');
    }
    const products = normalizeStoredProducts(parsedProducts, legacyQuantities);
    const hasLegacyQuantities = localStorage.getItem(legacyQuantityStorageKey) !== null;
    if ((savedProducts !== null && needsInventoryMigration(parsedProducts)) || hasLegacyQuantities) {
      localStorage.setItem(storageKey, JSON.stringify(products));
      localStorage.removeItem(legacyQuantityStorageKey);
    }
    return { products, error: null };
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

  const addProductLot = (codigo: string, lote: string, cantidad: number): boolean => {
    const product = state.products.find((currentProduct) => currentProduct.codigo === codigo);
    const normalizedLot = lote.trim();
    if (
      !product ||
      !normalizedLot ||
      !Number.isFinite(cantidad) ||
      cantidad < 0 ||
      product.lotes.some((lot) => lot.lote === normalizedLot)
    ) {
      return false;
    }

    return saveProducts(
      state.products.map((currentProduct) =>
        currentProduct.codigo === codigo
          ? { ...currentProduct, lotes: [...currentProduct.lotes, { lote: normalizedLot, cantidad }] }
          : currentProduct
      )
    );
  };

  const updateProductLotQuantity = (codigo: string, lote: string, cantidad: number): boolean => {
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      return false;
    }
    const product = state.products.find((currentProduct) => currentProduct.codigo === codigo);
    if (!product?.lotes.some((currentLot) => currentLot.lote === lote)) {
      return false;
    }
    return saveProducts(
      state.products.map((currentProduct) =>
        currentProduct.codigo === codigo
          ? {
              ...currentProduct,
              lotes: currentProduct.lotes.map((currentLot) =>
                currentLot.lote === lote ? { ...currentLot, cantidad } : currentLot
              )
            }
          : currentProduct
      )
    );
  };

  const adjustProductLotStock = (codigo: string, lote: string, delta: number): boolean => {
    const product = state.products.find((currentProduct) => currentProduct.codigo === codigo);
    const selectedLot = product?.lotes.find((currentLot) => currentLot.lote === lote);
    if (!selectedLot || !Number.isFinite(delta) || selectedLot.cantidad + delta < 0) {
      return false;
    }
    return updateProductLotQuantity(codigo, lote, selectedLot.cantidad + delta);
  };

  const removeProductLot = (codigo: string, lote: string): boolean => {
    const product = state.products.find((currentProduct) => currentProduct.codigo === codigo);
    if (!product?.lotes.some((currentLot) => currentLot.lote === lote)) {
      return false;
    }
    return saveProducts(
      state.products
        .map((currentProduct) =>
          currentProduct.codigo === codigo
            ? { ...currentProduct, lotes: currentProduct.lotes.filter((currentLot) => currentLot.lote !== lote) }
            : currentProduct
        )
        .filter((currentProduct) => currentProduct.lotes.length > 0)
    );
  };

  return { ...state, addProduct, addProductLot, updateProductLotQuantity, adjustProductLotStock, removeProductLot };
};
