// Main Application Controller
import { initializeFirebase } from './firebase-config.js';
import { initializeFundRequest } from './fund-request.js';
import { initializeBillCheck } from './bill-check.js';
import { initializeAdmin } from './admin.js';
import { showToast, formatCurrency, normalizePhone } from './utils.js';

class DigitalFundVIP {
    constructor() {
        this.currentSection = 'home';
        this.isAdmin = false;
        this.init();
    }

    async init() {
        try {
            // Initialize Firebase
            await initializeFirebase();
            
            // Initialize modules
            initializeFundRequest();
            initializeBillCheck();
            initializeAdmin();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize dark mode
            this.initializeDarkMode();
            
            // Initialize offline detection
            this.initializeOfflineDetection();
            
            // Check admin session
            this.checkAdminSession();
            
            console.log('Digital Fund VIP initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            showToast('Gagal menginisialisasi aplikasi', 'error');
        }
    }

    setupEventListeners() {
        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', this.toggleDarkMode.bind(this));
        
        // Admin login
        document.getElementById('adminLoginBtn').addEventListener('click', this.showAdminLogin.bind(this));
        
        // Offline retry
        document.getElementById('retryBtn').addEventListener('click', this.retryConnection.bind(this));
        
        // Navigation
        window.showHome = () => this.showSection('home');
        window.showFundRequest = () => this.showSection('fundRequest');
        window.showBillCheck = () => this.showSection('billCheck');
        window.showAdmin = () => this.showSection('admin');
        
        // Modal controls
        window.closeAdminLogin = () => this.closeModal('adminLoginModal');
        window.closeConfirmation = () => this.closeModal('confirmationModal');
        window.closeStatusUpdate = () => this.closeModal('statusUpdateModal');
    }

    showSection(section) {
        // Hide all sections
        const sections = ['homeSection', 'fundRequestSection', 'billCheckSection', 'adminSection'];
        sections.forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });

        // Show target section
        const targetSection = section + 'Section';
        document.getElementById(targetSection).classList.remove('hidden');
        
        this.currentSection = section;
        
        // Update URL without page reload
        const url = section === 'home' ? '/' : `/#${section}`;
        window.history.pushState({ section }, '', url);
    }

    initializeDarkMode() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            document.documentElement.classList.add('dark');
        }
    }

    toggleDarkMode() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark);
        showToast(isDark ? 'Mode gelap diaktifkan' : 'Mode terang diaktifkan', 'success');
    }

    initializeOfflineDetection() {
        const updateOnlineStatus = () => {
            const offlineBar = document.getElementById('offlineBar');
            if (navigator.onLine) {
                offlineBar.classList.add('hidden');
            } else {
                offlineBar.classList.remove('hidden');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    retryConnection() {
        if (navigator.onLine) {
            location.reload();
        } else {
            showToast('Masih tidak ada koneksi internet', 'error');
        }
    }

    showAdminLogin() {
        document.getElementById('adminLoginModal').classList.remove('hidden');
        document.getElementById('adminPassword').focus();
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.add('hidden');
    }

    checkAdminSession() {
        this.isAdmin = sessionStorage.getItem('isAdmin') === 'true';
        if (this.isAdmin) {
            document.getElementById('adminLoginBtn').textContent = 'Admin Panel';
            document.getElementById('adminLoginBtn').onclick = () => this.showSection('admin');
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DigitalFundVIP();
});

// Handle browser back/forward
window.addEventListener('popstate', (event) => {
    const section = event.state?.section || 'home';
    window.app.showSection(section);
});

// Export for global access
window.DigitalFundVIP = DigitalFundVIP;