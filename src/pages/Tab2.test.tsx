import { act, fireEvent, render, screen, within } from '@testing-library/react';
import inventoryData from '../../data/inventario.json';
import Tab1 from './Tab1';
import Tab2 from './Tab2';

beforeEach(() => {
  localStorage.clear();
  document.querySelectorAll('ion-modal').forEach((modal) => modal.remove());
});

test('shows every inventory field and saves quantities within their lots', () => {
  const { unmount } = render(<Tab2 />);

  expect(screen.getAllByRole('row')).toHaveLength(15);
  const productRow = screen.getByRole('row', { name: /Bloque 4 Primera/ });
  const firstProduct = inventoryData.items[0];
  expect(within(productRow).getByText(firstProduct.codigo)).toBeInTheDocument();
  const lotQuantity = within(productRow).getByRole('spinbutton', {
    name: 'Cantidad del lote Sin lote de Bloque 4 Primera'
  });
  expect(lotQuantity).toHaveValue(300259);

  fireEvent.change(lotQuantity, {
    target: { value: '300260' }
  });
  fireEvent.blur(lotQuantity);
  expect(lotQuantity).toHaveValue(300260);
  expect(localStorage.getItem('inventario-patio-productos')).toContain('"lote":"Sin lote","cantidad":300260');

  unmount();
  render(<Tab2 />);
  expect(screen.getByRole('spinbutton', { name: 'Cantidad del lote Sin lote de Bloque 4 Primera' })).toHaveValue(300260);
});

test('adds and persists a product from the catalog search modal', async () => {
  const { unmount } = render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  fireEvent.change(await screen.findByLabelText('Buscar producto por nombre'), { target: { value: 'corbatin 2,5' } });
  fireEvent.click(await screen.findByRole('button', { name: '0030101000062 - ADOQUIN CORBATIN 2,5' }));
  fireEvent.change(screen.getByLabelText('Lote del producto'), { target: { value: 'L-NEW' } });
  fireEvent.change(screen.getByLabelText('Cantidad inicial del producto'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  const newProductRow = screen.getByRole('row', { name: /0030101000062 ADOQUIN CORBATIN 2,5/ });
  expect(within(newProductRow).getByRole('spinbutton', { name: 'Cantidad del lote L-NEW de ADOQUIN CORBATIN 2,5' })).toHaveValue(7);
  expect(localStorage.getItem('inventario-patio-productos')).toContain('"codigo":"0030101000062"');
  expect(localStorage.getItem('inventario-patio-productos')).toContain('"lotes":[{"lote":"L-NEW","cantidad":7}]');
  expect(localStorage.getItem('inventario-patio-productos')).not.toContain('"cantidad":7,"lotes"');

  unmount();
  const { unmount: unmountReloadedTab } = render(<Tab2 />);
  expect(screen.getByRole('row', { name: /0030101000062 ADOQUIN CORBATIN 2,5/ })).toBeInTheDocument();

  unmountReloadedTab();
  render(<Tab1 />);
  const productCodeSelect = screen.getByLabelText('Código producto');
  expect(
    within(productCodeSelect).getByRole('option', {
      name: '0030101000062 - ADOQUIN CORBATIN 2,5'
    })
  ).toHaveValue('0030101000062');
  fireEvent.change(productCodeSelect, { target: { value: '0030101000062' } });
  expect(
    within(screen.getByLabelText('Lote despachado')).getByRole('option', { name: 'L-NEW' })
  ).toHaveValue('L-NEW');
});

test('adds a lot with its own quantity to an existing product', () => {
  render(<Tab2 />);
  const product = inventoryData.items[0];
  fireEvent.change(screen.getByLabelText(`Nuevo lote de ${product.item}`), { target: { value: 'L-67' } });
  fireEvent.change(screen.getByLabelText(`Cantidad del nuevo lote de ${product.item}`), { target: { value: '18' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Agregar lote' })[0]);

  const productRow = screen.getByRole('row', { name: /Bloque 4 Primera/ });
  expect(within(productRow).getByRole('spinbutton', { name: 'Cantidad del lote L-67 de Bloque 4 Primera' })).toHaveValue(18);
  expect(localStorage.getItem('inventario-patio-productos')).toContain('"lote":"L-67","cantidad":18');

  const { unmount } = render(<Tab1 />);
  fireEvent.change(screen.getByLabelText('Código producto'), { target: { value: product.codigo } });
  fireEvent.change(screen.getByLabelText('Lote despachado'), { target: { value: 'L-67' } });
  expect(
    within(screen.getByLabelText('Lote despachado')).getByRole('option', { name: 'L-67' })
  ).toHaveValue('L-67');
  expect(screen.getByText('Disponible en el lote seleccionado: 18')).toBeInTheDocument();
  unmount();
});

test('migrates existing product and separate quantities into the Sin lote lot', () => {
  const product = inventoryData.items[0];
  localStorage.setItem(
    'inventario-patio-productos',
    JSON.stringify([{ ...product, lotes: ['L-OLD'] }])
  );
  localStorage.setItem('inventario-patio-cantidades', JSON.stringify({ [product.codigo]: 42 }));

  render(<Tab2 />);

  const productRow = screen.getByRole('row', { name: /Bloque 4 Primera/ });
  expect(within(productRow).getByRole('spinbutton', {
    name: 'Cantidad del lote Sin lote de Bloque 4 Primera'
  })).toHaveValue(42);
  expect(within(productRow).getByRole('spinbutton', {
    name: 'Cantidad del lote L-OLD de Bloque 4 Primera'
  })).toHaveValue(0);
  expect(localStorage.getItem('inventario-patio-cantidades')).toBeNull();
});

test('removes only the selected lot from Tab2 and saved inventory', () => {
  const product = inventoryData.items[0];
  localStorage.setItem(
    'inventario-patio-productos',
    JSON.stringify([
      {
        codigo: product.codigo,
        item: product.item,
        lotes: [
          { lote: 'L-1', cantidad: 5 },
          { lote: 'L-2', cantidad: 7 }
        ]
      }
    ])
  );
  render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: `Eliminar lote L-1 de ${product.item}` }));
  const alert = document.querySelector('ion-alert');
  expect(alert?.header).toBe('Confirmar eliminación');
  expect(alert?.message).toBe(`¿Eliminar el lote L-1 del producto ${product.codigo} - ${product.item}?`);
  const deleteButton = alert?.buttons.find((button) => typeof button !== 'string' && button.text === 'Eliminar');
  expect(deleteButton).toBeDefined();
  if (deleteButton && typeof deleteButton !== 'string') {
    act(() => deleteButton.handler?.(undefined));
  }

  expect(screen.queryByLabelText(`Cantidad del lote L-1 de ${product.item}`)).not.toBeInTheDocument();
  expect(screen.getByLabelText(`Cantidad del lote L-2 de ${product.item}`)).toHaveValue(7);
  expect(screen.getByRole('status')).toHaveTextContent(`Se eliminó el lote L-1 de ${product.codigo} - ${product.item}.`);
  const stored = JSON.parse(localStorage.getItem('inventario-patio-productos') ?? '[]');
  expect(stored[0].lotes).toEqual([{ lote: 'L-2', cantidad: 7 }]);
});

test('removes the product when its last lot is deleted', () => {
  const product = inventoryData.items[0];
  localStorage.setItem(
    'inventario-patio-productos',
    JSON.stringify([{ codigo: product.codigo, item: product.item, lotes: [{ lote: 'L-1', cantidad: 5 }] }])
  );
  render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: `Eliminar lote L-1 de ${product.item}` }));
  const deleteButton = document
    .querySelector('ion-alert')
    ?.buttons.find((button) => typeof button !== 'string' && button.text === 'Eliminar');
  if (deleteButton && typeof deleteButton !== 'string') {
    act(() => deleteButton.handler?.(undefined));
  }

  expect(screen.queryByText(product.item)).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('inventario-patio-productos') ?? '[]')).toEqual([]);
});

test('shows an error when the initial quantity is invalid', async () => {
  render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  fireEvent.change(await screen.findByLabelText('Buscar producto por nombre'), { target: { value: 'corbatin 5.0 desp' } });
  fireEvent.click(await screen.findByRole('button', { name: /^0030101400025 - ADOQUIN CORBATIN 5\.0 DESP\s?\.$/ }));
  fireEvent.change(screen.getByLabelText('Lote del producto'), { target: { value: 'L-88' } });
  fireEvent.change(screen.getByLabelText('Cantidad inicial del producto'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Ingresa una cantidad inicial válida para el lote.');
});

test('clears the selected product when the search changes', async () => {
  render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  const codeInput = await screen.findByLabelText(/Buscar producto por c.digo/);
  fireEvent.change(codeInput, { target: { value: '0030101000062' } });
  fireEvent.click(await screen.findByRole('button', { name: /0030101000062/ }));
  expect(screen.getByLabelText('Buscar producto por nombre')).toHaveValue('ADOQUIN CORBATIN 2,5');

  fireEvent.change(codeInput, { target: { value: '' } });
  expect(screen.getByLabelText('Buscar producto por nombre')).toHaveValue('');
  expect(screen.queryByRole('button', { name: /0030101000062/ })).not.toBeInTheDocument();
});
