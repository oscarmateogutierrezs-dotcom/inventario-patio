import { fireEvent, render, screen, within } from '@testing-library/react';
import inventoryData from '../../data/inventario.json';
import Tab1 from './Tab1';

beforeEach(() => {
  localStorage.clear();
});

test('adds a yard exit record', () => {
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
  expect(within(row).getAllByRole('cell')[4]).toHaveTextContent(inventoryData.items[0].codigo);
  expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  expect(screen.getByLabelText('Remisión')).toHaveValue('');
});

test('persists yard exit records and shows pending sync count', () => {
  const { unmount } = render(<Tab1 />);
  expect(screen.getByText('Todo sincronizado')).toBeInTheDocument();

  const values = [
    ['Remisión', 'R-789'],
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

  expect(screen.getByText('1 pendiente de sincronizar')).toBeInTheDocument();

  unmount();
  render(<Tab1 />);
  expect(screen.getByRole('row', { name: /R-789/ })).toBeInTheDocument();
  expect(screen.getByText('1 pendiente de sincronizar')).toBeInTheDocument();
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
