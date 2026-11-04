import { useState } from 'react';
import { IonAlert, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTimedMessage } from '../useTimedMessage';
import { InventoryProduct, useInventoryProducts } from '../inventory';
import AddProductModal from '../components/AddProductModal';
import './form-validation.css';
import './Tab2.css';

const Tab2: React.FC = () => {
  const {
    products,
    error: catalogError,
    addProduct,
    addProductLot,
    updateProductLotQuantity,
    removeProductLot
  } = useInventoryProducts();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [lotInputs, setLotInputs] = useState<Record<string, string>>({});
  const [lotQuantityInputs, setLotQuantityInputs] = useState<Record<string, Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useTimedMessage();
  const [lotToDelete, setLotToDelete] = useState<{ codigo: string; item: string; lote: string } | null>(null);

  const handleAddProduct = (product: InventoryProduct): boolean => {
    if (products.some((currentProduct) => currentProduct.codigo === product.codigo)) {
      return false;
    }
    if (!addProduct(product)) {
      return false;
    }
    setFormError(null);
    return true;
  };

  const handleAddLot = (codigo: string) => {
    const lote = lotInputs[codigo]?.trim() ?? '';
    const cantidadText = lotQuantityInputs[codigo]?.newLot ?? '';
    const cantidad = Number(cantidadText);
    if (!lote) {
      setFormError('Ingresa el lote del producto.');
      return;
    }
    if (!cantidadText.trim() || !Number.isFinite(cantidad) || cantidad < 0) {
      setFormError('Ingresa una cantidad válida para el lote.');
      return;
    }
    if (products.find((product) => product.codigo === codigo)?.lotes.some((lot) => lot.lote === lote)) {
      setFormError('Ese lote ya está registrado para este producto.');
      return;
    }
    if (!addProductLot(codigo, lote, cantidad)) {
      setFormError('No se pudo guardar el lote. Inténtalo de nuevo.');
      return;
    }

    setLotInputs((currentInputs) => ({ ...currentInputs, [codigo]: '' }));
    setLotQuantityInputs((currentInputs) => ({ ...currentInputs, [codigo]: { ...currentInputs[codigo], newLot: '' } }));
    setFormError(null);
  };

  const saveLotQuantity = (codigo: string, lote: string) => {
    const value = lotQuantityInputs[codigo]?.[lote];
    if (value === undefined) {
      return;
    }
    const cantidad = Number(value);
    if (!value.trim() || !Number.isFinite(cantidad) || cantidad < 0) {
      setFormError('Ingresa una cantidad válida para el lote.');
      setLotQuantityInputs((currentInputs) => {
        const productInputs = { ...currentInputs[codigo] };
        delete productInputs[lote];
        return { ...currentInputs, [codigo]: productInputs };
      });
      return;
    }
    if (!updateProductLotQuantity(codigo, lote, cantidad)) {
      setFormError('No se pudo guardar la cantidad del lote. Inténtalo de nuevo.');
    } else {
      setFormError(null);
    }
    setLotQuantityInputs((currentInputs) => {
      const productInputs = { ...currentInputs[codigo] };
      delete productInputs[lote];
      return { ...currentInputs, [codigo]: productInputs };
    });
  };

  const handleRemoveLot = () => {
    if (!lotToDelete) {
      return;
    }
    if (removeProductLot(lotToDelete.codigo, lotToDelete.lote)) {
      setDeleteMessage(`Se eliminó el lote ${lotToDelete.lote} de ${lotToDelete.codigo} - ${lotToDelete.item}.`);
      setFormError(null);
    } else {
      setFormError('No se pudo eliminar el lote. Inténtalo de nuevo.');
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
          <p className="inventory__hint">Administra productos y existencias por lote; los cambios se guardan en este dispositivo.</p>
          {deleteMessage && <p className="inventory__success delete-popup" role="status">{deleteMessage}</p>}
          {(catalogError || formError) && (
            <p className="inventory__error" role="alert">
              {formError ?? catalogError}
            </p>
          )}
          <button className="inventory__add inventory__add--main" type="button" onClick={() => setIsAddModalOpen(true)}>
            Agregar producto
          </button>
          <AddProductModal
            isOpen={isAddModalOpen}
            existingCodes={new Set(products.map((product) => product.codigo))}
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddProduct}
          />
          <div className="inventory__table-wrap">
            <table className="inventory__table">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Producto</th>
                  <th scope="col">Lotes y cantidades</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td className="inventory__empty" colSpan={3}>No hay productos en el inventario.</td>
                  </tr>
                ) : products.map((product) => (
                  <tr key={product.codigo}>
                    <td>{product.codigo}</td>
                    <td>{product.item}</td>
                    <td>
                      {product.lotes.map((lot) => (
                        <div className="inventory__lot-row" key={lot.lote}>
                          <span>{lot.lote}</span>
                          <input
                            aria-label={`Cantidad del lote ${lot.lote} de ${product.item}`}
                            className="inventory__quantity"
                            type="number"
                            min="0"
                            step="any"
                            value={lotQuantityInputs[product.codigo]?.[lot.lote] ?? String(lot.cantidad)}
                            onChange={(event) =>
                              setLotQuantityInputs((currentInputs) => ({
                                ...currentInputs,
                                [product.codigo]: {
                                  ...currentInputs[product.codigo],
                                  [lot.lote]: event.target.value
                                }
                              }))
                            }
                            onBlur={() => saveLotQuantity(product.codigo, lot.lote)}
                          />
                          <button
                            aria-label={`Eliminar lote ${lot.lote} de ${product.item}`}
                            className="inventory__remove"
                            type="button"
                            onClick={() => setLotToDelete({ codigo: product.codigo, item: product.item, lote: lot.lote })}
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                      <div className="inventory__lot-entry">
                        <input
                          aria-label={`Nuevo lote de ${product.item}`}
                          type="text"
                          placeholder="Lote"
                          value={lotInputs[product.codigo] ?? ''}
                          onChange={(event) =>
                            setLotInputs((currentInputs) => ({
                              ...currentInputs,
                              [product.codigo]: event.target.value
                            }))
                          }
                        />
                        <input
                          aria-label={`Cantidad del nuevo lote de ${product.item}`}
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Cantidad"
                          value={lotQuantityInputs[product.codigo]?.newLot ?? ''}
                          onChange={(event) =>
                            setLotQuantityInputs((currentInputs) => ({
                              ...currentInputs,
                              [product.codigo]: {
                                ...currentInputs[product.codigo],
                                newLot: event.target.value
                              }
                            }))
                          }
                        />
                        <button
                          className="inventory__add"
                          type="button"
                          onClick={() => handleAddLot(product.codigo)}
                        >
                          Agregar lote
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <IonAlert
            isOpen={lotToDelete !== null}
            header="Confirmar eliminación"
            message={
              lotToDelete
                ? `¿Eliminar el lote ${lotToDelete.lote} del producto ${lotToDelete.codigo} - ${lotToDelete.item}?`
                : ''
            }
            buttons={[
              { text: 'Cancelar', role: 'cancel' },
              { text: 'Eliminar', role: 'destructive', handler: handleRemoveLot }
            ]}
            onDidDismiss={() => setLotToDelete(null)}
          />
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
