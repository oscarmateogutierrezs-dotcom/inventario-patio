// Pegar en Extensiones > Apps Script de la hoja de Google y desplegar como "Aplicación web"
// (Ejecutar como: yo; Acceso: cualquier persona). Copiar la URL en VITE_SHEETS_URL.
var SHEET_NAME = 'Salidas';
var HEADERS = ['id', 'fechaHora', 'remision', 'placaVehiculo', 'cantidadEntregada', 'codigoProducto',
  'loteDespachado', 'cantidad', 'desperdicioGenerado', 'reclasificaSegunda'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var job = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    var ids = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; })
      : [];
    var index = ids.indexOf(job.entryId);

    // Idempotente: reintentos no duplican ni fallan.
    if (job.action === 'add' && index === -1) {
      sheet.appendRow(HEADERS.map(function (h) { return h === 'id' ? job.entryId : job.data[h]; }));
    } else if (job.action === 'delete' && index !== -1) {
      sheet.deleteRow(index + 2);
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
