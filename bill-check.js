// Bill Check Module
import { getFirestore } from './firebase-config.js';
import { showToast, formatCurrency, normalizePhone, getStatusBadge, isOverdue, getTimeRemaining } from './utils.js';

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
        showToast('Masukkan nomor telepon yang valid', 'error');
        return;
    }
    
    try {
        // Show loading
        document.getElementById('billsLoading').classList.remove('hidden');
        document.getElementById('billsResults').classList.add('hidden');
        document.getElementById('noBillsFound').classList.add('hidden');
        
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
        } else {
            filteredBills = [...currentBills];
            displayBills();
            document.getElementById('billsResults').classList.remove('hidden');
            
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
            showToast('Gagal memuat tagihan. Silakan coba lagi.', 'error');
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
                showToast('Data dimuat dari cache (offline)', 'warning');
            } else {
                document.getElementById('noBillsFound').classList.remove('hidden');
            }
            return;
        }
    }
    
    document.getElementById('noBillsFound').classList.remove('hidden');
    showToast('Tidak dapat memuat data offline', 'error');
}

function displayBills() {
    const billsList = document.getElementById('billsList');
    
    if (filteredBills.length === 0) {
        billsList.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                Tidak ada tagihan yang sesuai dengan filter
            </div>
        `;
        return;
    }
    
    billsList.innerHTML = filteredBills.map(bill => createBillCard(bill)).join('');
    
    // Setup card interactions
    setupBillCardInteractions();
}

function createBillCard(bill) {
    const isOverdueStatus = isOverdue(bill.dueDate) && bill.status !== 'paid';
    const timeRemaining = getTimeRemaining(bill.dueDate);
    const statusBadge = getStatusBadge(bill.status);
    
    const cardClass = isOverdueStatus ? 
        'glassmorphism neumorphic rounded-xl p-6 border-2 border-error animate-pulse-glow' :
        bill.status === 'paid' ? 
        'glassmorphism neumorphic rounded-xl p-6 border-2 border-success' :
        'glassmorphism neumorphic rounded-xl p-6 hover:scale-[1.02] transition-all duration-300';
    
    return `
        <div class="${cardClass}" data-bill-id="${bill.id}">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-xl flex items-center justify-center">
                        <span class="text-white font-bold">${getServiceIcon(bill.service)}</span>
                    </div>
                    <div>
                        <h3 class="font-inter font-bold text-lg text-gray-800 dark:text-white">${bill.service}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Token: ${bill.token}</p>
                    </div>
                </div>
                <div class="text-right">
                    ${statusBadge}
                    ${bill.status === 'paid' ? '<div class="text-4xl opacity-20 absolute top-4 right-4">✅</div>' : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="text-center">
                    <div class="text-sm text-gray-500 dark:text-gray-400">Jumlah</div>
                    <div class="font-bold text-gray-800 dark:text-white">${formatCurrency(bill.requestAmount)}</div>
                </div>
                <div class="text-center">
                    <div class="text-sm text-gray-500 dark:text-gray-400">Biaya</div>
                    <div class="font-bold text-gray-800 dark:text-white">${formatCurrency(bill.adminFee + bill.termFee)}</div>
                </div>
                <div class="text-center">
                    <div class="text-sm text-gray-500 dark:text-gray-400">Total</div>
                    <div class="font-bold text-primary text-lg">${formatCurrency(bill.totalPayment)}</div>
                </div>
                <div class="text-center">
                    <div class="text-sm text-gray-500 dark:text-gray-400">Jatuh Tempo</div>
                    <div class="font-bold text-gray-800 dark:text-white text-sm">${bill.dueDate.toLocaleDateString('id-ID')}</div>
                    ${timeRemaining ? `<div class="text-xs text-gray-500 dark:text-gray-400">${timeRemaining}</div>` : ''}
                </div>
            </div>
            
            ${bill.status !== 'paid' && !isOverdueStatus ? `
                <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
                    <div class="flex items-center justify-between">
                        <span class="text-sm text-gray-600 dark:text-gray-400">Progress Pembayaran</span>
                        <span class="text-sm font-medium text-gray-800 dark:text-white">${getProgressPercentage(bill)}%</span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div class="bg-primary h-2 rounded-full transition-all duration-500" style="width: ${getProgressPercentage(bill)}%"></div>
                    </div>
                </div>
            ` : ''}
            
            <div class="flex flex-wrap gap-2">
                <button onclick="copyToken('${bill.token}')" class="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">
                    📋 Salin Token
                </button>
                <button onclick="remindAdmin('${bill.token}', '${bill.service}', ${bill.totalPayment})" class="px-3 py-2 bg-secondary text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm">
                    💬 Ingatkan Admin
                </button>
                <button onclick="exportBillPDF('${bill.id}')" class="px-3 py-2 bg-primary text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                    📄 Export PDF
                </button>
                <button onclick="toggleBillDetails('${bill.id}')" class="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm">
                    👁️ Detail
                </button>
            </div>
            
            <div id="details-${bill.id}" class="hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Tanggal Pengajuan:</span>
                        <span class="font-medium text-gray-800 dark:text-white ml-2">${bill.submissionDate.toLocaleDateString('id-ID')}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Biaya Admin:</span>
                        <span class="font-medium text-gray-800 dark:text-white ml-2">${formatCurrency(bill.adminFee)}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Biaya Jangka Waktu:</span>
                        <span class="font-medium text-gray-800 dark:text-white ml-2">${formatCurrency(bill.termFee)}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 dark:text-gray-400">Nomor Telepon:</span>
                        <span class="font-medium text-gray-800 dark:text-white ml-2">${bill.phoneNumber}</span>
                    </div>
                </div>
                ${bill.adminNotes ? `
                    <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Catatan Admin:</div>
                        <div class="text-sm text-gray-800 dark:text-white">${bill.adminNotes}</div>
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
            showToast('Token berhasil disalin', 'success');
        }).catch(() => {
            showToast('Gagal menyalin token', 'error');
        });
    };
    
    window.remindAdmin = (token, service, total) => {
        const message = `🔔 [Pengingat Tagihan] 
🆔 Token: ${token}
💼 Layanan: ${service}
💰 Total: ${formatCurrency(total)}
📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}

Mohon diproses segera. Terima kasih!`;
        
        const whatsappUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };
    
    window.exportBillPDF = (billId) => {
        const bill = currentBills.find(b => b.id === billId);
        if (bill) {
            generateBillPDF(bill);
        }
    };
    
    window.toggleBillDetails = (billId) => {
        const details = document.getElementById(`details-${billId}`);
        details.classList.toggle('hidden');
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
}

function exportAllBills() {
    if (filteredBills.length === 0) {
        showToast('Tidak ada tagihan untuk diekspor', 'warning');
        return;
    }
    
    generateAllBillsPDF(filteredBills);
}

function generateBillPDF(bill) {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tagihan ${bill.token}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .bill-info { margin-bottom: 20px; }
                .bill-info table { width: 100%; border-collapse: collapse; }
                .bill-info td { padding: 8px; border-bottom: 1px solid #ddd; }
                .total { font-size: 18px; font-weight: bold; color: #6A00F4; }
                .status { padding: 4px 8px; border-radius: 4px; color: white; }
                .status.paid { background-color: #10B981; }
                .status.processing { background-color: #F59E0B; }
                .status.pending { background-color: #6B7280; }
                .status.overdue { background-color: #EF4444; }
                .status.rejected { background-color: #EF4444; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Digital Fund VIP</h1>
                <h2>Detail Tagihan</h2>
            </div>
            <div class="bill-info">
                <table>
                    <tr><td><strong>Token:</strong></td><td>${bill.token}</td></tr>
                    <tr><td><strong>Layanan:</strong></td><td>${bill.service}</td></tr>
                    <tr><td><strong>Nomor Telepon:</strong></td><td>${bill.phoneNumber}</td></tr>
                    <tr><td><strong>Jumlah Permintaan:</strong></td><td>${formatCurrency(bill.requestAmount)}</td></tr>
                    <tr><td><strong>Biaya Admin:</strong></td><td>${formatCurrency(bill.adminFee)}</td></tr>
                    <tr><td><strong>Biaya Jangka Waktu:</strong></td><td>${formatCurrency(bill.termFee)}</td></tr>
                    <tr><td><strong>Total Pembayaran:</strong></td><td class="total">${formatCurrency(bill.totalPayment)}</td></tr>
                    <tr><td><strong>Tanggal Pengajuan:</strong></td><td>${bill.submissionDate.toLocaleDateString('id-ID')}</td></tr>
                    <tr><td><strong>Jatuh Tempo:</strong></td><td>${bill.dueDate.toLocaleDateString('id-ID')}</td></tr>
                    <tr><td><strong>Status:</strong></td><td><span class="status ${bill.status}">${getStatusText(bill.status)}</span></td></tr>
                    ${bill.adminNotes ? `<tr><td><strong>Catatan Admin:</strong></td><td>${bill.adminNotes}</td></tr>` : ''}
                </table>
            </div>
            <div style="margin-top: 30px; text-align: center; color: #666;">
                <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}</p>
                <p>Digital Fund VIP - Enterprise Fund Management</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

function generateAllBillsPDF(bills) {
    const printWindow = window.open('', '_blank');
    const billsHtml = bills.map(bill => `
        <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h3>Token: ${bill.token}</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 4px; border-bottom: 1px solid #eee;"><strong>Layanan:</strong></td><td style="padding: 4px; border-bottom: 1px solid #eee;">${bill.service}</td></tr>
                <tr><td style="padding: 4px; border-bottom: 1px solid #eee;"><strong>Total:</strong></td><td style="padding: 4px; border-bottom: 1px solid #eee; color: #6A00F4; font-weight: bold;">${formatCurrency(bill.totalPayment)}</td></tr>
                <tr><td style="padding: 4px; border-bottom: 1px solid #eee;"><strong>Status:</strong></td><td style="padding: 4px; border-bottom: 1px solid #eee;">${getStatusText(bill.status)}</td></tr>
                <tr><td style="padding: 4px; border-bottom: 1px solid #eee;"><strong>Jatuh Tempo:</strong></td><td style="padding: 4px; border-bottom: 1px solid #eee;">${bill.dueDate.toLocaleDateString('id-ID')}</td></tr>
            </table>
        </div>
    `).join('');
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Tagihan</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Digital Fund VIP</h1>
                <h2>Laporan Tagihan</h2>
                <p>Total: ${bills.length} tagihan</p>
                <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}</p>
            </div>
            ${billsHtml}
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
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
        'processing': 'Diproses',
        'paid': 'Lunas',
        'pending': 'Pending',
        'overdue': 'Terlambat',
        'rejected': 'Ditolak'
    };
    return statusTexts[status] || status;
}