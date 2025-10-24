// ==============================
// app.js - JS principal de la página
// Conexión a Firebase / Firestore
// Lógica del carrito (agrupación, total)
// Toasts flotantes (avisos)
// Badge de cantidad por producto
// Modo Admin: agregar, editar, borrar, salir
// ==============================

// ----------- IMPORTS DE FIREBASE -----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// ----------- CONFIGURACIÓN FIREBASE -----------
const firebaseConfig = {
  apiKey: "AIzaSyA6bQd9gGlIhDfqIzqZaFigNi2k4YuiY54",
  authDomain: "carniceria-lucas.firebaseapp.com",
  projectId: "carniceria-lucas",
  storageBucket: "carniceria-lucas.appspot.com",
  messagingSenderId: "285806072223",
  appId: "1:285806072223:web:7dcde9d3b7e1f2b1bf6daa",
};

// Inicializa la app y la base de datos
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ----------- ELEMENTOS DEL DOM -----------
const productosContainer = document.getElementById("productos");
const listaCarrito = document.getElementById("lista-carrito");
const totalEl = document.getElementById("total");
const enviarWspBtn = document.getElementById("enviarWsp");
const adminPanel = document.getElementById("adminPanel");
const modoAdminBtn = document.getElementById("modoAdmin");

const inputNombre = document.getElementById("nombre");
const inputPrecio = document.getElementById("precio");
const inputImagen = document.getElementById("imagen");
const inputDesc = document.getElementById("descripcion"); // si agregás el campo descripción
const agregarBtn = document.getElementById("agregar");

// ----------- VARIABLES PRINCIPALES -----------
let carrito = {}; // Guarda productos agrupados {id: {nombre, precio, cantidad}}
let productos = []; // Lista general de productos del Firestore
const telefonoWsp = "5493515720047"; // Número de destino del WhatsApp

// ===================================================
// FUNCIÓN: Mostrar aviso flotante (toast)
// ===================================================
function mostrarToast(mensaje) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = mensaje;
  document.body.appendChild(toast);

  // Animación de entrada y salida
  setTimeout(() => toast.classList.add("visible"), 100);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 400);
  }, 2000);
}

// ===================================================
// FUNCIÓN: Renderizar lista de productos en pantalla
// ===================================================
function mostrarProductos() {
  productosContainer.innerHTML = "";
  productos.forEach((p) => {
    const card = document.createElement("div");
    card.className = "producto";
    card.innerHTML = `
      <img src="${p.imagen}" alt="${p.nombre}">
      <h3>${p.nombre}</h3>
      <p>$${p.precio}</p>
      <button class="agregar" data-id="${p.id}">Agregar</button>
      <span class="badge oculto" id="badge-${p.id}">0</span>
    `;
    productosContainer.appendChild(card);
  });

  // Escuchar clicks de cada botón "Agregar"
  document.querySelectorAll(".agregar").forEach((btn) => {
    btn.addEventListener("click", () => agregarAlCarrito(btn.dataset.id));
  });
}

// ===================================================
// FUNCIÓN: Cargar productos desde Firestore
// ===================================================
async function cargarProductos() {
  try {
    contenedor.innerHTML = "<p>Cargando productos...</p>";
    const snapshot = await getDocs(collection(db, "productos"));
    productos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderProductos();
  } catch (error) {
    contenedor.innerHTML = "<p>Error al cargar productos 😢</p>";
    console.error("Error al obtener productos:", error);
  }
}

// --- Renderizar productos ---
function renderProductos() {
  contenedor.innerHTML = "";

  if (productos.length === 0) {
    contenedor.innerHTML = "<p>No hay productos cargados todavía 🥩</p>";
    return;
  }

  productos.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "producto";

    if (adminMode) {
      // --- Vista admin ---
      card.innerHTML = `
        <img src="${p.img}" alt="${p.nombre}" id="img-${i}" class="editable-img">
        <input type="text" id="nombre-${i}" value="${p.nombre}" placeholder="Nombre">
        <input type="number" id="precio-${i}" value="${p.precio}" placeholder="Precio">
        <input type="text" id="descripcion-${i}" value="${p.descripcion || ''}" placeholder="Descripción">
        <input type="text" id="imgurl-${i}" value="${p.img}" placeholder="URL de imagen">
        <div style="margin-top:5px;">
          <button onclick="guardar(${i})">💾 Guardar</button>
          <button onclick="borrar(${i})">🗑️ Borrar</button>
        </div>
      `;
    } else {
      // --- Vista cliente ---
      card.innerHTML = `
        <img src="${p.img}" alt="${p.nombre}">
        <h3>${p.nombre}</h3>
        <p class="precio">$${p.precio}</p>
        <p class="descripcion">${p.descripcion || ""}</p>
        <button onclick="agregar(${i})">Agregar</button>
      `;
    }

    contenedor.appendChild(card);
  });
}

// ===================================================
// FUNCIÓN: Agregar producto al carrito
// ===================================================
function agregarAlCarrito(id) {
  const producto = productos.find((p) => p.id === id);
  if (!producto) return;

  // Si ya existe, aumenta cantidad; si no, lo agrega
  if (carrito[id]) {
    carrito[id].cantidad++;
  } else {
    carrito[id] = { ...producto, cantidad: 1 };
  }

  mostrarCarrito();
  actualizarBadge(id);
  mostrarToast(`${producto.nombre} agregado al carrito 🛒`);
}

// ===================================================
// FUNCIÓN: Mostrar productos agrupados en carrito
// ===================================================
function mostrarCarrito() {
  listaCarrito.innerHTML = "";
  let total = 0;

  Object.values(carrito).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.cantidad} - ${item.nombre} ($${item.precio * item.cantidad})`;
    listaCarrito.appendChild(li);
    total += item.precio * item.cantidad;
  });

  totalEl.textContent = total;
}

// ===================================================
// FUNCIÓN: Actualizar número (badge) sobre cada producto
// ===================================================
function actualizarBadge(id) {
  const badge = document.getElementById(`badge-${id}`);
  if (!badge) return;

  const cantidad = carrito[id]?.cantidad || 0;
  badge.textContent = cantidad;
  badge.classList.toggle("oculto", cantidad === 0);
}

// ===================================================
// FUNCIÓN: Enviar pedido por WhatsApp
// ===================================================
enviarWspBtn.addEventListener("click", () => {
  if (Object.keys(carrito).length === 0) {
    mostrarToast("El carrito está vacío 🛒");
    return;
  }

  let mensaje = "Hola! Quiero hacer este pedido:%0A";
  Object.values(carrito).forEach((item) => {
    mensaje += `• ${item.cantidad}x ${item.nombre} - $${item.precio * item.cantidad}%0A`;
  });

  mensaje += `%0ATotal: $${totalEl.textContent}`;
  window.open(`https://wa.me/${telefonoWsp}?text=${mensaje}`, "_blank");
});

// ===================================================
// FUNCIÓN: Agregar producto nuevo (modo admin)
// ===================================================
agregarBtn.addEventListener("click", async () => {
  const nombre = inputNombre.value.trim();
  const precio = parseFloat(inputPrecio.value);
  const imagen = inputImagen.value.trim();
  const descripcion = inputDesc ? inputDesc.value.trim() : "";

  if (!nombre || !precio || !imagen) {
    mostrarToast("Faltan campos obligatorios ⚠️");
    return;
  }

  await addDoc(collection(db, "productos"), {
    nombre,
    precio,
    imagen,
    descripcion,
  });

  mostrarToast("Producto agregado ✅");
  inputNombre.value = inputPrecio.value = inputImagen.value = "";
  if (inputDesc) inputDesc.value = "";

  cargarProductos(); // refresca la lista
});

// ===================================================
// FUNCIÓN: Modo Admin - Mostrar / Ocultar panel
// ===================================================
modoAdminBtn.addEventListener("click", () => {
  adminPanel.classList.toggle("oculto");
  if (!adminPanel.classList.contains("oculto")) {
    mostrarToast("Modo administrador activado 🧑‍💻");
  }
});

// ===================================================
// FUNCIÓN: Botón para salir del modo admin y recargar
// ===================================================
const salirBtn = document.createElement("button");
salirBtn.textContent = "Salir del modo Admin";
salirBtn.className = "btn-salir";
salirBtn.addEventListener("click", () => {
  adminPanel.classList.add("oculto");
  location.reload(); // recarga la página para ver cambios
});
adminPanel.appendChild(salirBtn);

// ===================================================
// FUNCIÓN INICIAL: cargar todo al abrir la página
// ===================================================
window.addEventListener("DOMContentLoaded", cargarProductos);

