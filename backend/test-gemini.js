require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

async function testGemini() {
    try {
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: "Say hello to PackCheck in one sentence."
        });

        console.log("✅ Gemini is working!");
        console.log("Gemini response:");
        console.log(response.text);

    } catch (error) {
        console.error("❌ Gemini test failed:");
        console.error(error.message);
    }
}

testGemini();