import { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { moon, sunny } from 'ionicons/icons';

const storageKey = 'inventario-patio-dark-mode';

const getInitialDark = () => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {
    // localStorage no disponible
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

const ThemeToggle: React.FC = () => {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('ion-palette-dark', dark);
    try {
      localStorage.setItem(storageKey, String(dark));
    } catch {
      // se ignora el error de almacenamiento
    }
  }, [dark]);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={dark}
      onClick={() => setDark((current) => !current)}
    >
      <IonIcon aria-hidden="true" icon={dark ? sunny : moon} />
    </button>
  );
};

export default ThemeToggle;
