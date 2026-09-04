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

    const imageSize =
        getImageSize(
            imageBytes,
            mimeType
        );

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

Also measure letter/numeral size for Legal
Metrology Rule 7.

For fontAnalysis, use NORMALISED coordinates
between 0 and 1 relative to the full image
(x, y, width, height).

CRITICAL for font boxes:
- Box a SINGLE typical numeral or capital
  letter of that declaration, not the whole
  sentence or paragraph.
- Prefer a digit from MRP and a digit from
  net quantity.
- The box height must tightly match the
  printed character height.

principalDisplayPanel should tightly cover
the main labelled face visible in the photo.
If the whole image is that face, use
x=0, y=0, width=1, height=1.

readability must be one of:
clear, poor, unreadable.

If a declaration is not visible, set that
region width and height to 0.

Return ONLY JSON.

{
  "productName": "",
  "netQuantity": "",
  "mrp": "",
  "batchNumber": "",
  "manufacturingDate": "",
  "bestBefore": "",
  "manufacturer": "",
  "fssaiLicense": "",
  "customerCare": "",
  "fontAnalysis": {
    "principalDisplayPanel": {
      "x": 0, "y": 0, "width": 1, "height": 1
    },
    "mrp": {
      "x": 0, "y": 0, "width": 0, "height": 0,
      "readability": "clear"
    },
    "netQuantity": {
      "x": 0, "y": 0, "width": 0, "height": 0,
      "readability": "clear"
    },
    "manufacturingDate": {
      "x": 0, "y": 0, "width": 0, "height": 0,
      "readability": "clear"
    },
    "manufacturer": {
      "x": 0, "y": 0, "width": 0, "height": 0,
      "readability": "clear"
    },
    "customerCare": {
      "x": 0, "y": 0, "width": 0, "height": 0,
      "readability": "clear"
    }
  }
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
                                },

                                fontAnalysis: {
                                    type: "object"
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


    const fontAnalysis =
        productInfo.fontAnalysis || {};

    delete productInfo.fontAnalysis;


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

    console.log("Font regions:");
    console.log(fontAnalysis);

    console.log("Image size:");
    console.log(imageSize);

    console.log("---------------------------------");


    return {
        productInfo,
        fontAnalysis,
        imageSize
    };

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


            const extraction =
                await extractProductInfoWithGemini(
                    imagePath,
                    req.file.mimetype
                );


            const productInfo =
                extraction.productInfo;

            const fontAnalysis =
                extraction.fontAnalysis;

            const imageSize =
                extraction.imageSize || {
                    width: 0,
                    height: 0
                };


            const faceWidthCm =
                req.body && req.body.faceWidthCm;

            const faceHeightCm =
                req.body && req.body.faceHeightCm;

            const molded =
                req.body &&
                String(req.body.molded)
                    .toLowerCase() === "true";


            // ==================================
            // STEP 2
            // RULE 7 FONT SIZE
            // ==================================

            console.log("");
            console.log(
                "STEP 2: RULE 7 FONT SIZE"
            );


            const fontSize =
                analyzeFontSize({
                    fontAnalysis,
                    faceWidthCm,
                    faceHeightCm,
                    molded,
                    imageWidth: imageSize.width,
                    imageHeight: imageSize.height
                });


            console.log(fontSize);


            // ==================================
            // STEP 3
            // COMPLIANCE
            // ==================================

            console.log("");
            console.log(
                "STEP 3: COMPLIANCE CHECK"
            );


            const compliance =
                checkCompliance(
                    productInfo,
                    fontSize
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
                "STEP 4: SENDING RESULT TO WEBSITE"
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


                productInfo:
                    productInfo,


                fontSize:
                    fontSize,


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