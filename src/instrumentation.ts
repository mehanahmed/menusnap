export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Run an initial sweep on server start
    try {
      const { autoCloseMidnightShifts } = await import('@/app/actions/hrm');
      await autoCloseMidnightShifts();
    } catch (_) {}

    // Check periodically in the background every 5 minutes
    setInterval(async () => {
      try {
        const { autoCloseMidnightShifts } = await import('@/app/actions/hrm');
        const res = await autoCloseMidnightShifts();
        if (res.closedCount > 0) {
          console.log(`⏰ [Auto Check-Out] Automatically closed ${res.closedCount} unclosed shift(s) after midnight.`);
        }
      } catch (err) {
        console.error('Error in background auto-checkout timer:', err);
      }
    }, 5 * 60 * 1000);
  }
}
