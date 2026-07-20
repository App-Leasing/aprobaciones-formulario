import xmlrpc from 'xmlrpc';
import dotenv from 'dotenv';
dotenv.config({ path: '.env', override: true });
const url = new URL(process.env.ODOO_URL || '');
const common = xmlrpc.createSecureClient({ host: url.hostname, port: url.port ? parseInt(url.port) : 443, path: (url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname) + '/xmlrpc/2/common' });
const client = xmlrpc.createSecureClient({ host: url.hostname, port: url.port ? parseInt(url.port) : 443, path: (url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname) + '/xmlrpc/2/object' });
common.methodCall('authenticate', [process.env.ODOO_DB, process.env.ODOO_USERNAME, process.env.ODOO_PASSWORD, {}], (err, uid) => {
  client.methodCall('execute_kw', [process.env.ODOO_DB, uid, process.env.ODOO_PASSWORD, 'approval.request', 'read', [[3270], ['name', 'x_studio_cuenta_catastral_1']]], (err, records) => {
    console.log(JSON.stringify(records, null, 2));
  });
});
