import { useMemo, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import catalogData from '../../data/indice_inventario.json';
import type { InventoryProduct } from '../inventory';

type CatalogItem = { codigo: string; nombre: string };

const catalog = (catalogData.items as CatalogItem[]).filter(
  (item, index, items) => items.findIndex((other) => other.codigo === item.codigo) === index
);
const maxResults = 50;

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const searchIndex = catalog.map((item) => ({
  item,
  codigo: normalize(item.codigo),
  nombre: normalize(item.nombre)
}));

const toTerms = (text: string) => normalize(text).split(/\s+/).filter(Boolean);

// Normaliza carácter por carácter para que los índices coincidan con el texto original.
const highlight = (text: string, terms: string[]) => {
  if (terms.length === 0) {
    return text;
  }
  const folded = Array.from(text, (char) => normalize(char)[0] ?? char).join('');
  const marked = new Array<boolean>(text.length).fill(false);
  terms.forEach((term) => {
    for (let index = folded.indexOf(term); index !== -1; index = folded.indexOf(term, index + 1)) {
      marked.fill(true, index, index + term.length);
    }
  });
  const parts: React.ReactNode[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start;
    while (end < text.length && marked[end] === marked[start]) {
      end += 1;
    }
    const chunk = text.slice(start, end);
    parts.push(marked[start] ? <mark key={start}>{chunk}</mark> : chunk);
    start = end;
  }
  return parts;
};

type Props = {
  isOpen: boolean;
  existingCodes: Set<string>;
  onClose: () => void;
  onAdd: (product: InventoryProduct) => boolean;
};

const AddProductModal: React.FC<Props> = ({ isOpen, existingCodes, onClose, onAdd }) => {
  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  // Términos de búsqueda: no cambian al seleccionar una opción, para conservar la lista.
  const [search, setSearch] = useState({ codigo: '', nombre: '' });
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState('0');
  const [error, setError] = useState<string | null>(null);

  const codeTerms = useMemo(() => toTerms(search.codigo), [search.codigo]);
  const nameTerms = useMemo(() => toTerms(search.nombre), [search.nombre]);

  const results = useMemo(() => {
    if (codeTerms.length === 0 && nameTerms.length === 0) {
      return [];
    }
    return searchIndex
      .filter(
        (entry) =>
          codeTerms.every((term) => entry.codigo.includes(term)) &&
          nameTerms.every((term) => entry.nombre.includes(term))
      )
      .slice(0, maxResults)
      .map((entry) => entry.item);
  }, [codeTerms, nameTerms]);

  const handleSearchChange = (field: 'codigo' | 'nombre', value: string) => {
    // Tras seleccionar, el otro campo contiene el texto autocompletado; se limpia para no seguir filtrando por él.
    const otherValue = selected ? '' : field === 'codigo' ? nameInput : codeInput;
    const next = field === 'codigo' ? { codigo: value, nombre: otherValue } : { codigo: otherValue, nombre: value };
    setCodeInput(next.codigo);
    setNameInput(next.nombre);
    setSearch(next);
    setSelected(null);
    setError(null);
  };

  const handleSelect = (item: CatalogItem) => {
    setSelected(item);
    setCodeInput(item.codigo);
    setNameInput(item.nombre);
    setError(null);
  };

  const reset = () => {
    setCodeInput('');
    setNameInput('');
    setSearch({ codigo: '', nombre: '' });
    setSelected(null);
    setQuantity('0');
    setError(null);
  };

  const handleConfirm = () => {
    if (!selected) {
      return;
    }
    const cantidad = Number(quantity);
    if (!quantity.trim() || !Number.isInteger(cantidad) || cantidad < 0) {
      setError('Ingresa una cantidad inicial válida.');
      return;
    }
    if (!onAdd({ codigo: selected.codigo, item: selected.nombre, cantidad })) {
      setError('No se pudo guardar el producto. Inténtalo de nuevo.');
      return;
    }
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={() => { reset(); onClose(); }}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Agregar producto</IonTitle>
          <IonButtons slot="end">
            <IonButton className="inventory__close" fill="solid" onClick={onClose}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <label className="inventory__product-field">
          <span>Busque por código</span>
          <input
            aria-label="Buscar producto por código"
            type="search"
            autoFocus
            value={codeInput}
            onChange={(event) => handleSearchChange('codigo', event.target.value)}
          />
          <span>Busque por nombre</span>
          <input
            aria-label="Buscar producto por nombre"
            type="search"
            value={nameInput}
            onChange={(event) => handleSearchChange('nombre', event.target.value)}
          />
        </label>
        {error && <p className="inventory__error" role="alert">{error}</p>}
        {(codeTerms.length > 0 || nameTerms.length > 0) && results.length === 0 && (
          <p className="inventory__hint">No se encontraron productos.</p>
        )}
        <ul className="inventory__search-results">
          {(selected ? [selected] : results).map((item) => {
            const exists = existingCodes.has(item.codigo);
            return (
              <li key={item.codigo}>
                <button
                  type="button"
                  disabled={exists}
                  aria-pressed={selected?.codigo === item.codigo}
                  onClick={() => handleSelect(item)}
                >
                  {highlight(item.codigo, codeTerms)} - {highlight(item.nombre, nameTerms)}
                  {exists ? ' (ya agregado)' : ''}
                </button>
              </li>
            );
          })}
        </ul>
        {selected && (
          <div className="inventory__product-field">
            <p>Seleccionado: {selected.codigo} - {selected.nombre}</p>
            <label>
              <span>Cantidad inicial</span>
              <input
                aria-label="Cantidad inicial del producto"
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(event) => { setQuantity(event.target.value); setError(null); }}
              />
            </label>
            <button className="inventory__add" type="button" onClick={handleConfirm}>
              Confirmar
            </button>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};

export default AddProductModal;
