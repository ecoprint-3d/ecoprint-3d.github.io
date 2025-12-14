// js/utils.js
const Utils = {
    // Конфигурация точек выдачи
    PICKUP_POINTS: [
        {
            id: 'main',
            displayName: 'Главный корпус',
            address: 'ул. Ленина, 1',
            fullName: 'Главный корпус (ул. Ленина, 1)',
            workingHours: 'Пн-Пт 9:00-18:00',
            contact: '+7 (999) 123-45-67'
        },
        {
            id: 'science',
            displayName: 'Научный корпус', 
            address: 'пр. Мира, 15',
            fullName: 'Научный корпус (пр. Мира, 15)',
            workingHours: 'Пн-Сб 10:00-19:00',
            contact: '+7 (999) 123-45-68'
        },
    ],

    // Получить точку по ID
    getPickupPointById(id) {
        return this.PICKUP_POINTS.find(point => point.id === id) || null;
    },

    // Получить полное название точки
    getPickupPointFullName(id) {
        const point = this.getPickupPointById(id);
        return point ? point.fullName : `Точка ${id}`;
    },

    // Сгенерировать HTML для select
    generatePickupSelect(currentId = '') {
        let html = '<option value="">Выберите пункт выдачи...</option>';
        
        this.PICKUP_POINTS.forEach(point => {
            const selected = point.id === currentId ? 'selected' : '';
            html += `
                <option value="${point.id}" ${selected} 
                        data-address="${point.address}"
                        data-hours="${point.workingHours}">
                    ${point.displayName} - ${point.address}
                </option>
            `;
        });
        
        return html;
    },

    // Форматирование цены
    formatPrice(price) {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + ' ₽';
    },

    // Форматирование даты
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Проверка email
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    // Проверка телефона
    isValidPhone(phone) {
        return /^[\d\s\-\+\(\)]+$/.test(phone.replace(/\s/g, '')) && 
               phone.replace(/\D/g, '').length >= 10;
    }
};

// Экспорт
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}