# Milk Distributor ERP (निखिल दूध डेअरी - Pune)

Complete self-contained Admin ERP for milk distribution operations across Pune routes (**Kothrud, Baner, Hadapsar, Wakad**).

## 🚀 How to Open
Simply double-click or open [`index.html`](file:///C:/Users/Prathamesh/.gemini/antigravity/scratch/milk-distributor-erp/index.html) in any web browser.
It requires no server setup or complex dependencies—everything runs and saves automatically in your browser (`milkerp_crate_v2`).

---

## 📋 The 11 Admin Modules

1. **Dashboard (डॅशबोर्ड)**: Key business metrics: total crates held by retailers, crates issued and returned today, crate alerts, daily milk requirement preview, and retailers needing immediate attention.
2. **Daily Register (दैनिक नोंदवही)**: High-density interactive matrix of Retailers × Products and Crate columns (**Opening, Issued, Returned, Closing**). Enter/arrow keys navigate between cells; hatched cells = not entered, 0 = confirmed zero.
3. **Milk Requirement (दूध मागणी)**: Aggregated procurement demand for dairy plants (**Gokul, Chitale, Amul, Shivanand, Govind, Nature**). Grouped strictly by Brand + Pack size (never combined across brands). Features **"Finalize day"** to lock quantities and freeze rates.
4. **Retailers (किरकोळ विक्रेते)**: Full retailer database with search, Pune routes, opening balance, live crates held, and direct **Edit** and **Delete** (with double verification).
5. **Products & Pricing (उत्पादने व दर)**: Update selling rates in ₹, pouches per crate capacity, and add new products and dairy brands.
6. **Daily Bills (दैनिक बिल)**: The yellow-and-pink Pune dairy bill generator with Devanagari Marathi text, milk items, crate balances, cash/online payments, and total due. Instant **1-click PNG image download** to send straight to customers on WhatsApp.
7. **Payments & Collections (पेमेंट व वसुली)**: Record daily collections (**Cash, UPI, Bank Transfer**), print receipts (**RC-Receipts**), track advances, and void entries with mandatory reasons.
8. **Crate Management (क्रेट व्यवस्थापन)**:
   - **Balances & Alerts**: Highlights high balance ($\ge 25$) and inactive returns ($5+$ days).
   - **Ledger / Entry**: Record, edit, and void crate movements with automatic cascade recalculation.
   - **Capacity & Policy**: Configure alert limits and optional crate deposits.
   - **Reports**: Retailer-wise, Brand-wise, and Date-wise statements.
   - **Audit Trail**: Transparent log of all changes and void actions.
9. **Reports (अहवाल)**: Daily product requirements, retailer-wise orders, sales invoices, collections, outstanding balances, account ledgers, crate balances, and reconciliation checks with 1-click **CSV export**.
10. **Monthly Record (मासिक नोंद)**: Month-wide customer ledger sheets matching Excel format (**Date, Products, Today's Amount, Pre. Balance, Total Amount, Cash Jama, Online Jama, Total Jama, Balance Pending**).
11. **Settings (सेटिंग्ज)**: Business name, invoice prefix, cut-off time, payment methods, English / Marathi localization toggle, and reset demo data.
