// ============================================================================
// Supabase & Local Fallback Data Client
// Realtime sync + LocalStorage ('milkerp_crate_v1') zero-config compatibility
// ============================================================================

const STORAGE_KEY = 'milkerp_crate_v1';
const SYNC_CHANNEL_NAME = 'milk_erp_sync_bus';

// Default Pune Data
const DEFAULT_INITIAL_DATA = {
    settings: {
        distributorName: 'Pune Fresh Milk Distributors',
        distributorPhone: '+91 98220 11223',
        distributorAddress: 'Shop 12, Market Yard, Gultekdi, Pune 411037',
        cutOffTime: '18:00',
        upiVpa: 'milkdistributor@upi',
        upiPayeeName: 'Pune Milk Distributor',
        currency: '₹',
        supabaseUrl: '',
        supabaseKey: ''
    },
    products: [
        { id: 'gokul_fc_500', brand: 'Gokul', name: 'Gokul Full Cream 500ml', name_mr: 'गोकुळ फुल क्रीम ५०० मि.ली.', packSize: '500ml', rate: 30, pouches_per_crate: 12, isActive: true },
        { id: 'gokul_toned_1l', brand: 'Gokul', name: 'Gokul Toned 1L', name_mr: 'गोकुळ टोन्ड १ लिटर', packSize: '1L', rate: 56, pouches_per_crate: 10, isActive: true },
        { id: 'amul_taaza_500', brand: 'Amul', name: 'Amul Taaza 500ml', name_mr: 'अमूल ताजा ५०० मि.ली.', packSize: '500ml', rate: 29, pouches_per_crate: 10, isActive: true },
        { id: 'amul_gold_500', brand: 'Amul', name: 'Amul Gold 500ml', name_mr: 'अमूल गोल्ड ५०० मि.ली.', packSize: '500ml', rate: 33, pouches_per_crate: 10, isActive: true },
        { id: 'warana_std_500', brand: 'Warana', name: 'Warana Standard 500ml', name_mr: 'वारणा स्टँडर्ड ५०० मि.ली.', packSize: '500ml', rate: 28, pouches_per_crate: 12, isActive: true }
    ],
    retailers: [
        { id: 'RET001', name: 'Ramesh Patil', shopName: 'Mahesh Dairy', phone: '9822011223', route: 'Kothrud', address: 'Near Karve Statue, Kothrud', openingBalance: 1250, isActive: true },
        { id: 'RET002', name: 'Suresh Jadhav', shopName: 'Om Sai Super Market', phone: '9822044556', route: 'Baner', address: 'Pan Card Club Road, Baner', openingBalance: 450, isActive: true },
        { id: 'RET003', name: 'Ganesh Shinde', shopName: 'Shree Ganesh Kirana', phone: '9822077889', route: 'Hadapsar', address: 'Near Gadital, Hadapsar', openingBalance: 2800, isActive: true },
        { id: 'RET004', name: 'Vikas More', shopName: 'Balaji Provisions', phone: '9822099001', route: 'Wakad', address: 'Datta Mandir Chowk, Wakad', openingBalance: -300, isActive: true }
    ],
    orders: [
        {
            id: 'ORD-101',
            retailerId: 'RET001',
            orderDate: new Date().toISOString().slice(0, 10),
            orderTime: '14:20',
            source: 'App',
            status: 'Pending',
            items: { 'gokul_fc_500': 24, 'amul_gold_500': 10 },
            isLate: false,
            postedToRegister: false,
            note: 'Deliver before 5:30 AM'
        }
    ],
    dailyRegister: {}, // key: "YYYY-MM-DD_retailerId_productId" -> { pouches: 24, zeroConfirmed: false }
    crateRecords: {},  // key: "YYYY-MM-DD_retailerId_brand" -> { opening: 10, issued: 2, returned: 1, closing: 11 }
    dailyBills: [],
    payments: [
        { id: 'PAY-1001', receiptNo: 'RCP-1001', date: new Date().toISOString().slice(0, 10), retailerId: 'RET001', amount: 1000, mode: 'UPI', upiRef: 'UPI492817263512', status: 'Confirmed', notes: 'GPay collection' }
    ],
    auditLogs: [
        { id: 'LOG-1', action: 'SYSTEM_INIT', performedBy: 'System', details: 'Database initialized', timestamp: new Date().toISOString() }
    ],
    finalizedDates: {} // date -> { finalizedAt, finalizedBy }
};

class MilkDataService {
    constructor() {
        this.bus = typeof window !== 'undefined' && window.BroadcastChannel ? new BroadcastChannel(SYNC_CHANNEL_NAME) : null;
        this.listeners = new Set();
        
        if (this.bus) {
            this.bus.onmessage = (event) => {
                this.notifyListeners(event.data);
            };
        }

        // Listen for storage changes across tabs
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', (e) => {
                if (e.key === STORAGE_KEY) {
                    this.notifyListeners({ type: 'STORAGE_UPDATED' });
                }
            });
        }
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(payload) {
        for (const cb of this.listeners) {
            try { cb(payload); } catch (err) { console.error('Listener error:', err); }
        }
    }

    broadcast(type, payload = {}) {
        const msg = { type, payload, timestamp: Date.now() };
        if (this.bus) this.bus.postMessage(msg);
        this.notifyListeners(msg);
    }

    // Load entire database
    getDB() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                this.saveDB(DEFAULT_INITIAL_DATA);
                return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
            }
            const parsed = JSON.parse(raw);
            // Ensure schema integrity
            return {
                ...DEFAULT_INITIAL_DATA,
                ...parsed,
                settings: { ...DEFAULT_INITIAL_DATA.settings, ...(parsed.settings || {}) }
            };
        } catch (e) {
            console.error('Error reading localStorage DB, resetting to defaults:', e);
            return JSON.parse(JSON.stringify(DEFAULT_INITIAL_DATA));
        }
    }

    saveDB(db) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }

    // ==========================================
    // RETAILERS
    // ==========================================
    getRetailers() {
        return this.getDB().retailers || [];
    }

    getRetailerById(id) {
        return this.getRetailers().find(r => r.id === id);
    }

    getRetailerByPhone(phone) {
        const clean = phone.replace(/\D/g, '').slice(-10);
        return this.getRetailers().find(r => r.phone.replace(/\D/g, '').slice(-10) === clean);
    }

    saveRetailer(retailer) {
        const db = this.getDB();
        const idx = db.retailers.findIndex(r => r.id === retailer.id);
        if (idx >= 0) {
            db.retailers[idx] = { ...db.retailers[idx], ...retailer };
        } else {
            db.retailers.push(retailer);
        }
        this.saveDB(db);
        this.broadcast('RETAILERS_UPDATED');
    }

    // ==========================================
    // PRODUCTS
    // ==========================================
    getProducts() {
        return this.getDB().products || [];
    }

    saveProducts(products) {
        const db = this.getDB();
        db.products = products;
        this.saveDB(db);
        this.broadcast('PRODUCTS_UPDATED');
    }

    // ==========================================
    // ORDERS
    // ==========================================
    getOrders(filterDate = null) {
        const orders = this.getDB().orders || [];
        if (!filterDate) return orders;
        return orders.filter(o => o.orderDate === filterDate);
    }

    createOrder(orderData) {
        const db = this.getDB();
        const newOrder = {
            id: 'ORD-' + Date.now().toString().slice(-6),
            orderDate: new Date().toISOString().slice(0, 10),
            orderTime: new Date().toTimeString().slice(0, 5),
            source: orderData.source || 'App',
            status: 'Pending',
            postedToRegister: false,
            items: orderData.items || {},
            retailerId: orderData.retailerId,
            isLate: !!orderData.isLate,
            note: orderData.note || '',
            createdAt: new Date().toISOString()
        };

        db.orders.unshift(newOrder);
        this.saveDB(db);
        this.broadcast('NEW_ORDER_RECEIVED', newOrder);
        return newOrder;
    }

    updateOrderStatus(orderId, status) {
        const db = this.getDB();
        const ord = db.orders.find(o => o.id === orderId);
        if (ord) {
            ord.status = status;
            this.saveDB(db);
            this.broadcast('ORDER_STATUS_CHANGED', { orderId, status });
        }
    }

    cancelOrder(orderId, retailerId) {
        const db = this.getDB();
        const ord = db.orders.find(o => o.id === orderId && o.retailerId === retailerId);
        if (ord && ord.status === 'Pending') {
            ord.status = 'Cancelled';
            this.saveDB(db);
            this.broadcast('ORDER_CANCELLED', { orderId });
            return true;
        }
        return false;
    }

    // ==========================================
    // DAILY REGISTER
    // ==========================================
    getRegisterEntry(dateStr, retailerId, productId) {
        const db = this.getDB();
        const key = `${dateStr}_${retailerId}_${productId}`;
        return db.dailyRegister[key] || null;
    }

    setRegisterEntry(dateStr, retailerId, productId, pouches, zeroConfirmed = false) {
        const db = this.getDB();
        const key = `${dateStr}_${retailerId}_${productId}`;
        db.dailyRegister[key] = {
            pouches: pouches === null ? null : parseInt(pouches, 10),
            zeroConfirmed: !!zeroConfirmed
        };
        this.saveDB(db);
        this.broadcast('REGISTER_UPDATED', { dateStr, retailerId, productId });
    }

    postOrderToRegister(orderId) {
        const db = this.getDB();
        const order = db.orders.find(o => o.id === orderId);
        if (!order || order.postedToRegister || order.status !== 'Pending') {
            return false;
        }

        const dateStr = order.orderDate;
        for (const [prodId, qty] of Object.entries(order.items)) {
            const key = `${dateStr}_${order.retailerId}_${prodId}`;
            const existing = db.dailyRegister[key];
            const currentQty = (existing && existing.pouches !== null) ? existing.pouches : 0;
            db.dailyRegister[key] = {
                pouches: currentQty + (parseInt(qty, 10) || 0),
                zeroConfirmed: false
            };
        }

        order.postedToRegister = true;
        order.status = 'Posted';
        this.logAudit('POST_ORDER', 'Admin', `Order ${orderId} posted to register for date ${dateStr}`);
        this.saveDB(db);
        this.broadcast('ORDER_POSTED', { orderId, dateStr });
        return true;
    }

    // ==========================================
    // CRATE MANAGEMENT
    // ==========================================
    getCrateRecord(dateStr, retailerId, brand) {
        const db = this.getDB();
        const key = `${dateStr}_${retailerId}_${brand}`;
        return db.crateRecords[key] || null;
    }

    setCrateRecord(dateStr, retailerId, brand, opening, issued, returned) {
        const db = this.getDB();
        const key = `${dateStr}_${retailerId}_${brand}`;
        const op = parseInt(opening, 10) || 0;
        const iss = parseInt(issued, 10) || 0;
        const ret = parseInt(returned, 10) || 0;
        const closing = op + iss - ret;
        
        db.crateRecords[key] = {
            opening: op,
            issued: iss,
            returned: ret,
            closing
        };
        this.saveDB(db);
        this.broadcast('CRATES_UPDATED', { dateStr, retailerId, brand });
    }

    // Calculates retailer total crates held across all brands
    getRetailerCratesHeld(retailerId) {
        const db = this.getDB();
        const brands = ['Gokul', 'Amul', 'Warana'];
        const summary = {};
        
        for (const b of brands) {
            summary[b] = 0;
        }

        // Loop all crate records for this retailer and calculate latest closing balance
        const records = Object.entries(db.crateRecords)
            .filter(([k]) => k.includes(`_${retailerId}_`))
            .sort(([a], [b]) => a.localeCompare(b));

        for (const [key, val] of records) {
            const parts = key.split('_');
            const brand = parts[2];
            if (val && typeof val.closing === 'number') {
                summary[brand] = val.closing;
            }
        }

        return summary;
    }

    // ==========================================
    // PAYMENTS & OUTSTANDING
    // ==========================================
    getPayments(retailerId = null) {
        const payments = this.getDB().payments || [];
        if (!retailerId) return payments;
        return payments.filter(p => p.retailerId === retailerId);
    }

    addPayment(payment) {
        const db = this.getDB();
        const newPay = {
            id: 'PAY-' + Date.now().toString().slice(-6),
            receiptNo: 'RCP-' + Date.now().toString().slice(-6),
            date: payment.date || new Date().toISOString().slice(0, 10),
            retailerId: payment.retailerId,
            amount: parseFloat(payment.amount) || 0,
            mode: payment.mode || 'Cash',
            upiRef: payment.upiRef || '',
            status: payment.status || 'Confirmed',
            notes: payment.notes || '',
            createdAt: new Date().toISOString()
        };

        db.payments.unshift(newPay);
        this.saveDB(db);
        this.broadcast('PAYMENT_ADDED', newPay);
        return newPay;
    }

    voidPayment(paymentId, reason) {
        const db = this.getDB();
        const p = db.payments.find(x => x.id === paymentId);
        if (p) {
            p.status = 'Voided';
            p.voidReason = reason;
            this.logAudit('VOID_PAYMENT', 'Admin', `Payment ${paymentId} voided: ${reason}`);
            this.saveDB(db);
            this.broadcast('PAYMENT_VOIDED', { paymentId });
            return true;
        }
        return false;
    }

    getRetailerOutstanding(retailerId) {
        const db = this.getDB();
        const ret = db.retailers.find(r => r.id === retailerId);
        if (!ret) return 0;
        
        let balance = parseFloat(ret.openingBalance) || 0;
        
        // Sum all bills for this retailer
        const bills = (db.dailyBills || []).filter(b => b.retailerId === retailerId);
        for (const b of bills) {
            balance += (parseFloat(b.todayBill) || 0);
        }

        // Subtract confirmed payments
        const payments = (db.payments || []).filter(p => p.retailerId === retailerId && p.status === 'Confirmed');
        for (const p of payments) {
            balance -= (parseFloat(p.amount) || 0);
        }

        return Math.round(balance * 100) / 100;
    }

    // ==========================================
    // AUDIT LOGS & SETTINGS
    // ==========================================
    logAudit(action, performedBy, details) {
        const db = this.getDB();
        db.auditLogs.unshift({
            id: 'LOG-' + Date.now(),
            action,
            performedBy,
            details,
            timestamp: new Date().toISOString()
        });
        this.saveDB(db);
    }

    getAuditLogs() {
        return this.getDB().auditLogs || [];
    }

    getSettings() {
        return this.getDB().settings;
    }

    saveSettings(newSettings) {
        const db = this.getDB();
        db.settings = { ...db.settings, ...newSettings };
        this.saveDB(db);
        this.broadcast('SETTINGS_UPDATED');
    }

    // Finalize Day logic
    finalizeDay(dateStr) {
        const db = this.getDB();
        db.finalizedDates[dateStr] = {
            finalizedAt: new Date().toISOString(),
            finalizedBy: 'Staff'
        };
        this.logAudit('FINALIZE_DAY', 'Staff', `Day ${dateStr} finalized and rates/quantities frozen`);
        this.saveDB(db);
        this.broadcast('DAY_FINALIZED', { dateStr });
    }

    isDayFinalized(dateStr) {
        return !!this.getDB().finalizedDates[dateStr];
    }

    reopenDay(dateStr, reason) {
        const db = this.getDB();
        delete db.finalizedDates[dateStr];
        this.logAudit('REOPEN_DAY', 'Staff', `Day ${dateStr} reopened. Reason: ${reason}`);
        this.saveDB(db);
        this.broadcast('DAY_REOPENED', { dateStr, reason });
    }
}

export const milkDataService = new MilkDataService();
