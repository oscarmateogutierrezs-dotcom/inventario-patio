import { act, fireEvent, render, screen, within } from '@testing-library/react';
import inventoryData from '../../data/inventario.json';
import { vi } from 'vitest';
import Tab1 from './Tab1';

beforeEach(() => {
  localStorage.clear();
});

const addLotToFirstProduct = () => {
  const firstProduct = inventoryData.items[0];
  localStorage.setItem(
    'inventario-patio-productos',
    JSON.stringify([{
      codigo: firstProduct.codigo,
      item: firstProduct.item,
      lotes: [{ lote: 'L-67', cantidad: 100 }]
    }])
  );
};

test('adds a yard exit record', () => {
  addLotToFirstProduct();
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
  addLotToFirstProduct();
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

test('shows only the lots registered for the selected product', () => {
  const [firstProduct, secondProduct] = inventoryData.items;
  localStorage.setItem(
    'inventario-patio-productos',
    JSON.stringify([
      { codigo: firstProduct.codigo, item: firstProduct.item, lotes: [{ lote: 'L-67', cantidad: 20 }] },
      { codigo: secondProduct.codigo, item: secondProduct.item, lotes: [{ lote: 'L-88', cantidad: 30 }] }
    ])
  );
  render(<Tab1 />);

  fireEvent.change(screen.getByLabelText('Código producto'), { target: { value: firstProduct.codigo } });
  const lotSelect = screen.getByLabelText('Lote despachado');
  expect(within(lotSelect).getByRole('option', { name: 'L-67' })).toBeInTheDocument();
  expect(within(lotSelect).queryByRole('option', { name: 'L-88' })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Código producto'), { target: { value: secondProduct.codigo } });
  expect(lotSelect).toHaveValue('');
  expect(within(lotSelect).getByRole('option', { name: 'L-88' })).toBeInTheDocument();
});

test('deducts a yard exit from the selected lot and prevents overdrawing it', () => {
  const firstProduct = inventoryData.items[0];
  localStorage.setItem(
    'inventario-patio-productos',
    JSON.stringify([{
      codigo: firstProduct.codigo,
      item: firstProduct.item,
      lotes: [
        { lote: 'L-67', cantidad: 10 },
        { lote: 'L-68', cantidad: 50 }
      ]
    }])
  );
  render(<Tab1 />);

  const values = [
    ['Remisión', 'R-999'],
    ['Placa vehículo', 'ESZ 929'],
    ['Cantidad entregada', '25'],
    ['Código producto', firstProduct.codigo],
    ['Lote despachado', 'L-67'],
    ['Cantidad', '11'],
    ['Desperdicio generado', '1'],
    ['Reclasifica segunda', '0']
  ];
  values.forEach(([label, value]) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar registro' }));
  expect(screen.getByText('La cantidad supera el inventario disponible (10).')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '7' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar registro' }));

  const savedProducts = JSON.parse(localStorage.getItem('inventario-patio-productos') ?? '[]');
  expect(savedProducts[0].lotes).toEqual([
    { lote: 'L-67', cantidad: 3 },
    { lote: 'L-68', cantidad: 50 }
  ]);
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

test('clears yard exit validation errors after ten seconds', () => {
  vi.useFakeTimers();
  try {
    render(<Tab1 />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar registro' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(10000));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Remisión')).not.toHaveAttribute('aria-invalid', 'true');
  } finally {
    vi.useRealTimers();
  }
});
