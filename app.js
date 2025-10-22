// --- Firebase ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyA6bQd9gGlIhDfqIzqZaFigNi2k4YuiY54",
  authDomain: "carniceria-lucas.firebaseapp.com",
  projectId: "carniceria-lucas",
  storageBucket: "carniceria-lucas.appspot.com",
  messagingSenderId: "285806072223",
  appId: "1:285806072223:web:7dcde9d3b7e1f2b1bf6daa",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Variables ---
let productos = [];
let carrito = [];
let adminMode = false;

// --- Elementos del DOM ---
const contenedor = document.getElementById("productos");
const listaCarrito = document.getElementById("lista-carrito");
const totalSpan = document.getElementById("total");
const adminPanel = document.getElementById("adminPanel");

// --- Cargar productos desde Firebase ---
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

// --- Agregar producto al carrito ---
window.agregar = function (i) {
  carrito.push(productos[i]);
  renderCarrito();
};

// --- Eliminar producto del carrito ---
window.eliminarDelCarrito = function (index) {
  carrito.splice(index, 1);
  renderCarrito();
};

// --- Render del carrito ---
function renderCarrito() {
  listaCarrito.innerHTML = "";
  let total = 0;

  carrito.forEach((p, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${p.nombre} - $${p.precio}
      <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">❌</button>
    `;
    listaCarrito.appendChild(li);
    total += p.precio;
  });

  totalSpan.textContent = total;
}

// --- Enviar pedido por WhatsApp ---
document.getElementById("enviarWsp").addEventListener("click", () => {
  if (

