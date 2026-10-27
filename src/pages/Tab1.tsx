import { FormEvent, useEffect, useState } from 'react';
import { IonAlert, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useTimedMessage } from '../useTimedMessage';
import { useDrivers } from '../drivers';
import { adjustProductStock, useInventoryProducts, useSavedQuantities } from '../inventory';
import './form-validation.css';
import './Tab1.css';

const emptyForm = {
  remision: '',
  placaVehiculo: '',
  cantidadEntregada: '',
  codigoProducto: '',
  loteDespachado: '',
  cantidad: '',
  desperdicioGenerado: '',
  reclasificaSegunda: ''
};

type EntryForm = typeof emptyForm;
type Entry = EntryForm & { id: number };
type EntryField = keyof EntryForm;

const fields: Array<{
  name: keyof EntryForm;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder: string;
}> = [
  { name: 'remision', label: 'Remisión', type: 'text', placeholder: 'Folio' },
  { name: 'placaVehiculo', label: 'Placa vehículo', type: 'select', placeholder: 'Seleccionar placa' },
  { name: 'cantidadEntregada', label: 'Cantidad entregada', type: 'number', placeholder: '#' },
  { name: 'codigoProducto', label: 'Código producto', type: 'select', placeholder: 'Seleccionar producto' },
  { name: 'loteDespachado', label: 'Lote despachado', type: 'text', placeholder: 'Lote' },
  { name: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '#' },
  { name: 'desperdicioGenerado', label: 'Desperdicio generado', type: 'number', placeholder: '#' },
  { name: 'reclasificaSegunda', label: 'Reclasifica segunda', type: 'number', placeholder: '#' }
];

const Tab1: React.FC = () => {
  const [form, setForm] = useState<EntryForm>({ ...emptyForm });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EntryField, string>>>({});
  const [entries, setEntries] = useState<Entry[]>([]);
  const [deleteMessage, setDeleteMessage] = useTimedMessage();
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const { drivers } = useDrivers();
  const { products } = useInventoryProducts();
  const savedQuantities = useSavedQuantities();
  const selectedProduct = products.find((product) => product.codigo === form.codigoProducto);
  const availableStock = selectedProduct
    ? savedQuantities[selectedProduct.codigo] ?? selectedProduct.cantidad
    : 0;

  useEffect(() => {
    if (form.codigoProducto && !products.some((product) => product.codigo === form.codigoProducto)) {
      setForm((currentForm) => ({ ...currentForm, codigoProducto: '' }));
    }
  }, [form.codigoProducto, products]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missingFields = fields.reduce<Partial<Record<EntryField, string>>>((errors, field) => {
      if (!form[field.name].trim()) {
        errors[field.name] = `Completa el campo ${field.label}.`;
      }
      return errors;
    }, {});
    if (Object.keys(missingFields).length > 0) {
      setFieldErrors(missingFields);
      return;
    }
    const quantity = Number(form.cantidad);
    if (!(quantity > 0)) {
      setFieldErrors({ cantidad: 'La cantidad debe ser mayor a 0.' });
      return;
    }
    if (quantity > availableStock) {
      setFieldErrors({ cantidad: `La cantidad supera el inventario disponible (${availableStock}).` });
      return;
    }
    if (!adjustProductStock(products, form.codigoProducto, -quantity)) {
      setFieldErrors({ cantidad: 'No se pudo descontar del inventario.' });
      return;
    }
    setFieldErrors({});
    setEntries((currentEntries) => {
      const nextId = currentEntries.reduce((largestId, entry) => Math.max(largestId, entry.id), 0) + 1;
      return [...currentEntries, { ...form, id: nextId }];
    });
    setForm({ ...emptyForm });
  };

  const handleDeleteEntry = () => {
    if (!entryToDelete) {
      return;
    }
    const entry = entryToDelete;
    adjustProductStock(products, entry.codigoProducto, Number(entry.cantidad));
    setEntries((currentEntries) => currentEntries.filter((currentEntry) => currentEntry.id !== entry.id));
    setDeleteMessage(`Se eliminó el registro de remisión ${entry.remision}.`);
  };

  const clearFieldError = (fieldName: EntryField) => {
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Salidas de Patio</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Salidas de Patio</IonTitle>
          </IonToolbar>
        </IonHeader>
        <main className="yard-exit">
          {deleteMessage && <p className="yard-exit__success delete-popup" role="status">{deleteMessage}</p>}
          <form className="yard-exit__form" noValidate onSubmit={handleSubmit}>
            {Object.keys(fieldErrors).length > 0 && (
              <p className="form-validation-error" role="alert">Completa los campos obligatorios señalados.</p>
            )}
            <div className="yard-exit__fields">
              {fields.map((field) => (
                <label className="yard-exit__field" htmlFor={`yard-${field.name}`} key={field.name}>
                  <span>{field.label}</span>
                  {field.type === 'select' ? (
                    <select
                      id={`yard-${field.name}`}
                      name={field.name}
                      aria-label={field.label}
                      value={form[field.name]}
                      aria-invalid={Boolean(fieldErrors[field.name])}
                      aria-describedby={fieldErrors[field.name] ? `yard-${field.name}-error` : undefined}
                      className={fieldErrors[field.name] ? 'form-input-invalid' : undefined}
                      onChange={(event) =>
                        {
                          setForm((currentForm) => ({ ...currentForm, [field.name]: event.target.value }));
                          clearFieldError(field.name);
                        }
                      }
                      required
                    >
                      <option value="">{field.placeholder}</option>
                      {field.name === 'placaVehiculo'
                        ? drivers.map((driver) => (
                            <option key={`${driver.placa}-${driver.nombre}`} value={driver.placa}>
                              {driver.placa}
                            </option>
                          ))
                        : products.map((product) => (
                            <option key={product.codigo} value={product.codigo}>
                              {product.codigo} - {product.item}
                            </option>
                          ))}
                    </select>
                  ) : (
                    <input
                      id={`yard-${field.name}`}
                      name={field.name}
                      aria-label={field.label}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.name]}
                      aria-invalid={Boolean(fieldErrors[field.name])}
                      aria-describedby={fieldErrors[field.name] ? `yard-${field.name}-error` : undefined}
                      className={fieldErrors[field.name] ? 'form-input-invalid' : undefined}
                      onChange={(event) =>
                        {
                          setForm((currentForm) => ({ ...currentForm, [field.name]: event.target.value }));
                          clearFieldError(field.name);
                        }
                      }
                      required
                      min={field.type === 'number' ? '0' : undefined}
                      step={field.type === 'number' ? 'any' : undefined}
                    />
                  )}
                  {field.name === 'cantidad' && selectedProduct && (
                    <span>Disponible: {availableStock}</span>
                  )}
                  {fieldErrors[field.name] && (
                    <span className="form-field-error" id={`yard-${field.name}-error`}>
                      {fieldErrors[field.name]}
                    </span>
                  )}
                </label>
              ))}
            </div>
            <button className="yard-exit__submit" type="submit">
              Agregar registro
            </button>
          </form>

          <div className="yard-exit__table-wrap">
            <table className="yard-exit__table">
              <thead>
                <tr>
                  {fields.map((field) => (
                    <th key={field.name} scope="col">{field.label}</th>
                  ))}
                  <th scope="col">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td className="yard-exit__empty" colSpan={fields.length + 1}>
                      Aún no hay registros para este turno.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      {fields.map((field) => (
                        <td key={field.name}>{entry[field.name]}</td>
                      ))}
                      <td>
                        <button
                          className="yard-exit__delete"
                          type="button"
                          aria-label={`Eliminar registro de remisión ${entry.remision}`}
                          onClick={() => setEntryToDelete(entry)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <IonAlert
            isOpen={entryToDelete !== null}
            header="Confirmar eliminación"
            message={entryToDelete ? `¿Desea eliminar el registro de remisión ${entryToDelete.remision}?` : ''}
            buttons={[
              { text: 'Cancelar', role: 'cancel' },
              { text: 'Eliminar', role: 'destructive', handler: handleDeleteEntry }
            ]}
            onDidDismiss={() => setEntryToDelete(null)}
          />
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
