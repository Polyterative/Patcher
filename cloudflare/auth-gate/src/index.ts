import { handle, type GateEnv } from './gate.ts';

// Only the handler may be exported from the entry module; logic lives in gate.ts.
export default {
  fetch(request: Request, env: GateEnv): Promise<Response> {
    return handle(request, env);
  },
};
