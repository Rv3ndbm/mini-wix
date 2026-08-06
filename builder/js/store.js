/* ============================================================
   store.js
   Esta es la "base de datos" del sitio. En vez de usar un
   servidor, guardamos todo en localStorage del navegador como
   un solo objeto JSON. Cualquier página nueva o bloque nuevo
   que el usuario cree desde el panel de administración se
   guarda aquí, y el sitio público lee de aquí para dibujarse.
   ============================================================ */

const CLAVE_ALMACEN = "miniwix_datos_v1";
const CLAVE_BACKUP_PREFIX = "miniwix_backup_v1_";
const MAX_BACKUPS = 5;

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
  if (lower.startsWith("data:") && !lower.startsWith("data:image/")) {
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

function sanitizarBloqueRecursivo(bloque) {
  const b = { ...bloque };
  b.datos = b.datos ? { ...b.datos } : {};
  const d = b.datos;
  const camposUrl = ["url", "enlace", "botonEnlace", "imagen"];
  camposUrl.forEach((campo) => {
    if (typeof d[campo] === "string") d[campo] = sanitizarUrl(d[campo]);
  });
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
    sloganSitio: "Construido con el editor autogestionable",
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
  };
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
    const iniciales = datosPorDefecto();
    guardarDatos(iniciales);
    return iniciales;
  }
  try {
    const datos = JSON.parse(crudo);
    if (datos && !Array.isArray(datos.proyectos) && Array.isArray(datos.paginas)) {
      const proyectoMigrado = {
        id: generarId(),
        titulo: "Proyecto migrado",
        slug: "proyecto-migrado",
        paginas: datos.paginas,
      };
      const migrado = {
        config: { ...configPorDefecto(), ...(datos.config || {}) },
        proyectos: [proyectoMigrado],
      };
      guardarDatos(migrado);
      return migrado;
    }
    return datos;
  } catch (e) {
    console.error("El almacén estaba corrupto, se reinicia.", e);
    const iniciales = datosPorDefecto();
    guardarDatos(iniciales);
    return iniciales;
  }
}

function hacerBackup() {
  try {
    const actual = localStorage.getItem(CLAVE_ALMACEN);
    if (!actual) return;
    const marca = new Date().toISOString().replace(/[:.]/g, "-");
    const clave = CLAVE_BACKUP_PREFIX + marca;
    localStorage.setItem(clave, actual);
    const claves = Object.keys(localStorage)
      .filter((k) => k.startsWith(CLAVE_BACKUP_PREFIX))
      .sort();
    while (claves.length > MAX_BACKUPS) {
      const masVieja = claves.shift();
      localStorage.removeItem(masVieja);
    }
  } catch (e) {
    console.warn("No se pudo crear backup:", e);
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
  hacerBackup();
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

let ultimoAvisoCuota = 0;
function guardarDatos(datos) {
  if (datos && Array.isArray(datos.proyectos)) {
    datos.proyectos = datos.proyectos.map((proyecto) => ({
      ...proyecto,
      paginas: Array.isArray(proyecto.paginas)
        ? proyecto.paginas.map((pagina) => ({
            ...pagina,
            bloques: Array.isArray(pagina.bloques) ? pagina.bloques.map(sanitizarBloqueRecursivo) : [],
          }))
        : [],
    }));
  }
  hacerBackup();
  const serializado = JSON.stringify(datos);
  try {
    localStorage.setItem(CLAVE_ALMACEN, serializado);
  } catch (e) {
    const nombre = (e && e.name) ? e.name : "Error";
    if (nombre === "QuotaExceededError" || nombre === "NS_ERROR_DOM_QUOTA_REACHED" || serializado.length > 4_500_000) {
      const uso = usoAlmacenamiento();
      const ahora = Date.now();
      if (ahora - ultimoAvisoCuota > 5000) {
        ultimoAvisoCuota = ahora;
        const msg = `⚠️ ALMACENAMIENTO LLENO (${uso.mb}MB / ${uso.limiteEstimadoMb}MB aprox.).\n\nExporta tu sitio como JSON (Botón Exportar), elimina imágenes grandes o contacta al desarrollador para migrar a un servidor.`;
        if (typeof alert === "function") {
          try { alert(msg); } catch {}
        }
        console.error(msg);
      }
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
  if (!obj.config || typeof obj.config !== "object") {
    errores.push("Falta campo 'config' como objeto.");
  } else {
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

  if (!datosImportados || typeof datosImportados !== "object" || !datosImportados.config || typeof datosImportados.config !== "object") {
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

  const datosNormalizados = {
    config: {
      ...configPorDefecto(),
      ...(datosImportados.config || {}),
    },
    proyectos: proyectos.map((proyecto) => ({
      ...proyecto,
      id: proyecto.id || generarId(),
      titulo: proyecto.titulo || "Proyecto",
      slug: generarSlug(proyecto.slug || proyecto.titulo || "proyecto") || "proyecto",
      paginas: Array.isArray(proyecto.paginas)
        ? proyecto.paginas.map((pagina) => ({
            ...pagina,
            id: pagina.id || generarId(),
            titulo: pagina.titulo || "Página",
            slug: generarSlug(pagina.slug || pagina.titulo || "pagina") || "pagina",
            bloques: Array.isArray(pagina.bloques)
              ? pagina.bloques.map((bloque) => sanitizarBloqueRecursivo({
                  ...bloque,
                  id: bloque.id || generarId(),
                  tipo: bloque.tipo || "parrafo",
                  orden: typeof bloque.orden === "number" ? bloque.orden : 0,
                  datos: bloque.datos || {},
                }))
              : [],
          }))
        : [],
    })),
  };

  guardarDatos(datosNormalizados);
  return datosNormalizados;
}

/* ---------- Config del sitio ---------- */

function obtenerConfig() {
  const datos = obtenerDatos();
  return { ...configPorDefecto(), ...datos.config };
}

function guardarConfig(config) {
  const datos = obtenerDatos();
  datos.config = { ...configPorDefecto(), ...datos.config, ...config };
  guardarDatos(datos);
}

/* ---------- Páginas ---------- */

function listarProyectos() {
  return obtenerDatos().proyectos;
}

function obtenerProyectoPorSlug(slug) {
  return obtenerDatos().proyectos.find((p) => p.slug === slug) || null;
}

function obtenerProyectoPorId(id) {
  return obtenerDatos().proyectos.find((p) => p.id === id) || null;
}

function crearProyecto(titulo) {
  const datos = obtenerDatos();
  let slugBase = generarSlug(titulo) || "proyecto";
  let slug = slugBase;
  let contador = 2;
  while (datos.proyectos.some((p) => p.slug === slug)) {
    slug = `${slugBase}-${contador}`;
    contador++;
  }
  const nuevo = { id: generarId(), titulo, slug, paginas: [] };
  datos.proyectos.push(nuevo);
  guardarDatos(datos);
  return nuevo;
}

function actualizarProyecto(id, cambios) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === id);
  if (!proyecto) return null;
  if (cambios.titulo !== undefined) proyecto.titulo = cambios.titulo;
  if (cambios.slug !== undefined) proyecto.slug = generarSlug(cambios.slug) || proyecto.slug;
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

function crearPaginaEnProyecto(proyectoId, titulo) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;
  let slugBase = generarSlug(titulo) || "pagina";
  let slug = slugBase;
  let contador = 2;
  while (proyecto.paginas.some((p) => p.slug === slug)) {
    slug = `${slugBase}-${contador}`;
    contador++;
  }
  const nueva = { id: generarId(), titulo, slug, bloques: [] };
  proyecto.paginas.push(nueva);
  guardarDatos(datos);
  return nueva;
}

function actualizarPaginaEnProyecto(proyectoId, paginaId, cambios) {
  const datos = obtenerDatos();
  const proyecto = datos.proyectos.find((p) => p.id === proyectoId);
  if (!proyecto) return null;
  const pagina = proyecto.paginas.find((p) => p.id === paginaId);
  if (!pagina) return null;
  if (cambios.titulo !== undefined) pagina.titulo = cambios.titulo;
  if (cambios.slug !== undefined) pagina.slug = generarSlug(cambios.slug) || pagina.slug;
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
    case "landing":
      return [
        { tipo: "hero", datos: { titulo: "Tu propuesta en una frase", descripcion: "Describe tu producto o servicio aquí", botonTexto: "Conocer más", botonEnlace: "#" } },
        { tipo: "cards", datos: { items: [{ titulo: "Servicio 1", descripcion: "Descripción breve", enlace: "#" }, { titulo: "Servicio 2", descripcion: "Otra propuesta", enlace: "#" }] } },
        { tipo: "testimonios", datos: { items: [{ texto: "Excelente trabajo, muy recomendable.", autor: "Cliente satisfecho" }] } },
        { tipo: "contacto", datos: { titulo: "Contáctanos", descripcion: "Escríbenos y te responderemos pronto", boton: "Enviar" } },
      ];
    case "empresa":
      return [
        { tipo: "titulo", datos: { texto: "Sobre nosotros", nivel: "h2" } },
        { tipo: "parrafo", datos: { texto: "Somos un equipo que crea experiencias digitales claras, modernas y útiles." } },
        { tipo: "cards", datos: { items: [{ titulo: "Diseño", descripcion: "Interfaces limpias y funcionales.", enlace: "#" }, { titulo: "Desarrollo", descripcion: "Experiencias rápidas y fiables.", enlace: "#" }] } },
        { tipo: "faq", datos: { items: [{ pregunta: "¿Trabajáis con empresas?", respuesta: "Sí, también atendemos proyectos corporativos." }] } },
      ];
    case "contacto":
      return [
        { tipo: "hero", datos: { titulo: "Hablemos", descripcion: "Estamos listos para ayudarte con tu próximo proyecto.", botonTexto: "Enviar mensaje", botonEnlace: "#" } },
        { tipo: "contacto", datos: { titulo: "Formulario de contacto", descripcion: "Escríbenos y te responderemos lo antes posible.", boton: "Enviar" } },
      ];
    default:
      return [];
  }
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
      return { texto: "Un gran diseño comienza con una idea clara.", autor: "Equipo Mini Wix" };
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

/* ---------- Reinicio total (por si algo se rompe en clase) ---------- */

function reiniciarTodo() {
  hacerBackup();
  localStorage.removeItem(CLAVE_ALMACEN);
  return obtenerDatos();
}

/* ---------- Autenticación básica ---------- */

const CLAVE_AUTH = "miniwix_auth_v1";

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
