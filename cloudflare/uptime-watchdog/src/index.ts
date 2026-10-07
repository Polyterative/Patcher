import { runWatchdog, type WatchdogEnv } from './watchdog.ts';

// Only the handler may be exported from the entry module; logic lives in watchdog.ts.
export default {
  async scheduled(controller: ScheduledController, env: WatchdogEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runWatchdog(env, controller.scheduledTime));
  },
};
