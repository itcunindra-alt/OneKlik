const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');
code = code.replace(
  `        } else {\n          initializeApp({\n            projectId: config.projectId,\n          });\n        }`,
  `        } else {\n          if (process.env.VERCEL || process.env.NETLIFY) {\n            throw new Error("MISSING_SA_VERCEL");\n          }\n          initializeApp({\n            projectId: config.projectId,\n          });\n        }`
);
fs.writeFileSync('server.ts', code);
