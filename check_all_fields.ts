import xmlrpc from 'xmlrpc';
import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });
const url = new URL(process.env.ODOO_URL || '');
const common = xmlrpc.createSecureClient({ host: url.hostname, port: url.port ? parseInt(url.port) : 443, path: (url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname) + '/xmlrpc/2/common' });
const client = xmlrpc.createSecureClient({ host: url.hostname, port: url.port ? parseInt(url.port) : 443, path: (url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname) + '/xmlrpc/2/object' });
common.methodCall('authenticate', [process.env.ODOO_DB, process.env.ODOO_USERNAME, process.env.ODOO_PASSWORD, {}], (err, uid) => {
  client.methodCall('execute_kw', [process.env.ODOO_DB, uid, process.env.ODOO_PASSWORD, 'approval.request', 'fields_get', [], { attributes: ['string', 'type', 'relation'] }], (err, fields) => {
    Object.keys(fields).forEach(key => {
      if (key.startsWith('x_studio_')) {
        console.log(`${key} (${fields[key].type}): ${fields[key].string} ${fields[key].relation ? '-> ' + fields[key].relation : ''}`);
      }
    });
  });
});
