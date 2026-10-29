import { act, fireEvent, render, screen, within } from '@testing-library/react';
import inventoryData from '../../data/inventario.json';
import Tab1 from './Tab1';
import Tab2 from './Tab2';

beforeEach(() => {
  localStorage.clear();
  document.querySelectorAll('ion-modal').forEach((modal) => modal.remove());
});

test('shows every inventory field and saves edited quantities', () => {
  const { unmount } = render(<Tab2 />);

  expect(screen.getAllByRole('row')).toHaveLength(15);
  const productRow = screen.getByRole('row', { name: /Bloque 4 Primera/ });
  const firstProduct = inventoryData.items[0];
  expect(within(productRow).getByText(firstProduct.codigo)).toBeInTheDocument();
  expect(within(productRow).getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' })).toHaveValue(300259);

  fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' }), {
    target: { value: '300260' }
  });
  expect(screen.getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' })).toHaveValue(300260);
  expect(localStorage.getItem('inventario-patio-cantidades')).toContain(`"${firstProduct.codigo}":300260`);

  unmount();
  render(<Tab2 />);
  expect(screen.getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' })).toHaveValue(300260);
});

test('adds and persists a product from the catalog search modal', async () => {
  const { unmount } = render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  fireEvent.change(await screen.findByLabelText('Buscar producto por nombre'), { target: { value: 'corbatin 2,5' } });
  fireEvent.click(await screen.findByRole('button', { name: '0030101000062 - ADOQUIN CORBATIN 2,5' }));
  fireEvent.change(screen.getByLabelText('Cantidad inicial del producto'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  const newProductRow = screen.getByRole('row', { name: /0030101000062 ADOQUIN CORBATIN 2,5/ });
  expect(within(newProductRow).getByRole('spinbutton', { name: 'Cantidad de ADOQUIN CORBATIN 2,5' })).toHaveValue(7);
  expect(localStorage.getItem('inventario-patio-productos')).toContain('"codigo":"0030101000062"');

  unmount();
  const { unmount: unmountReloadedTab } = render(<Tab2 />);
  expect(screen.getByRole('row', { name: /0030101000062 ADOQUIN CORBATIN 2,5/ })).toBeInTheDocument();

  unmountReloadedTab();
  render(<Tab1 />);
  expect(
    within(screen.getByLabelText('Código producto')).getByRole('option', {
      name: '0030101000062 - ADOQUIN CORBATIN 2,5'
    })
  ).toHaveValue('0030101000062');
});

test('removes a product from both tabs and saved inventory', () => {
  const product = inventoryData.items[0];
  const { unmount } = render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: `Eliminar producto ${product.codigo}` }));
  const alert = document.querySelector('ion-alert');
  expect(alert?.header).toBe('Confirmar eliminación');
  expect(alert?.message).toBe(`¿Eliminar el producto ${product.codigo} - ${product.item}?`);
  const deleteButton = alert?.buttons.find((button) => typeof button !== 'string' && button.text === 'Eliminar');
  expect(deleteButton).toBeDefined();
  if (deleteButton && typeof deleteButton !== 'string') {
    act(() => deleteButton.handler?.(undefined));
  }

  expect(screen.queryByRole('row', { name: /Bloque 4 Primera/ })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(`Se eliminó el producto ${product.codigo} - ${product.item}.`);
  expect(localStorage.getItem('inventario-patio-productos')).not.toContain(product.codigo);
  expect(localStorage.getItem('inventario-patio-cantidades')).not.toContain(`"${product.codigo}"`);

  unmount();
  render(<Tab1 />);
  expect(
    within(screen.getByLabelText('Código producto')).queryByRole('option', {
      name: `${product.codigo} - ${product.item}`
    })
  ).not.toBeInTheDocument();

});

test('shows an error when the initial quantity is invalid', async () => {
  render(<Tab2 />);

  fireEvent.click(screen.getByRole('button', { name: 'Agregar producto' }));
  fireEvent.change(await screen.findByLabelText('Buscar producto por nombre'), { target: { value: 'corbatin 5.0 desp' } });
  fireEvent.click(await screen.findByRole('button', { name: /^0030101400025 - ADOQUIN CORBATIN 5\.0 DESP\s?\.$/ }));
  fireEvent.change(screen.getByLabelText('Cantidad inicial del producto'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Ingresa una cantidad inicial válida.');
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
