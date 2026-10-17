import { fireEvent, render, screen, within } from '@testing-library/react';
import Tab2 from './Tab2';

beforeEach(() => {
  localStorage.clear();
});

test('shows every inventory field and saves edited quantities', () => {
  const { unmount } = render(<Tab2 />);

  expect(screen.getAllByRole('row')).toHaveLength(15);
  const productRow = screen.getByRole('row', { name: /Bloque 4 Primera/ });
  expect(within(productRow).getByText('1')).toBeInTheDocument();
  expect(within(productRow).getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' })).toHaveValue(300259);

  fireEvent.change(screen.getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' }), {
    target: { value: '300260' }
  });
  expect(screen.getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' })).toHaveValue(300260);
  expect(localStorage.getItem('inventario-patio-cantidades')).toContain('"1":300260');

  unmount();
  render(<Tab2 />);
  expect(screen.getByRole('spinbutton', { name: 'Cantidad de Bloque 4 Primera' })).toHaveValue(300260);
});
