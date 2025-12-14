// js/common.js — окончательная версия, всё работает как надо
document.addEventListener("DOMContentLoaded", function () {

    // Добавить в начало common.js после "DOMContentLoaded"
    const analyticsScript = document.createElement('script');
    analyticsScript.src = 'js/analytics.js';
    document.head.appendChild(analyticsScript);

    // Добавить отслеживание событий корзины
    window.addEventListener('cartUpdated', function() {
        if (window.EcoAnalytics) {
            // Уже отслеживается в analytics.js
        }
    });

    // Отслеживание успешного заказа
    window.addEventListener('orderComplete', function(event) {
        if (window.EcoAnalytics) {
            window.EcoAnalytics.trackEvent('cart', 'checkoutComplete');
            window.EcoAnalytics.trackConversion('order', event.detail.total);
        }
    });

    // Загрузка header и footer
    function loadFile(url, elementId, callback) {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
                document.getElementById(elementId).innerHTML = xhr.responseText;
                if (callback) callback();
            }
        };
        xhr.open("GET", url, true);
        xhr.send();
    }

    loadFile("includes/header.html", "header", initHeader);
    loadFile("includes/footer.html", "footer");

    // === Инициализация шапки ===
    function initHeader() {
        const authButtons = document.getElementById("auth-buttons");
        if (!authButtons) return;

        const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
        const cart = JSON.parse(sessionStorage.getItem("cart")) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

        const showCart = ["/catalog.html", "/product.html"].some(p => location.pathname.endsWith(p));

        const cartIconHTML = showCart ? `
            <div class="cart-icon" id="cartIcon" style="display-flex; margin-right:12px; font-size:23px; position:relative; text-align:center">
                🛒
                ${totalItems > 0 ? `<span class="cart-count" id="cartCount">${totalItems}</span>` : ''}
            </div>
        ` : "";

        if (currentUser) {
            authButtons.innerHTML = `
                ${cartIconHTML}
                <div style="display:flex; align-items:center; gap:10px;">
                    ${currentUser.role === "operator"
                        ? '<a href="operator.html" class="btn btn-login">Панель оператора</a>'
                        : '<a href="profile.html" class="btn btn-login">Личный кабинет</a>'
                    }
                    <a href="#" id="logoutBtn" class="btn btn-register">Выйти</a>
                </div>
            `;

            document.getElementById("logoutBtn")?.addEventListener("click", e => {
                e.preventDefault();
                sessionStorage.removeItem("currentUser");
                window.location.href = 'index.html';
            });

        } else {
            authButtons.innerHTML = `
                ${cartIconHTML}
                <a href="login.html" class="btn btn-login">Войти</a>
                <a href="register.html" class="btn btn-register">Зарегистрироваться</a>
            `;
        }

        // Открытие корзины по клику на иконку
        document.getElementById("cartIcon")?.addEventListener("click", () => {
            const sidebar = document.getElementById("cartSidebar");
            if (sidebar) {
                sidebar.classList.add("active");
                updateCartUI(); // обновляем содержимое при открытии
            }
        });

        if (currentUser && currentUser.role === 'operator') {
            // Добавляем ссылку на аналитику в навигацию
            const nav = document.querySelector('nav ul');
            if (nav) {
                const analyticsLink = document.createElement('li');
                analyticsLink.innerHTML = '<a href="analytics.html">Аналитика</a>';
                nav.appendChild(analyticsLink);
            }
        }
    }

    // === Обновление счётчика в шапке ===
    window.updateCartCount = function () {
        const cart = JSON.parse(sessionStorage.getItem("cart")) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        const badge = document.getElementById("cartCount");
        if (badge) {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? "block" : "none";
        }
    };

    // === Обновление содержимого боковой корзины ===
    window.updateCartUI = function () {
        const cart = JSON.parse(sessionStorage.getItem("cart")) || [];
        const container = document.getElementById("cartItems");
        const totalEl = document.getElementById("cartTotal");

        if (!container || !totalEl) return;

        if (cart.length === 0) {
            container.innerHTML = '<div class="cart-empty">Корзина пуста</div>';
            totalEl.textContent = "Итого: 0 ₽";
            updateCartCount();
            return;
        }

        container.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">${item.icon}</div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">${item.price} ₽</div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn" onclick="changeQuantity(${item.id}, -1)">−</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1"
                            onchange="changeQuantity(${item.id}, this.value - ${item.quantity})">
                        <button class="quantity-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                        <button class="remove-item" onclick="removeFromCart(${item.id}); event.stopPropagation(); return false;">Delete</button>
                    </div>
                </div>
            </div>
        `).join("");

        const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        totalEl.textContent = `Итого: ${total} ₽`;
        updateCartCount();
    };

    // === Универсальные функции корзины ===
    window.addToCart = function (productId) {
        const products = window.products || [];
        const product = products.find(p => p.id === productId);
        if (!product) return;

        let cart = JSON.parse(sessionStorage.getItem("cart")) || [];
        const exists = cart.find(i => i.id === productId);

        if (exists) {
            exists.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        sessionStorage.setItem("cart", JSON.stringify(cart));
        
        // Обновляем счетчик в header
        updateCartCount();
        
        // ПЕРЕДЕЛАННОЕ: переинициализируем header, чтобы обновить иконку корзины
        if (typeof initHeader === 'function') {
            initHeader();
        }

        // Уведомление
        const n = document.createElement("div");
        n.textContent = `${product.name} добавлен в корзину!`;
        n.style.cssText = "position:fixed;top:20px;right:20px;background:#2e7d32;color:white;padding:15px 25px;border-radius:8px;z-index:10000;box-shadow:0 4px 15px rgba(0,0,0,0.2);font-size:15px;";
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 2500);
    };
    
    window.changeQuantity = function (id, delta) {
        let cart = JSON.parse(sessionStorage.getItem("cart")) || [];
        const item = cart.find(i => i.id === id);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
            sessionStorage.setItem("cart", JSON.stringify(cart));
            updateCartUI();
        }
    };

    window.removeFromCart = function (id) {
        let cart = JSON.parse(sessionStorage.getItem("cart")) || [];
        cart = cart.filter(i => i.id !== id);
        sessionStorage.setItem("cart", JSON.stringify(cart));
        updateCartUI();
    };

    // Закрытие корзины
    document.getElementById("closeCart")?.addEventListener("click", () => {
        document.getElementById("cartSidebar")?.classList.remove("active");
    });

    // Закрытие по клику вне корзины
    document.addEventListener("click", e => {
        const sidebar = document.getElementById("cartSidebar");
        const icon = document.getElementById("cartIcon");
        if (sidebar && !sidebar.contains(e.target) && !icon?.contains(e.target)) {
            sidebar.classList.remove("active");
        }
    });

    // Кнопка "Оформить заказ" — точно как у тебя было
    document.getElementById("checkoutBtn")?.addEventListener("click", function () {
        const cart = JSON.parse(sessionStorage.getItem("cart")) || [];
        if (cart.length === 0) {
            alert("Корзина пуста!");
            return;
        }

        const user = JSON.parse(sessionStorage.getItem("currentUser"));
        if (!user) {
            alert("Для оформления заказа необходимо войти в систему");
            document.getElementById("cartSidebar")?.classList.remove("active");
            setTimeout(() => location.href = "login.html", 300);
            return;
        }

        // Перенаправляем на страницу оформления заказа
        document.getElementById("cartSidebar")?.classList.remove("active");
        setTimeout(() => location.href = "checkout.html", 300);
    });

    window.performLogout = function() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        sessionStorage.removeItem("currentUser");
        // Опционально: sessionStorage.removeItem("cart"); // если хотите очищать корзину
        window.location.href = 'index.html';
        }
    };

    // Инициализация при загрузке
    updateCartCount();
    updateCartUI();
});