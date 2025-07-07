// Firebase Configuration and Initialization
let db = null;
let isFirebaseInitialized = false;

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
            apiKey: "AIzaSyAHqg6LY-Vr3DsfNrMA9gwTyl0xi7jiQWc",
            authDomain: "danapengajuan-3fe67.firebaseapp.com",
            projectId: "danapengajuan-3fe67",
            storageBucket: "danapengajuan-3fe67.appspot.com",
            messagingSenderId: "231562139072",
            appId: "1:231562139072:web:ef64922c3d4b5d1fe92425"
        };

// Mock Firestore for demo purposes
class MockFirestore {
    constructor() {
        this.collections = new Map();
        this.initializeMockData();
    }

    initializeMockData() {
        // Initialize with some sample data
        const submissions = [
            {
                id: 'ABC123XY',
                token: 'ABC123XY',
                phoneNumber: '081234567890',
                service: 'GoPay',
                requestAmount: 100000,
                adminFee: 5000,
                termFee: 2000,
                totalPayment: 107000,
                submissionDate: new Date('2024-01-15'),
                dueDate: new Date('2024-01-22'),
                status: 'processing',
                adminNotes: ''
            },
            {
                id: 'DEF456ZW',
                token: 'DEF456ZW',
                phoneNumber: '081234567890',
                service: 'OVO',
                requestAmount: 50000,
                adminFee: 3000,
                termFee: 1500,
                totalPayment: 54500,
                submissionDate: new Date('2024-01-10'),
                dueDate: new Date('2024-01-17'),
                status: 'paid',
                adminNotes: 'Pembayaran diterima'
            }
        ];
        
        this.collections.set('submissions', submissions);
    }

    collection(name) {
        return {
            add: async (data) => {
                const collections = this.collections.get(name) || [];
                const id = data.token || this.generateId();
                const doc = { id, ...data };
                collections.push(doc);
                this.collections.set(name, collections);
                return { id };
            },
            
            where: (field, operator, value) => {
                return {
                    get: async () => {
                        const collections = this.collections.get(name) || [];
                        let filtered = collections;
                        
                        if (operator === '==') {
                            filtered = collections.filter(doc => doc[field] === value);
                        }
                        
                        return {
                            docs: filtered.map(doc => ({
                                id: doc.id,
                                data: () => doc
                            }))
                        };
                    }
                };
            },
            
            get: async () => {
                const collections = this.collections.get(name) || [];
                return {
                    docs: collections.map(doc => ({
                        id: doc.id,
                        data: () => doc
                    }))
                };
            },
            
            doc: (id) => {
                return {
                    update: async (data) => {
                        const collections = this.collections.get(name) || [];
                        const index = collections.findIndex(doc => doc.id === id);
                        if (index !== -1) {
                            collections[index] = { ...collections[index], ...data };
                            this.collections.set(name, collections);
                        }
                    },
                    
                    get: async () => {
                        const collections = this.collections.get(name) || [];
                        const doc = collections.find(d => d.id === id);
                        return {
                            exists: !!doc,
                            data: () => doc
                        };
                    }
                };
            }
        };
    }

    generateId() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }
}

export async function initializeFirebase() {
    try {
        // In a real app, you would initialize Firebase here
        // For demo purposes, we'll use a mock Firestore
        console.log('Initializing Firebase...');
        
        // Simulate Firebase initialization delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        db = new MockFirestore();
        isFirebaseInitialized = true;
        
        console.log('Firebase initialized successfully (Mock)');
        return db;
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        throw error;
    }
}

export function getFirestore() {
    if (!isFirebaseInitialized || !db) {
        throw new Error('Firebase not initialized');
    }
    return db;
}

export { db };