export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const pid = process.pid;
    console.log(`🚀 [Instrumentation] Registering (PID: ${pid}, Runtime: ${process.env.NEXT_RUNTIME})`);
    const { startAutonomousWorker } = await import('./lib/background-sync');
    startAutonomousWorker();
  }
}
