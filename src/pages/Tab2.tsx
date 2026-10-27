import { useEffect, useMemo, useRef, useState } from 'react';
import { IonAlert, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTimedMessage } from '../useTimedMessage';
import { InventoryProduct, onQuantitiesChanged, quantityStorageKey, useInventoryProducts } from '../inventory';
import './form-validation.css';
import './Tab2.css';

type NewProductField = 'codigo' | 'item' | 'cantidad';

type InventoryState = {
  quantities: Record<string, string>;
  storageError: string | null;
};

const storageKey = quantityStorageKey;

const loadInventory = (products: InventoryProduct[]): InventoryState => {
  try {
    const savedQuantities = localStorage.getItem(storageKey);
    if (!savedQuantities) {
      return { quantities: {}, storageError: null };
    }

    const parsedQuantities: unknown = JSON.parse(savedQuantities);
    if (typeof parsedQuantities !== 'object' || parsedQuantities === null || Array.isArray(parsedQuantities)) {
      throw new Error('El formato de las cantidades guardadas no es válido.');
    }

    const quantities = parsedQuantities as Record<string, unknown>;
    return {
      quantities: Object.fromEntries(
        products.flatMap((product) => {
          const savedQuantity = quantities[product.codigo];
          return typeof savedQuantity === 'number' && Number.isFinite(savedQuantity) && savedQuantity >= 0
            ? [[product.codigo, String(savedQuantity)]]
            : [];
        })
      ),
      storageError: null
    };
  } catch (error) {
    console.error('No se pudo cargar el inventario guardado.', error);
    return {
      quantities: {},
      storageError: 'No se pudieron cargar las cantidades guardadas. Se muestran las cantidades iniciales.'
    };
  }
};

const Tab2: React.FC = () => {
  const { products, error: catalogError, addProduct, removeProduct } = useInventoryProducts();
  const [inventory, setInventory] = useState<InventoryState>(() => loadInventory(products));
  const lastSavedQuantities = useRef(inventory.quantities);
  const lastSavedProducts = useRef(products);
  const [newProduct, setNewProduct] = useState({ codigo: '', item: '', cantidad: '0' });
  const [newProductErrors, setNewProductErrors] = useState<Partial<Record<NewProductField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useTimedMessage();
  const [productToDelete, setProductToDelete] = useState<Pick<InventoryProduct, 'codigo' | 'item'> | null>(null);
  const items = useMemo(
    () =>
      products.map((product) => ({
        ...product,
        cantidad: inventory.quantities[product.codigo] ?? String(product.cantidad)
      })),
    [inventory.quantities, products]
  );

  useEffect(
    () => onQuantitiesChanged(() => setInventory(loadInventory(products))),
    [products]
  );

  useEffect(() => {
    if (
      lastSavedQuantities.current === inventory.quantities &&
      lastSavedProducts.current === products
    ) {
      return;
    }

    lastSavedQuantities.current = inventory.quantities;
    lastSavedProducts.current = products;
    try {
      const quantities = Object.fromEntries(
        items.flatMap((product) => {
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
  }, [inventory.quantities, items, products]);

  const updateQuantity = (codigo: string, cantidad: string) => {
    setInventory((currentInventory) => ({
      ...currentInventory,
      quantities: { ...currentInventory.quantities, [codigo]: cantidad }
    }));
  };

  const normalizeQuantity = (product: Omit<InventoryProduct, 'cantidad'> & { cantidad: string }) => {
    const quantity = Number(product.cantidad);
    const normalizedQuantity = Number.isFinite(quantity) && quantity >= 0 ? String(quantity) : '0';
    if (normalizedQuantity !== product.cantidad) {
      updateQuantity(product.codigo, normalizedQuantity);
    }
  };

  const handleAddProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors: Partial<Record<NewProductField, string>> = {};
    if (!newProduct.codigo.trim()) {
      validationErrors.codigo = 'Ingresa el código del producto.';
    }
    if (!newProduct.item.trim()) {
      validationErrors.item = 'Ingresa el nombre del producto.';
    }
    const cantidad = Number(newProduct.cantidad);
    if (!newProduct.cantidad.trim() || !Number.isInteger(cantidad) || cantidad < 0) {
      validationErrors.cantidad = 'Ingresa una cantidad inicial válida.';
    }
    if (Object.keys(validationErrors).length > 0) {
      setNewProductErrors(validationErrors);
      setFormError(null);
      return;
    }
    setNewProductErrors({});
    const product = {
      codigo: newProduct.codigo.trim(),
      item: newProduct.item.trim(),
      cantidad
    };
    if (products.some((currentProduct) => currentProduct.codigo === product.codigo)) {
      setFormError('Ya existe un producto con ese código.');
      return;
    }
    if (!addProduct(product)) {
      setFormError('No se pudo guardar el producto. Inténtalo de nuevo.');
      return;
    }
    setInventory((currentInventory) => ({
      ...currentInventory,
      quantities: { ...currentInventory.quantities, [product.codigo]: String(product.cantidad) }
    }));
    setNewProduct({ codigo: '', item: '', cantidad: '0' });
    setFormError(null);
  };

  const handleRemoveProduct = () => {
    if (!productToDelete) {
      return;
    }
    if (removeProduct(productToDelete.codigo)) {
      setDeleteMessage(`Se eliminó el producto ${productToDelete.codigo} - ${productToDelete.item}.`);
      setFormError(null);
    } else {
      setFormError('No se pudo eliminar el producto. Inténtalo de nuevo.');
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
          <p className="inventory__hint">Administra los productos y sus cantidades; los cambios se guardan en este dispositivo.</p>
          {deleteMessage && <p className="inventory__success delete-popup" role="status">{deleteMessage}</p>}
          {(catalogError || inventory.storageError || formError) && (
            <p className="inventory__error" role="alert">
              {formError ?? catalogError ?? inventory.storageError}
            </p>
          )}
          <form className="inventory__product-form" noValidate onSubmit={handleAddProduct}>
            {Object.keys(newProductErrors).length > 0 && (
              <p className="form-validation-error" role="alert">Completa correctamente los campos señalados.</p>
            )}
            <label className="inventory__product-field">
              <span>Código</span>
              <input
                aria-label="Código del producto nuevo"
                required
                value={newProduct.codigo}
                aria-invalid={Boolean(newProductErrors.codigo)}
                aria-describedby={newProductErrors.codigo ? 'new-product-code-error' : undefined}
                className={newProductErrors.codigo ? 'form-input-invalid' : undefined}
                onChange={(event) => {
                  setNewProduct((currentProduct) => ({ ...currentProduct, codigo: event.target.value }));
                  setNewProductErrors((currentErrors) => {
                    const nextErrors = { ...currentErrors };
                    delete nextErrors.codigo;
                    return nextErrors;
                  });
                }}
              />
              {newProductErrors.codigo && <span className="form-field-error" id="new-product-code-error">{newProductErrors.codigo}</span>}
            </label>
            <label className="inventory__product-field">
              <span>Producto</span>
              <input
                aria-label="Nombre del producto nuevo"
                required
                value={newProduct.item}
                aria-invalid={Boolean(newProductErrors.item)}
                aria-describedby={newProductErrors.item ? 'new-product-name-error' : undefined}
                className={newProductErrors.item ? 'form-input-invalid' : undefined}
                onChange={(event) => {
                  setNewProduct((currentProduct) => ({ ...currentProduct, item: event.target.value }));
                  setNewProductErrors((currentErrors) => {
                    const nextErrors = { ...currentErrors };
                    delete nextErrors.item;
                    return nextErrors;
                  });
                }}
              />
              {newProductErrors.item && <span className="form-field-error" id="new-product-name-error">{newProductErrors.item}</span>}
            </label>
            <label className="inventory__product-field">
              <span>Cantidad inicial</span>
              <input
                aria-label="Cantidad inicial del producto"
                type="number"
                min="0"
                step="1"
                required
                value={newProduct.cantidad}
                aria-invalid={Boolean(newProductErrors.cantidad)}
                aria-describedby={newProductErrors.cantidad ? 'new-product-quantity-error' : undefined}
                className={newProductErrors.cantidad ? 'form-input-invalid' : undefined}
                onChange={(event) => {
                  setNewProduct((currentProduct) => ({ ...currentProduct, cantidad: event.target.value }));
                  setNewProductErrors((currentErrors) => {
                    const nextErrors = { ...currentErrors };
                    delete nextErrors.cantidad;
                    return nextErrors;
                  });
                }}
              />
              {newProductErrors.cantidad && <span className="form-field-error" id="new-product-quantity-error">{newProductErrors.cantidad}</span>}
            </label>
            <button className="inventory__add" type="submit">Agregar producto</button>
          </form>
          <div className="inventory__table-wrap">
            <table className="inventory__table">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td className="inventory__empty" colSpan={4}>No hay productos en el inventario.</td>
                  </tr>
                ) : items.map((product) => (
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
                    <td>
                      <button
                        aria-label={`Eliminar producto ${product.codigo}`}
                        className="inventory__remove"
                        type="button"
                        onClick={() => setProductToDelete(product)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <IonAlert
            isOpen={productToDelete !== null}
            header="Confirmar eliminación"
            message={
              productToDelete
                ? `¿Eliminar el producto ${productToDelete.codigo} - ${productToDelete.item}?`
                : ''
            }
            buttons={[
              { text: 'Cancelar', role: 'cancel' },
              { text: 'Eliminar', role: 'destructive', handler: handleRemoveProduct }
            ]}
            onDidDismiss={() => setProductToDelete(null)}
          />
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
