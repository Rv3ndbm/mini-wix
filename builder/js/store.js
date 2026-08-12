/* ============================================================
   store.js
   Esta es la "base de datos" del sitio. En vez de usar un
   servidor, guardamos todo en localStorage del navegador como
   un solo objeto JSON. Cualquier página nueva o bloque nuevo
   que el usuario cree desde el panel de administración se
   guarda aquí, y el sitio público lee de aquí para dibujarse.
   ============================================================ */

const CLAVE_ALMACEN = "autopag_datos_v1";
const CLAVE_BACKUP_PREFIX = "autopag_backup_v1_";
const CLAVE_HISTORIAL = "autopag_historial_v1";
const CLAVE_BIBLIOTECA = "autopag_biblioteca_v1";
const MAX_BACKUPS = 2;
const MAX_HISTORIAL = 25;
const MAX_BIBLIOTECA = 30;
const MAX_BYTES_DATOS = 1_500_000;
const MAX_BYTES_IMAGEN = 700 * 1024;
const ESPACIADOS_BLOQUE = new Set(["compacto", "normal", "amplio"]);
const ALINEACIONES_BLOQUE = new Set(["izquierda", "centro", "derecha"]);
const BORDE_ANCHOS = new Set(["0", "1", "2", "3"]);
const BORDE_RADIOS = new Set(["0", "8", "16", "24"]);
let _omitirHistorial = false;

const ESQUEMAS_URL_PERMITIDOS = [
  "http://",
  "https://",
  "#",
  "/",
  "./",
  "../",
  "mailto:",
  "tel:",
];

function esUrlSegura(url) {
  if (url === null || url === undefined) return true;
  const str = String(url).trim();
  if (!str) return true;
  const lower = str.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:text/html")) {
    return false;
  }
  if (lower.startsWith("data:") && !/^data:image\/(png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(str)) {
    return false;
  }
  if (/^[a-z]+:/i.test(str)) {
    return ESQUEMAS_URL_PERMITIDOS.some((esquema) => lower.startsWith(esquema.toLowerCase()));
  }
  return true;
}

function sanitizarUrl(url) {
  if (!esUrlSegura(url)) return "#";
  return url;
}

function sanitizarColor(color) {
  const valor = String(color || "").trim();
  return /^#[0-9a-f]{6}$/i.test(valor) || /^#[0-9a-f]{3}$/i.test(valor) ? valor : "";
}

function sanitizarFuente(fuente, alternativa) {
  const valor = String(fuente || "").trim();
  return /^[a-z0-9 ,.'"-]{1,80}$/i.test(valor) ? valor : alternativa;
}

function limitarTexto(valor, maximo = 5000) {
  return typeof valor === "string" ? valor.slice(0, maximo) : valor;
}

function sanitizarEstiloBloque(d) {
  if (d.espaciado !== undefined && !ESPACIADOS_BLOQUE.has(d.espaciado)) delete d.espaciado;
  if (d.alineacion !== undefined && !ALINEACIONES_BLOQUE.has(d.alineacion)) delete d.alineacion;
  if (d.bordeAncho !== undefined && !BORDE_ANCHOS.has(String(d.bordeAncho))) delete d.bordeAncho;
  if (d.bordeRadio !== undefined && !BORDE_RADIOS.has(String(d.bordeRadio))) delete d.bordeRadio;
  if (d.numColumnas !== undefined) {
    const n = Number(d.numColumnas);
    d.numColumnas = String(Math.min(4, Math.max(2, Number.isFinite(n) ? n : 2)));
  }
}

function sanitizarBloqueRecursivo(bloque) {
  const b = { ...bloque };
  b.datos = b.datos ? { ...b.datos } : {};
  const d = b.datos;
  const camposUrl = ["url", "enlace", "botonEnlace", "imagen"];
  camposUrl.forEach((campo) => {
    if (typeof d[campo] === "string") d[campo] = sanitizarUrl(d[campo]);
  });
  ["colorTexto", "colorFondo", "colorBorde"].forEach((campo) => {
    if (d[campo] !== undefined) d[campo] = sanitizarColor(d[campo]);
  });
  sanitizarEstiloBloque(d);
  if (Array.isArray(d.items)) {
    d.items = d.items.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const copia = { ...item };
        camposUrl.forEach((campo) => {
          if (typeof copia[campo] === "string") copia[campo] = sanitizarUrl(copia[campo]);
        });
        return copia;
      }
      return item;
    });
  }
  return b;
}

/* Estructura por defecto la primera vez que alguien abre el
   sitio (todavía no ha creado nada). */
function configPorDefecto() {
  return {
    nombreSitio: "Mi Sitio",
    sloganSitio: "Construido con AutoPag",
    paginaInicioSlug: "inicio",
    colorPrincipal: "#1c3a54",
    colorAcento: "#e8631c",
    colorFondo: "#f6f3ec",
    colorTexto: "#1e2226",
    fuenteCabecera: "Space Grotesk",
    fuenteCuerpo: "Inter",
    anchoContenido: "780",
    footerTexto: "Editable desde",
    footerEnlace: "admin.html",
    plantillaVisual: "clasico",
    seoTitulo: "",
    seoDescripcion: "",
    seoImagen: "",
    seoPalabrasClave: "",
  };
}

const CONFIGS_PLANTILLA_VISUAL = {
  clasico: {},
  portafolio: {
    nombreSitio: "Estudio Creativo",
    sloganSitio: "Diseño, identidad y experiencias digitales",
    colorPrincipal: "#0f1419",
    colorAcento: "#d4a853",
    colorFondo: "#111820",
    colorTexto: "#eef2f6",
    fuenteCabecera: "Space Grotesk",
    fuenteCuerpo: "Inter",
    anchoContenido: "920",
    plantillaVisual: "portafolio",
  },
  restaurante: {
    nombreSitio: "La Mesa Dorada",
    sloganSitio: "Cocina de temporada · reservas online",
    colorPrincipal: "#4a1c28",
    colorAcento: "#c8922a",
    colorFondo: "#faf4eb",
    colorTexto: "#2a1810",
    fuenteCabecera: "Space Grotesk",
    fuenteCuerpo: "Inter",
    anchoContenido: "820",
    plantillaVisual: "restaurante",
  },
  empresa: {
    nombreSitio: "Nova Consulting",
    sloganSitio: "Estrategia, tecnología y crecimiento sostenible",
    colorPrincipal: "#1a3a5c",
    colorAcento: "#2b7de9",
    colorFondo: "#f4f7fb",
    colorTexto: "#1a2332",
    fuenteCabecera: "Space Grotesk",
    fuenteCuerpo: "Inter",
    anchoContenido: "860",
    plantillaVisual: "empresa",
  },
  producto: {
    nombreSitio: "FlowDesk",
    sloganSitio: "Automatiza tu trabajo en minutos, no en meses",
    colorPrincipal: "#2d1b69",
    colorAcento: "#7c3aed",
    colorFondo: "#f8f6ff",
    colorTexto: "#1e1633",
    fuenteCabecera: "Space Grotesk",
    fuenteCuerpo: "Inter",
    anchoContenido: "900",
    plantillaVisual: "producto",
  },
  landing: {
    nombreSitio: "Lanzamiento",
    sloganSitio: "Convierte visitas en clientes",
    colorPrincipal: "#1c3a54",
    colorAcento: "#e8631c",
    colorFondo: "#f6f3ec",
    colorTexto: "#1e2226",
    plantillaVisual: "landing",
  },
};

function normalizarConfig(config) {
  const base = configPorDefecto();
  const entrada = config && typeof config === "object" ? config : {};
  const ancho = Number(entrada.anchoContenido);
  return {
    nombreSitio: limitarTexto(entrada.nombreSitio || base.nombreSitio, 100),
    sloganSitio: limitarTexto(entrada.sloganSitio || base.sloganSitio, 180),
    paginaInicioSlug: generarSlug(entrada.paginaInicioSlug || base.paginaInicioSlug) || base.paginaInicioSlug,
    colorPrincipal: sanitizarColor(entrada.colorPrincipal) || base.colorPrincipal,
    colorAcento: sanitizarColor(entrada.colorAcento) || base.colorAcento,
    colorFondo: sanitizarColor(entrada.colorFondo) || base.colorFondo,
    colorTexto: sanitizarColor(entrada.colorTexto) || base.colorTexto,
    fuenteCabecera: sanitizarFuente(entrada.fuenteCabecera, base.fuenteCabecera),
    fuenteCuerpo: sanitizarFuente(entrada.fuenteCuerpo, base.fuenteCuerpo),
    anchoContenido: String(Number.isFinite(ancho) ? Math.min(1200, Math.max(500, ancho)) : Number(base.anchoContenido)),
    footerTexto: limitarTexto(entrada.footerTexto || base.footerTexto, 160),
    footerEnlace: sanitizarUrl(limitarTexto(entrada.footerEnlace || base.footerEnlace, 500)),
    plantillaVisual: ["clasico", "portafolio", "restaurante", "empresa", "producto", "landing"].includes(entrada.plantillaVisual)
      ? entrada.plantillaVisual
      : base.plantillaVisual,
    seoTitulo: limitarTexto(entrada.seoTitulo || base.seoTitulo, 120),
    seoDescripcion: limitarTexto(entrada.seoDescripcion || base.seoDescripcion, 320),
    seoImagen: sanitizarUrl(limitarTexto(entrada.seoImagen || base.seoImagen, 500)),
    seoPalabrasClave: limitarTexto(entrada.seoPalabrasClave || base.seoPalabrasClave, 200),
  };
}

function normalizarEstadoPublicacion(valor) {
  return valor === "borrador" ? "borrador" : "publicado";
}

function datosPorDefecto() {
  const idInicio = generarId();
  const idBienvenida = generarId();
  return {
    config: configPorDefecto(),
    proyectos: [
      {
        id: generarId(),
        titulo: "Proyecto inicial",
        slug: "proyecto-inicial",
        config: configPorDefecto(),
        paginas: [
          {
            id: idInicio,
            titulo: "Inicio",
            slug: "inicio",
            bloques: [
              {
                id: idBienvenida,
                tipo: "titulo",
                orden: 0,
                datos: { texto: "Bienvenido a tu sitio", nivel: "h1" },
              },
              {
                id: generarId(),
                tipo: "parrafo",
                orden: 1,
                datos: {
                  texto:
                    "Esta página se genera sola a partir de los bloques que armes en el panel de administración. Entra a admin.html para editar este contenido o crear páginas nuevas.",
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function normalizarProyecto(proyecto, configHereda) {
  const origen = proyecto && typeof proyecto === "object" ? proyecto : {};
  const paginas = Array.isArray(origen.paginas) ? origen.paginas : [];
  return {
    id: origen.id || generarId(),
    titulo: limitarTexto(origen.titulo || "Proyecto", 100),
    slug: generarSlug(origen.slug || origen.titulo || "proyecto") || "proyecto",
    estadoPublicacion: normalizarEstadoPublicacion(origen.estadoPublicacion),
    config: normalizarConfig({ ...(configHereda || {}), ...(origen.config || {}) }),
    paginas: paginas.map((pagina) => ({
      ...pagina,
      id: pagina.id || generarId(),
      titulo: limitarTexto(pagina.titulo || "Página", 100),
      slug: generarSlug(pagina.slug || pagina.titulo || "pagina") || "pagina",
      estadoPublicacion: normalizarEstadoPublicacion(pagina.estadoPublicacion),
      bloques: Array.isArray(pagina.bloques) ? pagina.bloques.map(sanitizarBloqueRecursivo) : [],
    })),
  };
}

function normalizarDatos(datos) {
  if (!datos || typeof datos !== "object") throw new Error("Los datos guardados no son válidos.");
  const configAnterior = normalizarConfig(datos.config);
  if (Array.isArray(datos.paginas) && !Array.isArray(datos.proyectos)) {
    return { version: 2, proyectos: [normalizarProyecto({ titulo: "Proyecto migrado", slug: "proyecto-migrado", paginas: datos.paginas }, configAnterior)] };
  }
  if (!Array.isArray(datos.proyectos)) throw new Error("Falta la lista de proyectos.");
  return { version: 2, proyectos: datos.proyectos.map((proyecto) => normalizarProyecto(proyecto, configAnterior)) };
}

function generarId() {
  return "id_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function generarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/* ---------- Lectura / escritura cruda ---------- */

function obtenerDatos() {
  const crudo = localStorage.getItem(CLAVE_ALMACEN);
  if (!crudo) {
    const iniciales = normalizarDatos(datosPorDefecto());
    guardarDatos(iniciales);
    return iniciales;
  }
  try {
    const datos = normalizarDatos(JSON.parse(crudo));
    if (crudo !== JSON.stringify(datos)) guardarDatos(datos);
    return datos;
  } catch (e) {
    console.error("El almacén estaba corrupto, se reinicia.", e);
    const iniciales = normalizarDatos(datosPorDefecto());
    guardarDatos(iniciales);
    return iniciales;
  }
}

function hacerBackup() {
  try {
    const actual = localStorage.getItem(CLAVE_ALMACEN);
    if (!actual) return true;
    if (actual.length > MAX_BYTES_DATOS) {
      throw new Error("Los datos son demasiado grandes para crear una copia local segura.");
    }
    const existentes = Object.keys(localStorage).filter((k) => k.startsWith(CLAVE_BACKUP_PREFIX)).sort();
    while (existentes.length >= MAX_BACKUPS) localStorage.removeItem(existentes.shift());
    const marca = new Date().toISOString().replace(/[:.]/g, "-");
    const clave = CLAVE_BACKUP_PREFIX + marca;
    localStorage.setItem(clave, actual);
    return true;
  } catch (e) {
    console.warn("No se pudo crear backup:", e);
    return false;
  }
}

function listarBackups() {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(CLAVE_BACKUP_PREFIX))
    .sort()
    .reverse()
    .map((clave) => {
      const marca = clave.slice(CLAVE_BACKUP_PREFIX.length).replace(/-/g, ":").replace(/^(\d{4}:\d{2}:\d{2}T)/, (m) => m.replace(/:/g, "-"));
      let tamano = 0;
      try {
        tamano = (localStorage.getItem(clave) || "").length;
      } catch {}
      return { clave, marca, tamano };
    });
}

function restaurarBackup(clave) {
  const datos = localStorage.getItem(clave);
  if (!datos) throw new Error("Backup no encontrado.");
  if (!hacerBackup()) throw new Error("No se pudo proteger el estado actual con un backup. Exporta tus datos antes de restaurar.");
  localStorage.setItem(CLAVE_ALMACEN, datos);
  return obtenerDatos();
}

function usoAlmacenamiento() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || "";
      total += (k.length + v.length) * 2;
    }
    const limiteEstimado = 5 * 1024 * 1024;
    return {
      bytes: total,
      kb: Math.round(total / 1024),
      mb: +(total / 1024 / 1024).toFixed(2),
      porcentaje: Math.min(100, Math.round((total / limiteEstimado) * 100)),
      limiteEstimadoMb: 5,
    };
  } catch (e) {
    return { bytes: 0, kb: 0, mb: 0, porcentaje: 0, limiteEstimadoMb: 5, error: true };
  }
}

function obtenerHistorial() {
  try {
    const crudo = localStorage.getItem(CLAVE_HISTORIAL);
    return crudo ? JSON.parse(crudo) : [];
  } catch {
    return [];
  }
}

function guardarHistorial(pila) {
  try {
    localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(pila.slice(0, MAX_HISTORIAL)));
  } catch (e) {
    console.warn("No se pudo guardar historial:", e);
  }
}

function registrarEnHistorial(etiqueta) {
  if (_omitirHistorial) return;
  try {
    const actual = localStorage.getItem(CLAVE_ALMACEN);
    if (!actual) return;
    const pila = obtenerHistorial();
    pila.unshift({ datos: actual, etiqueta: etiqueta || "Cambio", fecha: Date.now() });
    guardarHistorial(pila);
  } catch (e) {
    console.warn("No se pudo registrar historial:", e);
  }
}

function puedeDeshacer() {
  return obtenerHistorial().length > 0;
}

function deshacerUltimoCambio() {
  const pila = obtenerHistorial();
  if (!pila.length) throw new Error("No hay cambios para deshacer.");
  const [ultimo, ...resto] = pila;
  _omitirHistorial = true;
  try {
    localStorage.setItem(CLAVE_ALMACEN, ultimo.datos);
    guardarHistorial(resto);
  } finally {
    _omitirHistorial = false;
  }
  return { datos: obtenerDatos(), etiqueta: ultimo.etiqueta };
}

function listarEntradasHistorial() {
  return obtenerHistorial().map((item, i) => ({
    indice: i,
    etiqueta: item.etiqueta,
    fecha: item.fecha,
  }));
}

function guardarDatos(datos, opciones) {
  const opts = opciones || {};
  if (!opts.sinHistorial) registrarEnHistorial(opts.etiqueta);
  const normalizados = normalizarDatos(datos);
  const serializado = JSON.stringify(normalizados);
  if (serializado.length > MAX_BYTES_DATOS) {
    throw new Error("El sitio supera el límite local de 1.5 MB. Reduce o elimina imágenes y vuelve a intentar.");
  }
  try {
    localStorage.setItem(CLAVE_ALMACEN, serializado);
  } catch (e) {
    const nombre = (e && e.name) ? e.name : "Error";
    if (nombre === "QuotaExceededError" || nombre === "NS_ERROR_DOM_QUOTA_REACHED") {
      const uso = usoAlmacenamiento();
      console.error(`ALMACENAMIENTO LLENO (${uso.mb}MB / ${uso.limiteEstimadoMb}MB aprox.).`);
    }
    throw e;
  }
}

function exportarDatosComoJson() {
  return JSON.stringify(obtenerDatos(), null, 2);
}

function validarEsquemaDatos(obj) {
  const errores = [];
  if (!obj || typeof obj !== "object") {
    errores.push("Raíz no es un objeto.");
    return errores;
  }
  if (obj.config !== undefined && typeof obj.config !== "object") {
    errores.push("config debe ser un objeto.");
  } else if (obj.config) {
    const camposConfigString = ["nombreSitio", "sloganSitio", "paginaInicioSlug", "colorPrincipal", "colorAcento", "colorFondo", "colorTexto", "fuenteCabecera", "fuenteCuerpo", "anchoContenido", "footerTexto", "footerEnlace"];
    camposConfigString.forEach((c) => {
      if (obj.config[c] !== undefined && typeof obj.config[c] !== "string") {
        errores.push(`config.${c} debe ser string.`);
      }
    });
  }
  if (!Array.isArray(obj.proyectos)) {
    errores.push("Falta campo 'proyectos' como array.");
    return errores;
  }
  const TIPOS_BLOQUE_PERMITIDOS = new Set(Object.keys(ETIQUETAS_TIPO_BLOQUE_DEFAULT || ["titulo","parrafo","imagen","boton","separador","lista","video","galeria","contacto","cita","hero","cards","testimonios","faq","seccion","columnas"]));
  obj.proyectos.forEach((proy, pi) => {
    if (!proy || typeof proy !== "object") { errores.push(`proyectos[${pi}] no es objeto.`); return; }
    if (typeof proy.titulo !== "string" || !proy.titulo.trim()) errores.push(`proyectos[${pi}].titulo inválido.`);
    if (typeof proy.slug !== "string" || !proy.slug.trim()) errores.push(`proyectos[${pi}].slug inválido.`);
    if (proy.config !== undefined && typeof proy.config !== "object") errores.push(`proyectos[${pi}].config debe ser objeto.`);
    if (!Array.isArray(proy.paginas)) { errores.push(`proyectos[${pi}].paginas no es array.`); return; }
    proy.paginas.forEach((pag, pgi) => {
      if (!pag || typeof pag !== "object") { errores.push(`proyectos[${pi}].paginas[${pgi}] no es objeto.`); return; }
      if (typeof pag.titulo !== "string" || !pag.titulo.trim()) errores.push(`proyectos[${pi}].paginas[${pgi}].titulo inválido.`);
      if (typeof pag.slug !== "string" || !pag.slug.trim()) errores.push(`proyectos[${pi}].paginas[${pgi}].slug inválido.`);
      if (!Array.isArray(pag.bloques)) { errores.push(`proyectos[${pi}].paginas[${pgi}].bloques no es array.`); return; }
      pag.bloques.forEach((bl, bi) => {
        if (!bl || typeof bl !== "object") { errores.push(`bloque[${pi}][${pgi}][${bi}] no es objeto.`); return; }
        if (typeof bl.tipo !== "string" || !TIPOS_BLOQUE_PERMITIDOS.has(bl.tipo)) {
          errores.push(`bloque[${pi}][${pgi}][${bi}].tipo '${bl.tipo}' no permitido.`);
        }
        if (bl.orden !== undefined && typeof bl.orden !== "number") {
          errores.push(`bloque[${pi}][${pgi}][${bi}].orden no es number.`);
        }
        if (bl.datos !== undefined && typeof bl.datos !== "object") {
          errores.push(`bloque[${pi}][${pgi}][${bi}].datos no es objeto.`);
        }
      });
    });
  });
  return errores;
}

const ETIQUETAS_TIPO_BLOQUE_DEFAULT = {
  titulo: 1, parrafo: 1, imagen: 1, boton: 1, separador: 1, lista: 1, video: 1, galeria: 1, contacto: 1, cita: 1, hero: 1, cards: 1, testimonios: 1, faq: 1, seccion: 1, columnas: 1,
};

function importarDatosDesdeJson(texto) {
  if (typeof texto !== "string" || !texto.trim()) {
    throw new Error("El archivo está vacío.");
  }

  let datosImportados;
  try {
    datosImportados = JSON.parse(texto);
  } catch (error) {
    throw new Error("El archivo no es un JSON válido.");
  }

  const erroresEsquema = validarEsquemaDatos(datosImportados);
  if (erroresEsquema.length > 0) {
    const resumen = erroresEsquema.slice(0, 5).join("\n - ") + (erroresEsquema.length > 5 ? `\n ... y ${erroresEsquema.length - 5} errores más.` : "");
    throw new Error("El archivo no tiene el formato esperado:\n - " + resumen);
  }

  if (!datosImportados || typeof datosImportados !== "object") {
    throw new Error("El archivo no tiene el formato esperado.");
  }

  const proyectos = Array.isArray(datosImportados.proyectos)
    ? datosImportados.proyectos
    : Array.isArray(datosImportados.paginas)
    ? [
        {
          id: generarId(),
          titulo: "Proyecto importado",
          slug: "proyecto-importado",
          paginas: datosImportados.paginas,
        },
      ]
    : [];

  const datosNormalizados = normalizarDatos({ config: datosImportados.config, proyectos });

  if (!hacerBackup()) throw new Error("No se pudo crear un backup antes de importar. Exporta el sitio actual y libera espacio.");
  guardarDatos(datosNormalizados);
  return datosNormalizados;
}

/* ---------- Config del sitio ---------- */

function obtenerConfig(proyectoId) {
  const proyecto = proyectoId ? obtenerProyectoPorId(proyectoId) : null;
  return normalizarConfig(proyecto ? proyecto.config : configPorDefecto());
}

function guardarConfig(proyectoId, config) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((item) => item.id === proyectoId);
  if (!proyecto) throw new Error("Proyecto no encontrado.");
  proyecto.config = normalizarConfig({ ...proyecto.config, ...config });
  guardarDatos(datos);
}

/* ---------- Páginas ---------- */

function listarProyectos() {
  return obtenerDatos().proyectos;
}

function listarProyectosPublicos() {
  return listarProyectos().filter((p) => p.estadoPublicacion !== "borrador");
}

function listarPaginasPublicasDeProyecto(proyectoId) {
  const proyecto = obtenerProyectoPorId(proyectoId);
  if (!proyecto) return [];
  return (proyecto.paginas || []).filter((p) => p.estadoPublicacion !== "borrador");
}

function obtenerProyectoPorSlug(slug) {
  return obtenerDatos().proyectos.find((p) => p.slug === slug) || null;
}

function obtenerProyectoPorId(id) {
  return obtenerDatos().proyectos.find((p) => p.id === id) || null;
}

function crearProyecto(titulo, opciones) {
  const opts = opciones || {};
  const datos = obtenerDatos();
  let slugBase = generarSlug(opts.slug || titulo) || "proyecto";
  let slug = slugBase;
  let contador = 2;
  while (datos.proyectos.some((p) => p.slug === slug)) {
    slug = `${slugBase}-${contador}`;
    contador++;
  }
  const plantilla = opts.plantilla || "vacia";
  const configBase = normalizarConfig({
    ...configPorDefecto(),
    ...(CONFIGS_PLANTILLA_VISUAL[plantilla] || {}),
  });
  const nuevo = {
    id: generarId(),
    titulo,
    slug,
    estadoPublicacion: opts.estadoPublicacion === "borrador" ? "borrador" : "publicado",
    config: configBase,
    paginas: [],
  };
  datos.proyectos.push(nuevo);
  guardarDatos(datos, { etiqueta: "Crear proyecto" });

  if (plantilla !== "vacia") {
    poblarProyectoConPlantilla(nuevo.id, plantilla);
    return obtenerProyectoPorId(nuevo.id);
  }

  const pagina = crearPaginaEnProyecto(nuevo.id, "Inicio", { sinHistorial: true });
  if (pagina) {
    agregarBloque(pagina.id, "titulo");
    const bloques = obtenerPaginaPorId(pagina.id)?.bloques || [];
    if (bloques[0]) {
      actualizarBloque(pagina.id, bloques[0].id, {
        texto: "Bienvenido a tu nuevo proyecto",
        nivel: "h1",
      });
    }
    agregarBloque(pagina.id, "parrafo");
  }
  return obtenerProyectoPorId(nuevo.id);
}

function actualizarProyecto(id, cambios) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === id);
  if (!proyecto) return null;
  if (cambios.titulo !== undefined) proyecto.titulo = cambios.titulo;
  if (cambios.slug !== undefined) {
    const base = generarSlug(cambios.slug) || proyecto.slug;
    let slug = base;
    let contador = 2;
    while (datos.proyectos.some((item) => item.id !== id && item.slug === slug)) slug = `${base}-${contador++}`;
    proyecto.slug = slug;
  }
  guardarDatos(datos);
  return proyecto;
}

function eliminarProyecto(id) {
  const datos = obtenerDatos();
  datos.proyectos = datos.proyectos.filter((p) => p.id !== id);
  guardarDatos(datos);
}

function listarPaginas() {
  return obtenerDatos().proyectos.flatMap((proyecto) => proyecto.paginas || []);
}

function obtenerPaginaPorSlug(slug) {
  const datos = obtenerDatos();
  for (const proyecto of datos.proyectos) {
    const pagina = proyecto.paginas.find((p) => p.slug === slug);
    if (pagina) return pagina;
  }
  return null;
}

function obtenerPaginaPorId(id, datos = obtenerDatos()) {
  for (const proyecto of datos.proyectos) {
    const pagina = proyecto.paginas.find((p) => p.id === id);
    if (pagina) return pagina;
  }
  return null;
}

function buscarPaginaPorId(id, datos = obtenerDatos()) {
  for (const proyecto of datos.proyectos) {
    const pagina = proyecto.paginas.find((p) => p.id === id);
    if (pagina) return { proyecto, pagina };
  }
  return { proyecto: null, pagina: null };
}

function listarPaginasDeProyecto(proyectoId) {
  const proyecto = obtenerProyectoPorId(proyectoId);
  return proyecto ? proyecto.paginas : [];
}

function obtenerPaginaPorSlugEnProyecto(slug, proyectoId) {
  const proyecto = obtenerProyectoPorId(proyectoId);
  return proyecto ? proyecto.paginas.find((p) => p.slug === slug) || null : null;
}

function obtenerPaginaPorIdEnProyecto(id, proyectoId) {
  const proyecto = obtenerProyectoPorId(proyectoId);
  return proyecto ? proyecto.paginas.find((p) => p.id === id) || null : null;
}

function crearPaginaEnProyecto(proyectoId, titulo, opciones) {
  const opts = opciones || {};
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;
  let slugBase = generarSlug(opts.slug || titulo) || "pagina";
  let slug = slugBase;
  let contador = 2;
  while (proyecto.paginas.some((p) => p.slug === slug)) {
    slug = `${slugBase}-${contador}`;
    contador++;
  }
  const nueva = {
    id: generarId(),
    titulo,
    slug,
    estadoPublicacion: opts.estadoPublicacion === "borrador" ? "borrador" : "publicado",
    bloques: [],
  };
  proyecto.paginas.push(nueva);
  guardarDatos(datos, { etiqueta: "Crear página", sinHistorial: !!opts.sinHistorial });
  return nueva;
}

function actualizarPaginaEnProyecto(proyectoId, paginaId, cambios) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;
  const pagina = proyecto.paginas.find((p) => p.id === paginaId);
  if (!pagina) return null;
  if (cambios.titulo !== undefined) pagina.titulo = cambios.titulo;
  if (cambios.slug !== undefined) {
    const base = generarSlug(cambios.slug) || pagina.slug;
    let slug = base;
    let contador = 2;
    while (proyecto.paginas.some((item) => item.id !== paginaId && item.slug === slug)) slug = `${base}-${contador++}`;
    pagina.slug = slug;
  }
  guardarDatos(datos);
  return pagina;
}

function eliminarPaginaEnProyecto(proyectoId, paginaId) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return;
  proyecto.paginas = proyecto.paginas.filter((p) => p.id !== paginaId);
  guardarDatos(datos);
}

/* ---------- Bloques (el contenido dentro de cada página) ---------- */

function agregarBloque(paginaId, tipo) {
  const datos = obtenerDatos();
  const { pagina } = buscarPaginaPorId(paginaId, datos);
  if (!pagina) return null;
  const orden = pagina.bloques.length;
  const bloque = sanitizarBloqueRecursivo({ id: generarId(), tipo, orden, datos: datosVaciosParaTipo(tipo) });
  pagina.bloques.push(bloque);
  guardarDatos(datos);
  return bloque;
}

function bloquesPorPlantilla(plantilla) {
  const plantillaNormalizada = plantilla || "vacia";
  switch (plantillaNormalizada) {
    case "portafolio":
      return [
        { tipo: "hero", datos: { titulo: "Diseño con propósito", descripcion: "Ayudo a marcas ambiciosas a contar historias visuales memorables.", botonTexto: "Ver proyectos", botonEnlace: "#", alineacion: "izquierda", espaciado: "amplio" } },
        { tipo: "galeria", datos: { items: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800", "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800", "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800"], espaciado: "normal" } },
        { tipo: "cards", datos: { items: [{ titulo: "Branding", descripcion: "Identidad visual completa para startups.", enlace: "#" }, { titulo: "UI/UX", descripcion: "Interfaces claras orientadas a conversión.", enlace: "#" }, { titulo: "Motion", descripcion: "Animación y microinteracciones.", enlace: "#" }] } },
        { tipo: "testimonios", datos: { items: [{ texto: "Transformó nuestra presencia digital por completo.", autor: "Laura M. · Directora de marketing" }] } },
        { tipo: "contacto", datos: { titulo: "¿Tienes un proyecto?", descripcion: "Cuéntame tu idea y te respondo en 48 h.", boton: "Enviar mensaje" } },
      ];
    case "restaurante":
      return [
        { tipo: "hero", datos: { titulo: "Sabores de temporada", descripcion: "Producto local, fuego lento y una carta que cambia cada mes.", botonTexto: "Reservar mesa", botonEnlace: "#", colorFondo: "#faf4eb" } },
        { tipo: "cards", datos: { items: [{ titulo: "Entrantes", descripcion: "Burrata, tomate confitado y albahaca.", enlace: "#" }, { titulo: "Principales", descripcion: "Lubina a la brasa con verduras.", enlace: "#" }, { titulo: "Postres", descripcion: "Tarta de queso horneada.", enlace: "#" }], alineacion: "centro" } },
        { tipo: "columnas", datos: { columnas: ["Martes a jueves · 13:00–16:00 y 20:00–23:30", "Viernes y sábado · servicio continuo", "Domingo · brunch 11:00–15:00"], numColumnas: "3" } },
        { tipo: "faq", datos: { items: [{ pregunta: "¿Aceptáis reservas para grupos?", respuesta: "Sí, hasta 12 personas con menú degustación." }, { pregunta: "¿Opciones vegetarianas?", respuesta: "Siempre hay platos sin carne en carta." }] } },
        { tipo: "contacto", datos: { titulo: "Reserva o consulta", descripcion: "Indícanos fecha, hora y número de comensales.", boton: "Solicitar reserva" } },
      ];
    case "producto":
      return [
        { tipo: "hero", datos: { titulo: "Tu equipo, sincronizado", descripcion: "FlowDesk centraliza tareas, clientes y facturación en un solo panel intuitivo.", botonTexto: "Probar gratis", botonEnlace: "#", espaciado: "amplio" } },
        { tipo: "cards", datos: { items: [{ titulo: "Automatiza", descripcion: "Flujos repetitivos en un clic.", enlace: "#" }, { titulo: "Colabora", descripcion: "Comentarios y permisos granulares.", enlace: "#" }, { titulo: "Mide", descripcion: "Dashboards en tiempo real.", enlace: "#" }] } },
        { tipo: "lista", datos: { items: ["Plan gratuito para equipos pequeños", "Integraciones con Slack, Notion y Gmail", "Exportación CSV y API REST"] } },
        { tipo: "testimonios", datos: { items: [{ texto: "Reducimos el tiempo administrativo un 40%.", autor: "Carlos R. · COO" }] } },
        { tipo: "faq", datos: { items: [{ pregunta: "¿Hay prueba gratuita?", respuesta: "14 días sin tarjeta de crédito." }] } },
        { tipo: "contacto", datos: { titulo: "Solicita una demo", descripcion: "Te mostramos el producto en 20 minutos.", boton: "Agendar demo" } },
      ];
    case "landing":
      return [
        { tipo: "hero", datos: { titulo: "Lanza tu idea esta semana", descripcion: "Plantilla optimizada para captar leads y explicar tu propuesta en segundos.", botonTexto: "Empezar ahora", botonEnlace: "#", espaciado: "amplio" } },
        { tipo: "cards", datos: { items: [{ titulo: "Rápido", descripcion: "Publica sin escribir código.", enlace: "#" }, { titulo: "Flexible", descripcion: "Bloques listos para personalizar.", enlace: "#" }, { titulo: "Portable", descripcion: "Exporta tu sitio cuando quieras.", enlace: "#" }] } },
        { tipo: "testimonios", datos: { items: [{ texto: "Montamos la landing en una tarde.", autor: "Equipo fundador" }] } },
        { tipo: "contacto", datos: { titulo: "Únete a la lista", descripcion: "Déjanos tu email y te avisamos del lanzamiento.", boton: "Enviar" } },
      ];
    case "empresa":
      return [
        { tipo: "hero", datos: { titulo: "Consultoría que impulsa resultados", descripcion: "Acompañamos a empresas en transformación digital, procesos y cultura de producto.", botonTexto: "Conocer servicios", botonEnlace: "#" } },
        { tipo: "parrafo", datos: { texto: "Más de 10 años ayudando a equipos a escalar con claridad estratégica y ejecución ágil." } },
        { tipo: "cards", datos: { items: [{ titulo: "Estrategia", descripcion: "Roadmaps y OKRs alineados al negocio.", enlace: "#" }, { titulo: "Operaciones", descripcion: "Procesos medibles y equipos autónomos.", enlace: "#" }, { titulo: "Tecnología", descripcion: "Arquitectura y selección de herramientas.", enlace: "#" }] } },
        { tipo: "cita", datos: { texto: "La claridad es la ventaja competitiva del siglo XXI.", autor: "Nova Consulting" } },
        { tipo: "faq", datos: { items: [{ pregunta: "¿Trabajáis con pymes?", respuesta: "Sí, desde 5 hasta 500 empleados." }, { pregunta: "¿Modalidad remota?", respuesta: "100% remoto con sesiones presenciales opcionales." }] } },
        { tipo: "contacto", datos: { titulo: "Hablemos de tu reto", descripcion: "Agenda una llamada de descubrimiento sin compromiso.", boton: "Contactar" } },
      ];
    case "contacto":
      return [
        { tipo: "hero", datos: { titulo: "Estamos aquí para ayudarte", descripcion: "Escríbenos y un miembro del equipo te responderá en menos de 24 horas.", botonTexto: "Ir al formulario", botonEnlace: "#" } },
        { tipo: "columnas", datos: { columnas: ["📍 Calle Ejemplo 12, Madrid", "📞 +34 600 000 000", "✉️ hola@ejemplo.com"], numColumnas: "3" } },
        { tipo: "contacto", datos: { titulo: "Formulario de contacto", descripcion: "Cuéntanos en qué podemos ayudarte.", boton: "Enviar mensaje" } },
      ];
    default:
      return [];
  }
}

function estructuraPaginasPorPlantilla(plantilla) {
  switch (plantilla) {
    case "portafolio":
      return [{ titulo: "Inicio", slug: "inicio" }, { titulo: "Proyectos", slug: "proyectos" }, { titulo: "Contacto", slug: "contacto" }];
    case "restaurante":
      return [{ titulo: "Inicio", slug: "inicio" }, { titulo: "Carta", slug: "carta" }, { titulo: "Reservas", slug: "reservas" }];
    case "empresa":
      return [{ titulo: "Inicio", slug: "inicio" }, { titulo: "Servicios", slug: "servicios" }, { titulo: "Contacto", slug: "contacto" }];
    case "producto":
      return [{ titulo: "Inicio", slug: "inicio" }, { titulo: "Precios", slug: "precios" }, { titulo: "Demo", slug: "demo" }];
    case "landing":
    case "contacto":
      return [{ titulo: "Inicio", slug: "inicio" }];
    default:
      return [{ titulo: "Inicio", slug: "inicio" }];
  }
}

function poblarProyectoConPlantilla(proyectoId, plantilla) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;
  const paginasDef = estructuraPaginasPorPlantilla(plantilla);
  proyecto.paginas = paginasDef.map((def, pi) => {
    const bloquesTpl = pi === 0 ? bloquesPorPlantilla(plantilla) : bloquesPorPlantilla(plantilla === "contacto" ? "contacto" : "vacia");
    const bloques = (pi === 0 ? bloquesTpl : pi === paginasDef.length - 1 && plantilla !== "landing" ? bloquesPorPlantilla("contacto") : []).map((bloque, index) => ({
      id: generarId(),
      tipo: bloque.tipo,
      orden: index,
      datos: sanitizarBloqueRecursivo({ datos: { ...datosVaciosParaTipo(bloque.tipo), ...bloque.datos } }).datos,
    }));
    return {
      id: generarId(),
      titulo: def.titulo,
      slug: def.slug,
      estadoPublicacion: "publicado",
      bloques,
    };
  });
  if (proyecto.paginas[0]) {
    proyecto.config = normalizarConfig({
      ...proyecto.config,
      ...(CONFIGS_PLANTILLA_VISUAL[plantilla] || {}),
      paginaInicioSlug: proyecto.paginas[0].slug,
      seoTitulo: proyecto.config.nombreSitio,
      seoDescripcion: proyecto.config.sloganSitio,
    });
  }
  guardarDatos(datos, { etiqueta: `Plantilla ${plantilla}` });
  return proyecto;
}

function datosVaciosParaTipo(tipo) {
  switch (tipo) {
    case "titulo":
      return { texto: "Nuevo título", nivel: "h2" };
    case "parrafo":
      return { texto: "Escribe aquí el contenido de este párrafo." };
    case "imagen":
      return { url: "", alt: "" };
    case "boton":
      return { texto: "Haz clic aquí", enlace: "#" };
    case "separador":
      return {};
    case "lista":
      return { items: ["Primer elemento", "Segundo elemento"] };
    case "video":
      return { titulo: "Video destacado", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", descripcion: "" };
    case "galeria":
      return { items: [] };
    case "contacto":
      return { titulo: "Contáctanos", descripcion: "Escríbenos y te responderemos pronto", email: "", boton: "Enviar" };
    case "cita":
      return { texto: "Un gran diseño comienza con una idea clara.", autor: "Equipo AutoPag" };
    case "hero":
      return { titulo: "Tu propuesta en una frase", descripcion: "Describe tu producto o servicio aquí", botonTexto: "Conocer más", botonEnlace: "#", imagen: "", alt: "" };
    case "cards":
      return { items: [{ titulo: "Servicio 1", descripcion: "Descripción breve", enlace: "#" }] };
    case "testimonios":
      return { items: [{ texto: "Excelente trabajo, muy recomendable.", autor: "Cliente satisfecho" }] };
    case "faq":
      return { items: [{ pregunta: "¿Cuál es tu tiempo de respuesta?", respuesta: "Respondemos en menos de 24 horas." }] };
    case "seccion":
      return { contenido: ["Texto de ejemplo para esta sección."] };
    case "columnas":
      return { columnas: ["Columna 1", "Columna 2"] };
    default:
      return {};
  }
}

function actualizarBloque(paginaId, bloqueId, nuevosDatos) {
  const datos = obtenerDatos();
  const { pagina } = buscarPaginaPorId(paginaId, datos);
  if (!pagina) return null;
  const bloque = pagina.bloques.find((b) => b.id === bloqueId);
  if (!bloque) return null;
  const fusionado = sanitizarBloqueRecursivo({ ...bloque, datos: { ...bloque.datos, ...nuevosDatos } });
  bloque.datos = fusionado.datos;
  guardarDatos(datos);
  return bloque;
}

function eliminarBloque(paginaId, bloqueId) {
  const datos = obtenerDatos();
  const { pagina } = buscarPaginaPorId(paginaId, datos);
  if (!pagina) return;
  pagina.bloques = pagina.bloques.filter((b) => b.id !== bloqueId);
  pagina.bloques.forEach((b, i) => (b.orden = i));
  guardarDatos(datos);
}

function aplicarPlantillaAPagina(paginaId, plantilla) {
  const datos = obtenerDatos();
  const { pagina } = buscarPaginaPorId(paginaId, datos);
  if (!pagina) return null;
  const bloquesPlantilla = bloquesPorPlantilla(plantilla);
  pagina.bloques = bloquesPlantilla.map((bloque, index) => ({
    id: generarId(),
    tipo: bloque.tipo,
    orden: index,
    datos: { ...datosVaciosParaTipo(bloque.tipo), ...bloque.datos },
  }));
  guardarDatos(datos);
  return pagina;
}

function moverBloque(paginaId, bloqueId, direccion) {
  const datos = obtenerDatos();
  const { pagina } = buscarPaginaPorId(paginaId, datos);
  if (!pagina) return;
  pagina.bloques.sort((a, b) => a.orden - b.orden);
  const indice = pagina.bloques.findIndex((b) => b.id === bloqueId);
  const nuevoIndice = direccion === "arriba" ? indice - 1 : indice + 1;
  if (nuevoIndice < 0 || nuevoIndice >= pagina.bloques.length) return;
  const temp = pagina.bloques[indice];
  pagina.bloques[indice] = pagina.bloques[nuevoIndice];
  pagina.bloques[nuevoIndice] = temp;
  pagina.bloques.forEach((b, i) => (b.orden = i));
  guardarDatos(datos);
}

function reordenarBloque(paginaId, bloqueId, bloqueReferenciaId) {
  const datos = obtenerDatos();
  const { pagina } = buscarPaginaPorId(paginaId, datos);
  if (!pagina) return null;

  pagina.bloques.sort((a, b) => a.orden - b.orden);
  const indiceOrigen = pagina.bloques.findIndex((b) => b.id === bloqueId);
  const indiceReferencia = pagina.bloques.findIndex((b) => b.id === bloqueReferenciaId);

  if (indiceOrigen < 0 || indiceReferencia < 0 || indiceOrigen === indiceReferencia) return null;

  const [bloqueMovido] = pagina.bloques.splice(indiceOrigen, 1);
  const indiceDestino = indiceReferencia > indiceOrigen ? indiceReferencia - 1 : indiceReferencia;
  pagina.bloques.splice(indiceDestino, 0, bloqueMovido);
  pagina.bloques.forEach((b, i) => (b.orden = i));
  guardarDatos(datos);
  return pagina.bloques;
}

function regenerarIdsEnPagina(pagina) {
  return {
    ...pagina,
    id: generarId(),
    bloques: (pagina.bloques || []).map((bloque) => ({
      ...bloque,
      id: generarId(),
      datos: bloque.datos ? { ...bloque.datos } : {},
    })),
  };
}

function slugUnicoProyecto(base, datos, excluirId) {
  let slug = base;
  let contador = 2;
  while (datos.proyectos.some((item) => item.id !== excluirId && item.slug === slug)) slug = `${base}-${contador++}`;
  return slug;
}

function slugUnicoPagina(base, paginas, excluirId) {
  let slug = base;
  let contador = 2;
  while (paginas.some((item) => item.id !== excluirId && item.slug === slug)) slug = `${base}-${contador++}`;
  return slug;
}

function duplicarProyecto(id) {
  const datos = obtenerDatos();
  const origen = datos.proyectos.find((p) => p.id === id);
  if (!origen) return null;
  const copia = JSON.parse(JSON.stringify(origen));
  copia.id = generarId();
  copia.titulo = `${origen.titulo} (copia)`;
  copia.slug = slugUnicoProyecto(generarSlug(`${origen.slug}-copia`) || "proyecto-copia", datos);
  copia.estadoPublicacion = "borrador";
  const paginasCopia = (copia.paginas || []).map((pagina) => {
    const nueva = regenerarIdsEnPagina(pagina);
    nueva.estadoPublicacion = "borrador";
    nueva.titulo = `${pagina.titulo} (copia)`;
    return nueva;
  });
  paginasCopia.forEach((pagina, i) => {
    const base = generarSlug(`${origen.paginas[i].slug}-copia`) || "pagina-copia";
    pagina.slug = slugUnicoPagina(base, paginasCopia, pagina.id);
  });
  copia.paginas = paginasCopia;
  datos.proyectos.push(copia);
  guardarDatos(datos, { etiqueta: "Duplicar proyecto" });
  return copia;
}

function duplicarPaginaEnProyecto(proyectoId, paginaId) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;
  const origen = proyecto.paginas.find((p) => p.id === paginaId);
  if (!origen) return null;
  const copia = regenerarIdsEnPagina(JSON.parse(JSON.stringify(origen)));
  copia.titulo = `${origen.titulo} (copia)`;
  copia.slug = slugUnicoPagina(generarSlug(`${origen.slug}-copia`) || "pagina-copia", proyecto.paginas);
  copia.estadoPublicacion = "borrador";
  proyecto.paginas.push(copia);
  guardarDatos(datos, { etiqueta: "Duplicar página" });
  return copia;
}

function duplicarBloque(paginaId, bloqueId) {
  const datos = obtenerDatos();
  const { pagina } = buscarPaginaPorId(paginaId, datos);
  if (!pagina) return null;
  const origen = pagina.bloques.find((b) => b.id === bloqueId);
  if (!origen) return null;
  const copia = sanitizarBloqueRecursivo({
    id: generarId(),
    tipo: origen.tipo,
    orden: pagina.bloques.length,
    datos: JSON.parse(JSON.stringify(origen.datos || {})),
  });
  pagina.bloques.push(copia);
  pagina.bloques.forEach((b, i) => (b.orden = i));
  guardarDatos(datos, { etiqueta: "Duplicar bloque" });
  return copia;
}

function cambiarEstadoProyecto(id, estado) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === id);
  if (!proyecto) return null;
  proyecto.estadoPublicacion = normalizarEstadoPublicacion(estado);
  guardarDatos(datos, { etiqueta: "Estado del proyecto" });
  return proyecto;
}

function cambiarEstadoPagina(proyectoId, paginaId, estado) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;
  const pagina = proyecto.paginas.find((p) => p.id === paginaId);
  if (!pagina) return null;
  pagina.estadoPublicacion = normalizarEstadoPublicacion(estado);
  guardarDatos(datos, { etiqueta: "Estado de la página" });
  return pagina;
}

function listarBibliotecaImagenes() {
  try {
    const crudo = localStorage.getItem(CLAVE_BIBLIOTECA);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function agregarImagenABiblioteca(nombre, url) {
  if (!url || !esUrlSegura(url)) throw new Error("URL de imagen no válida.");
  const imgs = listarBibliotecaImagenes();
  const entrada = { id: generarId(), nombre: limitarTexto(nombre || "Imagen", 80), url, fecha: Date.now() };
  imgs.unshift(entrada);
  localStorage.setItem(CLAVE_BIBLIOTECA, JSON.stringify(imgs.slice(0, MAX_BIBLIOTECA)));
  return entrada;
}

function eliminarImagenDeBiblioteca(id) {
  const imgs = listarBibliotecaImagenes().filter((img) => img.id !== id);
  localStorage.setItem(CLAVE_BIBLIOTECA, JSON.stringify(imgs));
}

/* ---------- Reinicio total (por si algo se rompe en clase) ---------- */

function reiniciarTodo() {
  if (!hacerBackup()) throw new Error("No se pudo crear un backup. Exporta tus datos y libera espacio antes de reiniciar.");
  localStorage.removeItem(CLAVE_ALMACEN);
  return obtenerDatos();
}

/* ---------- Autenticación básica ---------- */

const CLAVE_AUTH = "autopag_auth_v1";

function hashSimple(texto) {
  let hash = 0;
  const str = String(texto || "");
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return "h_" + Math.abs(hash).toString(36);
}

function estaProteccionActiva() {
  try {
    return !!localStorage.getItem(CLAVE_AUTH);
  } catch { return false; }
}

function establecerContrasena(nueva) {
  if (!nueva || String(nueva).length < 4) throw new Error("La contraseña debe tener al menos 4 caracteres.");
  const token = btoa(hashSimple(nueva) + "$" + Date.now().toString(36));
  localStorage.setItem(CLAVE_AUTH, token);
  sessionStorage.setItem(CLAVE_AUTH, "ok");
}

function verificarContrasena(intento) {
  const guardado = localStorage.getItem(CLAVE_AUTH);
  if (!guardado) return true;
  try {
    const decodificado = atob(guardado);
    const [hashGuardado] = decodificado.split("$");
    if (hashSimple(intento) === hashGuardado) {
      sessionStorage.setItem(CLAVE_AUTH, "ok");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function estaAutenticado() {
  try {
    return sessionStorage.getItem(CLAVE_AUTH) === "ok" || !estaProteccionActiva();
  } catch { return true; }
}

function cerrarSesion() {
  try { sessionStorage.removeItem(CLAVE_AUTH); } catch {}
}

function quitarProteccion(intento) {
  if (!verificarContrasena(intento)) throw new Error("Contraseña incorrecta.");
  localStorage.removeItem(CLAVE_AUTH);
  sessionStorage.setItem(CLAVE_AUTH, "ok");
}
