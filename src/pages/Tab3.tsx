import { FormEvent, useEffect, useState } from 'react';
import { IonAlert, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, useIonViewWillLeave } from '@ionic/react';
import { useDrivers } from '../drivers';
import { useTimedMessage } from '../useTimedMessage';
import './form-validation.css';
import './Tab3.css';

type DriverField = 'nombre' | 'placa';
const errorDuration = 10000;

const Tab3: React.FC = () => {
  const { drivers, error: storageError, saveDrivers } = useDrivers();
  const [nombre, setNombre] = useState('');
  const [placa, setPlaca] = useState('');
  const [errorMessage, setErrorMessage] = useTimedMessage(errorDuration);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DriverField, string>>>({});
  const [deleteMessage, setDeleteMessage] = useTimedMessage();
  const [driverToDelete, setDriverToDelete] = useState<{ nombre: string; placa: string } | null>(null);

  useEffect(() => {
    if (storageError) {
      setErrorMessage(storageError);
    }
  }, [storageError, setErrorMessage]);

  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) {
      return;
    }
    const timer = setTimeout(() => setFieldErrors({}), errorDuration);
    return () => clearTimeout(timer);
  }, [fieldErrors]);

  useIonViewWillLeave(() => {
    setErrorMessage('');
    setFieldErrors({});
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = nombre.trim();
    const normalizedPlate = placa.trim().toUpperCase();

    const missingFields: Partial<Record<DriverField, string>> = {};
    if (!normalizedName) {
      missingFields.nombre = 'Ingresa el nombre del conductor.';
    }
    if (!normalizedPlate) {
      missingFields.placa = 'Ingresa la placa.';
    }
    if (Object.keys(missingFields).length > 0) {
      setFieldErrors(missingFields);
      setErrorMessage('');
      return;
    }
    setFieldErrors({});

    if (drivers.some((driver) => driver.placa.toUpperCase() === normalizedPlate)) {
      setErrorMessage('Ya existe un conductor registrado con esa placa.');
      return;
    }

    if (saveDrivers([...drivers, { nombre: normalizedName, placa: normalizedPlate }])) {
      setNombre('');
      setPlaca('');
      setErrorMessage('');
      setFieldErrors({});
    }
  };

  const removeDriver = () => {
    if (!driverToDelete) {
      return;
    }
    if (saveDrivers(drivers.filter((driver) => driver.placa !== driverToDelete.placa))) {
      setDeleteMessage(`Se eliminó el conductor ${driverToDelete.nombre}, placa ${driverToDelete.placa}.`);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Conductor y Placa</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Conductor y Placa</IonTitle>
          </IonToolbar>
        </IonHeader>
        <main className="drivers">
          <form className="drivers__form" noValidate onSubmit={handleSubmit}>
            <h2 className="drivers__heading">Agregar conductor</h2>
            {Object.keys(fieldErrors).length > 0 && (
              <p className="form-validation-error" role="alert">Completa los campos obligatorios señalados.</p>
            )}
            <div className="drivers__fields">
              <label className="drivers__field" htmlFor="driver-name">
                <span>Nombre del conductor</span>
                <input
                  id="driver-name"
                  name="nombre"
                  type="text"
                  aria-label="Nombre del conductor"
                  autoComplete="name"
                  value={nombre}
                  aria-invalid={Boolean(fieldErrors.nombre)}
                  aria-describedby={fieldErrors.nombre ? 'driver-name-error' : undefined}
                  className={fieldErrors.nombre ? 'form-input-invalid' : undefined}
                  onChange={(event) => {
                    setNombre(event.target.value);
                    setFieldErrors((currentErrors) => {
                      const nextErrors = { ...currentErrors };
                      delete nextErrors.nombre;
                      return nextErrors;
                    });
                  }}
                  required
                />
                {fieldErrors.nombre && <span className="form-field-error" id="driver-name-error">{fieldErrors.nombre}</span>}
              </label>
              <label className="drivers__field" htmlFor="driver-plate">
                <span>Placa</span>
                <input
                  id="driver-plate"
                  name="placa"
                  type="text"
                  aria-label="Placa"
                  autoCapitalize="characters"
                  value={placa}
                  aria-invalid={Boolean(fieldErrors.placa)}
                  aria-describedby={fieldErrors.placa ? 'driver-plate-error' : undefined}
                  className={fieldErrors.placa ? 'form-input-invalid' : undefined}
                  onChange={(event) => {
                    setPlaca(event.target.value);
                    setFieldErrors((currentErrors) => {
                      const nextErrors = { ...currentErrors };
                      delete nextErrors.placa;
                      return nextErrors;
                    });
                  }}
                  required
                />
                {fieldErrors.placa && <span className="form-field-error" id="driver-plate-error">{fieldErrors.placa}</span>}
              </label>
            </div>
            {errorMessage && <p className="drivers__error" role="alert">{errorMessage}</p>}
            <button className="drivers__submit" type="submit">Agregar conductor</button>
          </form>

          {deleteMessage && <p className="drivers__success delete-popup" role="status">{deleteMessage}</p>}
          <section className="drivers__list" aria-labelledby="drivers-list-heading">
            <h2 className="drivers__heading" id="drivers-list-heading">Conductores registrados</h2>
            {drivers.length === 0 ? (
              <p className="drivers__empty">No hay conductores registrados.</p>
            ) : (
              <ul className="drivers__items">
                {drivers.map((driver) => (
                  <li className="drivers__item" key={`${driver.placa}-${driver.nombre}`}>
                    <div className="drivers__details">
                      <span className="drivers__name">{driver.nombre}</span>
                      <span className="drivers__plate">{driver.placa}</span>
                    </div>
                    <button
                      className="drivers__remove"
                      type="button"
                      aria-label={`Quitar conductor ${driver.nombre}, placa ${driver.placa}`}
                      onClick={() => setDriverToDelete(driver)}
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <IonAlert
            isOpen={driverToDelete !== null}
            header="Confirmar eliminación"
            message={
              driverToDelete
                ? `¿Desea eliminar al conductor ${driverToDelete.nombre} de placa ${driverToDelete.placa}?`
                : ''
            }
            buttons={[
              { text: 'Cancelar', role: 'cancel' },
              { text: 'Eliminar', role: 'destructive', handler: removeDriver }
            ]}
            onDidDismiss={() => setDriverToDelete(null)}
          />
        </main>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;
