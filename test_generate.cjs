const { GoogleGenAI } = require("@google/genai");

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "hello",
      config: {
        responseMimeType: "application/json",
      }
    });
    console.log("SUCCESS:", response.text);
  } catch (e) {
    console.error("ERROR 1.5-pro:", e);
  }
}
run();
