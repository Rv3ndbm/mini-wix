/* Utilidades reutilizables de la interfaz del editor. */

function escaparAtributo(texto) {
  return escaparHtml(texto).replace(/"/g, "&quot;");
}

function textoParaTextarea(texto) {
  return escaparHtml(texto ?? "");
}

const OPCIONES_PLANTILLA_PROYECTO = [
  { valor: "vacia", etiqueta: "Vacía — página en blanco" },
  { valor: "portafolio", etiqueta: "Portafolio — creativo / diseño" },
  { valor: "restaurante", etiqueta: "Restaurante — carta y reservas" },
  { valor: "empresa", etiqueta: "Empresa — corporativo" },
  { valor: "producto", etiqueta: "Producto — SaaS / app" },
  { valor: "landing", etiqueta: "Landing — captación" },
];

const OPCIONES_PLANTILLA_PAGINA = [
  { valor: "vacia", etiqueta: "Vacía" },
  { valor: "landing", etiqueta: "Landing" },
  { valor: "empresa", etiqueta: "Empresa" },
  { valor: "contacto", etiqueta: "Contacto" },
  { valor: "portafolio", etiqueta: "Portafolio" },
  { valor: "restaurante", etiqueta: "Restaurante" },
  { valor: "producto", etiqueta: "Producto" },
];

function leerArchivoComoDataUrl(archivo, maxBytes) {
  if (!archivo.type.startsWith("image/")) return Promise.reject(new Error("El archivo debe ser una imagen."));
  if (archivo.size > maxBytes) return Promise.reject(new Error(`La imagen ${archivo.name} supera el límite de ${Math.round(maxBytes / 1024)} KB.`));
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(lector.result);
    lector.onerror = () => rechazar(new Error(`No se pudo leer ${archivo.name}.`));
    lector.readAsDataURL(archivo);
  });
}

function subirImagenConBiblioteca(archivo) {
  return leerArchivoComoDataUrl(archivo, MAX_BYTES_IMAGEN).then((dataUrl) => {
    if (typeof agregarImagenABiblioteca === "function") {
      agregarImagenABiblioteca(archivo.name, dataUrl);
    }
    return dataUrl;
  });
}

function camposEstiloBloque(d) {
  const espaciado = d.espaciado || "normal";
  const alineacion = d.alineacion || "izquierda";
  const bordeAncho = d.bordeAncho || "0";
  const bordeRadio = d.bordeRadio || "0";
  const numColumnas = d.numColumnas || "2";
  return `
    <details class="bloque-estilos" open>
      <summary>🎨 Estilo del bloque</summary>
      <div class="fila-campos">
        <div class="campo" style="flex:1; min-width:140px;">
          <label>Espaciado</label>
          <select data-campo="espaciado">
            <option value="compacto" ${espaciado === "compacto" ? "selected" : ""}>Compacto</option>
            <option value="normal" ${espaciado === "normal" ? "selected" : ""}>Normal</option>
            <option value="amplio" ${espaciado === "amplio" ? "selected" : ""}>Amplio</option>
          </select>
        </div>
        <div class="campo" style="flex:1; min-width:140px;">
          <label>Alineación</label>
          <select data-campo="alineacion">
            <option value="izquierda" ${alineacion === "izquierda" ? "selected" : ""}>Izquierda</option>
            <option value="centro" ${alineacion === "centro" ? "selected" : ""}>Centro</option>
            <option value="derecha" ${alineacion === "derecha" ? "selected" : ""}>Derecha</option>
          </select>
        </div>
        <div class="campo" style="flex:1; min-width:120px;">
          <label>Borde (px)</label>
          <select data-campo="bordeAncho">
            <option value="0" ${bordeAncho === "0" ? "selected" : ""}>Sin borde</option>
            <option value="1" ${bordeAncho === "1" ? "selected" : ""}>1px</option>
            <option value="2" ${bordeAncho === "2" ? "selected" : ""}>2px</option>
            <option value="3" ${bordeAncho === "3" ? "selected" : ""}>3px</option>
          </select>
        </div>
        <div class="campo" style="flex:1; min-width:120px;">
          <label>Radio</label>
          <select data-campo="bordeRadio">
            <option value="0" ${bordeRadio === "0" ? "selected" : ""}>Cuadrado</option>
            <option value="8" ${bordeRadio === "8" ? "selected" : ""}>Suave</option>
            <option value="16" ${bordeRadio === "16" ? "selected" : ""}>Redondeado</option>
            <option value="24" ${bordeRadio === "24" ? "selected" : ""}>Muy redondo</option>
          </select>
        </div>
      </div>
      <div class="fila-campos">
        <div class="campo" style="flex:1; min-width:180px;">
          <label>Tamaño contenedor</label>
          <select data-campo="tamano">
            <option value="normal" ${d.tamano === "normal" ? "selected" : ""}>Normal</option>
            <option value="ancho" ${d.tamano === "ancho" ? "selected" : ""}>Ancho</option>
            <option value="completo" ${d.tamano === "completo" ? "selected" : ""}>Completo</option>
          </select>
        </div>
        <div class="campo" style="flex:1; min-width:140px;">
          <label>Color texto</label>
          <input type="color" data-campo="colorTexto" value="${escaparAtributo(d.colorTexto || "#1e2226")}" />
        </div>
        <div class="campo" style="flex:1; min-width:140px;">
          <label>Fondo</label>
          <input type="color" data-campo="colorFondo" value="${escaparAtributo(d.colorFondo || "#f6f3ec")}" />
        </div>
        <div class="campo" style="flex:1; min-width:140px;">
          <label>Borde</label>
          <input type="color" data-campo="colorBorde" value="${escaparAtributo(d.colorBorde || "#1c3a54")}" />
        </div>
      </div>
      <div class="fila-campos" data-solo-columnas style="display:none;">
        <div class="campo" style="flex:1; max-width:160px;">
          <label>Nº columnas</label>
          <select data-campo="numColumnas">
            <option value="2" ${numColumnas === "2" ? "selected" : ""}>2</option>
            <option value="3" ${numColumnas === "3" ? "selected" : ""}>3</option>
            <option value="4" ${numColumnas === "4" ? "selected" : ""}>4</option>
          </select>
        </div>
      </div>
    </details>`;
}

function camposComunesBloque(d, tipo) {
  return camposEstiloBloque(d).replace(
    'data-solo-columnas style="display:none;"',
    tipo === "columnas" ? 'data-solo-columnas style="display:flex;"' : 'data-solo-columnas style="display:none;"'
  );
}

function notificar(mensaje, tipo) {
  if (typeof mostrarToast === "function") mostrarToast(mensaje, tipo || "success");
  else alert(mensaje);
}

function badgeEstado(estado) {
  return estado === "borrador"
    ? `<span class="badge-estado badge-estado--borrador" title="Borrador">● Borrador</span>`
    : `<span class="badge-estado badge-estado--publicado" title="Publicado">● Publicado</span>`;
}
