/* ============================================================
   site.js
   Esta es la parte "pública" de tu sitio en AutoPag. No tiene botones
   de editar ni nada de eso: solo lee lo que hay guardado y lo
   dibuja. La navegación usa el # de la URL (ej: index.html#/contacto)
   para no necesitar un servidor que maneje rutas.
   ============================================================ */

function rutaActual() {
  const hash = window.location.hash || "";
  const partes = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return {
    proyectoSlug: partes[0] || null,
    paginaSlug: partes[1] || null,
  };
}

function aplicarConfigVisual(config) {
  document.documentElement.style.setProperty("--plano", config.colorPrincipal || "#1c3a54");
  document.documentElement.style.setProperty("--acento", config.colorAcento || "#e8631c");
  document.documentElement.style.setProperty("--papel", config.colorFondo || "#f6f3ec");
  document.documentElement.style.setProperty("--tinta", config.colorTexto || "#1e2226");
  document.documentElement.style.setProperty("--fuente-display", `${config.fuenteCabecera || "Space Grotesk"}, "Segoe UI", sans-serif`);
  document.documentElement.style.setProperty("--fuente-cuerpo", `${config.fuenteCuerpo || "Inter"}, "Segoe UI", sans-serif`);
  const ancho = Number(config.anchoContenido || 780);
  document.documentElement.style.setProperty("--ancho-pagina", `${Number.isFinite(ancho) ? ancho : 780}px`);
  const temas = ["tema-clasico", "tema-portafolio", "tema-restaurante", "tema-empresa", "tema-producto", "tema-landing"];
  document.body.classList.remove(...temas);
  const tema = config.plantillaVisual && config.plantillaVisual !== "clasico" ? `tema-${config.plantillaVisual}` : "tema-clasico";
  document.body.classList.add(tema);
}

function aplicarSeo(config, pagina) {
  const titulo = (pagina && pagina.seoTitulo) || config.seoTitulo || config.nombreSitio || "Mi Sitio";
  const descripcion = (pagina && pagina.seoDescripcion) || config.seoDescripcion || config.sloganSitio || "";
  document.title = titulo;
  const setMeta = (nombre, contenido) => {
    if (!contenido) return;
    let el = document.querySelector(`meta[name="${nombre}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", nombre);
      document.head.appendChild(el);
    }
    el.setAttribute("content", contenido);
  };
  setMeta("description", descripcion);
  setMeta("keywords", config.seoPalabrasClave || "");
  if (config.seoImagen) {
    let og = document.querySelector('meta[property="og:image"]');
    if (!og) {
      og = document.createElement("meta");
      og.setAttribute("property", "og:image");
      document.head.appendChild(og);
    }
    og.setAttribute("content", config.seoImagen);
  }
}

function pintarEncabezado() {
  const nav = document.getElementById("nav-sitio");
  const ruta = rutaActual();
  const proyecto = ruta.proyectoSlug ? obtenerProyectoPorSlug(ruta.proyectoSlug) : null;
  const config = obtenerConfig(proyecto?.id);
  aplicarConfigVisual(config);
  aplicarSeo(config, null);
  document.getElementById("nombre-sitio").textContent = config.nombreSitio;
  document.getElementById("slogan-sitio").textContent = config.sloganSitio || "";
  document.title = config.nombreSitio;
  const activoInicio = ruta.proyectoSlug === null ? " activo" : "";

  if (!proyecto) {
    const items = [
      `<li><a class="${activoInicio.trim()}" href="index.html">Inicio</a></li>`,
      ...listarProyectosPublicos().map((proyectoItem) => `<li><a href="#/${escaparHtml(proyectoItem.slug)}">${escaparHtml(proyectoItem.titulo)}</a></li>`),
    ];
    nav.innerHTML = items.join("");
  } else {
    if (proyecto.estadoPublicacion === "borrador") {
      nav.innerHTML = `<li><a href="index.html">Inicio</a></li>`;
      return;
    }
    const paginas = listarPaginasPublicasDeProyecto(proyecto.id);
    const items = [`<li><a href="index.html">Inicio</a></li>`].concat(
      paginas.map((pagina) => {
        const activo = pagina.slug === ruta.paginaSlug || (!ruta.paginaSlug && pagina.slug === proyecto.paginas[0]?.slug) ? " activo" : "";
        return `<li><a class="${activo.trim()}" href="#/${escaparHtml(proyecto.slug)}/${escaparHtml(pagina.slug)}">${escaparHtml(pagina.titulo)}</a></li>`;
      })
    );
    nav.innerHTML = items.join("");
  }

  const pie = document.getElementById("pie-sitio");
  if (pie) {
    const enlace = sanitizarUrl(config.footerEnlace || "admin.html");
    pie.innerHTML = `${escaparHtml(config.footerTexto || "Editable desde")} <a href="${escaparHtml(enlace)}">${escaparHtml(enlace)}</a>`;
  }
}

function renderizarIndiceProyectos() {
  const proyectos = listarProyectosPublicos();
  const tarjetas = proyectos
    .map((proyecto) => {
      const primeraPagina = proyecto.paginas?.[0] || null;
      const descripcion = escaparHtml(
        (primeraPagina?.bloques?.[0]?.datos?.texto || primeraPagina?.bloques?.[0]?.datos?.titulo || "Proyecto sin contenido aún").slice(0, 110)
      );
      return `
        <article class="dashboard-tarjeta">
          <div class="dashboard-tarjeta__cabecera">
            <span class="dashboard-tarjeta__tipo">Proyecto</span>
            <span class="dashboard-tarjeta__slug">/${escaparHtml(proyecto.slug)}</span>
          </div>
          <h2>${escaparHtml(proyecto.titulo)}</h2>
          <p>${descripcion}</p>
          <div class="landing-tarjeta__acciones">
            <a class="dashboard-tarjeta__accion" href="#/${escaparHtml(proyecto.slug)}">Abrir proyecto</a>
          </div>
        </article>`;
    })
    .join("");

  return `
    <section class="dashboard-hero">
      <div>
        <p class="dashboard-badge">Proyectos</p>
        <h1>Elige un proyecto</h1>
        <p class="dashboard-descripcion">Selecciona un proyecto para ver su sitio público y navegar por sus páginas.</p>
      </div>
      <div class="dashboard-resumen">
        <div class="dashboard-resumen__item">
          <span>${proyectos.length}</span>
          <p>proyectos activos</p>
        </div>
      </div>
    </section>
    <section class="dashboard-grilla">
      ${tarjetas || `<div class="estado-vacio estado-vacio--ilustrado"><div class="estado-vacio__icono">📁</div><h2>No hay proyectos publicados</h2><p>Crea y publica tu primer proyecto desde <a href="admin.html">el panel de administración</a>.</p></div>`}
    </section>
  `;
}

function obtenerPaginaDeRuta(ruta) {
  if (!ruta.proyectoSlug) return null;
  const proyecto = obtenerProyectoPorSlug(ruta.proyectoSlug);
  if (!proyecto || proyecto.estadoPublicacion === "borrador") return null;
  if (!ruta.paginaSlug) {
    const config = obtenerConfig(proyecto.id);
    const slugInicio = config && config.paginaInicioSlug ? String(config.paginaInicioSlug).trim() : "";
    let inicio = null;
    const paginasPublicas = listarPaginasPublicasDeProyecto(proyecto.id);
    if (slugInicio) {
      inicio = paginasPublicas.find((p) => p.slug === slugInicio);
    }
    return inicio || paginasPublicas[0] || null;
  }
  const pagina = obtenerPaginaPorSlugEnProyecto(ruta.paginaSlug, proyecto.id);
  if (!pagina || pagina.estadoPublicacion === "borrador") return null;
  return pagina;
}

function pintarPaginaActual() {
  const ruta = rutaActual();
  const proyecto = ruta.proyectoSlug ? obtenerProyectoPorSlug(ruta.proyectoSlug) : null;
  const pagina = ruta.proyectoSlug ? obtenerPaginaDeRuta(ruta) : null;
  if (proyecto && pagina) {
    aplicarSeo(obtenerConfig(proyecto.id), pagina);
  }
  let contenido;
  if (ruta.proyectoSlug === null) {
    contenido = renderizarIndiceProyectos();
  } else if (proyecto && proyecto.estadoPublicacion === "borrador") {
    contenido = `<div class="estado-vacio estado-vacio--ilustrado"><div class="estado-vacio__icono">🔒</div><h2>Proyecto en borrador</h2><p>Este proyecto aún no está publicado. Publícalo desde el panel de administración.</p></div>`;
  } else {
    contenido = renderizarPagina(pagina);
  }
  document.getElementById("contenido-pagina").innerHTML = contenido;
  pintarEncabezado();
  if (typeof inicializarAnimaciones === "function") inicializarAnimaciones();
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
}

window.addEventListener("hashchange", pintarPaginaActual);
window.addEventListener("DOMContentLoaded", pintarPaginaActual);
