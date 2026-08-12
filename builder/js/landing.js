function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function crearTarjetasProyectos() {
  const proyectos = listarProyectos();
  const grilla = document.getElementById("landing-grilla");

  if (!proyectos.length) {
    grilla.innerHTML = `<div class="estado-vacio"><h2>No hay proyectos todavía</h2><p>Crea tu primer proyecto desde el botón "Nuevo proyecto" o desde <a href="admin.html">el panel de administración</a>.</p></div>`;
    return;
  }

  grilla.innerHTML = proyectos
    .map((proyecto) => {
      const primeraPagina = proyecto.paginas?.[0] || null;
      const descripcion = escaparHtml(
        (primeraPagina?.bloques?.[0]?.datos?.texto || primeraPagina?.bloques?.[0]?.datos?.titulo || "Proyecto sin contenido aún").slice(0, 100)
      );
      return `
        <article class="dashboard-tarjeta landing-tarjeta">
          <div class="dashboard-tarjeta__cabecera">
            <span class="dashboard-tarjeta__tipo">Proyecto</span>
            <span class="dashboard-tarjeta__slug">/${escaparHtml(proyecto.slug)}</span>
          </div>
          <h3>${escaparHtml(proyecto.titulo)}</h3>
          <p>${descripcion}</p>
          <div class="landing-tarjeta__acciones">
            <a class="dashboard-tarjeta__accion" href="app.html#/${escaparHtml(proyecto.slug)}">Abrir</a>
            <a class="boton-secundario" href="admin.html#/${escaparHtml(proyecto.slug)}">Editar</a>
          </div>
        </article>`;
    })
    .join("\n");
  if (typeof inicializarAnimaciones === "function") inicializarAnimaciones();
}

async function crearProyectoDesdeLanding() {
  const valores = await solicitarFormularioModal({
    titulo: "Nuevo proyecto",
    textoConfirmar: "Crear",
    campos: [
      { nombre: "titulo", etiqueta: "Título del nuevo proyecto", valor: "Proyecto nuevo", requerido: true }
    ]
  });
  if (!valores || !valores.titulo) return;
  const proyecto = crearProyecto(valores.titulo);
  crearPaginaEnProyecto(proyecto.id, "Inicio");
  window.location.href = `admin.html#/${encodeURIComponent(proyecto.slug)}`;
}

window.addEventListener("DOMContentLoaded", () => {
  crearTarjetasProyectos();
  const btnCrear = document.getElementById("btn-crear-proyecto");
  if (btnCrear) {
    btnCrear.addEventListener("click", crearProyectoDesdeLanding);
  }
});
