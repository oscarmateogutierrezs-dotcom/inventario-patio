export const testInventory = [
  { codigo: 'TEST-1', item: 'Bloque 4 Primera', cantidad: 300259 },
  { codigo: 'TEST-2', item: 'Bloque 4 Segunda', cantidad: 11316 }
];

export const seedTestInventory = () => {
  localStorage.setItem('inventario-patio-productos', JSON.stringify(testInventory));
};

export const seedTestDrivers = () => {
  localStorage.setItem('inventario-patio-conductores', JSON.stringify([
    { nombre: 'nombre', placa: 'ESZ 929' }
  ]));
};
