import xmlrpc from 'xmlrpc';
import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });

const url = new URL(process.env.ODOO_URL || '');
const client = xmlrpc.createSecureClient({
  host: url.hostname,
  port: url.port ? parseInt(url.port) : 443,
  path: (url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname) + '/xmlrpc/2/object'
});

const common = xmlrpc.createSecureClient({
  host: url.hostname,
  port: url.port ? parseInt(url.port) : 443,
  path: (url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname) + '/xmlrpc/2/common'
});

common.methodCall('authenticate', [process.env.ODOO_DB, process.env.ODOO_USERNAME, process.env.ODOO_PASSWORD, {}], (err, uid) => {
  if (err) return console.error('Auth err:', err);
  
  client.methodCall('execute_kw', [
    process.env.ODOO_DB, uid, process.env.ODOO_PASSWORD,
    'approval.request', 'fields_get',
    [],
    { attributes: ['string', 'type', 'relation'] }
  ], (err, fields) => {
    if (err) return console.error('Fields err:', err);
    
    for (const [fieldName, fieldInfo] of Object.entries(fields)) {
      const label = ((fieldInfo as any).string || '').toLowerCase();
      const fn = fieldName.toLowerCase();
      if (fn.includes('sucursal') || label.includes('sucursal') || 
          fn.includes('correo') || label.includes('correo') ||
          fn.includes('telefono') || label.includes('telefono') || label.includes('teléfono')) {
        console.log(`${fieldName} (${(fieldInfo as any).type}): ${(fieldInfo as any).string}`);
      }
    }
  });
});
