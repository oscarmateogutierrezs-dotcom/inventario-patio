import { fireEvent, render, screen, within } from '@testing-library/react';
import Tab1 from './Tab1';

test('adds and removes a yard exit record', () => {
  render(<Tab1 />);

  const values = [
    ['Remisión', 'R-123'],
    ['Placa vehículo', 'ABC-123'],
    ['Cantidad entregada', '25'],
    ['Código producto', 'P-45'],
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
  expect(within(row).getByText('ABC-123')).toBeInTheDocument();
  expect(within(row).getByText('P-45')).toBeInTheDocument();
  expect(screen.getByLabelText('Remisión')).toHaveValue('');

  fireEvent.click(within(row).getByRole('button', { name: 'Eliminar registro de remisión R-123' }));
  expect(screen.getByText('Aún no hay registros para este turno.')).toBeInTheDocument();
});
