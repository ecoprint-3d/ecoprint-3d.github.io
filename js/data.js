// js/data.js - обновленная версия для работы с sessionStorage
const API = {
    baseUrl: '',
    
    // Получить всех пользователей
    async getUsers() {
        try {
            // Пробуем получить из sessionStorage (для демо)
            const demoUsers = sessionStorage.getItem('demoUsers');
            if (demoUsers) {
                return JSON.parse(demoUsers);
            }
            
            // Если нет в sessionStorage, загружаем из файла
            const response = await fetch('data/users.json');
            if (!response.ok) throw new Error('Ошибка загрузки пользователей');
            const users = await response.json();
            
            // Сохраняем в sessionStorage для дальнейшего использования
            sessionStorage.setItem('demoUsers', JSON.stringify(users));
            return users;
        } catch (error) {
            console.error('Ошибка при получении пользователей:', error);
            return [];
        }
    },
    
    // Получить текущего пользователя из sessionStorage
    getCurrentUser() {
        const user = sessionStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    },
    
    // Вход в систему
    async login(email, password) {
        try {
            const users = await this.getUsers();
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                const userData = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    bonusBalance: user.bonusBalance || 0
                };
                sessionStorage.setItem('currentUser', JSON.stringify(userData));
                return userData;
            }
            return null;
        } catch (error) {
            console.error('Ошибка при входе:', error);
            return null;
        }
    },
    
    // Выход из системы
    logout() {
        sessionStorage.removeItem('currentUser');
    },
    
    // Регистрация нового пользователя
    async register(userData) {
        try {
            const users = await this.getUsers();
            
            // Проверяем, нет ли уже пользователя с таким email
            const existingUser = users.find(u => u.email === userData.email);
            if (existingUser) {
                return { success: false, message: 'Пользователь с таким email уже существует' };
            }
            
            // Создаем нового пользователя
            const newUser = {
                id: Date.now(),
                name: userData.fullName,
                email: userData.email,
                password: userData.password,
                role: 'student',
                bonusBalance: 0,
                registrationDate: new Date().toISOString().split('T')[0]
            };
            
            // Сохраняем обновленный список пользователей
            const updatedUsers = [...users, newUser];
            sessionStorage.setItem('demoUsers', JSON.stringify(updatedUsers));
            
            // Автоматически входим после регистрации
            const userSessionData = {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                bonusBalance: newUser.bonusBalance
            };
            sessionStorage.setItem('currentUser', JSON.stringify(userSessionData));
            
            return { success: true, user: newUser };
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            return { success: false, message: 'Ошибка сервера' };
        }
    },
    
    // Получить операции сдачи
    async getDeposits() {
        try {
            // Пробуем получить из sessionStorage
            const deposits = sessionStorage.getItem('deposits');
            if (deposits) {
                return JSON.parse(deposits);
            }
            
            // Если нет в sessionStorage, загружаем из файла (для начальных данных)
            const response = await fetch('data/deposits.json');
            if (!response.ok) return [];
            const initialDeposits = await response.json();
            
            // Сохраняем в sessionStorage
            sessionStorage.setItem('deposits', JSON.stringify(initialDeposits));
            return initialDeposits;
        } catch (error) {
            console.error('Ошибка при получении операций:', error);
            return [];
        }
    },
    
    // Добавить операцию сдачи
    async addDeposit(depositData) {
        try {
            const users = await this.getUsers();
            const deposits = await this.getDeposits();
            
            // Находим пользователя
            const userIndex = users.findIndex(u => u.id === depositData.userId);
            if (userIndex === -1) {
                return { success: false, message: 'Пользователь не найден' };
            }
            
            const user = users[userIndex];
            
            // Рассчитываем бонусы
            const bonusAmount = Math.round(depositData.weight * 10);
            
            // Создаем запись о сдаче
            const deposit = {
                id: Date.now(),
                userId: depositData.userId,
                userName: user.name,
                plasticType: depositData.plasticType,
                weight: parseFloat(depositData.weight),
                bonusAmount: bonusAmount,
                date: new Date().toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            };
            
            // Обновляем баланс пользователя
            user.bonusBalance = (parseInt(user.bonusBalance) || 0) + bonusAmount;
            
            // Сохраняем обновленных пользователей
            users[userIndex] = user;
            sessionStorage.setItem('demoUsers', JSON.stringify(users));
            
            // Добавляем запись о сдаче
            const updatedDeposits = [...deposits, deposit];
            sessionStorage.setItem('deposits', JSON.stringify(updatedDeposits));
            
            // Обновляем текущего пользователя в sessionStorage если это он
            const currentUser = this.getCurrentUser();
            if (currentUser && currentUser.id === user.id) {
                currentUser.bonusBalance = user.bonusBalance;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            console.log('Добавлена сдача:', deposit);
            console.log('Обновлен баланс пользователя:', user.name, user.bonusBalance);
            
            return { 
                success: true, 
                data: deposit,
                message: `Начислено ${bonusAmount} баллов пользователю ${user.name}`
            };
        } catch (error) {
            console.error('Ошибка при добавлении сдачи:', error);
            return { success: false, message: 'Ошибка сервера' };
        }
    },
    
    // Обновить баланс пользователя
    async updateUserBalance(userId, newBalance) {
        try {
            const users = await this.getUsers();
            const userIndex = users.findIndex(u => u.id === userId);
            
            if (userIndex !== -1) {
                users[userIndex].bonusBalance = newBalance;
                sessionStorage.setItem('demoUsers', JSON.stringify(users));
                
                // Обновляем текущего пользователя если это он
                const currentUser = this.getCurrentUser();
                if (currentUser && currentUser.id === userId) {
                    currentUser.bonusBalance = newBalance;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
                
                return { success: true };
            }
            return { success: false, message: 'Пользователь не найден' };
        } catch (error) {
            console.error('Ошибка при обновлении баланса:', error);
            return { success: false, message: 'Ошибка сервера' };
        }
    },
    
    // Отладочная информация
    async debug() {
        console.log('=== DEBUG INFO ===');
        console.log('Users from sessionStorage:', await this.getUsers());
        console.log('Current User:', this.getCurrentUser());
        console.log('Deposits from sessionStorage:', await this.getDeposits());
        console.log('sessionStorage demoUsers:', sessionStorage.getItem('demoUsers'));
        console.log('sessionStorage deposits:', sessionStorage.getItem('deposits'));
        console.log('==================');
    }
};

// Функция для получения данных для оператора
async function loadUsersForOperator() {
    const users = await API.getUsers();
    // Фильтруем только студентов
    return users.filter(user => user.role === 'student');
}

// Функция для получения последних операций
async function getRecentDeposits(limit = 5) {
    const deposits = await API.getDeposits();
    
    // Сортируем по ID (самые новые первыми)
    return deposits
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
}

// Функция для отладки и принудительного обновления
async function debugAndFix() {
    console.log('=== DEBUG INFO ===');
    
    const users = await API.getUsers();
    const deposits = await API.getDeposits();
    const currentUser = API.getCurrentUser();
    
    console.log('Пользователи:', users);
    console.log('Операции:', deposits);
    console.log('Текущий пользователь:', currentUser);
    
    // Очистка старых данных (для отладки)
    // sessionStorage.removeItem('demoUsers');
    // sessionStorage.removeItem('deposits');
    
    console.log('=== DEBUG END ===');
}

// Функция для сброса всех данных (только для разработки)
function resetAllData() {
    if (confirm('Вы уверены? Все данные будут сброшены к начальным значениям.')) {
        sessionStorage.removeItem('demoUsers');
        sessionStorage.removeItem('deposits');
        sessionStorage.removeItem('currentUser');
        console.log('Все данные сброшены');
        location.reload();
    }
}