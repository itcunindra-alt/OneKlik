const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `  const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError: any = null;

  for (const model of models) {
    let delay = 600; // ms
    const maxRetries = 2; // 3 attempts total per model
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(\`[Gemini API] Calling model: \${model} (attempt \${attempt + 1}/\${maxRetries + 1})\`);
        const response = await client.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            responseMimeType: responseMimeType || "text/plain",
            temperature: temperature ?? 0.8,
          }
        });
        
        if (response.text) {
          console.log(\`[Gemini API] Successfully generated content using \${model}\`);
          return response.text;
        }
        
        throw new Error("Empty response text received");
      } catch (error: any) {
        lastError = error;
        const errStr = (error.message || String(error)).toLowerCase();
        
        if (errStr.includes("api key not valid") || errStr.includes("api_key_invalid") || errStr.includes("authentication failed")) {
          throw new Error("API Key Gemini tidak valid. Silakan periksa kembali API Key Anda di menu pengaturan.");
        }
        
        const isServerBusy = errStr.includes("503") || 
                             errStr.includes("unavailable") || 
                             errStr.includes("demand");
                             
        const isTransient = isServerBusy ||
                            errStr.includes("429") || 
                            errStr.includes("resource_exhausted") ||
                            errStr.includes("limit") ||
                            errStr.includes("empty response");

        if (isServerBusy) {
          console.warn(\`[Gemini API] Server busy (503/demand) with model \${model}. Bypassing retries and falling back to next model immediately.\`);
          break; // Break inner loop immediately to switch model instantly
        }

        if (isTransient && attempt < maxRetries) {
          console.warn(\`[Gemini API] Transient error with model \${model} on attempt \${attempt + 1}. Retrying in \${delay}ms...\`, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.8; // Exponential backoff
        } else {
          console.warn(\`[Gemini API] Error or exhausted retries for model \${model}. Moving to fallback or final failure. Error:\`, error);
          break; // Break inner loop, try next fallback model in list
        }
      }
    }
  }

  // If we reach here, all models and retries failed
  const errStr = lastError?.message || String(lastError);`;

const replacement = `  // Jika user memilih model spesifik di pengaturan (melalui modelId), kita bisa menghormatinya jika ada
  // Namun karena UI sering menyembunyikan input modelId untuk GEMINI, kita pakai fallback yang andal
  const models = modelId && modelId.startsWith("gemini") ? [modelId, "gemini-2.5-flash", "gemini-3.5-flash"] : ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-1.5-flash"];
  let firstError: any = null;
  let lastError: any = null;

  for (const model of models) {
    let delay = 600; // ms
    const maxRetries = 2; // 3 attempts total per model
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(\`[Gemini API] Calling model: \${model} (attempt \${attempt + 1}/\${maxRetries + 1})\`);
        const response = await client.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            responseMimeType: responseMimeType || "text/plain",
            temperature: temperature ?? 0.8,
          }
        });
        
        if (response.text) {
          console.log(\`[Gemini API] Successfully generated content using \${model}\`);
          return response.text;
        }
        
        throw new Error("Empty response text received");
      } catch (error: any) {
        if (!firstError) firstError = error; // Simpan error pertama dari model prioritas tertinggi
        lastError = error;
        
        const errStr = (error.message || String(error)).toLowerCase();
        
        if (errStr.includes("api key not valid") || errStr.includes("api_key_invalid") || errStr.includes("authentication failed")) {
          throw new Error("API Key Gemini tidak valid. Silakan periksa kembali API Key Anda di menu pengaturan.");
        }
        
        const isServerBusy = errStr.includes("503") || 
                             errStr.includes("unavailable") || 
                             errStr.includes("demand");
                             
        const isTransient = isServerBusy ||
                            errStr.includes("429") || 
                            errStr.includes("resource_exhausted") ||
                            errStr.includes("limit") ||
                            errStr.includes("empty response");

        if (isServerBusy) {
          console.warn(\`[Gemini API] Server busy (503/demand) with model \${model}. Bypassing retries and falling back to next model immediately.\`);
          break; // Break inner loop immediately to switch model instantly
        }

        if (isTransient && attempt < maxRetries) {
          console.warn(\`[Gemini API] Transient error with model \${model} on attempt \${attempt + 1}. Retrying in \${delay}ms...\`, error);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.8; // Exponential backoff
        } else {
          console.warn(\`[Gemini API] Error or exhausted retries for model \${model}. Moving to fallback or final failure. Error:\`, error);
          break; // Break inner loop, try next fallback model in list
        }
      }
    }
  }

  // Jika kita sampai di sini, semua model dan percobaan gagal.
  // Gunakan pesan error dari percobaan PERTAMA karena itu adalah model yang paling diinginkan
  // namun jika yang pertama adalah 404, mungkin kita bisa menunjukkan error rate limit jika ada di fallback
  let errorToThrow = firstError;
  const firstErrStr = (firstError?.message || String(firstError)).toLowerCase();
  const lastErrStr = (lastError?.message || String(lastError)).toLowerCase();
  
  if (firstErrStr.includes("not found") && lastErrStr.includes("429")) {
      errorToThrow = lastError;
  }

  const errStr = errorToThrow?.message || String(errorToThrow);`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
console.log("Replaced successfully!");
