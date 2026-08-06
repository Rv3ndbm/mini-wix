# Mini Wix — sitio web autogestionable

Un sitio web que se administra a sí mismo: desde `admin.html` puedes crear
páginas nuevas y llenarlas con bloques (títulos, párrafos, imágenes, botones,
listas, separadores) sin escribir código. `index.html` lee esos datos y
genera las páginas automáticamente.

## Cómo abrirlo

**No lo abras haciendo doble clic en el archivo.** Algunos navegadores
(sobre todo Firefox) bloquean el guardado de datos cuando el archivo se abre
directo desde el disco (`file://`). Usa un servidor local, es una sola línea:

```bash
cd builder
python3 -m http.server 8000
```

Y abre en el navegador: `http://localhost:8000/index.html` (sitio público) y
`http://localhost:8000/admin.html` (panel de administración).

Si tienes VS Code, la extensión "Live Server" también funciona: clic derecho
sobre `index.html` → "Open with Live Server".

## Estructura del proyecto

```
builder/
├── index.html        → el sitio público (lo que ve un visitante)
├── admin.html         → el panel donde tú administras el contenido
├── css/style.css       → todos los estilos
└── js/
    ├── store.js        → guarda y lee los datos (usa localStorage del navegador)
    ├── render.js        → convierte un bloque de datos en HTML
    ├── site.js          → arma el sitio público (navegación con #)
    └── admin.js         → toda la lógica del panel de administración
```

## Cómo funciona (para explicarlo en la sustentación)

1. **Los datos son el sitio.** No hay HTML fijo para cada página. Cada
   página es un objeto `{ titulo, slug, bloques: [...] }` guardado como JSON
   en `localStorage`. `store.js` es la única parte del código que lee y
   escribe ese JSON.
2. **Un renderizador, no una plantilla por página.** `render.js` tiene una
   sola función (`renderizarBloque`) que sabe convertir cualquier bloque en
   HTML según su `tipo`. Por eso agregar una página nueva no requiere
   escribir código nuevo: solo se guarda un registro más.
3. **Rutas con `#`.** `index.html#/contacto` le dice a `site.js` qué `slug`
   buscar en los datos guardados y lo dibuja dentro de `#contenido-pagina`.
   No hace falta un servidor con enrutamiento porque todo pasa en el
   navegador.
4. **El panel de administración es un formulario que llama a `store.js`.**
   Cada botón (agregar bloque, subir, bajar, eliminar, guardar) termina
   llamando a una función de `store.js` y luego volviendo a dibujar la
   pantalla (`renderizarEditor()`), así siempre se ve el estado real de los
   datos.

## Funcionalidades ya incluidas

- Bloques más ricos: video embebido, galería, formulario de contacto,
  hero, cards, testimonios, FAQ, secciones y columnas.
- Exportar/importar el JSON de `localStorage` como archivo, para poder
  compartir un sitio entre computadores.
- Vista previa en vivo, personalización visual global (colores, tipografías,
  ancho del contenido) y carga de imágenes locales desde el panel.
- Plantillas de página, reordenado de bloques por arrastre y navegación
  más completa para el sitio público.
- Futuro paso natural: cambiar `localStorage` por un backend real (por
  ejemplo ASP.NET Core + SQLite) si la tarea pide persistencia en servidor
  en vez de en el navegador; la ventaja de este diseño es que solo
  tendrías que reemplazar `store.js`, el resto del código no cambia.

## Reiniciar los datos

Si algo se daña mientras pruebas, el botón "↺ Reiniciar todo" en el panel
de administración borra todo y vuelve al estado inicial. También puedes
borrarlo manualmente desde la consola del navegador:
`localStorage.removeItem("miniwix_datos_v1")`.
