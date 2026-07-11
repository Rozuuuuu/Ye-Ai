/**
 * kolorsTryOn — free AI try-on provider: the Kwai-Kolors Virtual Try-On
 * Space on Hugging Face (ZeroGPU).
 *
 * Called directly from the browser, which keeps it free (no server time,
 * no API keys) and avoids serverless timeouts — free-GPU queue waits can
 * exceed a minute. The Space's run endpoint is unnamed (api_name: false),
 * so it is invoked by fn_index, discovered from the Space's /config
 * (see db/inspect-kolors-config.mjs): person image, garment image, seed,
 * randomize-seed → result image, seed used, response text.
 */

const SPACE = 'Kwai-Kolors/Kolors-Virtual-Try-On';
const RUN_FN_INDEX = 2;
const TIMEOUT_MS = 180_000; // covers ZeroGPU queue + generation

/**
 * @param {Blob} personBlob - webcam snapshot
 * @param {Blob} garmentBlob - flat garment image
 * @param {(text: string) => void} [onStatus] - queue/progress updates for the UI
 * @returns {Promise<string>} data URL (or remote URL if CORS blocks re-fetch)
 */
export async function kolorsTryOn(personBlob, garmentBlob, onStatus) {
  // Dynamic import keeps the hefty client out of the main bundle
  const { Client } = await import('@gradio/client');
  const client = await Client.connect(SPACE);
  const job = client.submit(RUN_FN_INDEX, [personBlob, garmentBlob, 0, true]);

  const timeout = setTimeout(() => job.cancel(), TIMEOUT_MS);
  try {
    for await (const msg of job) {
      if (msg.type === 'status') {
        if (msg.stage === 'error') {
          throw new Error(msg.message || 'Free try-on GPU rejected the request');
        }
        if (typeof msg.position === 'number' && msg.position > 0) {
          onStatus?.(`In queue · #${msg.position}`);
        } else if (msg.stage === 'pending') {
          onStatus?.('Generating…');
        }
      }
      if (msg.type === 'data') {
        const [image, , responseText] = msg.data || [];
        const url = image?.url || (image?.path ? `${client.config.root}/file=${image.path}` : null);
        if (!url) {
          throw new Error(
            typeof responseText === 'string' && responseText
              ? responseText
              : 'Free try-on returned no image'
          );
        }
        return await toDataUrl(url);
      }
    }
    throw new Error('Free try-on timed out — the shared GPU may be busy');
  } finally {
    clearTimeout(timeout);
  }
}

/** Re-fetch the result so Save/download works; fall back to the remote URL. */
async function toDataUrl(url) {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}
