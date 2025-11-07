
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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

// --- Configuración Firebase ---
import { ADMIN_TOKEN } from "./admin-token.js";
import { firebaseConfig } from "./firebase-config.js";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Variables ---
let productos = [];
let carrito = [];
let adminMode = false;
let imagenArchivo = null;

// --- Elementos del DOM ---
const contenedor = document.getElementById("productos");
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
      card.innerHTML = `
        <img src="${p.img}" alt="${p.nombre}" id="img-${i}" class="editable-img">
        <input type="text" id="nombre-${i}" value="${p.nombre}" placeholder="Nombre">
        <input type="number" id="precio-${i}" value="${p.precio}" placeholder="Precio">
        <input type="text" id="descripcion-${i}" value="${p.descripcion || ''}" placeholder="Descripción">
        <input type="text" id="imgurl-${i}" value="${p.img}" placeholder="URL de imagen (opcional)">
        <div style="margin-top:5px;">
          <button onclick="guardar(${i})">💾 Guardar</button>
          <button onclick="borrar(${i})">🗑️ Borrar</button>
        </div>
      `;
    } else {
      card.innerHTML = `
        <img src="${p.img}" alt="${p.nombre}">
        <h3>${p.nombre}</h3>
        <p class="precio">$${p.precio.toLocaleString('es-AR')}</p>
        <p class="descripcion">${p.descripcion || ""}</p>
        <button onclick="agregar(${i})">Agregar</button>
        <span class="cantidad-badge"></span>
      `;
    }

    contenedor.appendChild(card);
  });
}

// --- Agregar producto al carrito ---
window.agregar = function (i) {
  carrito.push(productos[i]);
  actualizarBadges();
  actualizarBotonCarrito();
};

// --- Eliminar producto del carrito ---
window.eliminarDelCarrito = function (id) {
  const index = carrito.findIndex((p) => p.id === id);
  if (index !== -1) carrito.splice(index, 1);
  renderCarritoModal();
  actualizarBadges();
  actualizarBotonCarrito();
};

// --- Actualizar badges ---
function actualizarBadges() {
  productos.forEach((p, i) => {
    const card = contenedor.children[i];
    if (!card) return;
    const badge = card.querySelector(".cantidad-badge");
    const cantidad = carrito.filter((prod) => prod.id === p.id).length;
    badge.textContent = cantidad > 0 ? cantidad : "";
  });
}

// --- Modo administrador ---
document.getElementById("modoAdmin").addEventListener("click", async () => {
  const { value: password } = await Swal.fire({
    title: "🔐 Ingreso administrador",
    input: "password",
    inputLabel: "Contraseña",
    inputPlaceholder: "Ingresá la contraseña",
    confirmButtonText: "Entrar",
    showCancelButton: true,
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c62828",
    cancelButtonColor: "#777",
  });

  if (password === "donlucas") {
    Swal.fire({
      icon: "success",
      title: "Bienvenido al panel 🧑‍💼",
      timer: 1500,
      showConfirmButton: false,
    });
    adminMode = true;
    adminPanel.classList.toggle("oculto");
    renderProductos();
  } else if (password) {
    Swal.fire({
      icon: "error",
      title: "Contraseña incorrecta ❌",
      confirmButtonColor: "#c62828",
    });
  }
});

// --- Salir del modo admin ---
document.getElementById("salirAdmin").addEventListener("click", () => location.reload());

// --- Subida de imagen ---
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.addEventListener("change", (e) => (imagenArchivo = e.target.files[0]));
document.querySelector(".formulario").appendChild(fileInput);

// --- Agregar producto ---
document.getElementById("agregar").addEventListener("click", async () => {
  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const descripcion = document.getElementById("descripcion").value.trim();
  const urlManual = document.getElementById("imagen").value.trim();

  if (!nombre || !precio) return alert("Falta nombre o precio");

  let imgURL = urlManual || "img/default.jpg";

  try {
    if (imagenArchivo) {
      const storageRef = ref(storage, `productos/${Date.now()}_${imagenArchivo.name}`);
      await uploadBytes(storageRef, imagenArchivo, {
        customMetadata: { adminToken: ADMIN_TOKEN },
      });
      imgURL = await getDownloadURL(storageRef);
      imagenArchivo = null;
    }

    const docRef = await addDoc(collection(db, "productos"), {
      nombre,
      precio,
      descripcion,
      img: imgURL,
      adminToken: ADMIN_TOKEN,
    });

    productos.push({ id: docRef.id, nombre, precio, descripcion, img: imgURL });
    renderProductos();

    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("descripcion").value = "";
    document.getElementById("imagen").value = "";
    fileInput.value = "";

    alert("Producto agregado ✅");
  } catch (error) {
    console.error("Error al agregar producto:", error);
  }
});

// --- Guardar cambios ---
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
      adminToken: ADMIN_TOKEN,
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

// --- Borrar producto (con confirmación) ---
window.borrar = async function (i) {
  const confirmacion = await Swal.fire({
    title: "¿Eliminar producto?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#c62828",
    cancelButtonColor: "#777",
    confirmButtonText: "Sí, borrar",
    cancelButtonText: "Cancelar",
  });

  if (!confirmacion.isConfirmed) return;

  try {
    const productoRef = doc(db, "productos", productos[i].id);
    await deleteDoc(productoRef);
    productos.splice(i, 1);
    renderProductos();
    Swal.fire({
      icon: "success",
      title: "Producto eliminado 🗑️",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Error al borrar producto:", error);
  }
};

// --- 🛒 Botón flotante y modal del carrito ---
const btnCarritoFlotante = document.getElementById("btnCarritoFlotante");
const totalFlotante = document.getElementById("totalFlotante");
const modalCarrito = document.getElementById("modalCarrito");
const listaCarritoModal = document.getElementById("listaCarritoModal");
const totalModal = document.getElementById("totalModal");
const cerrarCarrito = document.getElementById("cerrarCarrito");
const enviarWspModal = document.getElementById("enviarWspModal");

function actualizarBotonCarrito() {
  const total = carrito.reduce((sum, p) => sum + p.precio, 0);
  totalFlotante.textContent = `$${total.toLocaleString('es-AR')}`;
  btnCarritoFlotante.classList.toggle("oculto", carrito.length === 0);
}

btnCarritoFlotante.addEventListener("click", () => {
  renderCarritoModal();
  modalCarrito.classList.remove("oculto");
});

cerrarCarrito.addEventListener("click", () => {
  modalCarrito.classList.add("oculto");
});

function renderCarritoModal() {
  listaCarritoModal.innerHTML = "";
  let total = 0;
  const agrupado = {};

  carrito.forEach((p) => {
    if (agrupado[p.id]) agrupado[p.id].cantidad++;
    else agrupado[p.id] = { ...p, cantidad: 1 };
  });

  Object.values(agrupado).forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${p.cantidad} × ${p.nombre} — $${p.precio.toLocaleString('es-AR')}
      <button class="btn-eliminar-modal" onclick="window.eliminarDelCarrito('${p.id}')">❌</button>
    `;
    listaCarritoModal.appendChild(li);
    total += p.precio * p.cantidad;
  });

  totalModal.textContent = `Total: $${total.toLocaleString('es-AR')}`;
}

enviarWspModal.addEventListener("click", () => {
  if (carrito.length === 0) return alert("Agregá algo al carrito 😅");

  const agrupado = {};
  carrito.forEach((p) => {
    if (agrupado[p.nombre]) agrupado[p.nombre].cantidad++;
    else agrupado[p.nombre] = { precio: p.precio, cantidad: 1 };
  });

  const texto = Object.entries(agrupado)
    .map(([nombre, datos]) => `- ${nombre} x${datos.cantidad}: $${datos.precio.toLocaleString('es-AR')}`)
    .join("%0A");

  const total = carrito.reduce((sum, p) => sum + p.precio, 0);
  const mensaje = `Hola! Quiero hacer este pedido:%0A${texto}%0A%0ATotal: $${total.toLocaleString('es-AR')}`;
  const numero = "5493515720047";
  window.open(`https://wa.me/${numero}?text=${mensaje}`);
});

// --- Iniciar carga ---
cargarProductos();


