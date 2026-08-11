/* Utilidades reutilizables de la interfaz del editor. */

function escaparAtributo(texto) {
  return escaparHtml(texto).replace(/"/g, "&quot;");
}

function textoParaTextarea(texto) {
  return escaparHtml(texto ?? "");
}

function solicitarTexto(mensaje, valorPorDefecto, opciones) {
  const opts = opciones || {};
  const minLong = typeof opts.minLong === "number" ? opts.minLong : 2;
  const maxIntentos = typeof opts.maxIntentos === "number" ? opts.maxIntentos : 3;
  for (let intentos = 0; intentos < maxIntentos; intentos++) {
    const texto = prompt(mensaje, valorPorDefecto);
    if (texto === null) return null;
    const limpio = texto.trim();
    if (limpio.length >= minLong) return limpio;
    alert(limpio ? `El valor debe tener al menos ${minLong} caracteres.` : "El valor no puede estar vacío.");
  }
  alert("Demasiados intentos. Operación cancelada.");
  return null;
}

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
