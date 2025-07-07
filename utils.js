// Utility Functions
export function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `
        glassmorphism neumorphic rounded-lg p-4 mb-2 animate-slide-up
        ${type === 'success' ? 'border-l-4 border-success' : ''}
        ${type === 'error' ? 'border-l-4 border-error' : ''}
        ${type === 'warning' ? 'border-l-4 border-warning' : ''}
        ${type === 'info' ? 'border-l-4 border-primary' : ''}
        max-w-sm shadow-lg
    `;
    
    const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    }[type] || 'ℹ️';
    
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <span class="text-xl">${icon}</span>
            <span class="text-sm font-medium text-gray-800 dark:text-white">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
                ✕
            </button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

export function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export function normalizePhone(phone) {
    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, '');
    
    // Remove +62 prefix and replace with 0
    if (normalized.startsWith('62')) {
        normalized = '0' + normalized.substring(2);
    }
    
    // Ensure it starts with 08
    if (normalized.startsWith('8')) {
        normalized = '0' + normalized;
    }
    
    return normalized;
}

export function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

export function calculateDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}

export function calculateFees(amount, termDays) {
    // Admin fee calculation (tiered)
    let adminFee;
    if (amount <= 25000) {
        adminFee = 3000;
    } else if (amount <= 100000) {
        adminFee = 5000;
    } else {
        adminFee = 7000;
    }
    
    // Term fee calculation based on days
    const termRates = {
        3: 0.02,   // 2%
        7: 0.03,   // 3%
        14: 0.05,  // 5%
        30: 0.08,  // 8%
        60: 0.12   // 12%
    };
    
    const termRate = termRates[termDays] || 0.05;
    const termFee = Math.round(amount * termRate);
    
    return {
        adminFee,
        termFee
    };
}

export function getStatusBadge(status) {
    const badges = {
        processing: '<span class="px-2 py-1 bg-warning text-white rounded-full text-xs font-medium">⏳ Diproses</span>',
        paid: '<span class="px-2 py-1 bg-success text-white rounded-full text-xs font-medium">✅ Lunas</span>',
        pending: '<span class="px-2 py-1 bg-gray-500 text-white rounded-full text-xs font-medium">⏸️ Pending</span>',
        overdue: '<span class="px-2 py-1 bg-error text-white rounded-full text-xs font-medium">⚠️ Terlambat</span>',
        rejected: '<span class="px-2 py-1 bg-error text-white rounded-full text-xs font-medium">❌ Ditolak</span>'
    };
    
    return badges[status] || `<span class="px-2 py-1 bg-gray-400 text-white rounded-full text-xs font-medium">${status}</span>`;
}

export function isOverdue(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    return now > due;
}

export function getTimeRemaining(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    
    if (diff <= 0) {
        return 'Terlambat';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return `${days} hari lagi`;
    } else if (hours > 0) {
        return `${hours} jam lagi`;
    } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${minutes} menit lagi`;
    }
}

export function exportToPDF(data, filename = 'export.pdf') {
    // This is a simplified PDF export function
    // In a real application, you would use a library like jsPDF
    console.log('Exporting to PDF:', data);
    showToast('Fitur export PDF akan segera tersedia', 'info');
}

export function exportToCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'warning');
        return;
    }
    
    // Convert data to CSV format
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Handle dates and objects
                if (value instanceof Date) {
                    return value.toLocaleDateString('id-ID');
                }
                if (typeof value === 'object') {
                    return JSON.stringify(value);
                }
                // Escape commas and quotes
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
        )
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('File CSV berhasil diunduh', 'success');
}

export function checkPermission(permission) {
    // Simple permission check for demo
    // In a real app, this would check user roles and permissions
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    
    const permissions = {
        'admin': isAdmin,
        'export': isAdmin,
        'update_status': isAdmin,
        'view_all': isAdmin
    };
    
    return permissions[permission] || false;
}

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// Debounce function for performance optimization
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for performance optimization
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Format date for display
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    
    return new Intl.DateTimeFormat('id-ID', defaultOptions).format(new Date(date));
}

// Format time for display
export function formatTime(date) {
    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(date));
}

// Validate Indonesian phone number
export function validatePhoneNumber(phone) {
    const normalized = normalizePhone(phone);
    return normalized.length >= 10 && normalized.length <= 15 && normalized.startsWith('08');
}

// Generate random color for avatars or charts
export function generateColor(seed) {
    const colors = [
        '#6A00F4', '#8B5CF6', '#A855F7', '#C084FC', '#DDD6FE',
        '#FFB800', '#FCD34D', '#FDE047', '#FACC15', '#EAB308',
        '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5',
        '#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2'
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

// Local storage helpers
export const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    },
    
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }
};