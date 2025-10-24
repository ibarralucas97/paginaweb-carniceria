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
      // <p class="precio">$${p.precio}</p> (Comentado para arreglar tema punto en precio)
      card.innerHTML = `
        <img src="${p.img}" alt="${p.nombre}">
        <h3>${p.nombre}</h3>
        <p class="precio">$${p.precio.toLocaleString('es-AR')}</p>
        <p class="descripcion">${p.descripcion || ""}</p>
        <button onclick="agregar(${i})">Agregar</button>
        <span class="cantidad-badge"></span> <!-- NUEVO: badge -->
      `;
    }

    contenedor.appendChild(card);
  });
}

// --- Agregar producto al carrito ---
window.agregar = function (i) {
  carrito.push(productos[i]);
  renderCarrito();
  actualizarBadges();
};

// --- Eliminar producto del carrito ---
window.eliminarDelCarrito = function (index) {
  carrito.splice(index, 1);
  renderCarrito();
  actualizarBadges();
};

// --- NUEVO: función para actualizar badges ---
function actualizarBadges() {
  productos.forEach((p, i) => {
    const card = contenedor.children[i];
    if (!card) return;
    const badge = card.querySelector(".cantidad-badge");
    const cantidad = carrito.filter((prod) => prod.id === p.id).length;
    badge.textContent = cantidad > 0 ? cantidad : "";
  });
}

// --- Render del carrito agrupando productos iguales ---
function renderCarrito() {
  listaCarrito.innerHTML = "";
  let total = 0;

  const carritoAgrupado = {};
  carrito.forEach((p) => {
    if (carritoAgrupado[p.id]) {
      carritoAgrupado[p.id].cantidad++;
    } else {
      carritoAgrupado[p.id] = { ...p, cantidad: 1 };
    }
  });

  Object.values(carritoAgrupado).forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${p.cantidad} - ${p.nombre} $${p.precio}
      <button class="btn-eliminar" onclick="eliminarDelCarrito(${carrito.indexOf(p)})">❌</button>
    `;
    listaCarrito.appendChild(li);
    total += p.precio * p.cantidad;
  });

  totalSpan.textContent = total;
}

// --- Enviar pedido por WhatsApp ---
document.getElementById("enviarWsp").addEventListener("click", () => {
  if (carrito.length === 0) return alert("Agregá algo al carrito 😅");

  const texto = carrito.map((p) => `- ${p.nombre}: $${p.precio}`).join("%0A");
  const total = totalSpan.textContent;
  const mensaje = `Hola! Quiero hacer este pedido:%0A${texto}%0A%0ATotal: $${total}`;
  const numero = "5493515720047"; // NUEVO número
  window.open(`https://wa.me/${numero}?text=${mensaje}`);
});

// --- Modo administrador ---
document.getElementById("modoAdmin").addEventListener("click", () => {
  const pass = prompt("Ingrese contraseña de admin:");
  if (pass === "donlucas") {
    adminMode = !adminMode;
    adminPanel.classList.toggle("oculto");
    renderProductos();
  } else {
    alert("Contraseña incorrecta");
  }
});

// --- NUEVO: botón salir admin ---
document.getElementById("salirAdmin").addEventListener("click", () => {
  location.reload();
});

// --- Agregar producto (Firebase) ---
document.getElementById("agregar").addEventListener("click", async () => {
  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const descripcion = document.getElementById("descripcion").value.trim();
  const img = document.getElementById("imagen").value || "img/default.jpg";

  if (!nombre || !precio) return alert("Falta nombre o precio");

  try {
    const docRef = await addDoc(collection(db, "productos"), {
      nombre,
      precio,
      descripcion,
      img,
    });

    productos.push({ id: docRef.id, nombre, precio, descripcion, img });
    renderProductos();

    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("descripcion").value = "";
    document.getElementById("imagen").value = "";

    alert("Producto agregado ✅");
  } catch (error) {
    console.error("Error al agregar producto:", error);
  }
});

// --- Guardar cambios (Firebase) ---
window.guardar = async function (i) {
  const nuevoNombre = document.getElementById(`nombre-${i}`).value;
  const nuevoPrecio = parseFloat(document.getElementById(`precio-${i}`).value);
  const nuevaDescripcion = document.getElementById(`descripcion-${i}`).value;
  const nuevaImg = document.getElementById(`imgurl-${i}`).value;

  if (!nuevoNombre || !nuevoPrecio) return alert("Nombre o precio inválido");

  try {
    const productoRef = doc(db, "productos", productos[i].id);
    await updateDoc(productoRef, {
      nombre: nuevoNombre,
      precio: nuevoPrecio,
      descripcion: nuevaDescripcion,
      img: nuevaImg,
    });

    productos[i] = {
      id: productos[i].id,
      nombre: nuevoNombre,
      precio: nuevoPrecio,
      descripcion: nuevaDescripcion,
      img: nuevaImg,
    };

    renderProductos();
    alert("Producto guardado ✅");
  } catch (error) {
    console.error("Error al guardar producto:", error);
  }
};

// --- Borrar producto (Firebase) ---
window.borrar = async function (i) {
  if (!confirm("¿Seguro que querés borrar este producto?")) return;

  try {
    const productoRef = doc(db, "productos", productos[i].id);
    await deleteDoc(productoRef);
    productos.splice(i, 1);
    renderProductos();
    alert("Producto eliminado 🗑️");
  } catch (error) {
    console.error("Error al borrar producto:", error);
  }
};

// --- Iniciar carga ---
cargarProductos();
