// Utility Functions - Modern 2025 Edition
export function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `
        cyber-card glassmorphism rounded-2xl p-4 mb-3 animate-slide-down
        ${type === 'success' ? 'border-l-4 border-neon-green' : ''}
        ${type === 'error' ? 'border-l-4 border-neon-pink' : ''}
        ${type === 'warning' ? 'border-l-4 border-warning' : ''}
        ${type === 'info' ? 'border-l-4 border-neon-purple' : ''}
        max-w-sm shadow-2xl backdrop-blur-xl
    `;
    
    const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: '💫'
    }[type] || '💫';
    
    const bgColor = {
        success: 'from-neon-green/20 to-green-500/20',
        error: 'from-neon-pink/20 to-red-500/20',
        warning: 'from-warning/20 to-yellow-500/20',
        info: 'from-neon-purple/20 to-purple-500/20'
    }[type] || 'from-neon-purple/20 to-purple-500/20';
    
    toast.innerHTML = `
        <div class="bg-gradient-to-r ${bgColor} rounded-xl p-4">
            <div class="flex items-center space-x-3">
                <span class="text-2xl animate-bounce-soft">${icon}</span>
                <span class="text-sm font-semibold text-white flex-1">${message}</span>
                <button onclick="this.closest('.cyber-card').remove()" class="text-gray-400 hover:text-white transition-colors text-xl">
                    ✕
                </button>
            </div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%) scale(0.8)';
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
    // Admin fee calculation (tiered) - Updated for Gen Z appeal
    let adminFee;
    if (amount <= 25000) {
        adminFee = 2500; // Reduced for accessibility
    } else if (amount <= 100000) {
        adminFee = 4000;
    } else if (amount <= 500000) {
        adminFee = 6000;
    } else {
        adminFee = 8000;
    }
    
    // Term fee calculation based on days - More competitive rates
    const termRates = {
        3: 0.015,   // 1.5% - Quick turnaround
        7: 0.025,   // 2.5% - Popular choice
        14: 0.04,   // 4% - Balanced
        30: 0.07,   // 7% - Extended
        60: 0.10    // 10% - Long term
    };
    
    const termRate = termRates[termDays] || 0.04;
    const termFee = Math.round(amount * termRate);
    
    return {
        adminFee,
        termFee
    };
}

export function getStatusBadge(status) {
    const badges = {
        processing: '<span class="status-processing px-3 py-1 rounded-full text-xs font-bold text-white">⏳ Processing</span>',
        paid: '<span class="status-paid px-3 py-1 rounded-full text-xs font-bold text-white">✅ Paid</span>',
        pending: '<span class="status-pending px-3 py-1 rounded-full text-xs font-bold text-white">⏸️ Pending</span>',
        overdue: '<span class="status-overdue px-3 py-1 rounded-full text-xs font-bold text-white">⚠️ Overdue</span>',
        rejected: '<span class="status-rejected px-3 py-1 rounded-full text-xs font-bold text-white">❌ Rejected</span>'
    };
    
    return badges[status] || `<span class="px-3 py-1 bg-gray-500 text-white rounded-full text-xs font-bold">${status}</span>`;
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
        return '🔥 Overdue!';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
        return `⏰ ${days}d left`;
    } else if (hours > 0) {
        return `⚡ ${hours}h left`;
    } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `🚨 ${minutes}m left`;
    }
}

export function exportToPDF(data, filename = 'export.pdf') {
    // Enhanced PDF export with modern styling
    console.log('Exporting to PDF:', data);
    showToast('PDF export coming soon! 📄✨', 'info');
}

export function exportToCSV(data, filename = 'export.csv') {
    if (!data || data.length === 0) {
        showToast('No data to export! 📊', 'warning');
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
    
    showToast('CSV downloaded successfully! 📊✨', 'success');
}

export function checkPermission(permission) {
    // Simple permission check for demo
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    
    const permissions = {
        'admin': isAdmin,
        'export': isAdmin,
        'update_status': isAdmin,
        'view_all': isAdmin
    };
    
    return permissions[permission] || false;
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

// Format date for display with Gen Z style
export function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
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

// Generate random color for avatars or charts - Neon theme
export function generateColor(seed) {
    const colors = [
        '#8B5CF6', '#06FFA5', '#FF6B6B', '#00D4FF', '#FFD93D',
        '#A855F7', '#34D399', '#F87171', '#38BDF8', '#FBBF24',
        '#C084FC', '#6EE7B7', '#FCA5A5', '#7DD3FC', '#FDE047'
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

// Local storage helpers with error handling
export const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            showToast('Storage error! 💾❌', 'error');
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
            showToast('Storage cleared! 🧹✨', 'success');
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }
};

// Modern animation helpers
export function animateValue(element, start, end, duration = 1000) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * easeOutCubic;
        
        element.textContent = Math.round(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Particle effect for celebrations
export function createParticleEffect(element, color = '#8B5CF6') {
    const particles = [];
    const particleCount = 20;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 6px;
            height: 6px;
            background: ${color};
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
        `;
        
        const rect = element.getBoundingClientRect();
        particle.style.left = rect.left + rect.width / 2 + 'px';
        particle.style.top = rect.top + rect.height / 2 + 'px';
        
        document.body.appendChild(particle);
        particles.push(particle);
        
        // Animate particle
        const angle = (i / particleCount) * Math.PI * 2;
        const velocity = 100 + Math.random() * 100;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        particle.animate([
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 500,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => {
            particle.remove();
        };
    }
}

// Haptic feedback for mobile devices
export function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            error: [50, 50, 50]
        };
        
        navigator.vibrate(patterns[type] || patterns.light);
    }
}

// Modern scroll animations
export function observeElements() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    document.querySelectorAll('.observe-me').forEach(el => {
        observer.observe(el);
    });
}

// Initialize modern features
export function initModernFeatures() {
    // Add smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Initialize intersection observer
    observeElements();
    
    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any open modals
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
    
    // Add focus management
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('input, button, select, textarea')) {
            e.target.style.outline = '2px solid #8B5CF6';
            e.target.style.outlineOffset = '2px';
        }
    });
    
    document.addEventListener('focusout', (e) => {
        if (e.target.matches('input, button, select, textarea')) {
            e.target.style.outline = 'none';
        }
    });
}