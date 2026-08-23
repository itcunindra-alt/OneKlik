import { createServerApp } from '../server';

let appPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      appPromise = createServerApp();
    }
    const app = await appPromise;
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}

