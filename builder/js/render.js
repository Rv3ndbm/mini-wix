/* ============================================================
   render.js
   Este archivo NO sabe nada de localStorage ni de formularios.
   Su único trabajo es: recibir un bloque (un objeto de datos)
   y devolver el HTML que le corresponde. Tanto el sitio público
   (index.html) como la vista previa del admin usan esta misma
   función, así el usuario siempre ve exactamente lo mismo.
   ============================================================ */

function _esUrlSeguraRender(url) {
  if (url === null || url === undefined) return true;
  const str = String(url).trim();
  if (!str) return true;
  const lower = str.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("vbscript:") || lower.startsWith("data:text/html")) {
    return false;
  }
  if (lower.startsWith("data:") && !lower.startsWith("data:image/")) return false;
  return true;
}

function _u(url) {
  return _esUrlSeguraRender(url) ? url : "#";
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function obtenerUrlEmbebida(url) {
  if (!url) return "";
  if (!_esUrlSeguraRender(url)) return "";
  const valor = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const parsed = new URL(valor);
    const host = parsed.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (host.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
    }
    if (/^https?:\/\//i.test(url)) return valor;
    return "";
  } catch {
    return "";
  }
}

function renderizarBloqueVideo(d) {
  const urlEmbebida = obtenerUrlEmbebida(d.url || "");
  if (!urlEmbebida) {
    return `<div class="bloque-video bloque-video--vacia">Sin video todavía</div>`;
  }
  const titulo = d.titulo ? `<p class="bloque-video__titulo">${escaparHtml(d.titulo)}</p>` : "";
  const descripcion = d.descripcion ? `<p class="bloque-video__descripcion">${escaparHtml(d.descripcion)}</p>` : "";
  return `<div class="bloque-video">
    <div class="bloque-video__marco">
      <iframe class="bloque-video__iframe" src="${escaparHtml(urlEmbebida)}" title="${escaparHtml(d.titulo || "Video embebido")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>
    </div>
    ${titulo}${descripcion}
  </div>`;
}

function renderizarBloqueGaleria(d) {
  const items = Array.isArray(d.items) ? d.items.filter(Boolean) : [];
  if (!items.length) {
    return `<div class="bloque-galeria bloque-galeria--vacia">Sin imágenes todavía</div>`;
  }
  const imagenes = items
    .map((item) => {
      if (typeof item === "string") {
        return `<img class="bloque-galeria__item" src="${escaparHtml(_u(item))}" alt="" loading="lazy" decoding="async" />`;
      }
      return `<img class="bloque-galeria__item" src="${escaparHtml(_u(item.url || ""))}" alt="${escaparHtml(item.alt || "")}" loading="lazy" decoding="async" />`;
    })
    .join("");
  return `<div class="bloque-galeria">${imagenes}</div>`;
}

function renderizarBloqueContacto(d) {
  const titulo = d.titulo || "Contacto";
  const descripcion = d.descripcion || "";
  const textoBoton = d.boton || "Enviar";
  const emailDestino = (typeof d.email === "string" && d.email.trim()) ? d.email.trim() : "";
  const endpoint = (typeof d.endpoint === "string" && d.endpoint.trim() && _esUrlSeguraRender(d.endpoint)) ? d.endpoint.trim() : "";
  const metodo = endpoint ? "POST" : "GET";
  const accion = endpoint ? endpoint : (emailDestino ? `mailto:${encodeURIComponent(emailDestino)}` : "#");
  const onsubmit = endpoint ? "" : (emailDestino ? `return __enviarContactoMailto(this, ${JSON.stringify(emailDestino)});` : `return __mostrarAvisoContacto(this);`);
  return `<form class="bloque-formulario" action="${escaparHtml(accion)}" method="${metodo}" ${endpoint ? 'target="_blank" rel="noopener"' : ""} onsubmit="${onsubmit}">
    <h3 class="bloque-formulario__titulo">${escaparHtml(titulo)}</h3>
    ${descripcion ? `<p class="bloque-formulario__texto">${escaparHtml(descripcion)}</p>` : ""}
    <label class="bloque-formulario__campo">
      <span>Nombre *</span>
      <input type="text" name="nombre" placeholder="Tu nombre" required minlength="2" maxlength="80" />
    </label>
    <label class="bloque-formulario__campo">
      <span>Email *</span>
      <input type="email" name="email" placeholder="tu@email.com" required maxlength="120" />
    </label>
    <label class="bloque-formulario__campo">
      <span>Asunto</span>
      <input type="text" name="asunto" placeholder="¿En qué podemos ayudarte?" maxlength="120" />
    </label>
    <label class="bloque-formulario__campo">
      <span>Mensaje *</span>
      <textarea name="mensaje" rows="4" placeholder="Escribe tu mensaje" required minlength="10" maxlength="2000"></textarea>
    </label>
    <button class="bloque-boton bloque-formulario__boton" type="submit">${escaparHtml(textoBoton)}</button>
    <p class="bloque-formulario__feedback" aria-live="polite" style="display:none; margin-top:10px; padding:8px 12px; border-radius:10px; font-family:var(--fuente-mono); font-size:12px;"></p>
  </form>`;
}

window.__enviarContactoMailto = function (form, emailDestino) {
  try {
    const fd = new FormData(form);
    const nombre = String(fd.get("nombre") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const asunto = String(fd.get("asunto") || "Contacto desde el sitio").trim();
    const mensaje = String(fd.get("mensaje") || "").trim();
    if (!nombre || !email || !mensaje) return false;
    const cuerpo = `Nombre: ${nombre}\nEmail: ${email}\n\n${mensaje}`;
    const href = `mailto:${encodeURIComponent(emailDestino)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    const feedback = form.querySelector(".bloque-formulario__feedback");
    window.location.href = href;
    if (feedback) {
      feedback.style.display = "block";
      feedback.style.background = "rgba(28,148,76,0.12)";
      feedback.style.color = "#1c944c";
      feedback.textContent = "✓ Abriendo tu cliente de correo para enviar el mensaje...";
    }
    setTimeout(() => {
      if (feedback && feedback.parentNode) feedback.style.display = "none";
    }, 6000);
  } catch (e) {
    console.error(e);
  }
  return false;
};

window.__mostrarAvisoContacto = function (form) {
  const feedback = form.querySelector(".bloque-formulario__feedback");
  if (feedback) {
    feedback.style.display = "block";
    feedback.style.background = "rgba(232,99,28,0.15)";
    feedback.style.color = "var(--acento-oscuro)";
    feedback.textContent = "⚠️ El administrador aún no ha configurado un email de destino. Por favor, contacta de otra manera.";
  }
  return false;
};

function obtenerClaseTamano(datos) {
  switch (datos.tamano) {
    case "ancho":
      return "bloque-wrapper--ancho";
    case "completo":
      return "bloque-wrapper--completo";
    default:
      return "";
  }
}

function obtenerClasesEstiloBloque(datos) {
  const clases = [];
  if (datos.espaciado && datos.espaciado !== "normal") clases.push(`bloque-wrapper--espaciado-${datos.espaciado}`);
  if (datos.alineacion && datos.alineacion !== "izquierda") clases.push(`bloque-wrapper--alinear-${datos.alineacion}`);
  if (datos.bordeAncho && datos.bordeAncho !== "0") clases.push(`bloque-wrapper--borde-${datos.bordeAncho}`);
  if (datos.bordeRadio && datos.bordeRadio !== "0") clases.push(`bloque-wrapper--radio-${datos.bordeRadio}`);
  return clases;
}

function obtenerEstilosBloque(datos) {
  const estilos = [];
  if (datos.colorTexto) estilos.push(`color:${datos.colorTexto}`);
  if (datos.colorFondo) estilos.push(`background-color:${datos.colorFondo}`);
  if (datos.colorBorde) estilos.push(`border-color:${datos.colorBorde}`);
  if (datos.bordeAncho && datos.bordeAncho !== "0") estilos.push(`border-width:${datos.bordeAncho}px`);
  if (datos.bordeRadio && datos.bordeRadio !== "0") estilos.push(`border-radius:${datos.bordeRadio}px`);
  return estilos.join(";");
}

function envolverBloque(contenido, bloque) {
  const d = bloque.datos || {};
  const clases = ["bloque-wrapper", obtenerClaseTamano(d), ...obtenerClasesEstiloBloque(d)].filter(Boolean);
  const estilos = obtenerEstilosBloque(d);
  const bordeStyle = d.bordeAncho && d.bordeAncho !== "0" ? " border-style:solid;" : "";
  return `<div class="${clases.join(" ")}"${estilos || bordeStyle ? ` style="${estilos}${bordeStyle}"` : ""}>${contenido}</div>`;
}

function renderizarBloqueCita(d) {
  return `<blockquote class="bloque-cita">
    <p>${escaparHtml(d.texto || "Cita")}</p>
    ${d.autor ? `<footer>${escaparHtml(d.autor)}</footer>` : ""}
  </blockquote>`;
}

function renderizarBloqueHero(d) {
  return `<section class="bloque-hero">
    <div class="bloque-hero__contenido">
      <h2>${escaparHtml(d.titulo || "Tu título aquí")}</h2>
      <p>${escaparHtml(d.descripcion || "Describe tu propuesta aquí")}</p>
      ${d.botonTexto ? `<a class="bloque-boton" href="${escaparHtml(_u(d.botonEnlace || "#"))}">${escaparHtml(d.botonTexto)}</a>` : ""}
    </div>
    ${d.imagen ? `<img class="bloque-hero__imagen" src="${escaparHtml(_u(d.imagen))}" alt="${escaparHtml(d.alt || "")}" loading="eager" decoding="async" />` : ""}
  </section>`;
}

function renderizarBloqueCards(d) {
  const items = Array.isArray(d.items) ? d.items : [];
  const cards = items.map((item) => {
    if (typeof item === "string") {
      return `<article class="bloque-card"><h3>${escaparHtml(item)}</h3></article>`;
    }
    return `<article class="bloque-card">
      ${item.titulo ? `<h3>${escaparHtml(item.titulo)}</h3>` : ""}
      ${item.descripcion ? `<p>${escaparHtml(item.descripcion)}</p>` : ""}
      ${item.enlace ? `<a href="${escaparHtml(_u(item.enlace))}">Ver más</a>` : ""}
    </article>`;
  }).join("");
  return `<div class="bloque-cards">${cards}</div>`;
}

function renderizarBloqueTestimonios(d) {
  const items = Array.isArray(d.items) ? d.items : [];
  const testimonios = items.map((item) => {
    if (typeof item === "string") {
      return `<article class="bloque-testimonio"><p>${escaparHtml(item)}</p></article>`;
    }
    return `<article class="bloque-testimonio">
      ${item.texto ? `<p>“${escaparHtml(item.texto)}”</p>` : ""}
      ${item.autor ? `<strong>${escaparHtml(item.autor)}</strong>` : ""}
    </article>`;
  }).join("");
  return `<div class="bloque-testimonios">${testimonios}</div>`;
}

function renderizarBloqueFaq(d) {
  const items = Array.isArray(d.items) ? d.items : [];
  const faqs = items.map((item) => {
    if (typeof item === "string") {
      return `<details class="bloque-faq-item"><summary>${escaparHtml(item)}</summary></details>`;
    }
    return `<details class="bloque-faq-item">
      <summary>${escaparHtml(item.pregunta || "Pregunta")}</summary>
      <p>${escaparHtml(item.respuesta || "Respuesta")}</p>
    </details>`;
  }).join("");
  return `<div class="bloque-faq">${faqs}</div>`;
}

function renderizarBloqueSeccion(d) {
  const contenido = Array.isArray(d.contenido) ? d.contenido : [];
  return `<section class="bloque-seccion">
    ${contenido.map((item) => `<div class="bloque-seccion__item">${escaparHtml(item)}</div>`).join("")}
  </section>`;
}

function renderizarBloqueColumnas(d) {
  const columnas = Array.isArray(d.columnas) ? d.columnas : [];
  const num = Math.min(4, Math.max(2, Number(d.numColumnas) || columnas.length || 2));
  const cols = columnas.map((col) => `<div class="bloque-columnas__col">${escaparHtml(col || "")}</div>`).join("");
  return `<div class="bloque-columnas bloque-columnas--${num}">${cols}</div>`;
}

function renderizarBloque(bloque) {
  const d = bloque.datos || {};
  let contenido;
  switch (bloque.tipo) {
    case "titulo": {
      const nivel = d.nivel && ["h1", "h2", "h3"].includes(d.nivel) ? d.nivel : "h2";
      contenido = `<${nivel} class="bloque-titulo">${escaparHtml(d.texto)}</${nivel}>`;
      break;
    }
    case "parrafo":
      contenido = `<p class="bloque-parrafo">${escaparHtml(d.texto)}</p>`;
      break;
    case "imagen":
      if (!d.url) {
        contenido = `<div class="bloque-imagen bloque-imagen--vacia">Sin imagen todavía</div>`;
      } else {
        contenido = `<img class="bloque-imagen" src="${escaparHtml(_u(d.url))}" alt="${escaparHtml(d.alt)}" loading="lazy" decoding="async" />`;
      }
      break;
    case "boton":
      contenido = `<a class="bloque-boton" href="${escaparHtml(_u(d.enlace || "#"))}">${escaparHtml(d.texto)}</a>`;
      break;
    case "separador":
      contenido = `<hr class="bloque-separador" />`;
      break;
    case "lista": {
      const items = Array.isArray(d.items) ? d.items : [];
      const li = items.map((item) => `<li>${escaparHtml(item)}</li>`).join("");
      contenido = `<ul class="bloque-lista">${li}</ul>`;
      break;
    }
    case "video":
      contenido = renderizarBloqueVideo(d);
      break;
    case "galeria":
      contenido = renderizarBloqueGaleria(d);
      break;
    case "contacto":
      contenido = renderizarBloqueContacto(d);
      break;
    case "cita":
      contenido = renderizarBloqueCita(d);
      break;
    case "hero":
      contenido = renderizarBloqueHero(d);
      break;
    case "cards":
      contenido = renderizarBloqueCards(d);
      break;
    case "testimonios":
      contenido = renderizarBloqueTestimonios(d);
      break;
    case "faq":
      contenido = renderizarBloqueFaq(d);
      break;
    case "seccion":
      contenido = renderizarBloqueSeccion(d);
      break;
    case "columnas":
      contenido = renderizarBloqueColumnas(d);
      break;
    default:
      contenido = `<div class="bloque-desconocido">Tipo de bloque no reconocido: ${escaparHtml(bloque.tipo)}</div>`;
  }
  return envolverBloque(contenido, bloque);
}

function renderizarPagina(pagina) {
  if (!pagina) {
    return `<div class="estado-vacio estado-vacio--ilustrado">
      <div class="estado-vacio__icono" aria-hidden="true">🔍</div>
      <h2>Esta página no existe</h2>
      <p>Puede que el enlace esté mal escrito, que la página esté en borrador o que se haya eliminado.</p>
    </div>`;
  }
  const bloques = [...pagina.bloques].sort((a, b) => a.orden - b.orden);
  if (bloques.length === 0) {
    return `<div class="estado-vacio estado-vacio--ilustrado">
      <div class="estado-vacio__icono" aria-hidden="true">📄</div>
      <h2>${escaparHtml(pagina.titulo)}</h2>
      <p>Todavía no hay contenido en esta página. Agrégalo desde el panel de administración.</p>
    </div>`;
  }
  return bloques.map(renderizarBloque).join("\n");
}

const ETIQUETAS_TIPO_BLOQUE = {
  titulo: "Título",
  parrafo: "Párrafo",
  imagen: "Imagen",
  boton: "Botón",
  separador: "Separador",
  lista: "Lista",
  video: "Video",
  galeria: "Galería",
  contacto: "Formulario",
  cita: "Cita",
  hero: "Hero",
  cards: "Cards",
  testimonios: "Testimonios",
  faq: "FAQ",
  seccion: "Sección",
  columnas: "Columnas",
};
