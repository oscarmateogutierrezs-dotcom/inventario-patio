import { fireEvent, render, screen } from '@testing-library/react';
import Tab3 from './Tab3';
import Tab1 from './Tab1';

beforeEach(() => {
  localStorage.clear();
});

test('shows saved drivers and supports adding and removing drivers', () => {
  render(
    <>
      <Tab3 />
      <Tab1 />
    </>
  );

  expect(screen.getAllByText('ESZ 929')).toHaveLength(2);
  expect(screen.getAllByRole('listitem')).toHaveLength(7);

  fireEvent.change(screen.getByLabelText('Nombre del conductor'), {
    target: { value: 'Ana Pérez' }
  });
  fireEvent.change(screen.getByLabelText('Placa'), {
    target: { value: 'abc 123' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar conductor' }));

  expect(screen.getAllByText('ABC 123')).toHaveLength(2);
  expect(screen.getByRole('option', { name: 'ABC 123' })).toBeInTheDocument();
  expect(localStorage.getItem('inventario-patio-conductores')).toContain('"placa":"ABC 123"');

  fireEvent.click(screen.getByRole('button', {
    name: 'Quitar conductor Ana Pérez, placa ABC 123'
  }));
  expect(screen.queryByText('ABC 123')).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'ABC 123' })).not.toBeInTheDocument();
});
