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
  console.log('UID:', uid);
  
  client.methodCall('execute_kw', [
    process.env.ODOO_DB, uid, process.env.ODOO_PASSWORD,
    'approval.request', 'fields_get',
    [],
    { attributes: ['type', 'string'] }
  ], (err, fields) => {
    if (err) return console.error('Fields err:', err);
    
    // Filter binary fields
    console.log("--- BINARY FIELDS ---");
    for (const [fieldName, fieldInfo] of Object.entries(fields)) {
      if ((fieldInfo as any).type === 'binary') {
        console.log(`${fieldName}: ${(fieldInfo as any).string}`);
      }
    }

    console.log("--- CHAR FIELDS FOR FILENAMES ---");
    for (const [fieldName, fieldInfo] of Object.entries(fields)) {
      if ((fieldInfo as any).type === 'char' && fieldName.includes('filename')) {
        console.log(`${fieldName}: ${(fieldInfo as any).string}`);
      }
    }
  });
});
