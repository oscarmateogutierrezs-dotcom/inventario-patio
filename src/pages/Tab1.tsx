import { FormEvent, useEffect, useState } from 'react';
import {IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useDrivers } from '../drivers';
import { useInventoryProducts } from '../inventory';
import { enqueueSync, usePendingSyncCount } from '../sheetSync';
import './form-validation.css';
import './Tab1.css';

const yardEntriesStorageKey = 'inventario-patio-salidas';

const emptyForm = {
  fechaHora: '',
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
type Entry = EntryForm & { id: number; sheetId: string };
type EntryField = keyof EntryForm;

const fields: Array<{
  name: keyof EntryForm;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder: string;
}> = [
  { name: 'fechaHora', label: 'Fecha y hora', type: 'text', placeholder: 'DD/MM/YYYY HH:MM' },
  { name: 'remision', label: 'Remisión', type: 'text', placeholder: 'Folio' },
  { name: 'placaVehiculo', label: 'Placa vehículo', type: 'select', placeholder: 'Seleccionar placa' },
  { name: 'cantidadEntregada', label: 'Cantidad entregada', type: 'number', placeholder: '#' },
  { name: 'codigoProducto', label: 'Código producto', type: 'select', placeholder: 'Seleccionar producto' },
  { name: 'loteDespachado', label: 'Lote despachado', type: 'select', placeholder: 'Seleccionar lote' },
  { name: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '#' },
  { name: 'desperdicioGenerado', label: 'Desperdicio generado', type: 'number', placeholder: '#' },
  { name: 'reclasificaSegunda', label: 'Reclasifica segunda', type: 'number', placeholder: '#' }
];

const formFields = fields.filter((field) => field.name !== 'fechaHora');

const formatDateTime = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const isEntry = (value: unknown): value is Entry => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'number' &&
    typeof record.sheetId === 'string' &&
    Object.keys(emptyForm).every((key) => typeof record[key] === 'string')
  );
};

const loadEntries = (): Entry[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(yardEntriesStorageKey) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
};

const Tab1: React.FC = () => {
  const [form, setForm] = useState<EntryForm>({ ...emptyForm });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<EntryField, string>>>({});
  const [entries, setEntries] = useState<Entry[]>(loadEntries);
  const pendingSync = usePendingSyncCount();
  const { drivers } = useDrivers();
  const { products, adjustProductLotStock } = useInventoryProducts();
  const selectedProduct = products.find((product) => product.codigo === form.codigoProducto);
  const selectedLot = selectedProduct?.lotes.find((lot) => lot.lote === form.loteDespachado);
  const availableStock = selectedLot?.cantidad ?? 0;

  useEffect(() => {
    try {
      localStorage.setItem(yardEntriesStorageKey, JSON.stringify(entries));
    } catch (error) {
      console.error('No se pudo guardar la lista de salidas.', error);
    }
  }, [entries]);

  useEffect(() => {
    if (form.codigoProducto && !products.some((product) => product.codigo === form.codigoProducto)) {
      setForm((currentForm) => ({ ...currentForm, codigoProducto: '' }));
    }
  }, [form.codigoProducto, products]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missingFields = formFields.reduce<Partial<Record<EntryField, string>>>((errors, field) => {
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
    if (!adjustProductLotStock(form.codigoProducto, form.loteDespachado, -quantity)) {
      setFieldErrors({ cantidad: 'No se pudo descontar la cantidad del lote seleccionado.' });
      return;
    }
    setFieldErrors({});
    const sheetId = crypto.randomUUID();
    const newEntry = { ...form, fechaHora: formatDateTime(new Date()) };
    enqueueSync({ action: 'add', entryId: sheetId, data: newEntry });
    setEntries((currentEntries) => {
      const nextId = currentEntries.reduce((largestId, entry) => Math.max(largestId, entry.id), 0) + 1;
      return [...currentEntries, { ...newEntry, id: nextId, sheetId }];
    });
    setForm({ ...emptyForm });
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
          <p className="yard-exit__sync" aria-live="polite" data-pending={pendingSync > 0}>
            {pendingSync > 0
              ? `${pendingSync} pendiente${pendingSync === 1 ? '' : 's'} de sincronizar`
              : 'Todo sincronizado'}
          </p>
          <form className="yard-exit__form" noValidate onSubmit={handleSubmit}>
            {Object.keys(fieldErrors).length > 0 && (
              <p className="form-validation-error" role="alert">Completa los campos obligatorios señalados.</p>
            )}
            <div className="yard-exit__fields">
              {formFields.map((field) => (
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
                      onChange={(event) => {
                        setForm((currentForm) => ({
                          ...currentForm,
                          [field.name]: event.target.value,
                          ...(field.name === 'codigoProducto' ? { loteDespachado: '' } : {})
                        }));
                        clearFieldError(field.name);
                        if (field.name === 'codigoProducto') {
                          clearFieldError('loteDespachado');
                        }
                      }}
                      required
                    >
                      <option value="">{field.placeholder}</option>
                      {field.name === 'placaVehiculo'
                        ? drivers.map((driver) => (
                            <option key={`${driver.placa}-${driver.nombre}`} value={driver.placa}>
                              {driver.placa}
                            </option>
                          ))
                        : field.name === 'codigoProducto'
                          ? products.map((product) => (
                            <option key={product.codigo} value={product.codigo}>
                              {product.codigo} - {product.item}
                            </option>
                          ))
                          : selectedProduct?.lotes.map((lot) => (
                            <option key={lot.lote} value={lot.lote}>{lot.lote}</option>
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
                    <span>Disponible en el lote seleccionado: {availableStock}</span>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
