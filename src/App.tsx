import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import {
  UploadCloud, CheckCircle, MapPin, Building,
  CreditCard, User, Calendar, ShieldCheck, Zap
} from "lucide-react";
import { motion } from "motion/react";

type FileData = { file: File | null; base64: string; name: string } | null;
interface OdooOpcion { id: string | number; nombre: string; }

export default function App() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", msg: "" });

  const [formData, setFormData] = useState({
    clienteNombre: "",
    correoCliente: "",
    telefono: "",
    tipoCliente: "",
    fechaNacimiento: "",
    callePrincipal: "",
    calleSecundaria: "",
    formaPago: "",
    sucursal: "",
    agenteId: "",
    canalVerificacion: "Correo Electrónico",
    estadoId: "",
    distritoId: "",
    localidadId: "",
    barrioId: "",
    packLeasing: "",
    modelo: "",
    color: "",
    operador: "",
    cuentaCatastral: ""
  });

  const [isSuccess, setIsSuccess] = useState(false);

  const [options, setOptions] = useState({
    estados: [] as OdooOpcion[],
    distritos: [] as OdooOpcion[],
    localidades: [] as OdooOpcion[],
    barrios: [] as OdooOpcion[],
    tipoCliente: [] as OdooOpcion[],
    formaPago: [] as OdooOpcion[],
    sucursal: [] as OdooOpcion[],
    agentes: [] as OdooOpcion[],
    packLeasing: [] as OdooOpcion[],
    modelos: [] as OdooOpcion[],
    colores: [] as OdooOpcion[],
    operador: [] as OdooOpcion[]
  });

  const [modeloFieldMap, setmodeloFieldMap] = useState("");
  const [colorFieldMap, setColorFieldMap] = useState("");

  const [optionsLoading, setOptionsLoading] = useState(true);

  const [files, setFiles] = useState<{
    ingresos: { file: File; base64: string; name: string }[];
  }>({ ingresos: [] });

  const selectedTipoCliente = options.tipoCliente.find(
    o => String(o.id) === String(formData.tipoCliente)
  )?.nombre || "";
  const showCuentaCatastral = selectedTipoCliente.toLowerCase().includes("recolectora");

  useEffect(() => {
    if (!showCuentaCatastral && formData.cuentaCatastral) {
      setFormData(prev => ({ ...prev, cuentaCatastral: "" }));
    }
  }, [showCuentaCatastral]);

  useEffect(() => {
    cargarOpcionesIniciales();
  }, []);

  const cargarOpcionesIniciales = async () => {
    setOptionsLoading(true);
    try {
      await Promise.all([
        fetch("/api/odoo/opciones?campo=x_studio_tipo_de_cliente").then(r => r.json()),
        fetch("/api/odoo/opciones?campo=x_studio_forma_de_pago").then(r => r.json()),
        fetch("/api/odoo/opciones?campo=x_studio_sucursale_de_venta_1").then(r => r.json()),
        fetch("/api/odoo/agentes").then(r => r.json()),
        fetch("/api/odoo/geografia/res.country.state").then(r => r.json()),
        fetch("/api/odoo/opciones?campo=x_studio_pack_de_leasing").then(r => r.json()),
        fetch("/api/odoo/opciones?campo=x_studio_operador_de_lina").then(r => r.json())
      ])
        .then(([tipoC, formaP, suc, agentes, est, pack, oper]) => {
          setOptions(prev => ({
            ...prev,
            tipoCliente: tipoC.opciones || [],
            formaPago: formaP.opciones || [],
            sucursal: suc.opciones || [],
            agentes: agentes.opciones || [],
            estados: (est.opciones || []).filter((o: OdooOpcion) => o.nombre.trim() !== "Central"),
            packLeasing: pack.opciones || [],
            operador: oper.opciones || []
          }));
        });
    } catch (e) {
      console.error("Error al cargar opciones iniciales:", e);
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (!formData.estadoId) return;
    setOptions(prev => ({ ...prev, distritos: [], localidades: [], barrios: [] }));
    setFormData(prev => ({ ...prev, distritoId: "", localidadId: "", barrioId: "" }));
    fetch(`/api/odoo/geografia/res.district?filtro_campo=state_id&filtro_valor=${formData.estadoId}`)
      .then(r => r.json())
      .then(data => setOptions(prev => ({ ...prev, distritos: data.opciones || [] })));
  }, [formData.estadoId]);

  useEffect(() => {
    if (!formData.distritoId) return;
    setOptions(prev => ({ ...prev, localidades: [], barrios: [] }));
    setFormData(prev => ({ ...prev, localidadId: "", barrioId: "" }));
    fetch(`/api/odoo/geografia/res.location?filtro_campo=district_id&filtro_valor=${formData.distritoId}`)
      .then(r => r.json())
      .then(data => setOptions(prev => ({ ...prev, localidades: data.opciones || [] })));
  }, [formData.distritoId]);

  useEffect(() => {
    if (!formData.localidadId) return;
    setOptions(prev => ({ ...prev, barrios: [] }));
    setFormData(prev => ({ ...prev, barrioId: "" }));
    fetch(`/api/odoo/geografia/res.neighborhood?filtro_campo=location_id&filtro_valor=${formData.localidadId}`)
      .then(r => r.json())
      .then(data => setOptions(prev => ({ ...prev, barrios: data.opciones || [] })));
  }, [formData.localidadId]);

  // Lógica Árbol Leasing (Pack -> Modelo)
  useEffect(() => {
    setOptions(prev => ({ ...prev, modelos: [], colores: [] }));
    setFormData(prev => ({ ...prev, modelo: "", color: "" }));
    setmodeloFieldMap("");

    const pack = options.packLeasing.find((p: any) => p.id === formData.packLeasing)?.nombre || "";

    if (pack.includes("1")) {
      setmodeloFieldMap("x_studio_telefonos_pack_1");
      fetch(`/api/odoo/opciones?campo=x_studio_telefonos_pack_1`).then(r => r.json())
        .then(data => setOptions(prev => ({ ...prev, modelos: data.opciones || [] })));
    } else if (pack.includes("2 Pro")) {
      setOptions(prev => ({ ...prev, modelos: [{ id: "p1_pro", nombre: "P1 Pro" }] }));
    } else if (pack.includes("2")) {
      setmodeloFieldMap("x_studio_telefonos_pack_2");
      fetch(`/api/odoo/opciones?campo=x_studio_telefonos_pack_2`).then(r => r.json())
        .then(data => setOptions(prev => ({ ...prev, modelos: data.opciones || [] })));
    } else if (pack.includes("3")) {
      setmodeloFieldMap("x_studio_telefonos_pack_3");
      fetch(`/api/odoo/opciones?campo=x_studio_telefonos_pack_3`).then(r => r.json())
        .then(data => setOptions(prev => ({ ...prev, modelos: data.opciones || [] })));
    } else if (pack.toLowerCase().includes("tablet")) {
      setOptions(prev => ({ ...prev, modelos: [{ id: "ot6_kids", nombre: "OT6 Kids" }] }));
    }
  }, [formData.packLeasing, options.packLeasing]);

  // Lógica Árbol Leasing (Modelo -> Color)
  useEffect(() => {
    setOptions(prev => ({ ...prev, colores: [] }));
    setFormData(prev => ({ ...prev, color: "" }));
    setColorFieldMap("");

    const mod = options.modelos.find((t: any) => t.id === formData.modelo)?.nombre || formData.modelo;
    if (!mod) return;

    let field = "";
    if (mod.includes("C3")) field = "x_studio_color_del_telefono";
    else if (mod.includes("C61")) field = "x_studio_selection_field_97d_1jeshelms";
    else if (mod.includes("C60")) field = "x_studio_color_c60";
    else if (mod.includes("C65")) field = "x_studio_color_c65";
    else if (mod.includes("C26")) field = "x_studio_color_c26";
    else if (mod.includes("G5")) field = "x_studio_color_g5";
    else if (mod.includes("P1 Pro")) field = "x_studio_color_p1_pro";
    else if (mod.includes("WP100")) field = "x_studio_color_wp100_titan";
    else if (mod.includes("WP300")) field = "x_studio_color_wp300";
    else if (mod.includes("WP55")) field = "x_studio_color_wp55_ultra";
    else if (mod.includes("P1")) field = "x_studio_color_p1";
    else if (mod.includes("OT6")) field = "x_studio_color_de_g5_1";

    if (field) {
      setColorFieldMap(field);
      fetch(`/api/odoo/opciones?campo=${field}`).then(r => r.json())
        .then(data => setOptions(prev => ({ ...prev, colores: data.opciones || [] })));
    }
  }, [formData.modelo, options.modelos]);

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (files.ingresos.length + selectedFiles.length > 6) {
      alert("Puedes subir un máximo de 6 archivos en total.");
      e.target.value = "";
      return;
    }

    const processedFiles: { file: File; base64: string; name: string }[] = [];
    for (const file of selectedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`El archivo "${file.name}" supera el límite de 5MB.`);
        continue;
      }
      try {
        const base64 = await toBase64(file);
        processedFiles.push({ file, base64, name: file.name });
      } catch (err) {
        console.error("Error al procesar archivo:", err);
      }
    }

    if (processedFiles.length > 0) {
      setFiles(prev => ({
        ...prev,
        ingresos: [...prev.ingresos, ...processedFiles]
      }));
    }
    e.target.value = "";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    // Validación estricta de campos geográficos
    const hasDistritos = options.distritos.length > 0;
    const hasLocalidades = options.localidades.length > 0;
    const hasBarrios = options.barrios.length > 0;

    if (
      !formData.estadoId ||
      (hasDistritos && !formData.distritoId) ||
      (hasLocalidades && !formData.localidadId) ||
      (hasBarrios && !formData.barrioId)
    ) {
      setStatus({
        type: "error",
        msg: "Por favor, completa todos los campos de ubicación (Departamento, Distrito, Ciudad y Barrio)."
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        clienteNombre: formData.clienteNombre,
        correoCliente: formData.correoCliente,
        telefono: formData.telefono,
        tipoCliente: formData.tipoCliente,
        fechaNacimiento: formData.fechaNacimiento,
        callePrincipal: formData.callePrincipal,
        calleSecundaria: formData.calleSecundaria,
        formaPago: formData.formaPago,
        sucursal: formData.sucursal || false,
        agenteId: formData.agenteId || null,
        estadoId: formData.estadoId || null,
        distritoId: formData.distritoId || null,
        localidadId: formData.localidadId || null,
        barrioId: formData.barrioId || null,
        packLeasing: formData.packLeasing || false,
        modeloField: modeloFieldMap,
        modeloValue: formData.modelo || false,
        colorField: colorFieldMap,
        colorValue: formData.color || false,
        operador: formData.operador || false,
        cuentaCatastral: showCuentaCatastral ? (formData.cuentaCatastral || false) : false,
        filesIngresos: files.ingresos.map(f => ({ base64: f.base64, name: f.name })),
        canalVerificacion: formData.canalVerificacion,
      };

      // 1. Enviar a Odoo (backend local)
      const response = await fetch("/api/leasing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Error en el servidor de Odoo");
      }

      const responseData = await response.json();

      // Enrutamiento a DIDIT: Si Max configuró n8n para devolver la URL, redirigimos automáticamente.
      if (responseData.diditUrl) {
        setStatus({ type: "success", msg: "Redirigiendo a verificación de identidad..." });
        window.location.href = responseData.diditUrl;
      } else {
        // Fallback a la pantalla de éxito si no hay URL directa
        setIsSuccess(true);
      }
    } catch (err: any) {
      setStatus({ type: "error", msg: err.message || "Hubo un error al procesar tu solicitud." });
    } finally {
      setLoading(false);
    }
  };

  const selectClass = "w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="bg-[#F8FAFC] font-sans text-slate-900 flex flex-col min-h-screen">
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-700 via-slate-500 to-zinc-800 z-50"></div>

      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center z-40">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Leasing Logo" className="w-10 h-10 rounded-xl object-contain shadow-md" />
        </div>
        <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs text-slate-600 font-semibold">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Odoo 18 Listo
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 flex flex-col gap-8 max-w-[1000px] mx-auto w-full">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 mt-4"
        >
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            Solicitud de <span className="text-zinc-600">Leasing</span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200/50 overflow-hidden w-full"
        >

          {isSuccess ? (
            <div className="p-16 text-center space-y-6 flex flex-col items-center justify-center min-h-[500px]">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">¡Solicitud enviada con éxito!</h2>
              <p className="text-slate-500 text-lg max-w-md mx-auto leading-relaxed">
                Para continuar con la aprobación, te acabamos de enviar un enlace seguro a tu <span className="font-bold text-zinc-700">{formData.canalVerificacion}</span>. Por favor, ábrelo para realizar la validación de identidad con Didit.
              </p>
              <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">
                Cargar nueva solicitud
              </button>
            </div>
          ) : (
            <>
              <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/40">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Nuevo Formulario de Registro</h2>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required type="text" placeholder="Juan Pérez"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all"
                        value={formData.clienteNombre}
                        onChange={e => setFormData({ ...formData, clienteNombre: e.target.value })} />
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico *</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 font-bold">@</div>
                      <input required type="email" placeholder="ejemplo@correo.com"
                        title="Ingresa un correo válido (ej: usuario@gmail.com)"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all"
                        value={formData.correoCliente}
                        onChange={e => setFormData({ ...formData, correoCliente: e.target.value })} />
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teléfono *</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 font-bold">#</div>
                      <input required type="tel" placeholder="09XX XXX XXX"
                        pattern="^09[0-9]{8}$"
                        title="Formato de Paraguay: debe empezar con 09 y tener 10 dígitos numéricos en total."
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all"
                        value={formData.telefono}
                        onChange={e => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData({ ...formData, telefono: val });
                        }} />
                    </div>
                  </div>



                  <div className="col-span-2 space-y-4 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Canal de Verificación de Identidad *</label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative flex items-center justify-center">
                          <input type="radio" name="canalVerificacion" value="Correo Electrónico"
                            className="peer sr-only"
                            checked={formData.canalVerificacion === "Correo Electrónico"}
                            onChange={e => setFormData({ ...formData, canalVerificacion: e.target.value })} />
                          <div className="w-5 h-5 border-2 border-slate-300 rounded-full peer-checked:border-zinc-800 peer-checked:bg-zinc-800 transition-all"></div>
                          <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-all"></div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Correo Electrónico</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <div className="relative flex items-center justify-center">
                          <input type="radio" name="canalVerificacion" value="Teléfono"
                            className="peer sr-only"
                            checked={formData.canalVerificacion === "Teléfono"}
                            onChange={e => setFormData({ ...formData, canalVerificacion: e.target.value })} />
                          <div className="w-5 h-5 border-2 border-slate-300 rounded-full peer-checked:border-zinc-800 peer-checked:bg-zinc-800 transition-all"></div>
                          <div className="absolute w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-all"></div>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Teléfono (WhatsApp/SMS)</span>
                      </label>
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo Cliente *</label>
                    <select required className={selectClass}
                      value={formData.tipoCliente}
                      onChange={e => setFormData({ ...formData, tipoCliente: e.target.value })}>
                      <option value="">{optionsLoading ? "Cargando..." : "Seleccione..."}</option>
                      {options.tipoCliente.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Nacimiento *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required type="date"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all appearance-none"
                        value={formData.fechaNacimiento}
                        onChange={e => setFormData({ ...formData, fechaNacimiento: e.target.value })} />
                    </div>
                  </div>

                  <div className="col-span-2 bg-zinc-50/50 p-8 rounded-[2rem] border border-zinc-200/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Departamento *</label>
                      <select required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-400"
                        value={formData.estadoId}
                        onChange={e => setFormData({ ...formData, estadoId: e.target.value })}>
                        <option value="">{optionsLoading ? "Cargando..." : "Seleccione..."}</option>
                        {options.estados.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                      <label className="text-[10px] text-slate-500 italic">Si es central - elegir "CENTRAL"</label>

                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Distrito *</label>
                      <select required disabled={!formData.estadoId || options.distritos.length === 0}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-50 outline-none"
                        value={formData.distritoId}
                        onChange={e => setFormData({ ...formData, distritoId: e.target.value })}>
                        <option value="">{!formData.estadoId ? "Primero dept." : "Seleccione..."}</option>
                        {options.distritos.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Ciudad *</label>
                      <select required disabled={!formData.distritoId || options.localidades.length === 0}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-50 outline-none"
                        value={formData.localidadId}
                        onChange={e => setFormData({ ...formData, localidadId: e.target.value })}>
                        <option value="">{!formData.distritoId ? "Primero distrito." : "Seleccione..."}</option>
                        {options.localidades.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Barrio *</label>
                      <select required disabled={!formData.localidadId || options.barrios.length === 0}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-50 outline-none"
                        value={formData.barrioId}
                        onChange={e => setFormData({ ...formData, barrioId: e.target.value })}>
                        <option value="">{!formData.localidadId ? "Primero ciudad." : "Seleccione..."}</option>
                        {options.barrios.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calle Principal *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input required type="text" placeholder="Ej: Avda. San Martín"
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all"
                        value={formData.callePrincipal}
                        onChange={e => setFormData({ ...formData, callePrincipal: e.target.value })} />
                    </div>
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Calle Secundaria *</label>
                    <input required type="text" placeholder="Ej: Esq. Las Magnolias"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all"
                      value={formData.calleSecundaria}
                      onChange={e => setFormData({ ...formData, calleSecundaria: e.target.value })} />
                  </div>

                  {showCuentaCatastral && (
                    <div className="col-span-2 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuenta Catastral *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input required type="text" placeholder="Ingresa la cuenta catastral"
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all"
                          value={formData.cuentaCatastral}
                          onChange={e => setFormData({ ...formData, cuentaCatastral: e.target.value })} />
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 space-y-6 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Información de Leasing</h3>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pack de Leasing *</label>
                        <select required value={formData.packLeasing} onChange={e => setFormData({ ...formData, packLeasing: e.target.value })}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all appearance-none font-medium">
                          <option value="">Seleccione Pack...</option>
                          {options.packLeasing.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo *</label>
                        <select required disabled={!formData.packLeasing} value={formData.modelo} onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all appearance-none font-medium disabled:opacity-50">
                          <option value="">{options.modelos.length === 0 ? "Primero elija un pack" : "Seleccione Modelo..."}</option>
                          {options.modelos.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color *</label>
                        <select required disabled={!formData.modelo} value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all appearance-none font-medium disabled:opacity-50">
                          <option value="">{options.colores.length === 0 ? "Primero elija modelo" : "Seleccione Color..."}</option>
                          {options.colores.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Operador de Línea *</label>
                        <select required value={formData.operador} onChange={e => setFormData({ ...formData, operador: e.target.value })}
                          className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none focus:ring-4 focus:ring-zinc-500/10 focus:border-zinc-700 transition-all appearance-none font-medium">
                          <option value="">Seleccione Operador...</option>
                          {options.operador.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-6 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Información de Pago</h3>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pago *</label>
                        <select required className={selectClass}
                          value={formData.formaPago}
                          onChange={e => setFormData({ ...formData, formaPago: e.target.value })}>
                          <option value="">{optionsLoading ? "Cargando..." : "Seleccione..."}</option>
                          {options.formaPago.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 space-y-6 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Información de Venta</h3>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Agente de Venta *</label>
                        <select required className={selectClass}
                          value={formData.agenteId}
                          onChange={e => setFormData({ ...formData, agenteId: e.target.value })}>
                          <option value="">{optionsLoading ? "Cargando..." : "Seleccione Agente..."}</option>
                          {options.agentes.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2 md:col-span-1 space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sucursal *</label>
                        <select required className={selectClass}
                          value={formData.sucursal}
                          onChange={e => setFormData({ ...formData, sucursal: e.target.value })}>
                          <option value="">{optionsLoading ? "Cargando..." : "Seleccione Sucursal..."}</option>
                          {options.sucursal.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Documentos */}
                  <div className="col-span-2 space-y-4 pt-4 flex flex-col items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                      Comprobante de Ingresos * (Máximo 6 archivos)
                    </label>
                    <div
                      className={`relative w-full max-w-md border-2 border-dashed ${files.ingresos.length > 0 ? 'border-zinc-400 bg-zinc-50/30' : 'border-slate-200 bg-slate-50'} rounded-2xl p-6 text-center transition-all cursor-pointer hover:bg-slate-50/80`}>
                      <div className={`mb-2 p-2 rounded-full inline-block ${files.ingresos.length > 0 ? 'bg-zinc-800 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>
                        {files.ingresos.length > 0 ? <CheckCircle className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                      </div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {files.ingresos.length > 0 ? `Añadir más archivos (${files.ingresos.length}/6)` : 'Subir Comprobantes (PDF o Imagen)'}
                      </p>
                      <input
                        required={files.ingresos.length === 0}
                        multiple
                        type="file"
                        accept="image/*,application/pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange} />
                    </div>
                    {files.ingresos.length > 0 && (
                      <div className="w-full max-w-md space-y-2 mt-2">
                        {files.ingresos.map((fileObj, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-semibold shadow-sm">
                            <span className="truncate max-w-[80%]">{fileObj.name}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFiles(prev => ({
                                  ...prev,
                                  ingresos: prev.ingresos.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-red-500 hover:text-red-700 font-black text-sm p-1 ml-2 transition-colors cursor-pointer"
                              title="Eliminar archivo">
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                {status.msg && (
                  <div className={`p-4 rounded-2xl text-sm font-bold text-center ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {status.msg}
                  </div>
                )}

                <button type="submit" disabled={loading || optionsLoading}
                  className="w-full bg-zinc-800 hover:bg-zinc-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                  {loading ? "Procesando solicitud y verificación..." : optionsLoading ? "Cargando opciones..." : "Enviar Solicitud y Verificar"}
                </button>
              </form>
            </>
          )}

          <div className="px-10 py-6 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Odoo 18 XML-RPC API
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
              <Building className="w-5 h-5 text-zinc-700" />
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="p-12 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
        Portal de Leasing Institucional — Powered by Richford Paraguay S.A
      </footer>
    </div>
  );
}
