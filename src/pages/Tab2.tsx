import { useEffect, useRef, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import inventoryData from '../../data/inventario.json';
import './Tab2.css';

type InventoryItem = {
  codigo: string;
  item: string;
  cantidad: string;
};

type InventoryState = {
  items: InventoryItem[];
  storageError: string | null;
};

const storageKey = 'inventario-patio-cantidades';
const initialItems: InventoryItem[] = inventoryData.items.map((product) => ({
  ...product,
  cantidad: String(product.cantidad)
}));

const loadInventory = (): InventoryState => {
  try {
    const savedQuantities = localStorage.getItem(storageKey);
    if (!savedQuantities) {
      return { items: initialItems, storageError: null };
    }

    const parsedQuantities: unknown = JSON.parse(savedQuantities);
    if (typeof parsedQuantities !== 'object' || parsedQuantities === null || Array.isArray(parsedQuantities)) {
      throw new Error('El formato de las cantidades guardadas no es válido.');
    }

    const quantities = parsedQuantities as Record<string, unknown>;
    return {
      items: initialItems.map((product) => {
        const savedQuantity = quantities[product.codigo];
        return typeof savedQuantity === 'number' && Number.isFinite(savedQuantity) && savedQuantity >= 0
          ? { ...product, cantidad: String(savedQuantity) }
          : product;
      }),
      storageError: null
    };
  } catch (error) {
    console.error('No se pudo cargar el inventario guardado.', error);
    return {
      items: initialItems,
      storageError: 'No se pudieron cargar las cantidades guardadas. Se muestran las cantidades iniciales.'
    };
  }
};

const Tab2: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryState>(loadInventory);
  const lastSavedItems = useRef(inventory.items);

  useEffect(() => {
    if (lastSavedItems.current === inventory.items) {
      return;
    }

    lastSavedItems.current = inventory.items;
    try {
      const quantities = Object.fromEntries(
        inventory.items.flatMap((product) => {
          const quantity = Number(product.cantidad);
          return Number.isFinite(quantity) && quantity >= 0 ? [[product.codigo, quantity]] : [];
        })
      );
      localStorage.setItem(storageKey, JSON.stringify(quantities));
      setInventory((currentInventory) =>
        currentInventory.storageError === null
          ? currentInventory
          : { ...currentInventory, storageError: null }
      );
    } catch (error) {
      console.error('No se pudo guardar el inventario.', error);
      setInventory((currentInventory) => ({
        ...currentInventory,
        storageError: 'No se pudieron guardar los cambios de cantidades en este dispositivo.'
      }));
    }
  }, [inventory.items]);

  const updateQuantity = (codigo: string, cantidad: string) => {
    setInventory((currentInventory) => ({
      ...currentInventory,
      items: currentInventory.items.map((product) =>
        product.codigo === codigo ? { ...product, cantidad } : product
      )
    }));
  };

  const normalizeQuantity = (product: InventoryItem) => {
    const quantity = Number(product.cantidad);
    const normalizedQuantity = Number.isFinite(quantity) && quantity >= 0 ? String(quantity) : '0';
    if (normalizedQuantity !== product.cantidad) {
      updateQuantity(product.codigo, normalizedQuantity);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Inventario</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Inventario</IonTitle>
          </IonToolbar>
        </IonHeader>
        <main className="inventory">
          <p className="inventory__hint">Modifica las cantidades; los cambios se guardan en este dispositivo.</p>
          {inventory.storageError && (
            <p className="inventory__error" role="alert">{inventory.storageError}</p>
          )}
          <div className="inventory__table-wrap">
            <table className="inventory__table">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {inventory.items.map((product) => (
                  <tr key={product.codigo}>
                    <td>{product.codigo}</td>
                    <td>{product.item}</td>
                    <td>
                      <input
                        aria-label={`Cantidad de ${product.item}`}
                        className="inventory__quantity"
                        type="number"
                        min="0"
                        step="1"
                        value={product.cantidad}
                        onChange={(event) => updateQuantity(product.codigo, event.target.value)}
                        onBlur={() => normalizeQuantity(product)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
