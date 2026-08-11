/* Microinteracciones compartidas: revelado al desplazarse y progreso de lectura. */
(function () {
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let observador;

  function actualizarProgreso() {
    const progreso = document.querySelector(".progreso-scroll");
    if (!progreso) return;
    const alto = document.documentElement.scrollHeight - window.innerHeight;
    progreso.style.transform = `scaleX(${alto > 0 ? Math.min(1, window.scrollY / alto) : 0})`;
  }

  function prepararRevelados() {
    if (!observador && !movimientoReducido) return;
    const elementos = document.querySelectorAll(
      ".landing-header, .landing-proyectos__intro, .dashboard-hero, .dashboard-tarjeta, .bloque-wrapper, .panel-configuracion, .preview-panel, .encabezado-editor, .tarjeta-bloque, .aviso"
    );
    elementos.forEach((elemento, indice) => {
      if (elemento.dataset.animado) return;
      elemento.dataset.animado = "true";
      elemento.classList.add("revelar");
      elemento.style.setProperty("--retraso-revelar", `${Math.min(indice % 8, 6) * 55}ms`);
      if (movimientoReducido) elemento.classList.add("revelar--visible");
      else observador.observe(elemento);
    });
  }

  function iniciar() {
    const barra = document.createElement("div");
    barra.className = "progreso-scroll";
    barra.setAttribute("aria-hidden", "true");
    document.body.prepend(barra);
    actualizarProgreso();
    window.addEventListener("scroll", actualizarProgreso, { passive: true });

    observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add("revelar--visible");
        observador.unobserve(entrada.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -36px" });

    prepararRevelados();
    new MutationObserver(() => prepararRevelados()).observe(document.body, { childList: true, subtree: true });
  }

  window.inicializarAnimaciones = prepararRevelados;
  window.addEventListener("DOMContentLoaded", iniciar);
})();
