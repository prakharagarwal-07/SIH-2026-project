const { createWorker } = require("tesseract.js");

async function runOCR() {
    console.log("Starting OCR...");

    const worker = await createWorker("eng");

    const result = await worker.recognize(
        "uploads/0e956d7c6cea149348ed4e462f2b58f9"
    );

    console.log("\n===== OCR RESULT =====\n");
    console.log(result.data.text);

    await worker.terminate();
}

runOCR();