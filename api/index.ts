import serverless from 'serverless-http';
import { createServerApp } from '../server';

let handlerInstance: any = null;

export default async function handler(req: any, res: any) {
  if (!handlerInstance) {
    const app = await createServerApp();
    handlerInstance = serverless(app);
  }
  return handlerInstance(req, res);
}

