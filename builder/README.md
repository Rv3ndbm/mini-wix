# AutoPag — creador de sitios autogestionables

AutoPag es un constructor de sitios estático hecho con HTML, CSS y JavaScript puro. Permite crear varios proyectos, diseñar sus páginas con bloques y publicar una vista navegable sin escribir HTML para cada página.

> Está pensado para ejecutarse localmente o como demostración. No incluye servidor, usuarios reales ni almacenamiento compartido.

## Ejecutarlo

No abras los archivos mediante `file://`: algunos navegadores restringen `localStorage` en ese modo. Inicia un servidor dentro de esta carpeta:

```bash
cd builder
python -m http.server 8000
```

Abre después:

- `http://localhost:8000/index.html` — inicio y lista de proyectos.
- `http://localhost:8000/admin.html` — panel de edición.
- `http://localhost:8000/app.html` — vista pública de los proyectos.

También funciona con Live Server de VS Code.

Para ejecutar las pruebas de almacenamiento y sanitización:

```bash
node tests/store.test.js
```

## Uso básico

1. Crea un proyecto desde la portada o el panel.
2. Configura su nombre, slug, colores, tipografías, pie de página y página inicial.
3. Crea páginas y añade bloques: títulos, texto, imágenes, botones, listas, video, galería, formulario, hero, cards, testimonios, FAQ, secciones y columnas.
4. Guarda los cambios y abre la vista previa o el enlace público.

Las rutas públicas usan hashes, por ejemplo: `app.html#/mi-proyecto/inicio`. No se necesita configurar rutas en el servidor.

## Estructura

```text
builder/
├── index.html            # Portada y proyectos
├── admin.html            # Editor
├── app.html              # Sitio público
├── css/style.css         # Estilos y diseño responsive
└── js/
    ├── store.js          # Datos, migraciones, validación y backups
    ├── render.js         # Renderizador seguro de bloques
    ├── site.js           # Rutas y navegación pública
    ├── admin-utils.js    # Utilidades reutilizables del editor
    ├── admin.js          # Interfaz y eventos del editor
    └── landing.js        # Inicio/lista de proyectos
```

## Datos y respaldo

Los datos se guardan en `localStorage` del navegador. Cada proyecto tiene su propia configuración visual y sus propias páginas. Los datos antiguos se migran automáticamente al abrir la aplicación.

- Exporta regularmente el sitio como JSON desde el editor.
- Importar, restaurar o reiniciar crea una copia de seguridad local antes de reemplazar datos.
- Se conservan hasta dos copias locales para no agotar el espacio del navegador.
- Las imágenes locales se limitan a 700 KB por archivo y el sitio completo a 1.5 MB. Para proyectos con muchas imágenes usa URLs externas o migra a almacenamiento de servidor.

## Seguridad y límites

- Los textos, URLs, colores y fuentes se validan antes de guardarse o renderizarse.
- Las URLs peligrosas, los `data:` que no sean imágenes permitidas y estilos no válidos se bloquean.
- La opción de contraseña del panel es únicamente un bloqueo local de conveniencia: no protege datos en un sitio publicado. Para producción se requiere autenticación en servidor.
- El formulario de contacto usa `mailto:` o un endpoint HTTP configurado por quien administra el proyecto; AutoPag no almacena mensajes.

## Siguiente paso para producción

Sustituye `store.js` por una API con autenticación, base de datos y almacenamiento de archivos. El renderizador y la interfaz pueden mantenerse, pero los datos deben dejar de depender de `localStorage` si habrá varios usuarios, varios dispositivos o contenido importante.
