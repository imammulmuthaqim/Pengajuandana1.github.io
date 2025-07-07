// Admin Panel Module
import { getFirestore } from './firebase-config.js';
import { showToast, formatCurrency, getStatusBadge, isOverdue } from './utils.js';

let allSubmissions = [];
let filteredSubmissions = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentFilter = 'all';
let isAdminLoggedIn = false;

const ADMIN_PASSWORD = 'admin123'; // In production, use proper authentication

export function initializeAdmin() {
    setupEventListeners();
    setupFilterChips();
}

function setupEventListeners() {
    // Admin login form
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    
    // Refresh data
    document.getElementById('refreshDataBtn').addEventListener('click', loadAdminData);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Date filters
    document.getElementById('dateFrom').addEventListener('change', applyDateFilter);
    document.getElementById('dateTo').addEventListener('change', applyDateFilter);
    
    // Export report
    document.getElementById('exportReportBtn').addEventListener('click', exportReport);
    
    // Pagination
    document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
    
    // Status update form
    document.getElementById('statusUpdateForm').addEventListener('submit', handleStatusUpdate);
    
    // Global functions for onclick handlers
    window.updateStatus = updateStatus;
    window.closeStatusUpdate = closeStatusUpdate;
}

function setupFilterChips() {
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Remove active class from all chips
            filterChips.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked chip
            chip.classList.add('active');
            
            // Apply filter
            currentFilter = chip.dataset.status;
            applyFilters();
        });
    });
    
    // Add CSS for filter chips
    const style = document.createElement('style');
    style.textContent = `
        .filter-chip {
            padding: 8px 16px;
            border-radius: 20px;
            border: 2px solid #E5E7EB;
            background: white;
            color: #6B7280;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 500;
        }
        
        .dark .filter-chip {
            border-color: #4B5563;
            background: #374151;
            color: #D1D5DB;
        }
        
        .filter-chip:hover {
            border-color: #6A00F4;
            color: #6A00F4;
        }
        
        .filter-chip.active {
            border-color: #6A00F4;
            background: #6A00F4;
            color: white;
        }
        
        .filter-chip.active:hover {
            background: #5B21B6;
        }
    `;
    document.head.appendChild(style);
}

async function handleAdminLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        isAdminLoggedIn = true;
        sessionStorage.setItem('isAdmin', 'true');
        
        document.getElementById('adminLoginModal').classList.add('hidden');
        document.getElementById('adminPassword').value = '';
        
        // Update UI
        document.getElementById('adminLoginBtn').textContent = 'Admin Panel';
        document.getElementById('adminLoginBtn').onclick = () => window.app.showSection('admin');
        
        showToast('Login admin berhasil', 'success');
        
        // Load admin data
        await loadAdminData();
        
        // Show admin section
        window.app.showSection('admin');
    } else {
        showToast('Password admin salah', 'error');
        document.getElementById('adminPassword').value = '';
    }
}

function handleLogout() {
    isAdminLoggedIn = false;
    sessionStorage.removeItem('isAdmin');
    
    // Update UI
    document.getElementById('adminLoginBtn').textContent = 'Admin Login';
    document.getElementById('adminLoginBtn').onclick = () => window.app.showAdminLogin();
    
    showToast('Logout berhasil', 'success');
    
    // Go back to home
    window.app.showSection('home');
}

async function loadAdminData() {
    if (!isAdminLoggedIn) {
        showToast('Akses ditolak', 'error');
        return;
    }
    
    try {
        document.getElementById('refreshDataBtn').disabled = true;
        document.getElementById('refreshDataBtn').innerHTML = '🔄 Loading...';
        
        const db = getFirestore();
        const querySnapshot = await db.collection('submissions').get();
        
        allSubmissions = [];
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            allSubmissions.push({
                id: doc.id,
                ...data,
                submissionDate: data.submissionDate instanceof Date ? data.submissionDate : new Date(data.submissionDate),
                dueDate: data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate)
            });
        });
        
        // Sort by submission date (newest first)
        allSubmissions.sort((a, b) => b.submissionDate - a.submissionDate);
        
        updateMetrics();
        applyFilters();
        
        document.getElementById('refreshDataBtn').disabled = false;
        document.getElementById('refreshDataBtn').innerHTML = '🔄 Refresh';
        
        showToast('Data berhasil dimuat', 'success');
        
    } catch (error) {
        console.error('Error loading admin data:', error);
        showToast('Gagal memuat data admin', 'error');
        
        document.getElementById('refreshDataBtn').disabled = false;
        document.getElementById('refreshDataBtn').innerHTML = '🔄 Refresh';
    }
}

function updateMetrics() {
    const total = allSubmissions.length;
    const processing = allSubmissions.filter(s => s.status === 'processing').length;
    const paid = allSubmissions.filter(s => s.status === 'paid').length;
    const pending = allSubmissions.filter(s => s.status === 'pending').length;
    const overdue = allSubmissions.filter(s => isOverdue(s.dueDate) && s.status !== 'paid').length;
    const rejected = allSubmissions.filter(s => s.status === 'rejected').length;
    
    document.getElementById('totalRequests').textContent = total;
    document.getElementById('processingCount').textContent = processing;
    document.getElementById('paidCount').textContent = paid;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('overdueCount').textContent = overdue;
    document.getElementById('rejectedCount').textContent = rejected;
}

function applyFilters() {
    let filtered = [...allSubmissions];
    
    // Status filter
    if (currentFilter !== 'all') {
        if (currentFilter === 'overdue') {
            filtered = filtered.filter(s => isOverdue(s.dueDate) && s.status !== 'paid');
        } else {
            filtered = filtered.filter(s => s.status === currentFilter);
        }
    }
    
    // Date filter
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    
    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        filtered = filtered.filter(s => s.submissionDate >= fromDate);
    }
    
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter(s => s.submissionDate <= toDate);
    }
    
    filteredSubmissions = filtered;
    currentPage = 1;
    displayTable();
}

function applyDateFilter() {
    applyFilters();
}

function displayTable() {
    const tbody = document.getElementById('adminTableBody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredSubmissions.slice(startIndex, endIndex);
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data yang sesuai dengan filter
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = pageData.map(submission => createTableRow(submission)).join('');
    }
    
    updatePagination();
}

function createTableRow(submission) {
    const isOverdueStatus = isOverdue(submission.dueDate) && submission.status !== 'paid';
    const rowClass = isOverdueStatus ? 'bg-red-50 dark:bg-red-900/20' : '';
    
    return `
        <tr class="${rowClass} hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <td class="px-4 py-3 text-sm">
                <span class="font-mono font-bold text-primary">${submission.token}</span>
                <button onclick="copyToClipboard('${submission.token}')" class="ml-2 text-gray-400 hover:text-gray-600 transition-colors" title="Salin Token">
                    📋
                </button>
            </td>
            <td class="px-4 py-3 text-sm">
                <span class="font-medium">${submission.phoneNumber}</span>
                <button onclick="copyToClipboard('${submission.phoneNumber}')" class="ml-2 text-gray-400 hover:text-gray-600 transition-colors" title="Salin Nomor">
                    📋
                </button>
            </td>
            <td class="px-4 py-3 text-sm">
                <div class="flex items-center space-x-2">
                    <span>${getServiceIcon(submission.service)}</span>
                    <span>${submission.service}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-sm font-medium">${formatCurrency(submission.requestAmount)}</td>
            <td class="px-4 py-3 text-sm font-bold text-primary">${formatCurrency(submission.totalPayment)}</td>
            <td class="px-4 py-3 text-sm">
                <div>${submission.dueDate.toLocaleDateString('id-ID')}</div>
                ${isOverdueStatus ? '<div class="text-xs text-red-500 font-medium">Terlambat</div>' : ''}
            </td>
            <td class="px-4 py-3 text-sm">${getStatusBadge(submission.status)}</td>
            <td class="px-4 py-3 text-sm">
                <div class="flex space-x-1">
                    <button onclick="updateStatus('${submission.id}', '${submission.status}')" 
                            class="px-2 py-1 bg-primary text-white rounded text-xs hover:bg-purple-700 transition-colors"
                            title="Update Status">
                        ✏️
                    </button>
                    <button onclick="exportSinglePDF('${submission.id}')" 
                            class="px-2 py-1 bg-secondary text-white rounded text-xs hover:bg-yellow-600 transition-colors"
                            title="Export PDF">
                        📄
                    </button>
                    <button onclick="sendWhatsApp('${submission.phoneNumber}', '${submission.token}')" 
                            class="px-2 py-1 bg-success text-white rounded text-xs hover:bg-green-600 transition-colors"
                            title="WhatsApp">
                        💬
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function updatePagination() {
    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredSubmissions.length);
    
    document.getElementById('showingFrom').textContent = filteredSubmissions.length > 0 ? startIndex : 0;
    document.getElementById('showingTo').textContent = endIndex;
    document.getElementById('totalRecords').textContent = filteredSubmissions.length;
    document.getElementById('currentPage').textContent = currentPage;
    
    document.getElementById('prevPageBtn').disabled = currentPage <= 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function changePage(direction) {
    const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        displayTable();
    }
}

function updateStatus(submissionId, currentStatus) {
    const submission = allSubmissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    document.getElementById('updateTokenId').value = submissionId;
    document.getElementById('newStatus').value = currentStatus;
    document.getElementById('adminNotes').value = submission.adminNotes || '';
    
    document.getElementById('statusUpdateModal').classList.remove('hidden');
}

function closeStatusUpdate() {
    document.getElementById('statusUpdateModal').classList.add('hidden');
}

async function handleStatusUpdate(e) {
    e.preventDefault();
    
    const submissionId = document.getElementById('updateTokenId').value;
    const newStatus = document.getElementById('newStatus').value;
    const adminNotes = document.getElementById('adminNotes').value;
    
    try {
        const db = getFirestore();
        await db.collection('submissions').doc(submissionId).update({
            status: newStatus,
            adminNotes: adminNotes,
            lastUpdated: new Date()
        });
        
        // Update local data
        const submission = allSubmissions.find(s => s.id === submissionId);
        if (submission) {
            submission.status = newStatus;
            submission.adminNotes = adminNotes;
            submission.lastUpdated = new Date();
        }
        
        updateMetrics();
        applyFilters();
        
        document.getElementById('statusUpdateModal').classList.add('hidden');
        showToast('Status berhasil diupdate', 'success');
        
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Gagal mengupdate status', 'error');
    }
}

function exportReport() {
    if (filteredSubmissions.length === 0) {
        showToast('Tidak ada data untuk diekspor', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const reportHtml = generateReportHTML(filteredSubmissions);
    
    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.print();
}

function generateReportHTML(submissions) {
    const totalAmount = submissions.reduce((sum, s) => sum + s.totalPayment, 0);
    const paidAmount = submissions.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.totalPayment, 0);
    
    const submissionsHtml = submissions.map(s => `
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.token}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.phoneNumber}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.service}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${formatCurrency(s.totalPayment)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${getStatusText(s.status)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${s.dueDate.toLocaleDateString('id-ID')}</td>
        </tr>
    `).join('');
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Admin - Digital Fund VIP</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { margin-bottom: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; }
                .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
                .summary-item { text-align: center; }
                .summary-value { font-size: 24px; font-weight: bold; color: #6A00F4; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #6A00F4; color: white; padding: 12px; text-align: left; }
                td { padding: 8px; border: 1px solid #ddd; }
                tr:nth-child(even) { background: #f9f9f9; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Digital Fund VIP</h1>
                <h2>Laporan Admin</h2>
                <p>Periode: ${new Date().toLocaleDateString('id-ID')}</p>
            </div>
            
            <div class="summary">
                <h3>Ringkasan</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-value">${submissions.length}</div>
                        <div>Total Permintaan</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${formatCurrency(totalAmount)}</div>
                        <div>Total Nilai</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${formatCurrency(paidAmount)}</div>
                        <div>Sudah Dibayar</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-value">${submissions.filter(s => s.status === 'paid').length}</div>
                        <div>Transaksi Lunas</div>
                    </div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>Token</th>
                        <th>Telepon</th>
                        <th>Layanan</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Jatuh Tempo</th>
                    </tr>
                </thead>
                <tbody>
                    ${submissionsHtml}
                </tbody>
            </table>
            
            <div style="margin-top: 30px; text-align: center; color: #666;">
                <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID')}</p>
            </div>
        </body>
        </html>
    `;
}

// Global functions for onclick handlers
window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Berhasil disalin', 'success');
    }).catch(() => {
        showToast('Gagal menyalin', 'error');
    });
};

window.exportSinglePDF = (submissionId) => {
    const submission = allSubmissions.find(s => s.id === submissionId);
    if (submission) {
        generateSingleSubmissionPDF(submission);
    }
};

window.sendWhatsApp = (phone, token) => {
    const message = `📞 [Kontak Admin] 
🆔 Token: ${token}
📱 Telepon: ${phone}
📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}

Halo, ada yang bisa kami bantu?`;
    
    const whatsappUrl = `https://wa.me/${phone.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
};

function generateSingleSubmissionPDF(submission) {
    const printWindow = window.open('', '_blank');
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Detail Submission ${submission.token}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .submission-info { margin-bottom: 20px; }
                .submission-info table { width: 100%; border-collapse: collapse; }
                .submission-info td { padding: 8px; border-bottom: 1px solid #ddd; }
                .total { font-size: 18px; font-weight: bold; color: #6A00F4; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Digital Fund VIP</h1>
                <h2>Detail Submission</h2>
            </div>
            <div class="submission-info">
                <table>
                    <tr><td><strong>Token:</strong></td><td>${submission.token}</td></tr>
                    <tr><td><strong>Telepon:</strong></td><td>${submission.phoneNumber}</td></tr>
                    <tr><td><strong>Layanan:</strong></td><td>${submission.service}</td></tr>
                    <tr><td><strong>Jumlah:</strong></td><td>${formatCurrency(submission.requestAmount)}</td></tr>
                    <tr><td><strong>Biaya Admin:</strong></td><td>${formatCurrency(submission.adminFee)}</td></tr>
                    <tr><td><strong>Biaya Jangka Waktu:</strong></td><td>${formatCurrency(submission.termFee)}</td></tr>
                    <tr><td><strong>Total:</strong></td><td class="total">${formatCurrency(submission.totalPayment)}</td></tr>
                    <tr><td><strong>Tanggal Pengajuan:</strong></td><td>${submission.submissionDate.toLocaleDateString('id-ID')}</td></tr>
                    <tr><td><strong>Jatuh Tempo:</strong></td><td>${submission.dueDate.toLocaleDateString('id-ID')}</td></tr>
                    <tr><td><strong>Status:</strong></td><td>${getStatusText(submission.status)}</td></tr>
                    ${submission.adminNotes ? `<tr><td><strong>Catatan Admin:</strong></td><td>${submission.adminNotes}</td></tr>` : ''}
                </table>
            </div>
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