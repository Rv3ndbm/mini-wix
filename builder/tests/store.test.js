const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function crearAlmacen() {
  const datos = new Map();
  return {
    get length() { return datos.size; },
    key(indice) { return [...datos.keys()][indice] || null; },
    getItem(clave) { return datos.has(clave) ? datos.get(clave) : null; },
    setItem(clave, valor) { datos.set(clave, String(valor)); },
    removeItem(clave) { datos.delete(clave); },
  };
}

const contexto = {
  localStorage: crearAlmacen(),
  sessionStorage: crearAlmacen(),
  console: { error() {}, warn() {} },
  alert() {},
  btoa: (valor) => Buffer.from(valor, "utf8").toString("base64"),
  atob: (valor) => Buffer.from(valor, "base64").toString("utf8"),
  Date,
  Math,
  JSON,
  String,
  Number,
  Object,
  Array,
  Set,
  Error,
};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync(require("node:path").join(__dirname, "..", "js", "store.js"), "utf8"), contexto);

const inicial = contexto.obtenerDatos();
assert.equal(inicial.version, 2);
assert.equal(inicial.proyectos[0].config.nombreSitio, "Mi Sitio");

const proyecto = contexto.crearProyecto("Segundo proyecto");
contexto.guardarConfig(proyecto.id, { nombreSitio: "Sitio dos", footerEnlace: "javascript:alert(1)" });
assert.equal(contexto.obtenerConfig(proyecto.id).nombreSitio, "Sitio dos");
assert.equal(contexto.obtenerConfig(proyecto.id).footerEnlace, "#");
assert.equal(contexto.obtenerConfig(inicial.proyectos[0].id).nombreSitio, "Mi Sitio");

const pagina = contexto.crearPaginaEnProyecto(proyecto.id, "Inicio");
const bloque = contexto.agregarBloque(pagina.id, "parrafo");
contexto.actualizarBloque(pagina.id, bloque.id, { colorTexto: 'red" onmouseover="alert(1)' });
const bloqueSeguro = contexto.obtenerPaginaPorId(pagina.id).bloques.find((item) => item.id === bloque.id);
assert.equal(bloqueSeguro.datos.colorTexto, "");

console.log("store.test.js: OK");
