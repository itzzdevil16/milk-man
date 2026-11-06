// ============================================================================
// Core Business Logic Engine - Milk Distributor ERP
// ============================================================================

/**
 * Calculates crate and loose pouch split.
 * Example: 28 pouches of 12-pack = 2 crates + 4 loose pouches.
 */
export function calculateCrateSplit(totalPouches, pouchesPerCrate) {
    const qty = parseInt(totalPouches, 10) || 0;
    const perCrate = parseInt(pouchesPerCrate, 10) || 12;
    if (perCrate <= 0) return { crates: 0, loose: qty, textEn: `${qty} loose`, textMr: `${qty} सुटे` };
    
    const crates = Math.floor(qty / perCrate);
    const loose = qty % perCrate;
    
    const partsEn = [];
    if (crates > 0) partsEn.push(`${crates} crate${crates > 1 ? 's' : ''}`);
    if (loose > 0) partsEn.push(`${loose} loose`);
    if (partsEn.length === 0) partsEn.push('0 pouches');
    
    const partsMr = [];
    if (crates > 0) partsMr.push(`${crates} क्रेट`);
    if (loose > 0) partsMr.push(`${loose} सुटे`);
    if (partsMr.length === 0) partsMr.push('० पिशव्या');

    return {
        crates,
        loose,
        textEn: partsEn.join(' + '),
        textMr: partsMr.join(' + ')
    };
}

/**
 * Calculates crate closing balance:
 * Closing = Opening + Issued - Returned
 */
export function calculateCrateBalance(opening, issued, returned) {
    const op = parseInt(opening, 10) || 0;
    const iss = parseInt(issued, 10) || 0;
    const ret = parseInt(returned, 10) || 0;
    const closing = op + iss - ret;
    
    return {
        opening: op,
        issued: iss,
        returned: ret,
        closing,
        isAlertHigh: closing >= 25,
        isAlertNegative: closing < 0
    };
}

/**
 * Calculates daily bill:
 * Total Milk = Sum of (Qty * Rate) for each product
 * Remaining Due = Previous Outstanding + Today Bill - Paid Amount
 */
export function calculateDailyBill(items, productCatalog, previousOutstanding = 0, paidAmount = 0) {
    let milkTotal = 0;
    const lineItems = [];
    
    for (const [productId, qty] of Object.entries(items || {})) {
        const count = parseInt(qty, 10) || 0;
        if (count > 0) {
            const prod = productCatalog.find(p => p.id === productId);
            const rate = prod ? parseFloat(prod.rate) : 0;
            const amount = count * rate;
            milkTotal += amount;
            lineItems.push({
                productId,
                name: prod ? prod.name : productId,
                nameMr: prod ? prod.name_mr : productId,
                rate,
                quantity: count,
                pouchesPerCrate: prod ? prod.pouches_per_crate : 12,
                amount
            });
        }
    }
    
    const prevDue = parseFloat(previousOutstanding) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const todayBill = milkTotal;
    const balanceDue = prevDue + todayBill - paid;

    return {
        lineItems,
        milkTotal: Math.round(milkTotal * 100) / 100,
        prevOutstanding: Math.round(prevDue * 100) / 100,
        todayBill: Math.round(todayBill * 100) / 100,
        paidAmount: Math.round(paid * 100) / 100,
        balanceDue: Math.round(balanceDue * 100) / 100,
        isAdvanceCredit: balanceDue < 0
    };
}

/**
 * Checks if current time is past the distributor's cut-off time (e.g., '18:00')
 */
export function isPastCutoff(cutOffTimeStr = '18:00') {
    const now = new Date();
    const [cutHour, cutMinute] = cutOffTimeStr.split(':').map(Number);
    const cutoffDate = new Date();
    cutoffDate.setHours(cutHour, cutMinute, 0, 0);
    return now > cutoffDate;
}

/**
 * Generates formatted invoice number (e.g. INV-20261022-RET001)
 */
export function generateInvoiceNumber(dateStr, retailerId) {
    const cleanDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    return `INV-${cleanDate}-${retailerId}`;
}
