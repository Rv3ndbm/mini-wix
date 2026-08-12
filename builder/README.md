# AutoPag — Manual del Programador

AutoPag es un constructor de sitios web estáticos (Website Builder) diseñado para funcionar completamente en el navegador (Client-Side) sin requerir un servidor backend o base de datos. Toda la información, recursos y configuraciones se procesan mediante JavaScript puro (Vanilla JS) y se almacenan de manera persistente en el `localStorage` del navegador.

---

## 🚀 Arquitectura y Tecnologías

El proyecto fue concebido para ser extremadamente liviano y transportable. No utiliza frameworks como React o Vue, ni requiere NodeJS para su compilación.

- **Estructura base:** HTML5 semántico.
- **Lógica de negocio:** JavaScript puro (ES6+).
- **Estilos y Temas:** CSS nativo, utilizando intensivamente Custom Properties (Variables CSS) para inyectar configuraciones dinámicas (Modo Oscuro, colores de marca elegidos por el usuario, etc).
- **Dependencias externas:** 
  - [JSZip](https://stuk.github.io/jszip/) (v3.10.1 cargado vía CDN) para compilar y descargar los sitios web generados a archivos `.zip`.

---

## 📂 Estructura del Sistema (Sistema de Archivos)

La aplicación se divide en vistas (HTML) y módulos lógicos (JS):

### Vistas (HTML)
- **`index.html`**: El *Dashboard* o panel de control principal. Lista los proyectos del usuario y actúa como portal de bienvenida.
- **`admin.html`**: El *Editor Visual*. Es el corazón del sistema, donde el usuario arrastra bloques, edita contenido, sube imágenes y configura el SEO y diseño.
- **`app.html`**: El *Visor Público* (SPA). Simula un entorno en vivo usando el hash de la URL (`#/ruta`) para navegar entre las distintas páginas del proyecto sin recargar el navegador.

### Lógica (JavaScript en `/js/`)
- **`store.js` (Capa de Datos):** Maneja todo el CRUD (Crear, Leer, Actualizar, Borrar) hacia el `localStorage`. Define los modelos de datos (Proyecto, Página, Bloque), la estructura de la biblioteca de imágenes y el historial de versiones (backups). Aquí también reside la lógica de sincronización de *Bloques Globales*.
- **`render.js` (Capa de Presentación):** Contiene funciones puras cuya única responsabilidad es recibir un objeto JSON (`datos` de un bloque) y escupir su equivalente en HTML crudo (String). Es la fuente de la verdad visual compartida entre `admin.html` y `app.html`.
- **`ui.js` (Componentes UI):** Proporciona un sistema de Modales (ventanas emergentes) y Toasts (notificaciones). Usa Promesas (`Promise`) para permitir flujos asíncronos limpios (ej: `const res = await confirmarModal("¿Seguro?");`).
- **`admin.js` (Controlador del Editor):** El archivo más complejo. Gestiona la interacción del DOM en el editor: formularios de propiedades de bloques, Drag & Drop nativo, validaciones, previsualización en iframe, y la exportación de archivos `.zip`.
- **`site.js` (Routing Público):** Escucha el evento `hashchange` en `app.html` para buscar en el `localStorage` la página correspondiente a la URL y enviarla a `render.js` para ser dibujada.
- **`landing.js` & `motion.js`**: Scripts auxiliares para controlar animaciones y el renderizado rápido de la cuadrícula de proyectos en `index.html`.

### Estilos (CSS en `/css/`)
- **`style.css`**: Contiene todo el código de diseño. Implementa metodologías modernas de Layout (Flexbox/Grid), utilidades de animación, y alberga las variables globales (`:root` y `body.modo-oscuro`) que permiten la alternancia del *Dark Mode* en el panel de administrador.

---

## 🧠 Modelado de Datos

El almacenamiento local se basa en un gran objeto JSON que anida la siguiente jerarquía:

1. **Proyectos:** Cada proyecto tiene una `id`, `slug`, `titulo` y una `config` global (colores, tipografías, página de inicio).
2. **Páginas:** Pertenecen a un proyecto. Tienen `id`, `slug`, `titulo`, propiedades de `seoTitulo`/`seoDescripcion` y un array de `bloques`.
3. **Bloques:** Las piezas de lego de la página. Poseen un `id`, `tipo` (identificador del componente), `orden` (para el Drag & Drop), y `datos` (objeto JSON arbitrario con los campos específicos de cada componente, ej: texto, color, URL de imagen).

### Tipos de Bloques Disponibles
El sistema es modular y fácilmente escalable. Actualmente soporta:
- `navbar`, `header`, `footer` *(Bloques globales)*
- `hero` (Banner principal)
- `cards` (Tarjetas de servicios o características)
- `texto` (Párrafos y títulos)
- `video` (Iframes seguros automáticos de YouTube/Vimeo)
- `galeria` (Mosaico de imágenes)
- `contacto` (Formulario que acciona un mailto nativo o un endpoint)
- `cita` (Testimonios individuales)
- `testimonios` / `faq` (Listados dinámicos)
- `columnas` (Diseño en grilla de texto)
- `codigo` (Incrustación de HTML crudo o iFrames externos de terceros).

---

## 🌟 Funcionalidades Principales

### 1. Sistema de "Bloques Globales"
Para facilitar el diseño, los bloques de tipo `navbar`, `header` y `footer` están sincronizados. Si un usuario edita un enlace del menú en la página "Acerca de", `store.js` intercepta la función `actualizarBloque` y aplica silenciosamente esos mismos cambios en los bloques homólogos del resto de las páginas del proyecto.

### 2. Exportación a ZIP (`JSZip`)
Como el proyecto corre localmente, permite "Descargar la Web". `admin.js` genera una carpeta virtual, recorre las páginas inyectando los componentes procesados por `render.js` en plantillas HTML5 válidas, y empaqueta los archivos estáticos (`style.css`, `site.js`) en un archivo `.zip` descargable. El resultado puede subirse directamente a un host (ej. Netlify o un FTP).

### 3. Drag & Drop (Nativo)
La API nativa de arrastrar y soltar de HTML5 (`draggable="true"`) está implementada para:
- **Páginas**: Reordenar el menú lateral de páginas dentro de un proyecto.
- **Bloques**: Alterar la disposición del layout de una página.
El cálculo de inserción detecta dinámicamente si el cursor se encuentra en la mitad superior o inferior del componente objetivo para ajustar el índice en el array.

### 4. Modo Oscuro (Dark Mode)
El editor puede cambiar entre interfaz clara y oscura. Esto se logra superponiendo la clase `.modo-oscuro` al `<body>`, la cual reescribe las Custom Properties de CSS (ej. `--papel`, `--texto`). La preferencia se guarda en el navegador bajo la clave `autopag_theme`.

### 5. Backups e Importación JSON
El sistema almacena automáticamente volcados (dumps) completos en formato JSON ante acciones destructivas. Estos JSON pueden ser descargados (Exportar) y cargados (Importar) desde la UI para compartir plantillas o guardar progreso externo.

### 6. Biblioteca de Imágenes en Base64
Las imágenes subidas por el usuario se convierten en cadenas de texto codificadas en Base64 utilizando `FileReader`. Dado el límite natural de 5MB del `localStorage`, el sistema pre-comprime/escala estas imágenes (mediante un `<canvas>` interno en la función de subida) para garantizar un uso de memoria responsable.

---

## 🛠 Cómo extender el sistema (Guía para añadir bloques)

Para añadir un nuevo componente (ej. **Bloque de Precios**):

1. **Definición (`store.js`)**: 
   - Añadirlo al diccionario `ETIQUETAS_TIPO_BLOQUE`.
   - Añadir sus datos predeterminados en el `switch` interno de nuevas instancias.
2. **Renderizado (`render.js`)**: 
   - Escribir una función `renderizarBloquePrecios(d) { return \`<div>...\` }`.
   - Registrar la función en el `switch` principal de `renderizarBloque`.
3. **Panel de Control (`admin.js`)**: 
   - En `camposEditablesDeBloque()`, crear el `case 'precios':` devolviendo los campos HTML (`<input data-campo="precio">`) que el usuario podrá manipular. El sistema de eventos global atrapará `data-campo` automáticamente y actualizará `store.js`.
