/* ============================================================
   admin.js
   Este es el "cerebro" del panel de autogestión. Todo lo que
   pasa aquí termina llamando a funciones de store.js (que
   guardan) y después vuelve a dibujar la pantalla con las
   funciones renderizar* de este mismo archivo.
   ============================================================ */

let idProyectoSeleccionado = null;
let idPaginaSeleccionada = null;
let bloqueArrastradoId = null;

function escaparAtributo(texto) {
  return escaparHtml(texto).replace(/"/g, "&quot;");
}

function obtenerProyectoSeleccionado() {
  return idProyectoSeleccionado ? obtenerProyectoPorId(idProyectoSeleccionado) : null;
}

function obtenerPaginaSeleccionada() {
  return idPaginaSeleccionada ? obtenerPaginaPorId(idPaginaSeleccionada) : null;
}

function solicitarTexto(mensaje, valorPorDefecto) {
  try {
    const texto = prompt(mensaje, valorPorDefecto);
    if (texto === null) return null;
    return texto.trim();
  } catch (error) {
    console.warn("prompt no disponible, usando valor por defecto:", error);
    return valorPorDefecto;
  }
}

function actualizarHash() {
  const proyecto = obtenerProyectoSeleccionado();
  const pagina = obtenerPaginaSeleccionada();
  if (!proyecto) {
    window.location.hash = "";
    return;
  }
  const fragmento = pagina ? `#/${encodeURIComponent(proyecto.slug)}/${encodeURIComponent(pagina.slug)}` : `#/${encodeURIComponent(proyecto.slug)}`;
  if (window.location.hash !== fragmento) {
    window.history.replaceState(null, "", fragmento);
  }
}

function iniciar() {
  const proyectos = listarProyectos();
  const hash = window.location.hash.replace(/^#\/?/, "");
  const partes = hash.split("/").filter(Boolean);
  const proyectoSlug = partes[0] || null;
  const paginaSlug = partes[1] || null;

  let proyecto = proyectoSlug ? obtenerProyectoPorSlug(proyectoSlug) : null;
  if (!proyecto && proyectos.length) {
    proyecto = proyectos[0];
  }

  if (proyecto) {
    idProyectoSeleccionado = proyecto.id;
    if (paginaSlug) {
      const pagina = obtenerPaginaPorSlugEnProyecto(paginaSlug, proyecto.id);
      if (pagina) {
        idPaginaSeleccionada = pagina.id;
      }
    }
    if (!idPaginaSeleccionada) {
      idPaginaSeleccionada = proyecto.paginas?.[0]?.id || null;
    }
  }

  renderizarBarraLateral();
  renderizarEditor();

  document.getElementById("btn-nuevo-proyecto").addEventListener("click", crearProyectoNuevo);
  document.getElementById("btn-nueva-pagina").addEventListener("click", crearPaginaNueva);
  document.getElementById("btn-reiniciar").addEventListener("click", () => {
    const seguro = confirm("Esto borra TODAS las páginas y bloques que hayas creado. ¿Continuar?");
    if (!seguro) return;
    reiniciarTodo();
    idProyectoSeleccionado = listarProyectos()[0]?.id || null;
    idPaginaSeleccionada = listarPaginasDeProyecto(idProyectoSeleccionado)[0]?.id || null;
    renderizarBarraLateral();
    renderizarEditor();
  });

  window.addEventListener("hashchange", () => {
    const hashActual = window.location.hash.replace(/^#\/?/, "");
    const partesActuales = hashActual.split("/").filter(Boolean);
    const proyectoSlugActual = partesActuales[0] || null;
    const paginaSlugActual = partesActuales[1] || null;
    const proyecto = proyectoSlugActual ? obtenerProyectoPorSlug(proyectoSlugActual) : null;
    if (proyecto) {
      idProyectoSeleccionado = proyecto.id;
      idPaginaSeleccionada = paginaSlugActual ? obtenerPaginaPorSlugEnProyecto(paginaSlugActual, proyecto.id)?.id : proyecto.paginas?.[0]?.id || null;
      renderizarBarraLateral();
      renderizarEditor();
    }
  });
}

/* ---------- Barra lateral: proyectos y páginas ---------- */

function renderizarBarraLateral() {
  const listaProyectos = document.getElementById("lista-proyectos");
  const listaPaginas = document.getElementById("lista-paginas");
  const proyectos = listarProyectos();
  const proyecto = obtenerProyectoSeleccionado();

  listaProyectos.innerHTML = proyectos
    .map((proyectoItem) => {
      const activo = proyectoItem.id === idProyectoSeleccionado ? " activo" : "";
      return `
        <li class="item-proyecto${activo}" data-id="${proyectoItem.id}">
          <span>${escaparHtml(proyectoItem.titulo)}<br /><span class="slug">/${escaparHtml(proyectoItem.slug)}</span></span>
        </li>`;
    })
    .join("");

  listaProyectos.querySelectorAll(".item-proyecto").forEach((el) => {
    el.addEventListener("click", () => {
      idProyectoSeleccionado = el.dataset.id;
      idPaginaSeleccionada = listarPaginasDeProyecto(idProyectoSeleccionado)[0]?.id || null;
      renderizarBarraLateral();
      renderizarEditor();
      actualizarHash();
    });
  });

  if (!proyecto) {
    listaPaginas.innerHTML = `<li class="aviso">Crea un proyecto para poder agregar páginas.</li>`;
    document.getElementById("btn-nueva-pagina").disabled = true;
    return;
  }

  document.getElementById("btn-nueva-pagina").disabled = false;

  listaPaginas.innerHTML = proyecto.paginas
    .map((pagina) => {
      const activo = pagina.id === idPaginaSeleccionada ? " activo" : "";
      return `
        <li class="item-pagina${activo}" data-id="${pagina.id}">
          <span>${escaparHtml(pagina.titulo)}<br /><span class="slug">/${escaparHtml(pagina.slug)}</span></span>
        </li>`;
    })
    .join("");

  if (!proyecto.paginas.length) {
    listaPaginas.innerHTML = `<li class="aviso">Este proyecto no tiene páginas aún. Crea una nueva página.</li>`;
  }

  listaPaginas.querySelectorAll(".item-pagina").forEach((el) => {
    el.addEventListener("click", () => {
      idPaginaSeleccionada = el.dataset.id;
      renderizarBarraLateral();
      renderizarEditor();
      actualizarHash();
    });
  });
}

function crearProyectoNuevo() {
  const titulo = solicitarTexto("Título del nuevo proyecto:", "Proyecto nuevo") || "Proyecto nuevo";
  const proyecto = crearProyecto(titulo);
  const pagina = crearPaginaEnProyecto(proyecto.id, "Inicio");
  idProyectoSeleccionado = proyecto.id;
  idPaginaSeleccionada = pagina.id;
  renderizarBarraLateral();
  renderizarEditor();
  actualizarHash();
}

function crearPaginaNueva() {
  const proyecto = obtenerProyectoSeleccionado();
  if (!proyecto) {
    alert("Selecciona un proyecto primero.");
    return;
  }
  const titulo = solicitarTexto("Título de la nueva página:", "Página nueva") || "Página nueva";
  const pagina = crearPaginaEnProyecto(proyecto.id, titulo);
  idPaginaSeleccionada = pagina.id;
  renderizarBarraLateral();
  renderizarEditor();
  actualizarHash();
}

/* ---------- Editor principal ---------- */

function actualizarVistaPrevia() {
  const iframe = document.getElementById("preview-frame");
  const proyecto = obtenerProyectoSeleccionado();
  const pagina = obtenerPaginaSeleccionada();
  if (!iframe || !proyecto || !pagina) return;
  iframe.src = `app.html#/${encodeURIComponent(proyecto.slug)}/${encodeURIComponent(pagina.slug)}`;
}

function renderizarEditor() {
  const contenedor = document.getElementById("contenido-admin");
  const proyecto = obtenerProyectoSeleccionado();
  const pagina = obtenerPaginaSeleccionada();

  if (!proyecto) {
    contenedor.innerHTML = `
      <div class="aviso">Aún no tienes ningún proyecto. Usa el botón "Nuevo proyecto" para crear uno.</div>`;
    return;
  }

  if (!pagina) {
    contenedor.innerHTML = `
      <div class="aviso">Selecciona o crea una página para el proyecto "${escaparHtml(proyecto.titulo)}".</div>`;
    return;
  }

  const bloquesOrdenados = [...pagina.bloques].sort((a, b) => a.orden - b.orden);
  const config = obtenerConfig();

  contenedor.innerHTML = `
    <div class="panel-configuracion">
      <div class="encabezado-editor">
        <div style="flex:1; min-width:260px;">
          <h2 style="margin:0 0 8px;">Proyecto: ${escaparHtml(proyecto.titulo)}</h2>
          <p class="etiqueta-tecnica" style="margin:0;">Edita la página seleccionada dentro del proyecto.</p>
        </div>
        <button class="boton-primario" id="btn-guardar-config">Guardar tema</button>
      </div>

      <div class="fila-campos">
        <div class="campo">
          <label for="campo-nombre-sitio">Nombre del sitio</label>
          <input id="campo-nombre-sitio" type="text" value="${escaparAtributo(config.nombreSitio)}" />
        </div>
        <div class="campo">
          <label for="campo-slogan-sitio">Slogan</label>
          <input id="campo-slogan-sitio" type="text" value="${escaparAtributo(config.sloganSitio)}" />
        </div>
      </div>

      <div class="fila-campos">
        <div class="campo">
          <label for="campo-pagina-inicio">Página de inicio</label>
          <input id="campo-pagina-inicio" type="text" value="${escaparAtributo(config.paginaInicioSlug)}" />
        </div>
      </div>

      <div class="fila-campos">
        <div class="campo">
          <label for="campo-color-principal">Color principal</label>
          <input id="campo-color-principal" type="color" value="${escaparAtributo(config.colorPrincipal || "#1c3a54")}" />
        </div>
        <div class="campo">
          <label for="campo-color-acento">Color de acento</label>
          <input id="campo-color-acento" type="color" value="${escaparAtributo(config.colorAcento || "#e8631c")}" />
        </div>
        <div class="campo">
          <label for="campo-color-fondo">Color de fondo</label>
          <input id="campo-color-fondo" type="color" value="${escaparAtributo(config.colorFondo || "#f6f3ec")}" />
        </div>
        <div class="campo">
          <label for="campo-color-texto">Color de texto</label>
          <input id="campo-color-texto" type="color" value="${escaparAtributo(config.colorTexto || "#1e2226")}" />
        </div>
      </div>

      <div class="fila-campos">
        <div class="campo">
          <label for="campo-fuente-cabecera">Fuente de cabecera</label>
          <input id="campo-fuente-cabecera" type="text" value="${escaparAtributo(config.fuenteCabecera || "Space Grotesk")}" />
        </div>
        <div class="campo">
          <label for="campo-fuente-cuerpo">Fuente de cuerpo</label>
          <input id="campo-fuente-cuerpo" type="text" value="${escaparAtributo(config.fuenteCuerpo || "Inter")}" />
        </div>
        <div class="campo">
          <label for="campo-ancho-contenido">Ancho del contenido (px)</label>
          <input id="campo-ancho-contenido" type="number" min="500" max="1200" value="${escaparAtributo(config.anchoContenido || "780")}" />
        </div>
      </div>
    </div>

    <div class="preview-panel">
      <div class="preview-panel__header">
        <strong>Vista previa</strong>
        <span>Tu sitio se actualiza al guardar</span>
      </div>
      <iframe id="preview-frame" src="app.html#/${escaparAtributo(proyecto.slug)}/${escaparAtributo(pagina.slug)}"></iframe>
    </div>

    <div class="encabezado-editor">
      <div style="flex:1; min-width:260px;">
        <div class="fila-campos">
          <div class="campo">
            <label for="campo-titulo">Título de la página</label>
            <input id="campo-titulo" type="text" value="${escaparAtributo(pagina.titulo)}" />
          </div>
          <div class="campo">
            <label for="campo-slug">Dirección (slug)</label>
            <input id="campo-slug" type="text" value="${escaparAtributo(pagina.slug)}" />
          </div>
        </div>
      </div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <a class="enlace-previa" target="_blank" href="app.html#/${escaparAtributo(proyecto.slug)}">Ver proyecto →</a>
        <a class="enlace-previa" target="_blank" href="app.html#/${escaparAtributo(proyecto.slug)}/${escaparAtributo(pagina.slug)}">Ver página →</a>
        <button class="boton-secundario" id="btn-exportar">⬇ Exportar JSON</button>
        <button class="boton-secundario" id="btn-importar">⬆ Importar JSON</button>
        <input id="input-importar" type="file" accept="application/json" hidden />
        <button class="boton-secundario" id="btn-guardar-pagina">Guardar cambios</button>
        <button class="boton-peligro" id="btn-eliminar-pagina">Eliminar página</button>
        <button class="boton-peligro" id="btn-eliminar-proyecto">Eliminar proyecto</button>
      </div>
    </div>

    <div class="fila-campos" style="margin-bottom:16px;">
      <div class="campo">
        <label for="select-plantilla">Aplicar plantilla</label>
        <select id="select-plantilla">
          <option value="vacia">Vacía</option>
          <option value="landing">Landing</option>
          <option value="empresa">Empresa</option>
          <option value="contacto">Contacto</option>
        </select>
      </div>
      <div class="campo" style="align-self:end; min-width: 180px;">
        <button class="boton-secundario" id="btn-aplicar-plantilla">Aplicar plantilla</button>
      </div>
    </div>

    <p class="etiqueta-tecnica">Agregar bloque</p>
    <div class="paleta-bloques">
      ${Object.entries(ETIQUETAS_TIPO_BLOQUE)
        .map(([tipo, etiqueta]) => `<button class="chip-bloque" data-tipo="${tipo}">+ ${etiqueta}</button>`)
        .join("")}
    </div>

    <div class="lista-bloques" id="lista-bloques">
      ${bloquesOrdenados.length
        ? bloquesOrdenados.map((b, i) => renderizarTarjetaBloque(b, i, bloquesOrdenados.length)).join("")
        : `<div class="aviso">Esta página no tiene bloques todavía. Usa los botones de arriba para agregar el primero.</div>`}
    </div>
  `;

  document.getElementById("btn-guardar-config").addEventListener("click", () => {
    guardarConfig({
      nombreSitio: document.getElementById("campo-nombre-sitio").value.trim() || config.nombreSitio,
      sloganSitio: document.getElementById("campo-slogan-sitio").value.trim() || config.sloganSitio,
      paginaInicioSlug: document.getElementById("campo-pagina-inicio").value.trim() || config.paginaInicioSlug,
      colorPrincipal: document.getElementById("campo-color-principal").value,
      colorAcento: document.getElementById("campo-color-acento").value,
      colorFondo: document.getElementById("campo-color-fondo").value,
      colorTexto: document.getElementById("campo-color-texto").value,
      fuenteCabecera: document.getElementById("campo-fuente-cabecera").value.trim() || config.fuenteCabecera,
      fuenteCuerpo: document.getElementById("campo-fuente-cuerpo").value.trim() || config.fuenteCuerpo,
      anchoContenido: document.getElementById("campo-ancho-contenido").value.trim() || config.anchoContenido,
      footerTexto: config.footerTexto,
      footerEnlace: config.footerEnlace,
    });
    renderizarEditor();
    alert("Configuración guardada correctamente.");
  });

  document.getElementById("btn-aplicar-plantilla").addEventListener("click", () => {
    const plantilla = document.getElementById("select-plantilla").value;
    aplicarPlantillaAPagina(pagina.id, plantilla);
    actualizarVistaPrevia();
    renderizarEditor();
  });

  document.getElementById("btn-guardar-pagina").addEventListener("click", () => {
    const nuevoTitulo = document.getElementById("campo-titulo").value.trim() || pagina.titulo;
    const nuevoSlug = document.getElementById("campo-slug").value.trim() || pagina.slug;
    actualizarPaginaEnProyecto(proyecto.id, pagina.id, { titulo: nuevoTitulo, slug: nuevoSlug });
    renderizarBarraLateral();
    renderizarEditor();
    actualizarHash();
  });

  document.getElementById("btn-eliminar-pagina").addEventListener("click", () => {
    const seguro = confirm(`¿Eliminar la página "${pagina.titulo}"? Esta acción no se puede deshacer.`);
    if (!seguro) return;
    eliminarPaginaEnProyecto(proyecto.id, pagina.id);
    idPaginaSeleccionada = listarPaginasDeProyecto(proyecto.id)[0]?.id || null;
    renderizarBarraLateral();
    renderizarEditor();
    actualizarHash();
  });

  document.getElementById("btn-eliminar-proyecto").addEventListener("click", () => {
    const seguro = confirm(`¿Eliminar el proyecto "${proyecto.titulo}" y todas sus páginas? Esta acción no se puede deshacer.`);
    if (!seguro) return;
    eliminarProyecto(proyecto.id);
    idProyectoSeleccionado = listarProyectos()[0]?.id || null;
    idPaginaSeleccionada = listarPaginasDeProyecto(idProyectoSeleccionado)[0]?.id || null;
    renderizarBarraLateral();
    renderizarEditor();
    actualizarHash();
  });

  document.getElementById("btn-exportar").addEventListener("click", () => {
    const blob = new Blob([exportarDatosComoJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `miniwix-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById("btn-importar").addEventListener("click", () => {
    document.getElementById("input-importar").click();
  });

  document.getElementById("input-importar").addEventListener("change", (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = () => {
      try {
        importarDatosDesdeJson(lector.result);
        idProyectoSeleccionado = listarProyectos()[0]?.id || null;
        idPaginaSeleccionada = listarPaginasDeProyecto(idProyectoSeleccionado)[0]?.id || null;
        renderizarBarraLateral();
        renderizarEditor();
        alert("Sitio importado correctamente.");
      } catch (error) {
        console.error("No se pudo importar el sitio", error);
        alert("No se pudo importar el archivo. Asegúrate de usar un JSON exportado desde este editor.");
      } finally {
        evento.target.value = "";
      }
    };
    lector.onerror = () => {
      alert("No se pudo leer el archivo seleccionado.");
    };
    lector.readAsText(archivo);
  });

  actualizarVistaPrevia();

  contenedor.querySelectorAll(".chip-bloque").forEach((chip) => {
    chip.addEventListener("click", () => {
      const paginaLocal = obtenerPaginaSeleccionada();
      if (!paginaLocal) {
        alert("Selecciona un proyecto y una página antes de agregar bloques.");
        return;
      }
      const resultado = agregarBloque(paginaLocal.id, chip.dataset.tipo);
      if (!resultado) {
        console.error("No se pudo agregar el bloque. Página no encontrada.");
        alert("Error al agregar bloque. Intenta recargar la página.");
        return;
      }
      renderizarEditor();
    });
  });

  enlazarEventosDeBloques(pagina.id);
}

/* ---------- Tarjetas de bloque (una por bloque) ---------- */

function renderizarTarjetaBloque(bloque, indice, total) {
  return `
    <div class="tarjeta-bloque" data-id="${bloque.id}">
      <div class="cabecera-bloque">
        <div class="cabecera-bloque__titulo">
          <span class="drag-handle" title="Arrastra para mover">⋮⋮</span>
          <span class="sello-tipo">${ETIQUETAS_TIPO_BLOQUE[bloque.tipo] || bloque.tipo}</span>
        </div>
        <div class="acciones-bloque">
          <button data-accion="subir" ${indice === 0 ? "disabled" : ""} title="Subir">↑</button>
          <button data-accion="bajar" ${indice === total - 1 ? "disabled" : ""} title="Bajar">↓</button>
          <button data-accion="eliminar" title="Eliminar">✕</button>
        </div>
      </div>
      ${camposEditablesDeBloque(bloque)}
    </div>
  `;
}

function camposComunesBloque(d) {
  return `
    <div class="fila-campos">
      <div class="campo" style="flex:1; min-width:180px;">
        <label>Tamaño</label>
        <select data-campo="tamano">
          <option value="normal" ${d.tamano === "normal" ? "selected" : ""}>Normal</option>
          <option value="ancho" ${d.tamano === "ancho" ? "selected" : ""}>Ancho</option>
          <option value="completo" ${d.tamano === "completo" ? "selected" : ""}>Completo</option>
        </select>
      </div>
      <div class="campo" style="flex:1; min-width:180px;">
        <label>Color de texto</label>
        <input type="color" data-campo="colorTexto" value="${escaparAtributo(d.colorTexto || "#1e2226")}" />
      </div>
      <div class="campo" style="flex:1; min-width:180px;">
        <label>Color de fondo</label>
        <input type="color" data-campo="colorFondo" value="${escaparAtributo(d.colorFondo || "#f6f3ec")}" />
      </div>
      <div class="campo" style="flex:1; min-width:180px;">
        <label>Color de borde</label>
        <input type="color" data-campo="colorBorde" value="${escaparAtributo(d.colorBorde || "#1c3a54")}" />
      </div>
    </div>`;
}

function camposEditablesDeBloque(bloque) {
  const d = bloque.datos || {};
  const estilos = camposComunesBloque(d);
  switch (bloque.tipo) {
    case "titulo":
      return `${estilos}
        <div class="fila-campos">
          <div class="campo" style="flex:3;">
            <label>Texto</label>
            <input type="text" data-campo="texto" value="${escaparAtributo(d.texto)}" />
          </div>
          <div class="campo" style="flex:1;">
            <label>Tamaño</label>
            <select data-campo="nivel">
              <option value="h1" ${d.nivel === "h1" ? "selected" : ""}>Grande</option>
              <option value="h2" ${d.nivel === "h2" ? "selected" : ""}>Mediano</option>
              <option value="h3" ${d.nivel === "h3" ? "selected" : ""}>Pequeño</option>
            </select>
          </div>
        </div>`;
    case "parrafo":
      return `${estilos}
        <div class="campo">
          <label>Texto</label>
          <textarea data-campo="texto">${escaparHtml(d.texto)}</textarea>
        </div>`;
    case "imagen":
      return `${estilos}
        <div class="fila-campos">
          <div class="campo" style="flex:2;">
            <label>URL de la imagen</label>
            <input type="text" data-campo="url" placeholder="https://..." value="${escaparAtributo(d.url)}" />
          </div>
          <div class="campo" style="flex:1;">
            <label>Texto alternativo</label>
            <input type="text" data-campo="alt" value="${escaparAtributo(d.alt)}" />
          </div>
        </div>
        <div class="campo">
          <label>Subir imagen local</label>
          <input type="file" accept="image/*" data-upload="imagen" />
        </div>`;
    case "boton":
      return `${estilos}
        <div class="fila-campos">
          <div class="campo">
            <label>Texto del botón</label>
            <input type="text" data-campo="texto" value="${escaparAtributo(d.texto)}" />
          </div>
          <div class="campo">
            <label>Enlace</label>
            <input type="text" data-campo="enlace" placeholder="#/otra-pagina o https://..." value="${escaparAtributo(d.enlace)}" />
          </div>
        </div>`;
    case "separador":
      return `${estilos}<p class="etiqueta-tecnica">— línea divisoria, no necesita datos —</p>`;
    case "lista":
      return `${estilos}
        <div class="lista-items-editor" data-lista-items>
          ${(d.items || [])
            .map(
              (item, i) => `
            <div class="fila-item">
              <input type="text" data-item-indice="${i}" value="${escaparAtributo(item)}" />
              <button data-accion-item="eliminar" data-item-indice="${i}" title="Quitar">✕</button>
            </div>`
            )
            .join("")}
          <button class="boton-secundario" data-accion-item="agregar" style="margin-top:6px;">+ Agregar elemento</button>
        </div>`;
    case "video":
      return `${estilos}
        <div class="fila-campos">
          <div class="campo" style="flex:2;">
            <label>Título del video</label>
            <input type="text" data-campo="titulo" value="${escaparAtributo(d.titulo)}" />
          </div>
          <div class="campo" style="flex:2;">
            <label>URL del video</label>
            <input type="text" data-campo="url" placeholder="https://..." value="${escaparAtributo(d.url)}" />
          </div>
        </div>
        <div class="campo">
          <label>Descripción</label>
          <textarea data-campo="descripcion">${escaparHtml(d.descripcion)}</textarea>
        </div>`;
    case "galeria":
      return `${estilos}
        <div class="campo">
          <label>URLs de imágenes (una por línea)</label>
          <textarea data-campo="items" placeholder="https://...&#10;https://...">${(Array.isArray(d.items) ? d.items : []).join("\n")}</textarea>
        </div>
        <div class="campo">
          <label>Subir imágenes locales</label>
          <input type="file" accept="image/*" multiple data-upload="galeria" />
        </div>`;
    case "contacto":
      return `${estilos}
        <div class="fila-campos">
          <div class="campo" style="flex:2;">
            <label>Título del formulario</label>
            <input type="text" data-campo="titulo" value="${escaparAtributo(d.titulo)}" />
          </div>
          <div class="campo" style="flex:1;">
            <label>Correo de destino</label>
            <input type="email" data-campo="email" value="${escaparAtributo(d.email)}" />
          </div>
        </div>
        <div class="fila-campos">
          <div class="campo" style="flex:2;">
            <label>Texto introductorio</label>
            <input type="text" data-campo="descripcion" value="${escaparAtributo(d.descripcion)}" />
          </div>
          <div class="campo" style="flex:1;">
            <label>Texto del botón</label>
            <input type="text" data-campo="boton" value="${escaparAtributo(d.boton)}" />
          </div>
        </div>`;
    case "cita":
      return `${estilos}
        <div class="campo">
          <label>Cita</label>
          <textarea data-campo="texto">${escaparHtml(d.texto)}</textarea>
        </div>
        <div class="campo">
          <label>Autor</label>
          <input type="text" data-campo="autor" value="${escaparAtributo(d.autor)}" />
        </div>`;
    case "hero":
      return `${estilos}
        <div class="fila-campos">
          <div class="campo" style="flex:2;">
            <label>Título</label>
            <input type="text" data-campo="titulo" value="${escaparAtributo(d.titulo)}" />
          </div>
          <div class="campo" style="flex:1;">
            <label>Imagen</label>
            <input type="text" data-campo="imagen" placeholder="https://..." value="${escaparAtributo(d.imagen)}" />
          </div>
        </div>
        <div class="campo">
          <label>Descripción</label>
          <textarea data-campo="descripcion">${escaparHtml(d.descripcion)}</textarea>
        </div>
        <div class="fila-campos">
          <div class="campo" style="flex:1;">
            <label>Texto del botón</label>
            <input type="text" data-campo="botonTexto" value="${escaparAtributo(d.botonTexto)}" />
          </div>
          <div class="campo" style="flex:1;">
            <label>Enlace del botón</label>
            <input type="text" data-campo="botonEnlace" value="${escaparAtributo(d.botonEnlace)}" />
          </div>
        </div>`;
    case "cards":
      return `${estilos}
        <div class="campo">
          <label>Cards (una por línea, formato: Título | Descripción | Enlace)</label>
          <textarea data-campo="items" placeholder="Servicio A | Descripción breve | #&#10;Servicio B | Otra descripción | #">${(Array.isArray(d.items) ? d.items : []).map((item) => typeof item === "string" ? item : `${item.titulo || ""} | ${item.descripcion || ""} | ${item.enlace || ""}`).join("\n")}</textarea>
        </div>`;
    case "testimonios":
      return `${estilos}
        <div class="campo">
          <label>Testimonios (una por línea, formato: Texto | Autor)</label>
          <textarea data-campo="items" placeholder="Excelente servicio | María&#10;Muy recomendable | Juan">${(Array.isArray(d.items) ? d.items : []).map((item) => typeof item === "string" ? item : `${item.texto || ""} | ${item.autor || ""}`).join("\n")}</textarea>
        </div>`;
    case "faq":
      return `${estilos}
        <div class="campo">
          <label>FAQ (una por línea, formato: Pregunta | Respuesta)</label>
          <textarea data-campo="items" placeholder="¿Quiénes sois? | Somos un equipo de desarrollo&#10;¿Atendéis a empresas? | Sí, también trabajamos con empresas">${(Array.isArray(d.items) ? d.items : []).map((item) => typeof item === "string" ? item : `${item.pregunta || ""} | ${item.respuesta || ""}`).join("\n")}</textarea>
        </div>`;
    case "seccion":
      return `${estilos}
        <div class="campo">
          <label>Contenido de la sección (uno por línea)</label>
          <textarea data-campo="contenido" placeholder="Texto de ejemplo&#10;Otro bloque en esta sección">${(Array.isArray(d.contenido) ? d.contenido : []).join("\n")}</textarea>
        </div>`;
    case "columnas":
      return `${estilos}
        <div class="campo">
          <label>Columnas (una por línea)</label>
          <textarea data-campo="columnas" placeholder="Columna 1&#10;Columna 2">${(Array.isArray(d.columnas) ? d.columnas : []).join("\n")}</textarea>
        </div>`;
    default:
      return "";
  }
}

/* ---------- Eventos dentro de cada tarjeta de bloque ---------- */

function enlazarEventosDeBloques(paginaId) {
  document.querySelectorAll(".tarjeta-bloque").forEach((tarjeta) => {
    const bloqueId = tarjeta.dataset.id;

    tarjeta.setAttribute("draggable", "true");

    tarjeta.addEventListener("dragstart", () => {
      bloqueArrastradoId = bloqueId;
      tarjeta.classList.add("tarjeta-bloque--arrastrando");
    });

    tarjeta.addEventListener("dragend", () => {
      bloqueArrastradoId = null;
      document.querySelectorAll(".tarjeta-bloque").forEach((item) => item.classList.remove("tarjeta-bloque--destino"));
      tarjeta.classList.remove("tarjeta-bloque--arrastrando");
    });

    tarjeta.addEventListener("dragover", (evento) => {
      evento.preventDefault();
      if (bloqueArrastradoId && bloqueArrastradoId !== bloqueId) {
        tarjeta.classList.add("tarjeta-bloque--destino");
      }
    });

    tarjeta.addEventListener("dragleave", () => {
      tarjeta.classList.remove("tarjeta-bloque--destino");
    });

    tarjeta.addEventListener("drop", (evento) => {
      evento.preventDefault();
      tarjeta.classList.remove("tarjeta-bloque--destino");
      if (bloqueArrastradoId && bloqueArrastradoId !== bloqueId) {
        reordenarBloque(paginaId, bloqueArrastradoId, bloqueId);
        renderizarEditor();
      }
      bloqueArrastradoId = null;
    });

    tarjeta.querySelectorAll("[data-accion]").forEach((boton) => {
      boton.addEventListener("click", () => {
        const accion = boton.dataset.accion;
        if (accion === "eliminar") {
          eliminarBloque(paginaId, bloqueId);
        } else if (accion === "subir") {
          moverBloque(paginaId, bloqueId, "arriba");
        } else if (accion === "bajar") {
          moverBloque(paginaId, bloqueId, "abajo");
        }
        renderizarEditor();
      });
    });

    tarjeta.querySelectorAll("[data-campo]").forEach((campo) => {
      campo.addEventListener("change", () => {
        let valor = campo.value;
        if (campo.dataset.campo === "contenido") {
          valor = campo.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        } else if (campo.dataset.campo === "columnas") {
          valor = campo.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        } else if (campo.dataset.campo === "items") {
          valor = campo.value
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((linea) => {
              const partes = linea.split("|").map((parte) => parte.trim());
              if (bloque.tipo === "cards") {
                if (partes.length === 1) return { titulo: partes[0] };
                return { titulo: partes[0] || "", descripcion: partes[1] || "", enlace: partes[2] || "" };
              }
              if (bloque.tipo === "testimonios") {
                return { texto: partes[0] || "", autor: partes[1] || "" };
              }
              if (bloque.tipo === "faq") {
                return { pregunta: partes[0] || "", respuesta: partes[1] || "" };
              }
              return { texto: linea };
            });
        }
        actualizarBloque(paginaId, bloqueId, { [campo.dataset.campo]: valor });
      });
    });

    tarjeta.querySelectorAll("input[data-upload]").forEach((input) => {
      input.addEventListener("change", () => {
        const archivos = Array.from(input.files || []);
        if (!archivos.length) return;

        const procesarArchivo = (archivo) => new Promise((resolver) => {
          const lector = new FileReader();
          lector.onload = () => resolver(lector.result);
          lector.readAsDataURL(archivo);
        });

        Promise.all(archivos.map(procesarArchivo)).then((resultados) => {
          const res = buscarPaginaPorId(paginaId);
          const paginaActual = res && res.pagina;
          if (!paginaActual) {
            console.error("Página no encontrada al procesar upload", paginaId);
            alert("No se encontró la página. Recarga el editor e intenta otra vez.");
            return;
          }
          const bloque = paginaActual.bloques.find((b) => b.id === bloqueId);
          if (!bloque) {
            console.error("Bloque no encontrado al procesar upload", bloqueId);
            alert("No se encontró el bloque. Recarga el editor e intenta otra vez.");
            return;
          }
          if (input.dataset.upload === "imagen") {
            actualizarBloque(paginaId, bloqueId, { url: resultados[0] });
          } else if (input.dataset.upload === "galeria") {
            const items = [...(Array.isArray(bloque.datos.items) ? bloque.datos.items : []), ...resultados];
            actualizarBloque(paginaId, bloqueId, { items });
          }
          renderizarEditor();
        });
      });
    });

    /* Campos especiales del bloque tipo "lista" */
    const contenedorLista = tarjeta.querySelector("[data-lista-items]");
    if (contenedorLista) {
      const res = buscarPaginaPorId(paginaId);
      const pagina = res && res.pagina;
      if (!pagina) return;
      const bloque = pagina.bloques.find((b) => b.id === bloqueId);
      if (!bloque) return;

      contenedorLista.querySelectorAll("input[data-item-indice]").forEach((input) => {
        input.addEventListener("change", () => {
          const items = [...bloque.datos.items];
          items[Number(input.dataset.itemIndice)] = input.value;
          actualizarBloque(paginaId, bloqueId, { items });
        });
      });

      contenedorLista.querySelectorAll('[data-accion-item="eliminar"]').forEach((boton) => {
        boton.addEventListener("click", () => {
          const items = bloque.datos.items.filter((_, i) => i !== Number(boton.dataset.itemIndice));
          actualizarBloque(paginaId, bloqueId, { items });
          renderizarEditor();
        });
      });

      const botonAgregarItem = contenedorLista.querySelector('[data-accion-item="agregar"]');
      if (botonAgregarItem) {
        botonAgregarItem.addEventListener("click", () => {
          const items = [...bloque.datos.items, "Nuevo elemento"];
          actualizarBloque(paginaId, bloqueId, { items });
          renderizarEditor();
        });
      }
    }
  });
}

window.addEventListener("DOMContentLoaded", iniciar);
