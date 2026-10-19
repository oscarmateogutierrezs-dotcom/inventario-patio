import { FormEvent, useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useDrivers } from '../drivers';
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

const fields: Array<{
  name: keyof EntryForm;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder: string;
}> = [
  { name: 'remision', label: 'Remisión', type: 'text', placeholder: 'Folio' },
  { name: 'placaVehiculo', label: 'Placa vehículo', type: 'select', placeholder: 'Seleccionar placa' },
  { name: 'cantidadEntregada', label: 'Cantidad entregada', type: 'number', placeholder: '#' },
  { name: 'codigoProducto', label: 'Código producto', type: 'text', placeholder: 'Código' },
  { name: 'loteDespachado', label: 'Lote despachado', type: 'text', placeholder: 'Lote' },
  { name: 'cantidad', label: 'Cantidad', type: 'number', placeholder: '#' },
  { name: 'desperdicioGenerado', label: 'Desperdicio generado', type: 'number', placeholder: '#' },
  { name: 'reclasificaSegunda', label: 'Reclasifica segunda', type: 'number', placeholder: '#' }
];

const Tab1: React.FC = () => {
  const [form, setForm] = useState<EntryForm>({ ...emptyForm });
  const [entries, setEntries] = useState<Entry[]>([]);
  const { drivers } = useDrivers();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEntries((currentEntries) => {
      const nextId = currentEntries.reduce((largestId, entry) => Math.max(largestId, entry.id), 0) + 1;
      return [...currentEntries, { ...form, id: nextId }];
    });
    setForm({ ...emptyForm });
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
          <form className="yard-exit__form" onSubmit={handleSubmit}>
            <div className="yard-exit__fields">
              {fields.map((field) => (
                <label className="yard-exit__field" htmlFor={`yard-${field.name}`} key={field.name}>
                  <span>{field.label}</span>
                  {field.type === 'select' ? (
                    <select
                      id={`yard-${field.name}`}
                      name={field.name}
                      value={form[field.name]}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          [field.name]: event.target.value
                        }))
                      }
                      required
                    >
                      <option value="">{field.placeholder}</option>
                      {drivers.map((driver) => (
                        <option key={`${driver.placa}-${driver.nombre}`} value={driver.placa}>
                          {driver.placa}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`yard-${field.name}`}
                      name={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={form[field.name]}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          [field.name]: event.target.value
                        }))
                      }
                      required
                      min={field.type === 'number' ? '0' : undefined}
                      step={field.type === 'number' ? 'any' : undefined}
                    />
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
                          onClick={() =>
                            setEntries((currentEntries) =>
                              currentEntries.filter((currentEntry) => currentEntry.id !== entry.id)
                            )
                          }
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
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
