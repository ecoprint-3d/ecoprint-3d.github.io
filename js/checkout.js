// checkout.js
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем данные пользователя и корзину
    loadCheckoutData();

    const pickupSelect = document.getElementById('pickupPoint');
        if (pickupSelect) {
            pickupSelect.innerHTML = '<option value="">Выберите пункт...</option>' +
                Utils.PICKUP_POINTS.map(point => 
                    `<option value="${point.id}">${point.fullName}</option>`
                ).join('');
        }
    
    // Обработчики событий
    document.getElementById('bonusAmount').addEventListener('input', updateOrderSummary);
    document.getElementById('submitOrder').addEventListener('click', submitOrder);
    
    // Автозаполнение данных пользователя если он авторизован
    autoFillUserData();
});

// Загрузка данных для оформления заказа
async function loadCheckoutData() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const cart = JSON.parse(sessionStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        alert('Ваша корзина пуста!');
        window.location.href = 'catalog.html';
        return;
    }
    
    // Обновляем список товаров
    updateOrderItems(cart);
    
    // Обновляем итоговую стоимость
    updateOrderSummary();
    
    // Показываем баланс бонусов
    if (currentUser) {
        document.getElementById('userBonusBalance').textContent = 
            currentUser.bonusBalance + ' баллов';
        
        // Устанавливаем максимальное количество бонусов
        const subtotal = calculateSubtotal(cart);
        const maxBonus = Math.min(currentUser.bonusBalance, Math.floor(subtotal * 0.9));
        document.getElementById('bonusAmount').max = maxBonus;
        
        // Автоматически заполняем email
        document.getElementById('email').value = currentUser.email;
    }
}

// Обновление списка товаров в заказе
function updateOrderItems(cart) {
    const orderItems = document.getElementById('orderItems');
    const subtotal = calculateSubtotal(cart);
    
    document.getElementById('subtotalPrice').textContent = subtotal + ' ₽';
    
    orderItems.innerHTML = cart.map(item => `
        <div class="order-item">
            <div class="order-item-image">${item.icon}</div>
            <div class="order-item-details">
                <div class="order-item-title">${item.name}</div>
                <div class="order-item-price">${item.price} ₽ × ${item.quantity}</div>
                <div class="order-item-quantity">${item.quantity} шт.</div>
            </div>
        </div>
    `).join('');
}

// Расчет общей стоимости
function calculateSubtotal(cart) {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Обновление итогов заказа
function updateOrderSummary() {
    const cart = JSON.parse(sessionStorage.getItem('cart')) || [];
    const subtotal = calculateSubtotal(cart);
    
    // Получаем количество бонусов для списания
    const bonusInput = document.getElementById('bonusAmount');
    const maxBonus = parseInt(bonusInput.max);
    let bonusToUse = parseInt(bonusInput.value) || 0;
    
    // Проверяем максимальное значение
    if (bonusToUse > maxBonus) {
        bonusToUse = maxBonus;
        bonusInput.value = maxBonus;
    }
    
    // Проверяем минимальное значение
    if (bonusToUse < 0) {
        bonusToUse = 0;
        bonusInput.value = 0;
    }
    
    // Рассчитываем итоговую стоимость
    const bonusValue = bonusToUse; // 1 балл = 1 рубль
    const finalPrice = Math.max(0, subtotal - bonusValue);
    
    // Обновляем отображение
    document.getElementById('usedBonus').textContent = 
        `${bonusToUse} баллов (${bonusValue} ₽)`;
    document.getElementById('finalPrice').textContent = finalPrice + ' ₽';
}

// Использовать максимальное количество бонусов (90%)
function useMaxBonus() {
    const cart = JSON.parse(sessionStorage.getItem('cart')) || [];
    const subtotal = calculateSubtotal(cart);
    const maxBonus = Math.floor(subtotal * 0.9);
    
    document.getElementById('bonusAmount').value = maxBonus;
    updateOrderSummary();
}

// Автозаполнение данных пользователя
function autoFillUserData() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (currentUser) {
        // Пробуем получить полное имя из профиля
        const userData = JSON.parse(sessionStorage.getItem('userProfileData'));
        if (userData && userData.fullName) {
            document.getElementById('fullName').value = userData.fullName;
        }
        
        // Если пользователь ввел телефон ранее (сохраняем в sessionStorage)
        const userPhone = sessionStorage.getItem('userPhone');
        if (userPhone) {
            document.getElementById('phone').value = userPhone;
        }
    }
}

// Отправка заказа
async function submitOrder() {
    // Валидация формы
    if (!validateForm()) {
        return;
    }
    
    // Получаем данные формы
    const orderData = collectOrderData();
    
    try {
        // Создаем заказ
        const order = await createOrder(orderData);
        
        // Показываем модальное окно успеха
        showSuccessModal(order);
        
        // Очищаем корзину
        sessionStorage.removeItem('cart');
        
        // Обновляем баланс бонусов
        if (orderData.paymentMethod === 'bonus') {
            updateUserBonusBalance(orderData.bonusUsed);
        }
        
        // Сохраняем телефон для будущих заказов
        sessionStorage.setItem('userPhone', orderData.phone);
        
    } catch (error) {
        console.error('Ошибка при оформлении заказа:', error);
        alert('Произошла ошибка при оформлении заказа. Попробуйте еще раз.');
    }
}

// Валидация формы
function validateForm() {
    const requiredFields = ['fullName', 'phone', 'email', 'pickupPoint'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            field.style.borderColor = '#f44336';
            isValid = false;
        } else {
            field.style.borderColor = '';
        }
    });
    
    if (!document.getElementById('agreeTerms').checked) {
        alert('Необходимо согласиться с условиями обработки данных');
        return false;
    }
    
    return isValid;
}

// Сбор данных заказа
function collectOrderData() {
    const cart = JSON.parse(sessionStorage.getItem('cart')) || [];
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    return {
        userId: currentUser?.id || null,
        userName: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        pickupPoint: document.getElementById('pickupPoint').value,
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        bonusUsed: parseInt(document.getElementById('bonusAmount').value) || 0,
        comment: document.getElementById('comment').value,
        items: cart,
        subtotal: calculateSubtotal(cart),
        finalPrice: parseInt(document.getElementById('finalPrice').textContent),
        date: new Date().toISOString(),
        status: 'pending' // pending, processing, ready, completed
    };
}

// Создание заказа
async function createOrder(orderData) {
    // Генерируем номер заказа
    const orderNumber = 'ECO-' + Date.now().toString().slice(-8);
    
    // Сохраняем заказ в sessionStorage
    const orders = JSON.parse(sessionStorage.getItem('orders')) || [];
    const order = {
        ...orderData,
        id: Date.now(),
        orderNumber: orderNumber,
        createdAt: new Date().toLocaleString('ru-RU')
    };
    
    orders.push(order);
    sessionStorage.setItem('orders', JSON.stringify(orders));
    
    console.log('Заказ создан:', order);
    
    // Здесь можно добавить отправку на сервер
    // await fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) });
    
    return order;
}

// Обновление баланса бонусов пользователя
function updateUserBonusBalance(bonusUsed) {
    if (bonusUsed <= 0) return;
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (currentUser) {
        currentUser.bonusBalance = (currentUser.bonusBalance || 0) - bonusUsed;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Также обновляем в основном списке пользователей
        const demoUsers = JSON.parse(sessionStorage.getItem('demoUsers')) || [];
        const userIndex = demoUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            demoUsers[userIndex].bonusBalance = currentUser.bonusBalance;
            sessionStorage.setItem('demoUsers', JSON.stringify(demoUsers));
        }
    }
}

// Показать модальное окно успеха
function showSuccessModal(order) {
    // Заполняем данные в модальном окне
    document.getElementById('orderNumber').textContent = order.orderNumber;
    document.getElementById('modalPickupPoint').textContent = 
        getPickupPointName(order.pickupPoint);
    document.getElementById('modalBonusUsed').textContent = order.bonusUsed + ' баллов';
    document.getElementById('modalFinalPrice').textContent = order.finalPrice + ' ₽';
    
    // Показываем модальное окно
    document.getElementById('successModal').style.display = 'flex';
}

// Получить название пункта выдачи
function getPickupPointName(pointId) {
    return Utils.getPickupPointFullName(pointId);
}

// Закрыть модальное окно
function closeModal() {
    document.getElementById('successModal').style.display = 'none';
    window.location.href = 'catalog.html';
}

// Экспортируем функции для использования в других файлах
window.useMaxBonus = useMaxBonus;
window.closeModal = closeModal;