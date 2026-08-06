/* ============================================================
   admin.js
   Este es el "cerebro" del panel de autogestión. Todo lo que
   pasa aquí termina llamando a funciones de store.js (que
   guardan) y después vuelve a dibujar la pantalla con las
   funciones renderizar* de este mismo archivo.
   ============================================================ */

let idPaginaSeleccionada = null;

function escaparAtributo(texto) {
  return escaparHtml(texto).replace(/"/g, "&quot;");
}

function iniciar() {
  const paginas = listarPaginas();
  if (paginas.length) idPaginaSeleccionada = paginas[0].id;
  renderizarBarraLateral();
  renderizarEditor();

  document.getElementById("btn-nueva-pagina").addEventListener("click", crearPaginaNueva);
  document.getElementById("btn-reiniciar").addEventListener("click", () => {
    const seguro = confirm("Esto borra TODAS las páginas y bloques que hayas creado. ¿Continuar?");
    if (!seguro) return;
    reiniciarTodo();
    idPaginaSeleccionada = listarPaginas()[0]?.id || null;
    renderizarBarraLateral();
    renderizarEditor();
  });
}

/* ---------- Barra lateral: lista de páginas ---------- */

function renderizarBarraLateral() {
  const lista = document.getElementById("lista-paginas");
  const paginas = listarPaginas();
  lista.innerHTML = paginas
    .map((p) => {
      const activo = p.id === idPaginaSeleccionada ? " activo" : "";
      return `
        <li class="item-pagina${activo}" data-id="${p.id}">
          <span>${escaparHtml(p.titulo)}<br /><span class="slug">/${escaparHtml(p.slug)}</span></span>
        </li>`;
    })
    .join("");

  lista.querySelectorAll(".item-pagina").forEach((el) => {
    el.addEventListener("click", () => {
      idPaginaSeleccionada = el.dataset.id;
      renderizarBarraLateral();
      renderizarEditor();
    });
  });
}

function crearPaginaNueva() {
  const titulo = prompt("Título de la nueva página:", "Página nueva");
  if (!titulo) return;
  const pagina = crearPagina(titulo);
  idPaginaSeleccionada = pagina.id;
  renderizarBarraLateral();
  renderizarEditor();
}

/* ---------- Editor principal ---------- */

function renderizarEditor() {
  const contenedor = document.getElementById("contenido-admin");
  const pagina = obtenerPaginaPorId(idPaginaSeleccionada);

  if (!pagina) {
    contenedor.innerHTML = `
      <div class="aviso">Todavía no tienes ninguna página. Crea la primera desde el botón "+ Nueva página".</div>`;
    return;
  }

  const bloquesOrdenados = [...pagina.bloques].sort((a, b) => a.orden - b.orden);
  const config = obtenerConfig();

  contenedor.innerHTML = `
    <div class="panel-configuracion">
      <div class="encabezado-editor">
        <div style="flex:1; min-width:260px;">
          <h2 style="margin:0 0 8px;">Configuración del sitio</h2>
          <p class="etiqueta-tecnica" style="margin:0;">Ajusta el estilo general de tu proyecto</p>
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
      <iframe id="preview-frame" src="index.html#/${escaparAtributo(pagina.slug)}"></iframe>
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
        <a class="enlace-previa" target="_blank" href="index.html#/${escaparAtributo(pagina.slug)}">Ver página →</a>
        <button class="boton-secundario" id="btn-exportar">⬇ Exportar JSON</button>
        <button class="boton-secundario" id="btn-importar">⬆ Importar JSON</button>
        <input id="input-importar" type="file" accept="application/json" hidden />
        <button class="boton-secundario" id="btn-guardar-pagina">Guardar cambios</button>
        <button class="boton-peligro" id="btn-eliminar-pagina">Eliminar página</button>
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
    });
    renderizarEditor();
    alert("Configuración guardada correctamente.");
  });

  document.getElementById("btn-guardar-pagina").addEventListener("click", () => {
    const nuevoTitulo = document.getElementById("campo-titulo").value.trim() || pagina.titulo;
    const nuevoSlug = document.getElementById("campo-slug").value.trim() || pagina.slug;
    actualizarPagina(pagina.id, { titulo: nuevoTitulo, slug: nuevoSlug });
    renderizarBarraLateral();
    renderizarEditor();
  });

  document.getElementById("btn-eliminar-pagina").addEventListener("click", () => {
    const seguro = confirm(`¿Eliminar la página "${pagina.titulo}"? Esta acción no se puede deshacer.`);
    if (!seguro) return;
    eliminarPagina(pagina.id);
    idPaginaSeleccionada = listarPaginas()[0]?.id || null;
    renderizarBarraLateral();
    renderizarEditor();
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
        idPaginaSeleccionada = listarPaginas()[0]?.id || null;
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

  contenedor.querySelectorAll(".chip-bloque").forEach((chip) => {
    chip.addEventListener("click", () => {
      agregarBloque(pagina.id, chip.dataset.tipo);
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
        <span class="sello-tipo">${ETIQUETAS_TIPO_BLOQUE[bloque.tipo] || bloque.tipo}</span>
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
          const paginaActual = obtenerPaginaPorId(paginaId);
          const bloque = paginaActual.bloques.find((b) => b.id === bloqueId);
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
      const pagina = obtenerPaginaPorId(paginaId);
      const bloque = pagina.bloques.find((b) => b.id === bloqueId);

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
