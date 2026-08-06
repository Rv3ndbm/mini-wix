/* ============================================================
   store.js
   Esta es la "base de datos" del sitio. En vez de usar un
   servidor, guardamos todo en localStorage del navegador como
   un solo objeto JSON. Cualquier página nueva o bloque nuevo
   que el usuario cree desde el panel de administración se
   guarda aquí, y el sitio público lee de aquí para dibujarse.
   ============================================================ */

const CLAVE_ALMACEN = "miniwix_datos_v1";

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
  };
}

function datosPorDefecto() {
  const idInicio = generarId();
  const idBienvenida = generarId();
  return {
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
    return JSON.parse(crudo);
  } catch (e) {
    console.error("El almacén estaba corrupto, se reinicia.", e);
    const iniciales = datosPorDefecto();
    guardarDatos(iniciales);
    return iniciales;
  }
}

function guardarDatos(datos) {
  localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(datos));
}

function exportarDatosComoJson() {
  return JSON.stringify(obtenerDatos(), null, 2);
}

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

  if (!datosImportados || typeof datosImportados !== "object" || !Array.isArray(datosImportados.paginas) || !datosImportados.config || typeof datosImportados.config !== "object") {
    throw new Error("El archivo no tiene el formato esperado.");
  }

  const datosNormalizados = {
    config: {
      ...datosPorDefecto().config,
      ...(datosImportados.config || {}),
    },
    paginas: (datosImportados.paginas || []).map((pagina) => ({
      ...pagina,
      id: pagina.id || generarId(),
      titulo: pagina.titulo || "Página",
      slug: generarSlug(pagina.slug || pagina.titulo || "pagina") || "pagina",
      bloques: Array.isArray(pagina.bloques)
        ? pagina.bloques.map((bloque) => ({
            ...bloque,
            id: bloque.id || generarId(),
            tipo: bloque.tipo || "parrafo",
            orden: typeof bloque.orden === "number" ? bloque.orden : 0,
            datos: bloque.datos || {},
          }))
        : [],
    })),
  };

  if (!datosNormalizados.paginas.length) {
    datosNormalizados.config.paginaInicioSlug = datosPorDefecto().config.paginaInicioSlug;
  } else if (!datosNormalizados.paginas.some((pagina) => pagina.slug === datosNormalizados.config.paginaInicioSlug)) {
    datosNormalizados.config.paginaInicioSlug = datosNormalizados.paginas[0].slug;
  }

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

function listarPaginas() {
  return obtenerDatos().paginas;
}

function obtenerPaginaPorSlug(slug) {
  return obtenerDatos().paginas.find((p) => p.slug === slug) || null;
}

function obtenerPaginaPorId(id) {
  return obtenerDatos().paginas.find((p) => p.id === id) || null;
}

function crearPagina(titulo) {
  const datos = obtenerDatos();
  let slugBase = generarSlug(titulo) || "pagina";
  let slug = slugBase;
  let contador = 2;
  while (datos.paginas.some((p) => p.slug === slug)) {
    slug = `${slugBase}-${contador}`;
    contador++;
  }
  const nueva = { id: generarId(), titulo, slug, bloques: [] };
  datos.paginas.push(nueva);
  guardarDatos(datos);
  return nueva;
}

function actualizarPagina(id, cambios) {
  const datos = obtenerDatos();
  const pagina = datos.paginas.find((p) => p.id === id);
  if (!pagina) return null;
  if (cambios.titulo !== undefined) pagina.titulo = cambios.titulo;
  if (cambios.slug !== undefined) pagina.slug = generarSlug(cambios.slug) || pagina.slug;
  guardarDatos(datos);
  return pagina;
}

function eliminarPagina(id) {
  const datos = obtenerDatos();
  datos.paginas = datos.paginas.filter((p) => p.id !== id);
  if (datos.paginas.length && !datos.paginas.some((p) => p.slug === datos.config.paginaInicioSlug)) {
    datos.config.paginaInicioSlug = datos.paginas[0].slug;
  }
  guardarDatos(datos);
}

/* ---------- Bloques (el contenido dentro de cada página) ---------- */

function agregarBloque(paginaId, tipo) {
  const datos = obtenerDatos();
  const pagina = datos.paginas.find((p) => p.id === paginaId);
  if (!pagina) return null;
  const orden = pagina.bloques.length;
  const bloque = { id: generarId(), tipo, orden, datos: datosVaciosParaTipo(tipo) };
  pagina.bloques.push(bloque);
  guardarDatos(datos);
  return bloque;
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
  const pagina = datos.paginas.find((p) => p.id === paginaId);
  if (!pagina) return null;
  const bloque = pagina.bloques.find((b) => b.id === bloqueId);
  if (!bloque) return null;
  bloque.datos = { ...bloque.datos, ...nuevosDatos };
  guardarDatos(datos);
  return bloque;
}

function eliminarBloque(paginaId, bloqueId) {
  const datos = obtenerDatos();
  const pagina = datos.paginas.find((p) => p.id === paginaId);
  if (!pagina) return;
  pagina.bloques = pagina.bloques.filter((b) => b.id !== bloqueId);
  pagina.bloques.forEach((b, i) => (b.orden = i));
  guardarDatos(datos);
}

function moverBloque(paginaId, bloqueId, direccion) {
  const datos = obtenerDatos();
  const pagina = datos.paginas.find((p) => p.id === paginaId);
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

/* ---------- Reinicio total (por si algo se rompe en clase) ---------- */

function reiniciarTodo() {
  localStorage.removeItem(CLAVE_ALMACEN);
  return obtenerDatos();
}
