/* Modales, toasts y diálogos reutilizables del panel. */

(function () {
  let modalActivo = null;

  function asegurarContenedores() {
    if (!document.getElementById("toast-stack")) {
      const stack = document.createElement("div");
      stack.id = "toast-stack";
      stack.className = "toast-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    if (!document.getElementById("modal-root")) {
      const root = document.createElement("div");
      root.id = "modal-root";
      root.className = "modal-root";
      root.hidden = true;
      document.body.appendChild(root);
    }
  }

  function cerrarModal() {
    const root = document.getElementById("modal-root");
    if (!root) return;
    root.hidden = true;
    root.innerHTML = "";
    modalActivo = null;
    document.body.classList.remove("modal-abierto");
  }

  function abrirModal({ titulo, cuerpo, acciones, ancho = "480px", onClose }) {
    asegurarContenedores();
    const root = document.getElementById("modal-root");
    root.hidden = false;
    document.body.classList.add("modal-abierto");
    root.innerHTML = `
      <div class="modal-overlay" data-cerrar="overlay"></div>
      <div class="modal-dialog" role="dialog" aria-modal="true" style="max-width:${ancho}">
        <header class="modal-dialog__header">
          <h2 class="modal-dialog__titulo">${titulo}</h2>
          <button type="button" class="modal-dialog__cerrar" data-cerrar="btn" aria-label="Cerrar">✕</button>
        </header>
        <div class="modal-dialog__cuerpo">${cuerpo}</div>
        <footer class="modal-dialog__acciones">${acciones || ""}</footer>
      </div>`;

    root.querySelectorAll("[data-cerrar]").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.cerrar === "overlay" && modalActivo && modalActivo.bloquearOverlay) return;
        if (onClose) onClose();
        cerrarModal();
      });
    });

    modalActivo = { root };
    const dialog = root.querySelector(".modal-dialog");
    const primerInput = dialog.querySelector("input, textarea, select, button");
    if (primerInput) primerInput.focus();
    return { root, dialog, cerrar: cerrarModal };
  }

  function mostrarToast(mensaje, tipo = "success", duracion = 4200) {
    asegurarContenedores();
    const stack = document.getElementById("toast-stack");
    const iconos = { success: "✓", error: "✕", info: "ℹ", warning: "!" };
    const toast = document.createElement("div");
    toast.className = `toast toast--${tipo}`;
    toast.innerHTML = `
      <span class="toast__icono" aria-hidden="true">${iconos[tipo] || iconos.info}</span>
      <span class="toast__texto">${mensaje}</span>
      <button type="button" class="toast__cerrar" aria-label="Cerrar">✕</button>`;
    stack.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast--visible"));
    const quitar = () => {
      toast.classList.remove("toast--visible");
      setTimeout(() => toast.remove(), 280);
    };
    toast.querySelector(".toast__cerrar").addEventListener("click", quitar);
    setTimeout(quitar, duracion);
  }

  function confirmarModal(mensaje, { titulo = "Confirmar", confirmar = "Continuar", cancelar = "Cancelar", peligro = false } = {}) {
    return new Promise((resolver) => {
      const modal = abrirModal({
        titulo,
        cuerpo: `<p class="modal-texto">${mensaje}</p>`,
        acciones: `
          <button type="button" class="boton-secundario" data-accion="cancelar">${cancelar}</button>
          <button type="button" class="${peligro ? "boton-peligro" : "boton-primario"}" data-accion="ok">${confirmar}</button>`,
        onClose: () => resolver(false)
      });
      modalActivo.bloquearOverlay = false;
      modal.root.querySelector('[data-accion="cancelar"]').addEventListener("click", () => {
        cerrarModal();
        resolver(false);
      });
      modal.root.querySelector('[data-accion="ok"]').addEventListener("click", () => {
        cerrarModal();
        resolver(true);
      });
    });
  }

  function solicitarFormularioModal({ titulo, campos, textoConfirmar = "Guardar", ancho }) {
    return new Promise((resolver) => {
      const htmlCampos = campos
        .map((campo) => {
          const id = campo.id || campo.nombre;
          const req = campo.requerido ? "required" : "";
          if (campo.tipo === "select") {
            const opts = (campo.opciones || [])
              .map((op) => `<option value="${op.valor}" ${op.valor === campo.valor ? "selected" : ""}>${op.etiqueta}</option>`)
              .join("");
            return `<div class="campo"><label for="${id}">${campo.etiqueta}</label><select id="${id}" name="${campo.nombre}" ${req}>${opts}</select></div>`;
          }
          if (campo.tipo === "textarea") {
            return `<div class="campo"><label for="${id}">${campo.etiqueta}</label><textarea id="${id}" name="${campo.nombre}" ${req} placeholder="${campo.placeholder || ""}">${campo.valor || ""}</textarea></div>`;
          }
          return `<div class="campo"><label for="${id}">${campo.etiqueta}</label><input id="${id}" name="${campo.nombre}" type="${campo.tipo || "text"}" value="${campo.valor || ""}" placeholder="${campo.placeholder || ""}" ${req} /></div>`;
        })
        .join("");

      const modal = abrirModal({
        titulo,
        ancho,
        cuerpo: `<form id="modal-form" class="modal-form">${htmlCampos}</form>`,
        acciones: `
          <button type="button" class="boton-secundario" data-accion="cancelar">Cancelar</button>
          <button type="submit" form="modal-form" class="boton-primario">${textoConfirmar}</button>`,
        onClose: () => resolver(null)
      });

      modalActivo.bloquearOverlay = true;
      const form = modal.root.querySelector("#modal-form");
      modal.root.querySelector('[data-accion="cancelar"]').addEventListener("click", () => {
        cerrarModal();
        resolver(null);
      });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const valores = {};
        campos.forEach((campo) => {
          valores[campo.nombre] = String(fd.get(campo.nombre) || "").trim();
        });
        cerrarModal();
        resolver(valores);
      });
    });
  }

  function elegirDeListaModal({ titulo, items, textoConfirmar = "Seleccionar" }) {
    return new Promise((resolver) => {
      if (!items.length) {
        mostrarToast("No hay opciones disponibles.", "info");
        resolver(null);
        return;
      }
      const lista = items
        .map(
          (item, i) =>
            `<label class="modal-opcion"><input type="radio" name="opcion" value="${i}" ${i === 0 ? "checked" : ""} /><span><strong>${item.titulo}</strong>${item.subtitulo ? `<small>${item.subtitulo}</small>` : ""}</span></label>`
        )
        .join("");
      const modal = abrirModal({
        titulo,
        cuerpo: `<form id="modal-form" class="modal-form modal-form--lista">${lista}</form>`,
        acciones: `
          <button type="button" class="boton-secundario" data-accion="cancelar">Cancelar</button>
          <button type="submit" form="modal-form" class="boton-primario">${textoConfirmar}</button>`,
        onClose: () => resolver(null)
      });
      modalActivo.bloquearOverlay = true;
      modal.root.querySelector('[data-accion="cancelar"]').addEventListener("click", () => {
        cerrarModal();
        resolver(null);
      });
      modal.root.querySelector("#modal-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const indice = Number(new FormData(e.target).get("opcion"));
        cerrarModal();
        resolver(items[indice] || null);
      });
    });
  }

  window.cerrarModal = cerrarModal;
  window.abrirModal = abrirModal;
  window.mostrarToast = mostrarToast;
  window.confirmarModal = confirmarModal;
  window.solicitarFormularioModal = solicitarFormularioModal;
  window.elegirDeListaModal = elegirDeListaModal;

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalActivo) cerrarModal();
  });
})();
