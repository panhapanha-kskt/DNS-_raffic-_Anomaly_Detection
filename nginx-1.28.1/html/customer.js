// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjvbEt7S7n9KY80KifkqLMUuJcZ1KhhYc",
  authDomain: "mobile-online-shop-foryou.firebaseapp.com",
  projectId: "mobile-online-shop-foryou",
  storageBucket: "mobile-online-shop-foryou.firebasestorage.app",
  messagingSenderId: "213171588341",
  appId: "1:213171588341:web:87a9bdbed780bc855749bc",
  measurementId: "G-KGJGKPKJXY",
};

// Check if Firebase is available
if (typeof firebase === "undefined") {
  console.error(
    "Firebase SDK not loaded. Please check your internet connection.",
  );
  document.getElementById("phones-container").innerHTML =
    "<p>Error: Firebase SDK not loaded. Please check your internet connection and refresh.</p>";
} else {
  console.log("Firebase SDK loaded successfully");
}

// Initialize Firebase
let auth, db;
try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
  document.getElementById("phones-container").innerHTML =
    "<p>Error initializing app. Please check console for details.</p>";
}

// Global variables
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let currentUser = null;

// Initialize the application
function initializeApp() {
  console.log("Initializing application...");

  // Set up event listeners
  setupEventListeners();

  // Set up auth state listener
  if (auth) {
    auth.onAuthStateChanged(handleAuthStateChange);
  } else {
    console.error("Auth service not available");
  }

  // Load phones
  loadPhones();

  // Initialize cart count
  updateCartCount();

  console.log("Application initialized");
}

// Handle auth state changes
function handleAuthStateChange(user) {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    loadUserOrders();
  }
}

// Set up event listeners
function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Auth buttons
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginSubmit = document.getElementById("login-submit");
  const registerSubmit = document.getElementById("register-submit");

  if (loginBtn) loginBtn.addEventListener("click", showLogin);
  if (registerBtn) registerBtn.addEventListener("click", showRegister);
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
  if (loginSubmit) loginSubmit.addEventListener("click", login);
  if (registerSubmit) registerSubmit.addEventListener("click", register);

  // Cart buttons
  const cartIcon = document.getElementById("cart-icon");
  const checkoutBtn = document.getElementById("checkout-btn");
  const completePaymentBtn = document.getElementById("complete-payment");

  if (cartIcon) cartIcon.addEventListener("click", showCart);
  if (checkoutBtn) checkoutBtn.addEventListener("click", checkout);
  if (completePaymentBtn)
    completePaymentBtn.addEventListener("click", completePayment);

  // Close buttons
  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", function () {
      const modal = this.closest(".modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  });

  // Close modals when clicking outside
  window.addEventListener("click", function (event) {
    const modals = document.getElementsByClassName("modal");
    for (const modal of modals) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }
  });
}

// Update authentication UI
function updateAuthUI(user) {
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const userEmail = document.getElementById("user-email");
  const ordersSection = document.getElementById("orders-section");

  if (user) {
    if (loginBtn) loginBtn.style.display = "none";
    if (registerBtn) registerBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (userEmail && user.email) {
        const username = user.email.split("@")[0];
        userEmail.textContent = `Welcome, ${username}`;
    }

    if (ordersSection) {
      ordersSection.style.display = "block";
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (registerBtn) registerBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userEmail) userEmail.textContent = "";

    if (ordersSection) {
      ordersSection.style.display = "none";
    }
  }
}

// Auth Functions
function showLogin() {
  document.getElementById("login-modal").style.display = "block";
}

function showRegister() {
  document.getElementById("register-modal").style.display = "block";
}

async function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    showMessage("Please enter email and password", "error");
    return;
  }

  try {
    if (!auth) {
      throw new Error("Authentication service not available");
    }

    await auth.signInWithEmailAndPassword(email, password);
    document.getElementById("login-modal").style.display = "none";
    showMessage("Login successful!", "success");
  } catch (error) {
    console.error("Login error:", error);
    showMessage(`Login failed: ${error.message}`, "error");
  }
}

async function register() {
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  if (!email || !password) {
    showMessage("Please enter email and password", "error");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters", "error");
    return;
  }

  try {
    if (!auth) {
      throw new Error("Authentication service not available");
    }

    await auth.createUserWithEmailAndPassword(email, password);
    document.getElementById("register-modal").style.display = "none";
    showMessage("Registration successful!", "success");
  } catch (error) {
    console.error("Registration error:", error);
    showMessage(`Registration failed: ${error.message}`, "error");
  }
}

async function logout() {
  try {
    if (!auth) {
      throw new Error("Authentication service not available");
    }

    await auth.signOut();
    showMessage("Logged out successfully!", "success");
  } catch (error) {
    console.error("Logout error:", error);
    showMessage(error.message, "error");
  }
}

// Load Phones
async function loadPhones() {
  if (!db) {
    console.error("Database not available");
    document.getElementById("phones-container").innerHTML =
      "<p>Database connection error. Please refresh the page.</p>";
    return;
  }

  try {
    const phonesRef = db.collection("phones");
    const snapshot = await phonesRef.where("stock", ">", 0).get();
    const container = document.getElementById("phones-container");

    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = "<p>No phones available at the moment.</p>";
      return;
    }

    container.innerHTML = "";
    snapshot.forEach((doc) => {
      const phone = { id: doc.id, ...doc.data() };
      const phoneCard = createPhoneCard(phone);
      container.appendChild(phoneCard);
    });
  } catch (error) {
    console.error("Error loading phones:", error);
    const container = document.getElementById("phones-container");
    if (container) {
      container.innerHTML =
        "<p>Error loading products. Please try again later.</p>";
    }
  }
}

function createPhoneCard(phone) {
  const div = document.createElement("div");
  div.className = "phone-card";

  // Check if already in cart
  const cartItem = cart.find((item) => item.id === phone.id);
  const inCartCount = cartItem ? cartItem.quantity : 0;
  const availableStock = phone.stock - inCartCount;

  div.innerHTML = `
        <img src="${phone.image || "https://via.placeholder.com/200x150?text=Phone"}" alt="${phone.name}">
        <h3>${phone.name}</h3>
        <p>${phone.description || "Premium smartphone"}</p>
        <div class="price">$${phone.price ? phone.price.toFixed(2) : "0.00"}</div>
        <div class="stock">Available: ${availableStock}</div>
        <button class="add-to-cart-btn" ${availableStock <= 0 ? "disabled" : ""}>
            ${availableStock <= 0 ? "Out of Stock" : "Add to Cart"}
        </button>
        ${inCartCount > 0 ? `<div style="color: #4CAF50; margin-top: 5px;">In cart: ${inCartCount}</div>` : ""}
    `;

  // Add event listener to the button
  const addToCartBtn = div.querySelector(".add-to-cart-btn");
  addToCartBtn.addEventListener("click", function () {
    addToCart(phone.id, phone.name, phone.price || 0, phone.stock || 0);
  });

  return div;
}

// Cart Functions
function addToCart(phoneId, name, price, stock) {
  const existingItem = cart.find((item) => item.id === phoneId);

  if (existingItem) {
    if (existingItem.quantity < stock) {
      existingItem.quantity++;
    } else {
      showMessage("Not enough stock available!", "error");
      return;
    }
  } else {
    cart.push({ id: phoneId, name, price, quantity: 1 });
  }

  updateCart();
  loadPhones(); // Refresh to update available stock
  showMessage(`${name} added to cart!`, "success");
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
  loadPhones();
}

function updateCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  if (document.getElementById("cart-modal").style.display === "block") {
    showCart();
  }
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    cartCountElement.textContent = count;
  }
}

function showCart() {
  const modal = document.getElementById("cart-modal");
  const cartItems = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("checkout-btn");

  if (!modal || !cartItems || !cartTotal) return;

  if (cart.length === 0) {
    cartItems.innerHTML = "<p>Your cart is empty</p>";
    cartTotal.innerHTML = "";
    if (checkoutBtn) checkoutBtn.disabled = true;
  } else {
    let total = 0;
    cartItems.innerHTML = "";

    cart.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;

      const itemDiv = document.createElement("div");
      itemDiv.className = "cart-item";
      itemDiv.innerHTML = `
                <div>
                    <strong>${item.name}</strong><br>
                    $${item.price.toFixed(2)} × ${item.quantity}
                </div>
                <div>
                    <strong>$${itemTotal.toFixed(2)}</strong>
                    <button class="remove-from-cart-btn" data-index="${index}" style="margin-left: 10px; background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Remove</button>
                </div>
            `;
      cartItems.appendChild(itemDiv);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll(".remove-from-cart-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const index = parseInt(this.getAttribute("data-index"));
        removeFromCart(index);
      });
    });

    cartTotal.innerHTML = `<h3>Total: $${total.toFixed(2)}</h3>`;
    if (checkoutBtn) checkoutBtn.disabled = false;
  }

  modal.style.display = "block";
}

// Checkout and Payment
function checkout() {
  if (!currentUser) {
    showMessage("Please login to checkout!", "error");
    showLogin();
    return;
  }

  if (cart.length === 0) {
    showMessage("Your cart is empty!", "error");
    return;
  }

  document.getElementById("cart-modal").style.display = "none";

  // Show payment modal
  const modal = document.getElementById("payment-modal");
  const summary = document.getElementById("payment-summary");

  if (!modal || !summary) return;

  let total = 0;
  let summaryHTML = "<h3>Order Summary</h3>";
  cart.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    summaryHTML += `<p>${item.name} × ${item.quantity}: $${itemTotal.toFixed(2)}</p>`;
  });
  summaryHTML += `<h4>Total: $${total.toFixed(2)}</h4>`;

  summary.innerHTML = summaryHTML;
  modal.style.display = "block";
}

async function completePayment() {
  try {
    if (!db) {
      throw new Error("Database not ready. Please try again.");
    }

    if (!currentUser) {
      throw new Error("You must be logged in to complete payment.");
    }

    // Check stock availability
    for (const item of cart) {
      const phoneRef = db.collection("phones").doc(item.id);
      const phoneDoc = await phoneRef.get();

      if (!phoneDoc.exists) {
        throw new Error(`${item.name} is no longer available`);
      }

      const currentStock = phoneDoc.data().stock;
      if (currentStock < item.quantity) {
        throw new Error(`Only ${currentStock} ${item.name} available in stock`);
      }
    }

    // Create order
    const orderData = {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      items: cart,
      total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      status: "completed",
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };

    // Update stock and create order in a batch
    const batch = db.batch();

    // Update stock for each phone
    cart.forEach((item) => {
      const phoneRef = db.collection("phones").doc(item.id);
      batch.update(phoneRef, {
        stock: firebase.firestore.FieldValue.increment(-item.quantity),
      });
    });

    // Add order
    const orderRef = db.collection("orders").doc();
    batch.set(orderRef, orderData);

    await batch.commit();

    // Clear cart
    cart = [];
    updateCart();

    // Show success
    document.getElementById("payment-modal").style.display = "none";
    showMessage("Payment successful! Thank you for your purchase.", "success");

    // Refresh phone list and load orders
    loadPhones();
    loadUserOrders();
  } catch (error) {
    console.error("Payment error:", error);
    showMessage(`Payment failed: ${error.message}`, "error");
  }
}

// Load user orders
async function loadUserOrders() {
  if (!currentUser || !db) return;

  try {
    const ordersRef = db.collection("orders");
    const snapshot = await ordersRef
      .where("userId", "==", currentUser.uid)
      .orderBy("timestamp", "desc")
      .get();

    const container = document.getElementById("orders-container");
    if (!container) return;

    if (snapshot.empty) {
      container.innerHTML = "<p>No orders yet.</p>";
      return;
    }

    container.innerHTML = "";
    snapshot.forEach((doc) => {
      const order = { id: doc.id, ...doc.data() };
      const orderCard = createOrderCard(order);
      container.appendChild(orderCard);
    });
  } catch (error) {
    console.error("Error loading orders:", error);
  }
}

function createOrderCard(order) {
  const div = document.createElement("div");
  div.className = "order-card";

  let itemsHTML = "";
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((item) => {
      itemsHTML += `
                <div class="order-item">
                    <span>${item.name} × ${item.quantity}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `;
    });
  }

  const date =
    order.timestamp && order.timestamp.toDate
      ? order.timestamp.toDate().toLocaleString()
      : "Just now";

  div.innerHTML = `
        <h4>Order #${order.id ? order.id.substring(0, 8) : "N/A"} - ${date}</h4>
        ${itemsHTML}
        <div class="order-total">Total: $${order.total ? order.total.toFixed(2) : "0.00"}</div>
        <div style="color: #4CAF50; margin-top: 5px;">Status: ${order.status || "completed"}</div>
    `;

  return div;
}

// Utility Functions
function showMessage(message, type) {
  // Remove existing messages
  document.querySelectorAll(".message-notification").forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  const messageDiv = document.createElement("div");
  messageDiv.className = "message-notification";
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === "error" ? "#f44336" : type === "info" ? "#2196F3" : "#4CAF50"};
        color: white;
        border-radius: 5px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        max-width: 400px;
        word-wrap: break-word;
    `;

  document.body.appendChild(messageDiv);

  setTimeout(() => {
    messageDiv.style.animation = "slideOut 0.3s ease";
    setTimeout(() => {
      if (messageDiv.parentNode) {
        document.body.removeChild(messageDiv);
      }
    }, 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .message-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        color: white;
        border-radius: 5px;
        z-index: 1001;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
`;
document.head.appendChild(style);

// Start the app when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
