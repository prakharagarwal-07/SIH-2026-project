require("dotenv").config();

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");

const { GoogleGenAI } = require("@google/genai");
const { checkCompliance } = require("./compliance");
const { analyzeFontSize, getImageSize } = require("./fontSize");

const app = express();

app.use(cors());


// ==========================================
// SERVER CONFIGURATION
// ==========================================

const PORT = process.env.PORT || 3000;


// ==========================================
// GEMINI CONFIGURATION
// ==========================================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,

    httpOptions: {
        timeout: 60000
    }
});


// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const upload = multer({
    dest: "uploads/"
});


// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {

    res.json({
        status: "ok",
        message: "PackCheck backend is running"
    });

});


// ==========================================
// GEMINI PRODUCT EXTRACTION
// ==========================================

async function extractProductInfoWithGemini(
    imagePath,
    mimeType
) {

    console.log("---------------------------------");
    console.log("Reading package image...");
    console.log("---------------------------------");


    // ======================================
    // READ IMAGE
    // ======================================

    const imageBytes =
        fs.readFileSync(imagePath);

    const base64Image =
        imageBytes.toString("base64");


    // ======================================
    // GEMINI PROMPT
    // ======================================

    const prompt = `

You are PackCheck, an AI assistant that
extracts information from Indian product
and food packaging labels.

Carefully inspect the ENTIRE package image.

Your job is to extract ONLY information that
is actually visible on the package.

IMPORTANT RULES:

1. NEVER guess or invent information.

2. If a field cannot be clearly identified,
   return an empty string.

3. Do not confuse the brand name with the
   actual product name.

4. Read the actual label, including small
   printed text.

5. Understand common variations and
   abbreviations such as:

   - MRP
   - M.R.P.
   - MRP ₹
   - MFD
   - MFG
   - MANUFACTURED
   - PKD
   - PACKED ON
   - PACKED
   - BATCH
   - BATCH NO
   - LOT
   - LOT NO
   - BEST BEFORE
   - USE BY
   - EXPIRY
   - EXP
   - FSSAI
   - FSSAI LICENCE
   - CUSTOMER CARE
   - CONSUMER CARE

6. If the package says "Packed On", treat
   that as the manufacturing/packed date.

7. If a date is present, preserve it as it
   appears on the package.

8. Preserve quantities and units as they
   appear on the package.

9. For MRP, preserve the currency symbol
   if visible.

10. Do not use information from general
    knowledge.

11. Do not infer a manufacturer merely from
    a brand name.

12. Do not assume an FSSAI licence exists
    if it is not visible.

13. Do not turn unclear characters into
    guessed values.

14. If something is not readable or not
    present, return an empty string.

15. Look at the WHOLE image before deciding
    that information is missing.

16. Pay special attention to small printed
    areas containing dates, batch numbers,
    MRP and licence numbers.

Return ONLY JSON.

Return exactly these fields:

{
  "productName": "",
  "netQuantity": "",
  "mrp": "",
  "batchNumber": "",
  "manufacturingDate": "",
  "bestBefore": "",
  "manufacturer": "",
  "fssaiLicense": "",
  "customerCare": ""
}

An empty string means the information was
not clearly visible in the image.

`;


    // ======================================
    // SEND ONE REQUEST TO GEMINI
    // ======================================

    console.log(
        "Sending package image to Gemini..."
    );


    const response =
        await ai.models.generateContent({

            model: "gemini-3.6-flash",

            contents: [

                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image
                    }
                },

                {
                    text: prompt
                }

            ],

            config: {

                responseFormat: {

                    text: {

                        mimeType:
                            "application/json",

                        schema: {

                            type: "object",

                            properties: {

                                productName: {
                                    type: "string"
                                },

                                netQuantity: {
                                    type: "string"
                                },

                                mrp: {
                                    type: "string"
                                },

                                batchNumber: {
                                    type: "string"
                                },

                                manufacturingDate: {
                                    type: "string"
                                },

                                bestBefore: {
                                    type: "string"
                                },

                                manufacturer: {
                                    type: "string"
                                },

                                fssaiLicense: {
                                    type: "string"
                                },

                                customerCare: {
                                    type: "string"
                                }

                            },

                            required: [

                                "productName",
                                "netQuantity",
                                "mrp",
                                "batchNumber",
                                "manufacturingDate",
                                "bestBefore",
                                "manufacturer",
                                "fssaiLicense",
                                "customerCare"

                            ]

                        }

                    }

                }

            }

        });


    // ======================================
    // GET GEMINI RESPONSE
    // ======================================

    const text =
        response.text;


    console.log("---------------------------------");
    console.log("Gemini raw response:");
    console.log(text);
    console.log("---------------------------------");


    // ======================================
    // CLEAN GEMINI RESPONSE
    // ======================================

    let cleanedText =
        text.trim();


    // Gemini sometimes returns:

    // ```json
    // {
    //   ...
    // }
    // ```

    // Remove Markdown code fences.

    if (cleanedText.startsWith("```")) {

        cleanedText =
            cleanedText
                .replace(
                    /^```json\s*/i,
                    ""
                )
                .replace(
                    /^```\s*/i,
                    ""
                )
                .replace(
                    /\s*```$/i,
                    ""
                )
                .trim();

    }


    // ======================================
    // PARSE JSON
    // ======================================

    let productInfo;

    try {

        productInfo =
            JSON.parse(cleanedText);

    }

    catch (error) {

        console.error(
            "Gemini returned invalid JSON."
        );

        console.error(
            cleanedText
        );

        throw new Error(
            "Gemini returned invalid JSON"
        );

    }


    // ======================================
    // ENSURE REQUIRED FIELDS EXIST
    // ======================================

    const requiredFields = [

        "productName",
        "netQuantity",
        "mrp",
        "batchNumber",
        "manufacturingDate",
        "bestBefore",
        "manufacturer",
        "fssaiLicense",
        "customerCare"

    ];


    for (const field of requiredFields) {

        if (
            productInfo[field] === undefined ||
            productInfo[field] === ""
        ) {

            productInfo[field] = null;

        }

    }


    // ======================================
    // LOG FINAL EXTRACTION
    // ======================================

    console.log("---------------------------------");
    console.log(
        "Gemini extraction completed:"
    );

    console.log(productInfo);

    console.log("---------------------------------");


    return productInfo;

}


// ==========================================
// DELETE TEMPORARY IMAGE
// ==========================================

function deleteUploadedFile(filePath) {

    try {

        if (
            filePath &&
            fs.existsSync(filePath)
        ) {

            fs.unlinkSync(filePath);

            console.log(
                "Temporary image deleted."
            );

        }

    }

    catch (error) {

        console.error(
            "Could not delete temporary image:",
            error.message
        );

    }

}


// ==========================================
// PRODUCT SCAN
// ==========================================

app.post(
    "/api/scan",
    upload.single("productImage"),

    async (req, res) => {

        let imagePath = null;


        try {

            // ==================================
            // CHECK IMAGE
            // ==================================

            if (!req.file) {

                return res.status(400).json({

                    status: "error",

                    message:
                        "No product image was uploaded"

                });

            }


            imagePath =
                req.file.path;


            console.log("");
            console.log("=================================");
            console.log("PACKCHECK SCAN STARTED");
            console.log("=================================");


            console.log(
                "Image:",
                req.file.originalname
            );


            console.log(
                "Type:",
                req.file.mimetype
            );


            console.log(
                "Size:",
                req.file.size,
                "bytes"
            );


            // ==================================
            // STEP 1
            // GEMINI VISION
            // ==================================

            console.log("");
            console.log(
                "STEP 1: GEMINI VISION"
            );


            const productInfo =
                await extractProductInfoWithGemini(
                    imagePath,
                    req.file.mimetype
                );


            // ==================================
            // STEP 2
            // COMPLIANCE
            // ==================================

            console.log("");
            console.log(
                "STEP 2: COMPLIANCE CHECK"
            );


            const compliance =
                checkCompliance(
                    productInfo
                );


            console.log(
                "Compliance result:"
            );

            console.log(
                compliance
            );


            // ==================================
            // STEP 3
            // SEND RESULT
            // ==================================

            console.log("");
            console.log(
                "STEP 3: SENDING RESULT TO WEBSITE"
            );


            res.json({

                status: "ok",

                message:
                    "Product image processed successfully",

                file: {

                    originalName:
                        req.file.originalname,

                    filename:
                        req.file.filename,

                    size:
                        req.file.size,

                    mimetype:
                        req.file.mimetype

                },


                // Gemini result
                productInfo:
                    productInfo,


                // Compliance result
                compliance:
                    compliance

            });


            console.log("");
            console.log("=================================");
            console.log("PACKCHECK SCAN COMPLETED");
            console.log("=================================");

        }


        catch (error) {

            console.error("");
            console.error(
                "================================="
            );

            console.error(
                "PACKCHECK PROCESSING ERROR"
            );

            console.error(
                "================================="
            );

            console.error(
                error
            );


            if (!res.headersSent) {

                res.status(500).json({

                    status: "error",

                    message:
                        "Failed to process product image",

                    error:
                        error.message

                });

            }

        }


        finally {

            // ==================================
            // DELETE TEMPORARY IMAGE
            // ==================================

            deleteUploadedFile(
                imagePath
            );

        }

    }
);


// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    "0.0.0.0",

    () => {

        console.log("");
        console.log(
            "================================="
        );

        console.log(
            `PackCheck backend running on port ${PORT}`
        );

        console.log(
            "================================="
        );

    }
);