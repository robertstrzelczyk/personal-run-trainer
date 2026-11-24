/** Minimalny odstęp między zapytaniami do Garmin (Personal API lubi 429). */
const MIN_GAP_MS = 450;

let chain: Promise<void> = Promise.resolve();
let lastAt = 0;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Kolejkuj wywołania — max 1 w locie z odstępem MIN_GAP_MS. */
export function paced<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastAt));
    if (wait) await sleep(wait);
    lastAt = Date.now();
    return work();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function withRetry429<T>(
  work: () => Promise<T>,
  attempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await paced(work);
    } catch (error) {
      lastError = error;
      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status: unknown }).status)
          : undefined;
      if (status !== 429 || i === attempts - 1) throw error;
      await sleep(2500 * (i + 1));
    }
  }
  throw lastError;
}

export async function pause(ms: number) {
  await sleep(ms);
}
