// Fund Request Module - Modern 2025 Edition
import { getFirestore } from './firebase-config.js';
import { showToast, formatCurrency, normalizePhone, generateToken, calculateDueDate, calculateFees, hapticFeedback, createParticleEffect } from './utils.js';

let selectedService = null;
let selectedTerm = null;
let currentToken = null;

const services = [
    { id: 'gopay', name: 'GoPay', icon: '💚', description: 'Go Digital', color: 'from-green-500 to-emerald-400' },
    { id: 'ovo', name: 'OVO', icon: '💜', description: 'Smart Money', color: 'from-purple-500 to-violet-400' },
    { id: 'dana', name: 'DANA', icon: '💙', description: 'Digital Wallet', color: 'from-blue-500 to-cyan-400' },
    { id: 'shopeepay', name: 'ShopeePay', icon: '🧡', description: 'Shop & Pay', color: 'from-orange-500 to-amber-400' },
    { id: 'linkaja', name: 'LinkAja', icon: '❤️', description: 'Link Everything', color: 'from-red-500 to-pink-400' },
    { id: 'jenius', name: 'Jenius', icon: '💛', description: 'Smart Banking', color: 'from-yellow-500 to-orange-400' },
    { id: 'sakuku', name: 'Sakuku', icon: '💖', description: 'My Pocket', color: 'from-pink-500 to-rose-400' },
    { id: 'isaku', name: 'i.Saku', icon: '💝', description: 'Digital Pocket', color: 'from-indigo-500 to-purple-400' }
];

const terms = [
    { days: 3, rate: 0.015, label: '3 Days', emoji: '⚡', description: 'Lightning Fast' },
    { days: 7, rate: 0.025, label: '1 Week', emoji: '🚀', description: 'Popular Choice' },
    { days: 14, rate: 0.04, label: '2 Weeks', emoji: '⭐', description: 'Balanced' },
    { days: 30, rate: 0.07, label: '1 Month', emoji: '💎', description: 'Extended' },
    { days: 60, rate: 0.10, label: '2 Months', emoji: '👑', description: 'Premium' }
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
        <div class="service-tile cyber-card glassmorphism rounded-2xl p-6 cursor-pointer transition-all duration-300 border-2 border-transparent hover:border-neon-purple/50 group" 
             data-service="${service.id}" onclick="selectService('${service.id}')">
            <div class="text-center">
                <div class="w-16 h-16 bg-gradient-to-r ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <span class="text-3xl">${service.icon}</span>
                </div>
                <div class="font-bold text-white text-lg mb-1">${service.name}</div>
                <div class="text-xs text-gray-400">${service.description}</div>
            </div>
        </div>
    `).join('');
}

function setupTermGrid() {
    const termGrid = document.getElementById('termGrid');
    termGrid.innerHTML = terms.map(term => `
        <div class="term-tile cyber-card glassmorphism rounded-xl p-4 cursor-pointer transition-all duration-300 border-2 border-transparent hover:border-neon-green/50 text-center group" 
             data-term="${term.days}" onclick="selectTerm(${term.days})">
            <div class="text-2xl mb-2 group-hover:scale-110 transition-transform">${term.emoji}</div>
            <div class="font-bold text-white text-sm mb-1">${term.label}</div>
            <div class="text-xs text-neon-green font-semibold">${(term.rate * 100).toFixed(1)}%</div>
            <div class="text-xs text-gray-400 mt-1">${term.description}</div>
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
        phoneStatus.title = 'Valid number';
        e.target.style.borderColor = '#06FFA5';
    } else {
        phoneStatus.textContent = '❌';
        phoneStatus.title = 'Invalid number';
        e.target.style.borderColor = '#FF6B6B';
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
        
        // Add visual feedback for large amounts
        const amount = parseInt(value);
        if (amount >= 1000000) {
            e.target.style.borderColor = '#FFD93D';
            e.target.style.boxShadow = '0 0 20px rgba(255, 217, 61, 0.3)';
        } else if (amount >= 100000) {
            e.target.style.borderColor = '#06FFA5';
            e.target.style.boxShadow = '0 0 20px rgba(6, 255, 165, 0.3)';
        } else {
            e.target.style.borderColor = '#8B5CF6';
            e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
        }
    } else {
        e.target.style.borderColor = '#8B5CF6';
        e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
    }
    
    updateSummary();
    validateForm();
}

function selectService(serviceId) {
    // Remove previous selection
    document.querySelectorAll('.service-tile').forEach(tile => {
        tile.classList.remove('border-neon-purple', 'bg-neon-purple/10', 'scale-105');
        tile.classList.add('border-transparent');
    });
    
    // Add selection to clicked tile
    const selectedTile = document.querySelector(`[data-service="${serviceId}"]`);
    selectedTile.classList.add('border-neon-purple', 'bg-neon-purple/10', 'scale-105');
    selectedTile.classList.remove('border-transparent');
    
    selectedService = services.find(s => s.id === serviceId);
    
    // Haptic feedback
    hapticFeedback('light');
    
    // Particle effect
    createParticleEffect(selectedTile, '#8B5CF6');
    
    updateSummary();
    validateForm();
    
    showToast(`${selectedService.name} selected! 🎯`, 'success');
}

function selectTerm(days) {
    // Remove previous selection
    document.querySelectorAll('.term-tile').forEach(tile => {
        tile.classList.remove('border-neon-green', 'bg-neon-green/10', 'scale-110');
        tile.classList.add('border-transparent');
    });
    
    // Add selection to clicked tile
    const selectedTile = document.querySelector(`[data-term="${days}"]`);
    selectedTile.classList.add('border-neon-green', 'bg-neon-green/10', 'scale-110');
    selectedTile.classList.remove('border-transparent');
    
    selectedTerm = terms.find(t => t.days === days);
    
    // Haptic feedback
    hapticFeedback('medium');
    
    // Particle effect
    createParticleEffect(selectedTile, '#06FFA5');
    
    updateSummary();
    validateForm();
    
    showToast(`${selectedTerm.label} selected! ⏰`, 'success');
}

function addAmount(amount) {
    const amountInput = document.getElementById('amountInput');
    const currentValue = parseInt(amountInput.value.replace(/[^\d]/g, '')) || 0;
    const newValue = currentValue + amount;
    
    const formatted = formatCurrency(newValue);
    amountInput.value = formatted.replace('Rp ', '');
    
    // Trigger input event to update styling
    amountInput.dispatchEvent(new Event('input'));
    
    // Haptic feedback
    hapticFeedback('light');
    
    updateSummary();
    validateForm();
    
    showToast(`+${formatCurrency(amount)} added! 💰`, 'success');
}

function updateSummary() {
    const amountInput = document.getElementById('amountInput');
    const amount = parseInt(amountInput.value.replace(/[^\d]/g, '')) || 0;
    
    if (amount > 0 && selectedTerm) {
        const fees = calculateFees(amount, selectedTerm.days);
        const total = amount + fees.adminFee + fees.termFee;
        const dueDate = calculateDueDate(selectedTerm.days);
        
        // Animate number changes
        animateNumber('summaryAmount', formatCurrency(amount));
        animateNumber('summaryAdminFee', formatCurrency(fees.adminFee));
        animateNumber('summaryTermFee', formatCurrency(fees.termFee));
        animateNumber('summaryTotal', formatCurrency(total));
        
        document.getElementById('summaryDueDate').textContent = dueDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }) + ` (${selectedTerm.days} days)`;
        
        // Add glow effect to total
        const totalElement = document.getElementById('summaryTotal');
        totalElement.style.textShadow = '0 0 20px rgba(139, 92, 246, 0.8)';
    } else {
        document.getElementById('summaryAmount').textContent = 'Rp 0';
        document.getElementById('summaryAdminFee').textContent = 'Rp 0';
        document.getElementById('summaryTermFee').textContent = 'Rp 0';
        document.getElementById('summaryTotal').textContent = 'Rp 0';
        document.getElementById('summaryDueDate').textContent = '-';
    }
}

function animateNumber(elementId, newValue) {
    const element = document.getElementById(elementId);
    element.style.transform = 'scale(1.1)';
    element.style.color = '#06FFA5';
    
    setTimeout(() => {
        element.textContent = newValue;
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 150);
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
        submitBtn.style.transform = 'scale(1)';
        submitBtn.style.boxShadow = '0 10px 30px rgba(139, 92, 246, 0.4)';
    } else {
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        submitBtn.style.transform = 'scale(0.98)';
        submitBtn.style.boxShadow = 'none';
    }
}

function generateNewToken() {
    currentToken = generateToken();
    document.getElementById('transactionToken').textContent = currentToken;
    
    // Add glow effect to token
    const tokenElement = document.getElementById('transactionToken');
    tokenElement.style.textShadow = '0 0 15px rgba(139, 92, 246, 0.8)';
}

function copyToken() {
    if (currentToken) {
        navigator.clipboard.writeText(currentToken).then(() => {
            // Haptic feedback
            hapticFeedback('success');
            
            // Visual feedback
            const btn = document.getElementById('copyTokenBtn');
            const originalText = btn.textContent;
            btn.textContent = '✅';
            btn.style.transform = 'scale(1.2)';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.transform = 'scale(1)';
            }, 1000);
            
            showToast('Token copied! 📋✨', 'success');
        }).catch(() => {
            showToast('Failed to copy token! ❌', 'error');
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
        showToast('Please select service and term first! 🎯', 'error');
        hapticFeedback('error');
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
        <div class="space-y-4">
            <div class="text-center mb-6">
                <div class="text-6xl mb-4">${selectedService ? services.find(s => s.name === data.service)?.icon : '💰'}</div>
                <h4 class="text-2xl font-bold gradient-text">${data.service}</h4>
            </div>
            
            <div class="cyber-card glassmorphism rounded-xl p-6 space-y-3">
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">🎫 Token:</span>
                    <span class="font-mono font-bold text-neon-purple text-lg">${data.token}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">📱 Phone:</span>
                    <span class="font-semibold text-white">${data.phone}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">💰 Amount:</span>
                    <span class="font-semibold text-white">${formatCurrency(data.amount)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">🏦 Admin Fee:</span>
                    <span class="font-semibold text-white">${formatCurrency(data.adminFee)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">⏰ Term Fee:</span>
                    <span class="font-semibold text-white">${formatCurrency(data.termFee)}</span>
                </div>
                <hr class="border-gray-600">
                <div class="flex justify-between items-center text-xl font-bold">
                    <span class="gradient-text">💎 Total:</span>
                    <span class="gradient-text text-2xl">${formatCurrency(data.total)}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-300">📅 Due Date:</span>
                    <span class="font-semibold text-neon-green">${data.dueDate.toLocaleDateString('id-ID')} (${data.term} days)</span>
                </div>
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
        
        // Success haptic feedback
        hapticFeedback('success');
        
        showToast('Request submitted successfully! 🎉', 'success');
        
        // Generate WhatsApp message
        const whatsappMessage = generateWhatsAppMessage(data);
        
        // Try to open WhatsApp
        const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(whatsappMessage)}`;
        
        setTimeout(() => {
            if (window.confirm('Open WhatsApp to notify admin? 📱💬')) {
                window.open(whatsappUrl, '_blank');
            }
            
            // Reset form
            resetForm();
            
            // Show success message
            showToast('Contact admin via WhatsApp for confirmation! 💬✨', 'info');
        }, 1000);
        
    } catch (error) {
        console.error('Error submitting request:', error);
        document.getElementById('loadingOverlay').classList.add('hidden');
        hapticFeedback('error');
        showToast('Failed to submit request. Please try again! ❌', 'error');
    }
}

function generateWhatsAppMessage(data) {
    return `🎯 *NEW REQUEST ALERT!* 

🆔 *Token:* ${data.token}
📱 *Phone:* ${data.phone}
💎 *Service:* ${data.service}
💰 *Amount:* ${formatCurrency(data.amount)}
🏦 *Fees:* ${formatCurrency(data.adminFee)} + ${formatCurrency(data.termFee)}
🔥 *TOTAL:* ${formatCurrency(data.total)}
⏰ *Term:* ${data.term} days
📅 *Date:* ${new Date().toLocaleDateString('id-ID')}

*Please process ASAP! Thanks! 🚀*`;
}

function resetForm() {
    document.getElementById('fundRequestForm').reset();
    selectedService = null;
    selectedTerm = null;
    
    // Reset service selection
    document.querySelectorAll('.service-tile').forEach(tile => {
        tile.classList.remove('border-neon-purple', 'bg-neon-purple/10', 'scale-105');
        tile.classList.add('border-transparent');
    });
    
    // Reset term selection
    document.querySelectorAll('.term-tile').forEach(tile => {
        tile.classList.remove('border-neon-green', 'bg-neon-green/10', 'scale-110');
        tile.classList.add('border-transparent');
    });
    
    // Reset input styles
    const phoneInput = document.getElementById('phoneInput');
    const amountInput = document.getElementById('amountInput');
    phoneInput.style.borderColor = '#8B5CF6';
    amountInput.style.borderColor = '#8B5CF6';
    amountInput.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
    
    // Generate new token
    generateNewToken();
    
    // Update summary
    updateSummary();
    validateForm();
    
    // Clear phone status
    document.getElementById('phoneStatus').textContent = '';
}