import serverless from 'serverless-http';
import { createServerApp } from '../../server';

let serverlessHandler: any = null;

export const handler = async (event: any, context: any) => {
  if (!serverlessHandler) {
    // Setup Express app on the first invocation
    const app = await createServerApp();
    serverlessHandler = serverless(app);
  }
  
  return serverlessHandler(event, context);
};
