import { act, fireEvent, render, screen, within } from '@testing-library/react';
import inventoryData from '../../data/inventario.json';
import Tab1 from './Tab1';

beforeEach(() => {
  localStorage.clear();
});

test('adds and removes a yard exit record', () => {
  render(<Tab1 />);

  const values = [
    ['Remisión', 'R-123'],
    ['Placa vehículo', 'ESZ 929'],
    ['Cantidad entregada', '25'],
    ['Código producto', inventoryData.items[0].codigo],
    ['Lote despachado', 'L-67'],
    ['Cantidad', '24'],
    ['Desperdicio generado', '1'],
    ['Reclasifica segunda', '0']
  ];

  values.forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar registro' }));

  const row = screen.getByRole('row', { name: /R-123/ });
  expect(within(row).getByText('ESZ 929')).toBeInTheDocument();
  expect(within(row).getAllByRole('cell')[3]).toHaveTextContent(inventoryData.items[0].codigo);
  expect(screen.getByLabelText('Remisión')).toHaveValue('');

  fireEvent.click(within(row).getByRole('button', { name: 'Eliminar registro de remisión R-123' }));
  const alert = document.querySelector('ion-alert');
  expect(alert?.header).toBe('Confirmar eliminación');
  expect(alert?.message).toBe('¿Desea eliminar el registro de remisión R-123?');
  const deleteButton = alert?.buttons.find((button) => typeof button !== 'string' && button.text === 'Eliminar');
  expect(deleteButton).toBeDefined();
  if (deleteButton && typeof deleteButton !== 'string') {
    act(() => deleteButton.handler?.(undefined));
  }
  expect(screen.getByText('Aún no hay registros para este turno.')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Se eliminó el registro de remisión R-123.');
});

test('keeps a yard exit record when deletion is canceled', () => {
  render(<Tab1 />);

  const values = [
    ['Remisión', 'R-456'],
    ['Placa vehículo', 'ESZ 929'],
    ['Cantidad entregada', '25'],
    ['Código producto', inventoryData.items[0].codigo],
    ['Lote despachado', 'L-67'],
    ['Cantidad', '24'],
    ['Desperdicio generado', '1'],
    ['Reclasifica segunda', '0']
  ];
  values.forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar registro' }));
  const row = screen.getByRole('row', { name: /R-456/ });

  fireEvent.click(within(row).getByRole('button', { name: 'Eliminar registro de remisión R-456' }));

  const alert = document.querySelector('ion-alert');
  expect(alert?.buttons.find((button) => typeof button !== 'string' && button.text === 'Cancelar')).toBeDefined();
  expect(screen.getByRole('row', { name: /R-456/ })).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('uses product codes from the inventory list', () => {
  render(<Tab1 />);

  const productCode = screen.getByLabelText('Código producto');
  expect(productCode.tagName).toBe('SELECT');
  const firstProduct = inventoryData.items[0];
  expect(
    within(productCode).getByRole('option', {
      name: `${firstProduct.codigo} - ${firstProduct.item}`
    })
  ).toHaveValue(firstProduct.codigo);
});

test('shows errors and shakes every missing required field', () => {
  render(<Tab1 />);

  fireEvent.click(screen.getByRole('button', { name: 'Agregar registro' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Completa los campos obligatorios señalados.');
  expect(screen.getByLabelText('Remisión')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Remisión')).toHaveClass('form-input-invalid');
  expect(screen.getByText('Completa el campo Remisión.')).toBeInTheDocument();
  expect(screen.getByText('Completa el campo Código producto.')).toBeInTheDocument();
  expect(screen.queryByText('Aún no hay registros para este turno.')).toBeInTheDocument();
});
