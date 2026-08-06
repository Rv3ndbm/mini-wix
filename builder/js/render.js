/* ============================================================
   render.js
   Este archivo NO sabe nada de localStorage ni de formularios.
   Su único trabajo es: recibir un bloque (un objeto de datos)
   y devolver el HTML que le corresponde. Tanto el sitio público
   (index.html) como la vista previa del admin usan esta misma
   función, así el usuario siempre ve exactamente lo mismo.
   ============================================================ */

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function obtenerUrlEmbebida(url) {
  if (!url) return "";
  const valor = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const parsed = new URL(valor);
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : valor;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : valor;
    }
    return valor;
  } catch {
    return valor;
  }
}

function renderizarBloqueVideo(d) {
  const url = d.url || "";
  if (!url) {
    return `<div class="bloque-video bloque-video--vacia">Sin video todavía</div>`;
  }
  const urlEmbebida = obtenerUrlEmbebida(url);
  const titulo = d.titulo ? `<p class="bloque-video__titulo">${escaparHtml(d.titulo)}</p>` : "";
  const descripcion = d.descripcion ? `<p class="bloque-video__descripcion">${escaparHtml(d.descripcion)}</p>` : "";
  return `<div class="bloque-video">
    <div class="bloque-video__marco">
      <iframe class="bloque-video__iframe" src="${escaparHtml(urlEmbebida)}" title="${escaparHtml(d.titulo || "Video embebido")}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
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
        return `<img class="bloque-galeria__item" src="${escaparHtml(item)}" alt="" />`;
      }
      return `<img class="bloque-galeria__item" src="${escaparHtml(item.url || "")}" alt="${escaparHtml(item.alt || "")}" />`;
    })
    .join("");
  return `<div class="bloque-galeria">${imagenes}</div>`;
}

function renderizarBloqueContacto(d) {
  const titulo = d.titulo || "Contacto";
  const descripcion = d.descripcion || "";
  const textoBoton = d.boton || "Enviar";
  return `<form class="bloque-formulario" action="#" method="post" onsubmit="return false;">
    <h3 class="bloque-formulario__titulo">${escaparHtml(titulo)}</h3>
    ${descripcion ? `<p class="bloque-formulario__texto">${escaparHtml(descripcion)}</p>` : ""}
    <label class="bloque-formulario__campo">
      <span>Nombre</span>
      <input type="text" name="nombre" placeholder="Tu nombre" />
    </label>
    <label class="bloque-formulario__campo">
      <span>Email</span>
      <input type="email" name="email" placeholder="tu@email.com" />
    </label>
    <label class="bloque-formulario__campo">
      <span>Mensaje</span>
      <textarea name="mensaje" rows="4" placeholder="Escribe tu mensaje"></textarea>
    </label>
    <button class="bloque-boton bloque-formulario__boton" type="submit">${escaparHtml(textoBoton)}</button>
  </form>`;
}

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

function obtenerEstilosBloque(datos) {
  const estilos = [];
  if (datos.colorTexto) estilos.push(`color:${datos.colorTexto}`);
  if (datos.colorFondo) estilos.push(`background-color:${datos.colorFondo}`);
  if (datos.colorBorde) estilos.push(`border-color:${datos.colorBorde}`);
  return estilos.join(";");
}

function envolverBloque(contenido, bloque) {
  const d = bloque.datos || {};
  const clases = ["bloque-wrapper", obtenerClaseTamano(d)].filter(Boolean);
  const estilos = obtenerEstilosBloque(d);
  return `<div class="${clases.join(" ")}"${estilos ? ` style="${estilos}"` : ""}>${contenido}</div>`;
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
      ${d.botonTexto ? `<a class="bloque-boton" href="${escaparHtml(d.botonEnlace || "#")}">${escaparHtml(d.botonTexto)}</a>` : ""}
    </div>
    ${d.imagen ? `<img class="bloque-hero__imagen" src="${escaparHtml(d.imagen)}" alt="${escaparHtml(d.alt || "")}" />` : ""}
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
      ${item.enlace ? `<a href="${escaparHtml(item.enlace)}">Ver más</a>` : ""}
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
  const cols = columnas.map((col) => `<div class="bloque-columnas__col">${escaparHtml(col || "")}</div>`).join("");
  return `<div class="bloque-columnas">${cols}</div>`;
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
        contenido = `<img class="bloque-imagen" src="${escaparHtml(d.url)}" alt="${escaparHtml(d.alt)}" />`;
      }
      break;
    case "boton":
      contenido = `<a class="bloque-boton" href="${escaparHtml(d.enlace || "#")}">${escaparHtml(d.texto)}</a>`;
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
    return `<div class="estado-vacio">
      <h2>Esta página no existe</h2>
      <p>Puede que el enlace esté mal escrito o que la página se haya borrado.</p>
    </div>`;
  }
  const bloques = [...pagina.bloques].sort((a, b) => a.orden - b.orden);
  if (bloques.length === 0) {
    return `<div class="estado-vacio">
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
