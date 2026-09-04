function checkCompliance(productInfo) {
    const checks = [];

    // MRP
    checks.push({
        field: "MRP",
        value: productInfo.mrp,
        status: productInfo.mrp ? "PASS" : "REVIEW",
        message: productInfo.mrp
            ? "MRP detected"
            : "MRP could not be detected"
    });

    // Net quantity
    checks.push({
        field: "Net Quantity",
        value: productInfo.netQuantity,
        status: productInfo.netQuantity ? "PASS" : "REVIEW",
        message: productInfo.netQuantity
            ? "Net quantity detected"
            : "Net quantity could not be detected"
    });

    // Batch number
    checks.push({
        field: "Batch Number",
        value: productInfo.batchNumber,
        status: productInfo.batchNumber ? "PASS" : "REVIEW",
        message: productInfo.batchNumber
            ? "Batch number detected"
            : "Batch number could not be detected"
    });

    // Manufacturing / packed date
    checks.push({
        field: "Manufacturing / Packed Date",
        value: productInfo.manufacturingDate,
        status: productInfo.manufacturingDate ? "PASS" : "REVIEW",
        message: productInfo.manufacturingDate
            ? "Manufacturing/packed date detected"
            : "Manufacturing/packed date could not be detected"
    });

    // Best before / expiry
    checks.push({
        field: "Best Before / Expiry",
        value: productInfo.bestBefore,
        status: productInfo.bestBefore ? "PASS" : "REVIEW",
        message: productInfo.bestBefore
            ? "Best-before/expiry information detected"
            : "Best-before/expiry information could not be detected"
    });

    // Manufacturer
    checks.push({
        field: "Manufacturer",
        value: productInfo.manufacturer,
        status: productInfo.manufacturer ? "PASS" : "REVIEW",
        message: productInfo.manufacturer
            ? "Manufacturer information detected"
            : "Manufacturer information could not be detected"
    });

    // FSSAI
    checks.push({
        field: "FSSAI Licence",
        value: productInfo.fssaiLicense,
        status: productInfo.fssaiLicense ? "PASS" : "REVIEW",
        message: productInfo.fssaiLicense
            ? "FSSAI licence number detected"
            : "FSSAI licence number could not be detected"
    });

    // Customer care
    checks.push({
        field: "Customer Care",
        value: productInfo.customerCare,
        status: productInfo.customerCare ? "PASS" : "REVIEW",
        message: productInfo.customerCare
            ? "Customer-care information detected"
            : "Customer-care information could not be detected"
    });
    // Count results

    const passed = checks.filter(
        check => check.status === "PASS"
    ).length;

    const failed = checks.filter(
        check => check.status === "FAIL"
    ).length;

    const review = checks.filter(
        check => check.status === "REVIEW"
    ).length;

    let overallStatus = "COMPLIANT";

    if (failed > 0) {
        overallStatus = "FAIL";
    } else if (review > 0) {
        overallStatus = "NEEDS REVIEW";
    }

    return {
        overallStatus,
        totalChecks: checks.length,
        passed,
        failed,
        review,
        checks
    };
}

module.exports = {
    checkCompliance
};