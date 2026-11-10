/** G2 is not enabled: quality and temporal diversity are not watch detection. */
export const detectionCapabilities = () => ({ watchPresence: 'unknown' as const, view: 'unknown' as const, modelEnabled: false as const });
