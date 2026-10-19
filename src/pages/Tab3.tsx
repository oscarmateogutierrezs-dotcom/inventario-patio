import { FormEvent, useState } from 'react';
import { IonAlert, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useDrivers } from '../drivers';
import './Tab3.css';

const Tab3: React.FC = () => {
  const { drivers, error: storageError, saveDrivers } = useDrivers();
  const [nombre, setNombre] = useState('');
  const [placa, setPlaca] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [driverToDelete, setDriverToDelete] = useState<{ nombre: string; placa: string } | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = nombre.trim();
    const normalizedPlate = placa.trim().toUpperCase();

    if (!normalizedName || !normalizedPlate) {
      setFormError('Ingresa el nombre del conductor y la placa.');
      return;
    }

    if (drivers.some((driver) => driver.placa.toUpperCase() === normalizedPlate)) {
      setFormError('Ya existe un conductor registrado con esa placa.');
      return;
    }

    if (saveDrivers([...drivers, { nombre: normalizedName, placa: normalizedPlate }])) {
      setNombre('');
      setPlaca('');
      setFormError(null);
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
          <form className="drivers__form" onSubmit={handleSubmit}>
            <h2 className="drivers__heading">Agregar conductor</h2>
            <div className="drivers__fields">
              <label className="drivers__field" htmlFor="driver-name">
                <span>Nombre del conductor</span>
                <input
                  id="driver-name"
                  name="nombre"
                  type="text"
                  autoComplete="name"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  required
                />
              </label>
              <label className="drivers__field" htmlFor="driver-plate">
                <span>Placa</span>
                <input
                  id="driver-plate"
                  name="placa"
                  type="text"
                  autoCapitalize="characters"
                  value={placa}
                  onChange={(event) => setPlaca(event.target.value)}
                  required
                />
              </label>
            </div>
            {formError && <p className="drivers__error" role="alert">{formError}</p>}
            {storageError && <p className="drivers__error" role="alert">{storageError}</p>}
            <button className="drivers__submit" type="submit">Agregar conductor</button>
          </form>

          {deleteMessage && <p className="drivers__success" role="status">{deleteMessage}</p>}
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
