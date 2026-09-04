function extractProductInfo(ocrText) {
    const text = ocrText || "";

    const result = {
        productName: null,
        netQuantity: null,
        mrp: null,
        batchNumber: null,
        manufacturingDate: null,
        bestBefore: null,
        manufacturer: null,
        fssaiLicense: null,
        customerCare: null
    };

    // --------------------------------
    // MRP / Maximum Retail Price
    // --------------------------------
    const mrpMatch = text.match(
        /(?:M\.?\s*R\.?\s*P\.?|maximum\s*retail\s*price)\s*[:\-©®]?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i
    );

    if (mrpMatch) {
        result.mrp = `₹${mrpMatch[1]}`;
    }

    // --------------------------------
    // Net Quantity / Net Weight
    // --------------------------------
    const quantityMatch = text.match(
        /(?:net\s*(?:quantity|qty|weight|wt))\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kg|kgs|g|gm|gms|mg|l|ltr|litre|liter|ml)\b/i
    );

    if (quantityMatch) {
        result.netQuantity =
            `${quantityMatch[1]} ${quantityMatch[2]}`;
    }

    // --------------------------------
    // Manufacturing / Packed Date
    // --------------------------------
    const manufacturingMatch = text.match(
        /(?:mfg|mfd|manufactured|manufacturing|packed\s*on|packedon|pkd)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    );

    if (manufacturingMatch) {
        result.manufacturingDate = manufacturingMatch[1];
    }

    // --------------------------------
    // Best Before
    // --------------------------------
    const bestBeforeMatch = text.match(
        /best\s*(?:before|bef\.?)\s*[:\-]?\s*([^\n\r]+)/i
    );

    if (bestBeforeMatch) {
        result.bestBefore = bestBeforeMatch[1].trim();
    }

    // --------------------------------
    // Expiry / Use By
    // --------------------------------
    const expiryMatch = text.match(
        /(?:expiry|exp\.?|use\s*by)\s*[:\-]?\s*([^\n\r]+)/i
    );

    if (!result.bestBefore && expiryMatch) {
        result.bestBefore = expiryMatch[1].trim();
    }

    // --------------------------------
    // Batch Number
    // --------------------------------
    const batchMatch = text.match(
        /(?:batch\s*(?:no\.?|number)?|lot\s*(?:no\.?|number)?)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]*)/i
    );

    if (batchMatch) {
        result.batchNumber = batchMatch[1];
    }

    // --------------------------------
    // Manufacturer
    // --------------------------------
    const manufacturerMatch = text.match(
        /(?:manufactured\s*by|mfg\.?\s*by|manufactured\s*&\s*marketed\s*by|manufactured\s*and\s*marketed\s*by)\s*[:\-]?\s*([^\n\r]+)/i
    );

    if (manufacturerMatch) {
        result.manufacturer = manufacturerMatch[1].trim();
    }

    // --------------------------------
    // FSSAI Licence Number
    // --------------------------------
    const fssaiMatch = text.match(
        /(?:fssai|lic\.?\s*no\.?|license\s*no\.?|licence\s*no\.?)\s*[:\-]?\s*(\d{10,14})/i
    );

    if (fssaiMatch) {
        result.fssaiLicense = fssaiMatch[1];
    }

    // --------------------------------
    // Customer Care / Helpline
    // --------------------------------
    const customerCareMatch = text.match(
        /(?:customer\s*care|consumer\s*care|helpline|toll\s*free)\s*(?:no\.?|number)?\s*[:\-]?\s*([0-9][0-9\s\-\/().]{7,})/i
    );

    if (customerCareMatch) {
        result.customerCare = customerCareMatch[1].trim();
    }

    // --------------------------------
    // Product Name
    // --------------------------------
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 2);

    if (lines.length > 0) {
        // Try to avoid treating obvious labels as product name
        const ignoredLines = [
            "mrp",
            "net weight",
            "net quantity",
            "batch",
            "packed on",
            "best before",
            "expiry",
            "customer care"
        ];

        const possibleName = lines.find(line => {
            const lower = line.toLowerCase();

            return !ignoredLines.some(label =>
                lower.startsWith(label)
            );
        });

        if (possibleName) {
            result.productName = possibleName;
        }
    }

    return result;
}

module.exports = {
    extractProductInfo
};