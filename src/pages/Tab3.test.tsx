import { act, fireEvent, render, screen } from '@testing-library/react';
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
  const alert = document.querySelector('ion-alert');
  expect(alert?.header).toBe('Confirmar eliminación');
  expect(alert?.message).toBe('¿Desea eliminar al conductor Ana Pérez de placa ABC 123?');
  const deleteButton = alert?.buttons.find((button) => typeof button !== 'string' && button.text === 'Eliminar');
  expect(deleteButton).toBeDefined();
  if (deleteButton && typeof deleteButton !== 'string') {
    act(() => deleteButton.handler?.(undefined));
  }

  expect(screen.queryByText('ABC 123')).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'ABC 123' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Se eliminó el conductor Ana Pérez, placa ABC 123.');
});

test('keeps a driver when deletion is canceled', () => {
  render(<Tab3 />);

  fireEvent.click(screen.getByRole('button', {
    name: 'Quitar conductor nombre, placa ESZ 929'
  }));

  const alert = document.querySelector('ion-alert');
  expect(alert?.buttons.find((button) => typeof button !== 'string' && button.text === 'Cancelar')).toBeDefined();
  expect(screen.getByText('ESZ 929')).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
