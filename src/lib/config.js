// How often the public pages refresh themselves, in milliseconds. Overridable
// at build time so tests don't wait ten seconds to see an update.
const override = Number(import.meta.env.VITE_POLL_MS);
export const POLL_MS = override > 0 ? override : 10000;
export const TV_POLL_MS = override > 0 ? override : 8000;
