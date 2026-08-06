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
              ? pagina.bloques.map((bloque) => ({
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
  const bloque = { id: generarId(), tipo, orden, datos: datosVaciosParaTipo(tipo) };
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
  bloque.datos = { ...bloque.datos, ...nuevosDatos };
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
  localStorage.removeItem(CLAVE_ALMACEN);
  return obtenerDatos();
}
