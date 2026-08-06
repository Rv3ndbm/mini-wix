/* ============================================================
   site.js
   Esta es la parte "pública" de tu mini Wix. No tiene botones
   de editar ni nada de eso: solo lee lo que hay guardado y lo
   dibuja. La navegación usa el # de la URL (ej: index.html#/contacto)
   para no necesitar un servidor que maneje rutas.
   ============================================================ */

function slugActual() {
  const hash = window.location.hash || "";
  return hash.replace(/^#\/?/, "") || null;
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
}

function pintarEncabezado() {
  const config = obtenerConfig();
  aplicarConfigVisual(config);
  document.getElementById("nombre-sitio").textContent = config.nombreSitio;
  document.getElementById("slogan-sitio").textContent = config.sloganSitio || "";
  document.title = config.nombreSitio;

  const nav = document.getElementById("nav-sitio");
  const paginas = listarPaginas();
  const slugVisible = slugActual() || config.paginaInicioSlug;
  const paginasOrdenadas = [...paginas].sort((a, b) => {
    if (a.slug === config.paginaInicioSlug) return -1;
    if (b.slug === config.paginaInicioSlug) return 1;
    return 0;
  });

  nav.innerHTML = paginasOrdenadas
    .map((p) => {
      const activo = p.slug === slugVisible ? " activo" : "";
      return `<li><a class="${activo.trim()}" href="#/${p.slug}">${escaparHtml(p.titulo)}</a></li>`;
    })
    .join("");

  const pie = document.getElementById("pie-sitio");
  if (pie) {
    pie.innerHTML = `${escaparHtml(config.footerTexto || "Editable desde")} <a href="${escaparHtml(config.footerEnlace || "admin.html")}">${escaparHtml(config.footerEnlace || "admin.html")}</a>`;
  }
}

function pintarPaginaActual() {
  const config = obtenerConfig();
  const slug = slugActual() || config.paginaInicioSlug;
  const pagina = obtenerPaginaPorSlug(slug);
  document.getElementById("contenido-pagina").innerHTML = renderizarPagina(pagina);
  pintarEncabezado(); // para refrescar el link "activo" del menú
}

window.addEventListener("hashchange", pintarPaginaActual);
window.addEventListener("DOMContentLoaded", pintarPaginaActual);
