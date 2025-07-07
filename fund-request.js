// Fund Request Module
import { getFirestore } from './firebase-config.js';
import { showToast, formatCurrency, normalizePhone, generateToken, calculateDueDate, calculateFees } from './utils.js';

let selectedService = null;
let selectedTerm = null;
let currentToken = null;

const services = [
    { id: 'gopay', name: 'GoPay', icon: '💚', description: 'E-wallet GoPay' },
    { id: 'ovo', name: 'OVO', icon: '💜', description: 'E-wallet OVO' },
    { id: 'dana', name: 'DANA', icon: '💙', description: 'E-wallet DANA' },
    { id: 'shopeepay', name: 'ShopeePay', icon: '🧡', description: 'E-wallet ShopeePay' },
    { id: 'linkaja', name: 'LinkAja', icon: '❤️', description: 'E-wallet LinkAja' },
    { id: 'jenius', name: 'Jenius', icon: '💛', description: 'E-wallet Jenius' },
    { id: 'sakuku', name: 'Sakuku', icon: '💖', description: 'E-wallet Sakuku' },
    { id: 'isaku', name: 'i.Saku', icon: '💝', description: 'E-wallet i.Saku' }
];

const terms = [
    { days: 3, rate: 0.02, label: '3 Hari' },
    { days: 7, rate: 0.03, label: '7 Hari' },
    { days: 14, rate: 0.05, label: '14 Hari' },
    { days: 30, rate: 0.08, label: '30 Hari' },
    { days: 60, rate: 0.12, label: '60 Hari' }
];

export function initializeFundRequest() {
    setupServiceGrid();
    setupTermGrid();
    setupEventListeners();
    generateNewToken();
}

function setupServiceGrid() {
    const serviceGrid = document.getElementById('serviceGrid');
    serviceGrid.innerHTML = services.map(service => `
        <div class="service-tile glassmorphism neumorphic rounded-xl p-4 cursor-pointer hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-primary/30" 
             data-service="${service.id}" onclick="selectService('${service.id}')">
            <div class="text-center">
                <div class="text-3xl mb-2">${service.icon}</div>
                <div class="font-medium text-gray-800 dark:text-white text-sm">${service.name}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${service.description}</div>
            </div>
        </div>
    `).join('');
}

function setupTermGrid() {
    const termGrid = document.getElementById('termGrid');
    termGrid.innerHTML = terms.map(term => `
        <div class="term-tile glassmorphism neumorphic rounded-lg p-3 cursor-pointer hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-primary/30 text-center" 
             data-term="${term.days}" onclick="selectTerm(${term.days})">
            <div class="font-medium text-gray-800 dark:text-white text-sm">${term.label}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${(term.rate * 100).toFixed(1)}%</div>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Phone input
    const phoneInput = document.getElementById('phoneInput');
    phoneInput.addEventListener('input', handlePhoneInput);
    
    // Amount input
    const amountInput = document.getElementById('amountInput');
    amountInput.addEventListener('input', handleAmountInput);
    
    // Form submission
    const fundRequestForm = document.getElementById('fundRequestForm');
    fundRequestForm.addEventListener('submit', handleFormSubmit);
    
    // Copy token button
    document.getElementById('copyTokenBtn').addEventListener('click', copyToken);
    
    // Global functions for onclick handlers
    window.selectService = selectService;
    window.selectTerm = selectTerm;
    window.addAmount = addAmount;
}

function handlePhoneInput(e) {
    const normalized = normalizePhone(e.target.value);
    e.target.value = normalized;
    
    const phoneStatus = document.getElementById('phoneStatus');
    if (normalized.length >= 10 && normalized.startsWith('08')) {
        phoneStatus.textContent = '✅';
        phoneStatus.title = 'Nomor valid';
    } else {
        phoneStatus.textContent = '❌';
        phoneStatus.title = 'Nomor tidak valid';
    }
    
    updateSummary();
    validateForm();
}

function handleAmountInput(e) {
    // Remove non-numeric characters except for existing formatting
    let value = e.target.value.replace(/[^\d]/g, '');
    
    // Format as currency
    if (value) {
        const formatted = formatCurrency(parseInt(value));
        e.target.value = formatted.replace('Rp ', '');
    }
    
    updateSummary();
    validateForm();
}

function selectService(serviceId) {
    // Remove previous selection
    document.querySelectorAll('.service-tile').forEach(tile => {
        tile.classList.remove('border-primary', 'bg-primary/10');
        tile.classList.add('border-transparent');
    });
    
    // Add selection to clicked tile
    const selectedTile = document.querySelector(`[data-service="${serviceId}"]`);
    selectedTile.classList.add('border-primary', 'bg-primary/10');
    selectedTile.classList.remove('border-transparent');
    
    selectedService = services.find(s => s.id === serviceId);
    updateSummary();
    validateForm();
    
    showToast(`${selectedService.name} dipilih`, 'success');
}

function selectTerm(days) {
    // Remove previous selection
    document.querySelectorAll('.term-tile').forEach(tile => {
        tile.classList.remove('border-primary', 'bg-primary/10');
        tile.classList.add('border-transparent');
    });
    
    // Add selection to clicked tile
    const selectedTile = document.querySelector(`[data-term="${days}"]`);
    selectedTile.classList.add('border-primary', 'bg-primary/10');
    selectedTile.classList.remove('border-transparent');
    
    selectedTerm = terms.find(t => t.days === days);
    updateSummary();
    validateForm();
    
    showToast(`Jangka waktu ${selectedTerm.label} dipilih`, 'success');
}

function addAmount(amount) {
    const amountInput = document.getElementById('amountInput');
    const currentValue = parseInt(amountInput.value.replace(/[^\d]/g, '')) || 0;
    const newValue = currentValue + amount;
    
    const formatted = formatCurrency(newValue);
    amountInput.value = formatted.replace('Rp ', '');
    
    updateSummary();
    validateForm();
    
    showToast(`+${formatCurrency(amount)} ditambahkan`, 'success');
}

function updateSummary() {
    const amountInput = document.getElementById('amountInput');
    const amount = parseInt(amountInput.value.replace(/[^\d]/g, '')) || 0;
    
    if (amount > 0 && selectedTerm) {
        const fees = calculateFees(amount, selectedTerm.days);
        const total = amount + fees.adminFee + fees.termFee;
        const dueDate = calculateDueDate(selectedTerm.days);
        
        document.getElementById('summaryAmount').textContent = formatCurrency(amount);
        document.getElementById('summaryAdminFee').textContent = formatCurrency(fees.adminFee);
        document.getElementById('summaryTermFee').textContent = formatCurrency(fees.termFee);
        document.getElementById('summaryTotal').textContent = formatCurrency(total);
        document.getElementById('summaryDueDate').textContent = dueDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) + ` - dalam ${selectedTerm.days} hari`;
    } else {
        document.getElementById('summaryAmount').textContent = 'Rp 0';
        document.getElementById('summaryAdminFee').textContent = 'Rp 0';
        document.getElementById('summaryTermFee').textContent = 'Rp 0';
        document.getElementById('summaryTotal').textContent = 'Rp 0';
        document.getElementById('summaryDueDate').textContent = '-';
    }
}

function validateForm() {
    const phoneInput = document.getElementById('phoneInput');
    const amountInput = document.getElementById('amountInput');
    const submitBtn = document.getElementById('submitBtn');
    
    const phone = normalizePhone(phoneInput.value);
    const amount = parseInt(amountInput.value.replace(/[^\d]/g, '')) || 0;
    
    const isValid = phone.length >= 10 && 
                   phone.startsWith('08') && 
                   amount >= 10000 && 
                   selectedService && 
                   selectedTerm;
    
    submitBtn.disabled = !isValid;
    
    if (isValid) {
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function generateNewToken() {
    currentToken = generateToken();
    document.getElementById('transactionToken').textContent = currentToken;
}

function copyToken() {
    if (currentToken) {
        navigator.clipboard.writeText(currentToken).then(() => {
            showToast('Token berhasil disalin', 'success');
        }).catch(() => {
            showToast('Gagal menyalin token', 'error');
        });
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const phoneInput = document.getElementById('phoneInput');
    const amountInput = document.getElementById('amountInput');
    
    const phone = normalizePhone(phoneInput.value);
    const amount = parseInt(amountInput.value.replace(/[^\d]/g, ''));
    
    if (!selectedService || !selectedTerm) {
        showToast('Pilih layanan dan jangka waktu terlebih dahulu', 'error');
        return;
    }
    
    const fees = calculateFees(amount, selectedTerm.days);
    const total = amount + fees.adminFee + fees.termFee;
    const dueDate = calculateDueDate(selectedTerm.days);
    
    // Show confirmation modal
    showConfirmationModal({
        phone,
        service: selectedService.name,
        amount,
        adminFee: fees.adminFee,
        termFee: fees.termFee,
        total,
        dueDate,
        token: currentToken,
        term: selectedTerm.days
    });
}

function showConfirmationModal(data) {
    const modal = document.getElementById('confirmationModal');
    const details = document.getElementById('confirmationDetails');
    
    details.innerHTML = `
        <div class="space-y-3 text-sm">
            <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Token:</span>
                <span class="font-mono font-bold text-primary">${data.token}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Telepon:</span>
                <span class="font-medium">${data.phone}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Layanan:</span>
                <span class="font-medium">${data.service}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Jumlah:</span>
                <span class="font-medium">${formatCurrency(data.amount)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Biaya Admin:</span>
                <span class="font-medium">${formatCurrency(data.adminFee)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Biaya Jangka Waktu:</span>
                <span class="font-medium">${formatCurrency(data.termFee)}</span>
            </div>
            <hr class="border-gray-300 dark:border-gray-600">
            <div class="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span class="text-primary">${formatCurrency(data.total)}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Jatuh Tempo:</span>
                <span class="font-medium">${data.dueDate.toLocaleDateString('id-ID')} (${data.term} hari)</span>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Setup confirm button
    document.getElementById('confirmSubmitBtn').onclick = () => submitRequest(data);
}

async function submitRequest(data) {
    try {
        document.getElementById('loadingOverlay').classList.remove('hidden');
        
        const db = getFirestore();
        
        const submissionData = {
            token: data.token,
            phoneNumber: data.phone,
            service: data.service,
            requestAmount: data.amount,
            adminFee: data.adminFee,
            termFee: data.termFee,
            totalPayment: data.total,
            submissionDate: new Date(),
            dueDate: data.dueDate,
            status: 'processing',
            adminNotes: ''
        };
        
        await db.collection('submissions').add(submissionData);
        
        document.getElementById('loadingOverlay').classList.add('hidden');
        document.getElementById('confirmationModal').classList.add('hidden');
        
        showToast('Permintaan berhasil diajukan!', 'success');
        
        // Generate WhatsApp message
        const whatsappMessage = generateWhatsAppMessage(data);
        
        // Try to open WhatsApp
        const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(whatsappMessage)}`;
        
        setTimeout(() => {
            if (window.confirm('Buka WhatsApp untuk mengirim notifikasi ke admin?')) {
                window.open(whatsappUrl, '_blank');
            }
            
            // Reset form
            resetForm();
            
            // Show success message
            showToast('Silakan hubungi admin melalui WhatsApp untuk konfirmasi', 'info');
        }, 1000);
        
    } catch (error) {
        console.error('Error submitting request:', error);
        document.getElementById('loadingOverlay').classList.add('hidden');
        showToast('Gagal mengajukan permintaan. Silakan coba lagi.', 'error');
    }
}

function generateWhatsAppMessage(data) {
    return `📥 [Permintaan Baru] 🆔 Token: ${data.token}
📱 Telepon: ${data.phone}
💼 Layanan: ${data.service}
💵 Jumlah: ${formatCurrency(data.amount)}
🧾 Biaya Admin / Jangka Waktu: ${formatCurrency(data.adminFee)} / ${formatCurrency(data.termFee)}
🔢 Total: ${formatCurrency(data.total)} (Jatuh tempo dalam ${data.term} hari)
📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}

Mohon diproses. Terima kasih!`;
}

function resetForm() {
    document.getElementById('fundRequestForm').reset();
    selectedService = null;
    selectedTerm = null;
    
    // Reset service selection
    document.querySelectorAll('.service-tile').forEach(tile => {
        tile.classList.remove('border-primary', 'bg-primary/10');
        tile.classList.add('border-transparent');
    });
    
    // Reset term selection
    document.querySelectorAll('.term-tile').forEach(tile => {
        tile.classList.remove('border-primary', 'bg-primary/10');
        tile.classList.add('border-transparent');
    });
    
    // Generate new token
    generateNewToken();
    
    // Update summary
    updateSummary();
    validateForm();
    
    // Clear phone status
    document.getElementById('phoneStatus').textContent = '';
}