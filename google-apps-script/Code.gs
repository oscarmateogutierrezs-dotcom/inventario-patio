// Pegar en Extensiones > Apps Script de la hoja de Google y desplegar como "Aplicación web"
// (Ejecutar como: yo; Acceso: cualquier persona). Copiar la URL en VITE_SHEETS_URL.
var SHEET_NAME = 'Salidas';
var HEADERS = ['fechaHora', 'remision', 'placaVehiculo', 'cantidadEntregada', 'codigoProducto',
  'nombreProducto', 'loteDespachado', 'cantidad', 'desperdicioGenerado', 'reclasificaSegunda'];

var SUMMARY_SHEET_NAME = 'Resumen';
var SUMMARY_HEADERS = ['placa', 'conductor', 'codigoProducto', 'nombreProducto', 'totalProductos', 'totalSalidas'];

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return headers;
  }
  var existing = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach(function (header) {
    if (existing.indexOf(header) === -1) {
      existing.push(header);
      sheet.getRange(1, existing.length).setValue(header);
    }
  });
  return existing;
}

// Acumula por camión (placa) y por producto la cantidad sacada y el número de salidas.
function updateSummary(ss, placa, conductor, codigoProducto, nombreProducto, qty) {
  var sheet = ss.getSheetByName(SUMMARY_SHEET_NAME) || ss.insertSheet(SUMMARY_SHEET_NAME);
  var headers = ensureHeaders(sheet, SUMMARY_HEADERS);
  var last = sheet.getLastRow();
  var rows = last > 1 ? sheet.getRange(2, 1, last - 1, headers.length).getValues() : [];
  var plateIndex = headers.indexOf('placa');
  var driverIndex = headers.indexOf('conductor');
  var codeIndex = headers.indexOf('codigoProducto');
  var nameIndex = headers.indexOf('nombreProducto');
  var quantityIndex = headers.indexOf('totalProductos');
  var exitsIndex = headers.indexOf('totalSalidas');
  var delta = qty >= 0 ? 1 : -1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i][plateIndex] === placa && String(rows[i][codeIndex]) === String(codigoProducto)) {
      var r = i + 2;
      if (conductor) sheet.getRange(r, driverIndex + 1).setValue(conductor);
      if (nombreProducto) sheet.getRange(r, nameIndex + 1).setValue(nombreProducto);
      sheet.getRange(r, quantityIndex + 1).setValue((Number(rows[i][quantityIndex]) || 0) + qty);
      sheet.getRange(r, exitsIndex + 1).setValue((Number(rows[i][exitsIndex]) || 0) + delta);
      return;
    }
  }
  if (qty > 0) {
    var values = {
      placa: placa,
      conductor: conductor || '',
      codigoProducto: codigoProducto,
      nombreProducto: nombreProducto || '',
      totalProductos: qty,
      totalSalidas: 1
    };
    sheet.appendRow(headers.map(function (header) { return values[header] || ''; }));
  }
}

var INVENTORY_SHEET_NAME = 'Inventario';
var INVENTORY_HEADERS = ['codigo', 'nombre', 'lote', 'cantidad'];

function findSheet(ss, name) {
  return ss.getSheets().filter(function (s) { return s.getName().toLowerCase() === name.toLowerCase(); })[0] || null;
}

// La app envía el inventario completo; la hoja se reescribe y siempre refleja el último estado (idempotente).
function replaceInventory(ss, rows) {
  var sheet = findSheet(ss, INVENTORY_SHEET_NAME) || ss.insertSheet(INVENTORY_SHEET_NAME);
  sheet.clearContents();
  var values = [INVENTORY_HEADERS].concat(rows.map(function (r) {
    return [String(r.codigo), r.nombre, r.lote, r.cantidad];
  }));
  var range = sheet.getRange(1, 1, values.length, INVENTORY_HEADERS.length);
  range.setNumberFormat('@');
  if (rows.length) sheet.getRange(2, 4, rows.length, 1).setNumberFormat('0');
  range.setValues(values);
}

// La app lee el inventario de esta hoja (GET) cuando no tiene cambios pendientes por enviar.
function doGet() {
  var sheet = findSheet(SpreadsheetApp.getActiveSpreadsheet(), INVENTORY_SHEET_NAME);
  var rows = [];
  if (sheet && sheet.getLastRow() > 1) {
    rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, INVENTORY_HEADERS.length).getValues()
      .map(function (r) { return { codigo: String(r[0]), nombre: String(r[1]), lote: String(r[2]), cantidad: r[3] }; });
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: rows }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var job = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (job.action === 'inventory') {
      replaceInventory(ss, job.rows || []);
      return ContentService.createTextOutput(JSON.stringify({ ok: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    var headers = ensureHeaders(sheet, HEADERS);
    // El id no es una columna: se guarda como metadato oculto de la fila, que la sigue si se mueve o borra.
    var found = ss.createDeveloperMetadataFinder()
      .withLocationType(SpreadsheetApp.DeveloperMetadataLocationType.ROW)
      .withKey('entryId').withValue(job.entryId).find();
    var meta = found.length ? found[0] : null;

    // Idempotente: reintentos no duplican ni fallan.
    if (job.action === 'add' && !meta) {
      sheet.appendRow(headers.map(function (h) { return job.data[h] || ''; }));
      var newRow = sheet.getLastRow();
      sheet.getRange(newRow + ':' + newRow).addDeveloperMetadata('entryId', job.entryId);
      updateSummary(ss, job.data.placaVehiculo, job.data.conductor, job.data.codigoProducto,
        job.data.nombreProducto, Number(job.data.cantidad) || 0);
    } else if (job.action === 'delete' && meta) {
      var rowIndex = meta.getLocation().getRow().getRow();
      var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
      sheet.deleteRow(rowIndex);
      updateSummary(ss, row[headers.indexOf('placaVehiculo')], null, row[headers.indexOf('codigoProducto')],
        row[headers.indexOf('nombreProducto')], -(Number(row[headers.indexOf('cantidad')]) || 0));
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
