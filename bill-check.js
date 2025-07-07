// Bill Check Module - Modern 2025 Edition
import { getFirestore } from './firebase-config.js';
import { showToast, formatCurrency, normalizePhone, getStatusBadge, isOverdue, getTimeRemaining, hapticFeedback, createParticleEffect } from './utils.js';

let currentBills = [];
let filteredBills = [];

export function initializeBillCheck() {
    setupEventListeners();
}

function setupEventListeners() {
    // Phone input normalization
    const billCheckPhone = document.getElementById('billCheckPhone');
    billCheckPhone.addEventListener('input', (e) => {
        e.target.value = normalizePhone(e.target.value);
        
        // Visual feedback
        const phone = normalizePhone(e.target.value);
        if (phone.length >= 10 && phone.startsWith('08')) {
            e.target.style.borderColor = '#06FFA5';
            e.target.style.boxShadow = '0 0 20px rgba(6, 255, 165, 0.3)';
        } else {
            e.target.style.borderColor = '#8B5CF6';
            e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.3)';
        }
    });
    
    // Check bills button
    document.getElementById('checkBillsBtn').addEventListener('click', checkBills);
    
    // Filter dropdown
    document.getElementById('billsFilter').addEventListener('change', filterBills);
    
    // Export all button
    document.getElementById('exportAllBtn').addEventListener('click', exportAllBills);
    
    // Enter key support
    billCheckPhone.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkBills();
        }
    });
}

async function checkBills() {
    const phoneInput = document.getElementById('billCheckPhone');
    const phone = normalizePhone(phoneInput.value);
    
    if (!phone || phone.length < 10 || !phone.startsWith('08')) {
        showToast('Please enter a valid phone number! 📱', 'error');
        hapticFeedback('error');
        
        // Shake animation for invalid input
        phoneInput.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            phoneInput.style.animation = '';
        }, 500);
        return;
    }
    
    try {
        // Show loading with modern animation
        document.getElementById('billsLoading').classList.remove('hidden');
        document.getElementById('billsResults').classList.add('hidden');
        document.getElementById('noBillsFound').classList.add('hidden');
        
        // Haptic feedback
        hapticFeedback('light');
        
        const db = getFirestore();
        const querySnapshot = await db.collection('submissions')
            .where('phoneNumber', '==', phone)
            .get();
        
        currentBills = [];
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            currentBills.push({
                id: doc.id,
                ...data,
                submissionDate: data.submissionDate instanceof Date ? data.submissionDate : new Date(data.submissionDate),
                dueDate: data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate)
            });
        });
        
        // Sort by submission date (newest first)
        currentBills.sort((a, b) => b.submissionDate - a.submissionDate);
        
        // Hide loading
        document.getElementById('billsLoading').classList.add('hidden');
        
        if (currentBills.length === 0) {
            document.getElementById('noBillsFound').classList.remove('hidden');
            showToast('No bills found for this number! 📭', 'info');
        } else {
            filteredBills = [...currentBills];
            displayBills();
            document.getElementById('billsResults').classList.remove('hidden');
            
            // Success haptic feedback
            hapticFeedback('success');
            showToast(`Found ${currentBills.length} bills! 📊✨`, 'success');
            
            // Cache results
            localStorage.setItem('lastBillCheck', JSON.stringify({
                phone,
                bills: currentBills,
                timestamp: Date.now()
            }));
        }
        
    } catch (error) {
        console.error('Error checking bills:', error);
        document.getElementById('billsLoading').classList.add('hidden');
        
        // Try to load from cache if offline
        if (!navigator.onLine) {
            loadFromCache(phone);
        } else {
            showToast('Failed to load bills. Please try again! ❌', 'error');
            hapticFeedback('error');
        }
    }
}

function loadFromCache(phone) {
    const cached = localStorage.getItem('lastBillCheck');
    if (cached) {
        const data = JSON.parse(cached);
        if (data.phone === phone && Date.now() - data.timestamp < 3600000) { // 1 hour cache
            currentBills = data.bills.map(bill => ({
                ...bill,
                submissionDate: new Date(bill.submissionDate),
                dueDate: new Date(bill.dueDate)
            }));
            
            if (currentBills.length > 0) {
                filteredBills = [...currentBills];
                displayBills();
                document.getElementById('billsResults').classList.remove('hidden');
                showToast('Data loaded from cache (offline) 📱💾', 'warning');
            } else {
                document.getElementById('noBillsFound').classList.remove('hidden');
            }
            return;
        }
    }
    
    document.getElementById('noBillsFound').classList.remove('hidden');
    showToast('Cannot load data offline! 🔌❌', 'error');
}

function displayBills() {
    const billsList = document.getElementById('billsList');
    
    if (filteredBills.length === 0) {
        billsList.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">🔍</div>
                <p class="text-xl text-gray-300">No bills match your filter</p>
            </div>
        `;
        return;
    }
    
    billsList.innerHTML = filteredBills.map((bill, index) => createBillCard(bill, index)).join('');
    
    // Setup card interactions
    setupBillCardInteractions();
}

function createBillCard(bill, index) {
    const isOverdueStatus = isOverdue(bill.dueDate) && bill.status !== 'paid';
    const timeRemaining = getTimeRemaining(bill.dueDate);
    const statusBadge = getStatusBadge(bill.status);
    
    const cardClass = isOverdueStatus ? 
        'bill-card cyber-card glassmorphism rounded-3xl p-8 border-2 border-neon-pink animate-glow-pulse' :
        bill.status === 'paid' ? 
        'bill-card cyber-card glassmorphism rounded-3xl p-8 border-2 border-neon-green' :
        'bill-card cyber-card glassmorphism rounded-3xl p-8 border-2 border-transparent hover:border-neon-purple/50';
    
    const serviceIcon = getServiceIcon(bill.service);
    const serviceColor = getServiceColor(bill.service);
    
    return `
        <div class="${cardClass}" data-bill-id="${bill.id}" style="animation-delay: ${index * 0.1}s">
            <div class="flex items-start justify-between mb-6">
                <div class="flex items-center space-x-4">
                    <div class="w-16 h-16 bg-gradient-to-r ${serviceColor} rounded-2xl flex items-center justify-center animate-float">
                        <span class="text-3xl">${serviceIcon}</span>
                    </div>
                    <div>
                        <h3 class="font-space font-bold text-2xl text-white">${bill.service}</h3>
                        <p class="text-gray-400 font-mono">Token: ${bill.token}</p>
                        <p class="text-sm text-gray-500">${bill.submissionDate.toLocaleDateString('id-ID')}</p>
                    </div>
                </div>
                <div class="text-right">
                    ${statusBadge}
                    ${bill.status === 'paid' ? '<div class="text-6xl opacity-20 absolute top-4 right-4 animate-bounce-soft">✅</div>' : ''}
                    ${isOverdueStatus ? '<div class="text-6xl opacity-20 absolute top-4 right-4 animate-bounce-soft">⚠️</div>' : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div class="text-center p-4 glassmorphism rounded-xl">
                    <div class="text-sm text-gray-400 mb-1">Amount</div>
                    <div class="font-bold text-white text-lg">${formatCurrency(bill.requestAmount)}</div>
                </div>
                <div class="text-center p-4 glassmorphism rounded-xl">
                    <div class="text-sm text-gray-400 mb-1">Fees</div>
                    <div class="font-bold text-white text-lg">${formatCurrency(bill.adminFee + bill.termFee)}</div>
                </div>
                <div class="text-center p-4 glassmorphism rounded-xl">
                    <div class="text-sm text-gray-400 mb-1">Total</div>
                    <div class="font-bold gradient-text text-xl">${formatCurrency(bill.totalPayment)}</div>
                </div>
                <div class="text-center p-4 glassmorphism rounded-xl">
                    <div class="text-sm text-gray-400 mb-1">Due Date</div>
                    <div class="font-bold text-white">${bill.dueDate.toLocaleDateString('id-ID')}</div>
                    ${timeRemaining ? `<div class="text-xs text-neon-green mt-1">${timeRemaining}</div>` : ''}
                </div>
            </div>
            
            ${bill.status !== 'paid' && !isOverdueStatus ? `
                <div class="glassmorphism rounded-xl p-4 mb-6">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm text-gray-400">Payment Progress</span>
                        <span class="text-sm font-bold text-white">${getProgressPercentage(bill)}%</span>
                    </div>
                    <div class="w-full bg-gray-700 rounded-full h-3">
                        <div class="bg-gradient-to-r from-neon-purple to-neon-green h-3 rounded-full transition-all duration-1000" style="width: ${getProgressPercentage(bill)}%"></div>
                    </div>
                </div>
            ` : ''}
            
            <div class="flex flex-wrap gap-3">
                <button onclick="copyToken('${bill.token}')" class="cyber-button px-4 py-2 rounded-xl text-white font-medium hover:scale-105 transition-transform">
                    📋 Copy Token
                </button>
                <button onclick="remindAdmin('${bill.token}', '${bill.service}', ${bill.totalPayment})" class="cyber-button px-4 py-2 rounded-xl text-white font-medium hover:scale-105 transition-transform">
                    💬 Remind Admin
                </button>
                <button onclick="exportBillPDF('${bill.id}')" class="cyber-button px-4 py-2 rounded-xl text-white font-medium hover:scale-105 transition-transform">
                    📄 Export PDF
                </button>
                <button onclick="toggleBillDetails('${bill.id}')" class="cyber-button px-4 py-2 rounded-xl text-white font-medium hover:scale-105 transition-transform">
                    👁️ Details
                </button>
            </div>
            
            <div id="details-${bill.id}" class="hidden mt-6 pt-6 border-t border-gray-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Submission Date:</span>
                            <span class="font-semibold text-white">${bill.submissionDate.toLocaleDateString('id-ID')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Admin Fee:</span>
                            <span class="font-semibold text-white">${formatCurrency(bill.adminFee)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Term Fee:</span>
                            <span class="font-semibold text-white">${formatCurrency(bill.termFee)}</span>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Phone Number:</span>
                            <span class="font-semibold text-white">${bill.phoneNumber}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Status:</span>
                            <span class="font-semibold text-white">${getStatusText(bill.status)}</span>
                        </div>
                    </div>
                </div>
                ${bill.adminNotes ? `
                    <div class="mt-6 p-4 glassmorphism rounded-xl border border-neon-blue/30">
                        <div class="text-sm text-gray-400 mb-2">💬 Admin Notes:</div>
                        <div class="text-white">${bill.adminNotes}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function setupBillCardInteractions() {
    // Global functions for onclick handlers
    window.copyToken = (token) => {
        navigator.clipboard.writeText(token).then(() => {
            hapticFeedback('success');
            createParticleEffect(event.target, '#06FFA5');
            showToast('Token copied successfully! 📋✨', 'success');
        }).catch(() => {
            showToast('Failed to copy token! ❌', 'error');
        });
    };
    
    window.remindAdmin = (token, service, total) => {
        const message = `🔔 *PAYMENT REMINDER* 

🆔 *Token:* ${token}
💎 *Service:* ${service}
💰 *Total:* ${formatCurrency(total)}
📅 *Date:* ${new Date().toLocaleDateString('id-ID')}

*Please process ASAP! Thanks! 🚀*`;
        
        const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        hapticFeedback('medium');
        showToast('Opening WhatsApp... 💬', 'info');
    };
    
    window.exportBillPDF = (billId) => {
        const bill = currentBills.find(b => b.id === billId);
        if (bill) {
            generateBillPDF(bill);
            hapticFeedback('light');
        }
    };
    
    window.toggleBillDetails = (billId) => {
        const details = document.getElementById(`details-${billId}`);
        const isHidden = details.classList.contains('hidden');
        
        if (isHidden) {
            details.classList.remove('hidden');
            details.style.animation = 'slideDown 0.3s ease-out';
        } else {
            details.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                details.classList.add('hidden');
            }, 300);
        }
        
        hapticFeedback('light');
    };
}

function filterBills() {
    const filter = document.getElementById('billsFilter').value;
    
    if (filter === 'all') {
        filteredBills = [...currentBills];
    } else {
        filteredBills = currentBills.filter(bill => {
            if (filter === 'overdue') {
                return isOverdue(bill.dueDate) && bill.status !== 'paid';
            }
            return bill.status === filter;
        });
    }
    
    displayBills();
    showToast(`Filtered to ${filteredBills.length} bills! 🔍`, 'info');
}

function exportAllBills() {
    if (filteredBills.length === 0) {
        showToast('No bills to export! 📄', 'warning');
        return;
    }
    
    generateAllBillsPDF(filteredBills);
    hapticFeedback('success');
}

function generateBillPDF(bill) {
    // Create a modern printable version
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bill ${bill.token} - Digital Fund VIP</title>
            <style>
                body { 
                    font-family: 'Space Grotesk', Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: linear-gradient(135deg, #0A0A0F, #1A1A2E);
                    color: white;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 40px; 
                    padding: 20px;
                    background: rgba(139, 92, 246, 0.1);
                    border-radius: 20px;
                    border: 2px solid rgba(139, 92, 246, 0.3);
                }
                .header h1 {
                    background: linear-gradient(45deg, #8B5CF6, #06FFA5, #FF6B6B);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 2.5em;
                    margin: 0;
                }
                .bill-info { 
                    background: rgba(26, 26, 46, 0.7);
                    border-radius: 20px;
                    padding: 30px;
                    border: 2px solid rgba(139, 92, 246, 0.3);
                }
                .bill-info table { 
                    width: 100%; 
                    border-collapse: collapse; 
                }
                .bill-info td { 
                    padding: 15px; 
                    border-bottom: 1px solid rgba(139, 92, 246, 0.2); 
                    font-size: 16px;
                }
                .total { 
                    font-size: 24px; 
                    font-weight: bold; 
                    background: linear-gradient(45deg, #8B5CF6, #06FFA5);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .status { 
                    padding: 8px 16px; 
                    border-radius: 20px; 
                    color: white; 
                    font-weight: bold;
                    text-align: center;
                    display: inline-block;
                }
                .status.paid { background: linear-gradient(45deg, #06FFA5, #00D4AA); }
                .status.processing { background: linear-gradient(45deg, #FFD93D, #FFA500); }
                .status.pending { background: linear-gradient(45deg, #6B7280, #9CA3AF); }
                .status.overdue { background: linear-gradient(45deg, #FF6B6B, #EF4444); }
                .status.rejected { background: linear-gradient(45deg, #FF6B6B, #DC2626); }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    padding: 20px;
                    color: #8B5CF6;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>💎 Digital Fund VIP</h1>
                <h2>Bill Details</h2>
            </div>
            <div class="bill-info">
                <table>
                    <tr><td><strong>🎫 Token:</strong></td><td>${bill.token}</td></tr>
                    <tr><td><strong>💎 Service:</strong></td><td>${bill.service}</td></tr>
                    <tr><td><strong>📱 Phone:</strong></td><td>${bill.phoneNumber}</td></tr>
                    <tr><td><strong>💰 Amount:</strong></td><td>${formatCurrency(bill.requestAmount)}</td></tr>
                    <tr><td><strong>🏦 Admin Fee:</strong></td><td>${formatCurrency(bill.adminFee)}</td></tr>
                    <tr><td><strong>⏰ Term Fee:</strong></td><td>${formatCurrency(bill.termFee)}</td></tr>
                    <tr><td><strong>🔥 Total:</strong></td><td class="total">${formatCurrency(bill.totalPayment)}</td></tr>
                    <tr><td><strong>📅 Submission:</strong></td><td>${bill.submissionDate.toLocaleDateString('id-ID')}</td></tr>
                    <tr><td><strong>⏰ Due Date:</strong></td><td>${bill.dueDate.toLocaleDateString('id-ID')}</td></tr>
                    <tr><td><strong>📊 Status:</strong></td><td><span class="status ${bill.status}">${getStatusText(bill.status)}</span></td></tr>
                    ${bill.adminNotes ? `<tr><td><strong>💬 Admin Notes:</strong></td><td>${bill.adminNotes}</td></tr>` : ''}
                </table>
            </div>
            <div class="footer">
                <p>Generated on: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}</p>
                <p>Digital Fund VIP - Your Money, Your Vibe ✨</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    
    showToast('PDF generated! 📄✨', 'success');
}

function generateAllBillsPDF(bills) {
    const printWindow = window.open('', '_blank');
    const billsHtml = bills.map(bill => `
        <div style="margin-bottom: 30px; padding: 20px; background: rgba(26, 26, 46, 0.7); border-radius: 15px; border: 2px solid rgba(139, 92, 246, 0.3);">
            <h3 style="color: #8B5CF6; margin-top: 0;">🎫 Token: ${bill.token}</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2);"><strong>💎 Service:</strong></td><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">${bill.service}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2);"><strong>🔥 Total:</strong></td><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2); color: #06FFA5; font-weight: bold;">${formatCurrency(bill.totalPayment)}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2);"><strong>📊 Status:</strong></td><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">${getStatusText(bill.status)}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2);"><strong>⏰ Due:</strong></td><td style="padding: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.2);">${bill.dueDate.toLocaleDateString('id-ID')}</td></tr>
            </table>
        </div>
    `).join('');
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bills Report - Digital Fund VIP</title>
            <style>
                body { 
                    font-family: 'Space Grotesk', Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: linear-gradient(135deg, #0A0A0F, #1A1A2E);
                    color: white;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 40px; 
                    padding: 20px;
                    background: rgba(139, 92, 246, 0.1);
                    border-radius: 20px;
                    border: 2px solid rgba(139, 92, 246, 0.3);
                }
                .header h1 {
                    background: linear-gradient(45deg, #8B5CF6, #06FFA5, #FF6B6B);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    font-size: 2.5em;
                    margin: 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>💎 Digital Fund VIP</h1>
                <h2>Bills Report</h2>
                <p>Total: ${bills.length} bills</p>
                <p>Generated: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}</p>
            </div>
            ${billsHtml}
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    
    showToast('All bills PDF generated! 📊✨', 'success');
}

function getServiceIcon(service) {
    const icons = {
        'GoPay': '💚',
        'OVO': '💜',
        'DANA': '💙',
        'ShopeePay': '🧡',
        'LinkAja': '❤️',
        'Jenius': '💛',
        'Sakuku': '💖',
        'i.Saku': '💝'
    };
    return icons[service] || '💰';
}

function getServiceColor(service) {
    const colors = {
        'GoPay': 'from-green-500 to-emerald-400',
        'OVO': 'from-purple-500 to-violet-400',
        'DANA': 'from-blue-500 to-cyan-400',
        'ShopeePay': 'from-orange-500 to-amber-400',
        'LinkAja': 'from-red-500 to-pink-400',
        'Jenius': 'from-yellow-500 to-orange-400',
        'Sakuku': 'from-pink-500 to-rose-400',
        'i.Saku': 'from-indigo-500 to-purple-400'
    };
    return colors[service] || 'from-neon-purple to-neon-green';
}

function getProgressPercentage(bill) {
    const now = new Date();
    const start = bill.submissionDate;
    const end = bill.dueDate;
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    
    const percentage = Math.min(Math.max((elapsed / total) * 100, 0), 100);
    return Math.round(percentage);
}

function getStatusText(status) {
    const statusTexts = {
        'processing': 'Processing',
        'paid': 'Paid',
        'pending': 'Pending',
        'overdue': 'Overdue',
        'rejected': 'Rejected'
    };
    return statusTexts[status] || status;
}

// Add shake animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);