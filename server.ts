import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import xmlrpc from 'xmlrpc';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const createClient = (urlString: string, rpcPath: string) => {
  try {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const clientFactory = isHttps ? xmlrpc.createSecureClient : xmlrpc.createClient;
    const port = url.port ? parseInt(url.port, 10) : (isHttps ? 443 : 80);

    // Mantener subrutas si la URL de Odoo las tiene (ej: odoo.empresa.com/instancia1)
    const basePath = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
    const fullPath = basePath + rpcPath;

    const options: any = { host: url.hostname, port, path: fullPath };
    if (isHttps) {
      options.rejectUnauthorized = false;
    }

    return clientFactory(options);
  } catch (err) {
    console.error("Error parseando ODOO_URL:", err);
    throw err;
  }
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' }));

  const getOdooConfig = () => {
    const config = {
      url: process.env.ODOO_URL || '',
      db: process.env.ODOO_DB || '',
      username: process.env.ODOO_USERNAME || '',
      password: process.env.ODOO_PASSWORD || ''
    };
    // Log para depurar si está tomando el .env correcto
    console.log(`[Config Odoo] URL: ${config.url} | DB: ${config.db} | User: ${config.username}`);
    return config;
  };

  const authenticate = async (): Promise<number | null> => {
    const { url, db, username, password } = getOdooConfig();
    if (!url || !db || !username || !password) return null;
    const common = createClient(url, '/xmlrpc/2/common');
    return new Promise((resolve) => {
      common.methodCall('authenticate', [db, username, password, {}], (err, value) => {
        if (err) { console.error('Auth error:', err); resolve(null); }
        else resolve(value);
      });
    });
  };

  // ✅ FIX #4: kwargs {} agregado
  const execute = async (model: string, method: string, args: any[], kwargs: object = {}): Promise<any> => {
    const uid = await authenticate();
    if (!uid) throw new Error('Odoo Authentication Failed');
    const { url, db, password } = getOdooConfig();
    const object = createClient(url, '/xmlrpc/2/object');
    return new Promise((resolve, reject) => {
      object.methodCall('execute_kw', [db, uid, password, model, method, args, kwargs], (err, value) => {
        if (err) reject(err); else resolve(value);
      });
    });
  };

  // --- API para Opciones de Selección ---
  app.get('/api/odoo/opciones', async (req: Request, res: Response) => {
    try {
      const campo = req.query.campo as string;
      const modelo = (req.query.modelo as string) || 'approval.request';

      if (!campo) return res.status(400).json({ error: "Falta el parámetro 'campo'" });

      const fieldsInfo = await execute(modelo, 'fields_get', [[campo], ['selection', 'type', 'relation']]);
      const fieldData = fieldsInfo[campo];
      if (!fieldData) return res.json({ opciones: [] });

      if (fieldData.type === 'selection') {
        const opciones = (fieldData.selection || []).map((opt: any) => ({ id: opt[0], nombre: opt[1] }));
        return res.json({ opciones });
      }

      if (fieldData.type === 'many2one') {
        // Enviar 'fields' dentro de kwargs
        const records = await execute(fieldData.relation, 'search_read', [[]], { fields: ['id', 'name', 'display_name'] });
        return res.json({ opciones: records.map((r: any) => ({ id: r.id, nombre: r.name || r.display_name || 'Sin nombre' })) });
      }

      res.json({ opciones: [] });
    } catch (error: any) {
      console.error("Error en opciones:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ✅ FIX #3: domain sin doble wrapper
  app.get('/api/odoo/geografia/:modelo', async (req: Request, res: Response) => {
    try {
      const { modelo } = req.params;
      const { filtro_campo, filtro_valor } = req.query;

      const domain: any[] = [];
      if (modelo === 'res.country.state') domain.push(['country_id', '=', 185]);
      if (filtro_campo && filtro_valor) domain.push([filtro_campo as string, '=', parseInt(filtro_valor as string, 10)]);

      // Enviar 'fields' dentro de kwargs
      const records = await execute(modelo, 'search_read', [domain], { fields: ['id', 'name', 'display_name'] });
      res.json({ opciones: records.map((r: any) => ({ id: r.id, nombre: r.name || r.display_name || 'Sin nombre' })) });
    } catch (error: any) {
      console.error("Error geografía:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoint para estirar los agentes de venta (etiqueta 81)
  app.get('/api/odoo/agentes', async (req: Request, res: Response) => {
    try {
      const domain = [['category_id', 'in', [81]]];
      const records = await execute('res.partner', 'search_read', [domain], { fields: ['id', 'name', 'display_name'] });
      res.json({ opciones: records.map((r: any) => ({ id: r.id, nombre: r.name || r.display_name || 'Sin nombre' })) });
    } catch (error: any) {
      console.error("Error agentes:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ✅ FIX #1 + #2: domain correcto + false en vez de undefined
  app.post('/api/leasing', async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body;
      const uid = await authenticate();
      if (!uid) { res.status(401).json({ error: "Error de autenticación con Odoo." }); return; }

      // ✅ FIX #1: domain con un solo nivel extra (args = [domain])
      const categoryIds = await execute('approval.category', 'search', [[['name', '=', 'Solicitud Leasing']]]);
      const categoryId = categoryIds?.[0] ?? false;

      if (!categoryId) {
        console.error('⚠️ No se encontró la categoría "Solicitud Leasing" en Odoo');
      }

      const cleanBase64 = (b64: string | undefined) => b64?.split(',')[1] || false;

      const now = new Date();
      const formattedDate = now.toISOString().replace('T', ' ').substring(0, 19);

      // ✅ FIX #2: false en lugar de undefined para campos opcionales
      const payload: Record<string, any> = {
        name: `${body.clienteNombre}`,
        date: formattedDate, // Enviamos la fecha y hora de creación de la web
        category_id: categoryId,
        request_owner_id: uid,
        x_studio_correo_cliente: body.correoCliente || false,
        x_studio_telefono: body.telefono || false,
        x_studio_pack_de_leasing: body.packLeasing || false,
        x_studio_operador_de_lina: body.operador || false,

        x_studio_tipo_de_cliente: body.tipoCliente || false,
        x_studio_fecha_de_nacimiento: body.fechaNacimiento || false,
        x_studio_calle_principal: body.callePrincipal || false,
        x_studio_calle_secundaria: body.calleSecundaria || false,
        x_studio_cuenta_catastral_1: body.cuentaCatastral || false,
        x_studio_forma_de_pago: body.formaPago || false,
        x_studio_sucursale_de_venta_1: body.sucursal || false,
        x_studio_pas: 185,
        x_studio_estado_1: body.estadoId ? parseInt(body.estadoId, 10) : false,
        x_studio_ciudad_1: body.distritoId ? parseInt(body.distritoId, 10) : false,
        x_studio_localidad: body.localidadId ? parseInt(body.localidadId, 10) : false,
        x_studio_barrio_real: body.barrioId ? parseInt(body.barrioId, 10) : false,
        x_studio_agente_de_venta: body.agenteId ? parseInt(body.agenteId, 10) : false,
        x_studio_justificativo_de_ingreso: body.filesIngresos && body.filesIngresos.length > 0 ? cleanBase64(body.filesIngresos[0].base64) : false,
        x_studio_justificativo_de_ingreso_filename: body.filesIngresos && body.filesIngresos.length > 0 ? body.filesIngresos[0].name : false,
      };

      // Limpiar todos los campos dinámicos para que Odoo no use sus valores por defecto
      const allDynamicFields = [
        'x_studio_telefonos_pack_1',
        'x_studio_telefonos_pack_2',
        'x_studio_telefonos_pack_3',
        'x_studio_color_c26',
        'x_studio_selection_field_97d_1jeshelms',
        'x_studio_color_wp55_ultra',
        'x_studio_color_p1_pro',
        'x_studio_color_wp100_titan',
        'x_studio_color_g5',
        'x_studio_color_de_g5_1',
        'x_studio_color_del_telefono',
        'x_studio_color_wp300',
        'x_studio_color_p1',
        'x_studio_color_c65',
        'x_studio_color_c60'
      ];
      for (const f of allDynamicFields) {
        payload[f] = false;
      }

      // Asignación dinámica del teléfono y color
      const valModelo = body.modeloValue || body.telefonoValue;
      if (body.modeloField && valModelo) {
        payload[body.modeloField] = valModelo;
      }
      if (body.colorField && body.colorValue) {
        payload[body.colorField] = body.colorValue;
      }

      console.log('📤 Enviando payload a Odoo:', JSON.stringify(payload, null, 2));

      const requestId = await execute('approval.request', 'create', [payload]);
      console.log('✅ Registro creado con ID:', requestId);

      // 📎 Subir imágenes como Adjuntos (ir.attachment) para que salgan en el Chatter/Clip
      const attachFile = async (fileObj: any) => {
        if (!fileObj || !fileObj.base64) return;
        try {
          await execute('ir.attachment', 'create', [{
            name: fileObj.name,
            type: 'binary',
            datas: cleanBase64(fileObj.base64),
            res_model: 'approval.request',
            res_id: requestId
          }]);
          console.log(`📎 Imagen ${fileObj.name} adjuntada al Chatter.`);
        } catch (err) {
          console.error(`⚠️ Error adjuntando ${fileObj.name}:`, err);
        }
      };

      if (body.filesIngresos && Array.isArray(body.filesIngresos)) {
        for (const fileObj of body.filesIngresos) {
          await attachFile(fileObj);
        }
      }

      // --- N8N WEBHOOK INTEGRATION ---
      let diditUrl = null;
      try {
        console.log(`🚀 Enviando datos al Webhook de n8n para Didit (ID: ${requestId})...`);
        
        // Excluir imágenes/archivos base64 del webhook de n8n
        const { filesIngresos, ...n8nPayload } = body;

        const webhookPayload = {
          ...n8nPayload,
          id: requestId,
          referencia: requestId,
          odooRequestId: requestId
        };
        const n8nResponse = await fetch("https://n8n-aimz.srv1588639.hstgr.cloud/webhook/37c67d13-6814-49a7-aae3-161191cb10f2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload)
        });

        if (n8nResponse.ok) {
          console.log(`✅ Webhook n8n disparado con éxito. Status: ${n8nResponse.status}`);
          // Intentamos leer la respuesta de n8n por si Max nos devuelve el link de Didit
          try {
            const n8nData = await n8nResponse.json();
            console.log(`Response payload from n8n:`, JSON.stringify(n8nData));
            diditUrl = n8nData.url || n8nData.diditUrl || n8nData.redirectUrl || n8nData.link || n8nData.redirect_url || null;
            if (diditUrl) console.log(`🔗 URL de Didit recibida desde n8n: ${diditUrl}`);
          } catch (e) {
            console.log("n8n no devolvió JSON o no se pudo parsear.");
          }
        } else {
          console.error(`⚠️  Webhook n8n falló con status: ${n8nResponse.status}`);
        }
      } catch (webhookErr) {
        console.error(`⚠️ Error al contactar el webhook de n8n:`, webhookErr);
      }

      res.json({ success: true, id: requestId, diditUrl: diditUrl });
    } catch (error: any) {
      console.error("❌ Error en /api/leasing:", error);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server running on http://0.0.0.0:${PORT}`));
}

startServer();