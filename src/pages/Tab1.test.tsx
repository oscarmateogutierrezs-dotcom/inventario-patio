import { fireEvent, render, screen, within } from '@testing-library/react';
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
  expect(screen.getByText('Aún no hay registros para este turno.')).toBeInTheDocument();
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
