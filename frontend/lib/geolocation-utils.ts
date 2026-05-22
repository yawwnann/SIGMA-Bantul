/**
 * Geolocation utilities with fallback capabilities for robust device location retrieval.
 * Standard browsers (especially desktop ones) often timeout or fail when enableHighAccuracy: true
 * is requested because they don't have GPS hardware. These utilities automatically fallback
 * to low-accuracy mode when needed.
 */

export interface RobustPositionOptions extends PositionOptions {
  fallbackTimeout?: number;
}

/**
 * Robust wrapper for navigator.geolocation.getCurrentPosition.
 * If enableHighAccuracy is true and it fails due to TIMEOUT or POSITION_UNAVAILABLE,
 * it retries with enableHighAccuracy: false.
 */
export function getCurrentPositionRobust(
  successCallback: (position: GeolocationPosition) => void,
  errorCallback: (error: GeolocationPositionError) => void,
  options?: RobustPositionOptions
): void {
  if (typeof window === "undefined" || !navigator.geolocation) {
    const error = new Error("Geolocation tidak didukung oleh browser ini") as any;
    error.code = 0; // Custom code for unsupported
    errorCallback(error as GeolocationPositionError);
    return;
  }

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    fallbackTimeout = 10000,
  } = options || {};

  if (enableHighAccuracy) {
    // Attempt high accuracy with a shorter primary timeout (max 5s) so the fallback is fast
    const primaryTimeout = Math.min(timeout, 5000);

    console.log(`[Geolocation] Attempting high accuracy location (timeout: ${primaryTimeout}ms)...`);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("[Geolocation] High accuracy location obtained successfully.");
        successCallback(position);
      },
      (error) => {
        // Only fallback if it's a timeout or position is unavailable
        if (
          error.code === error.TIMEOUT ||
          error.code === error.POSITION_UNAVAILABLE
        ) {
          console.warn(
            `[Geolocation] High accuracy failed (code: ${error.code}). Retrying with low accuracy...`
          );
          navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
            enableHighAccuracy: false,
            timeout: fallbackTimeout,
            maximumAge,
          });
        } else {
          // If PERMISSION_DENIED or other error, do not retry and fail immediately
          errorCallback(error);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: primaryTimeout,
        maximumAge,
      }
    );
  } else {
    // Standard low-accuracy call
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  }
}

/**
 * Robust watchPosition that restarts with enableHighAccuracy: false if high-accuracy watch fails.
 */
export function watchPositionRobust(
  successCallback: (position: GeolocationPosition) => void,
  errorCallback: (error: GeolocationPositionError) => void,
  options?: RobustPositionOptions
): { clear: () => void; getWatchId: () => number | null } {
  let watchId: number | null = null;
  let isCleared = false;

  if (typeof window === "undefined" || !navigator.geolocation) {
    const error = new Error("Geolocation tidak didukung oleh browser ini") as any;
    error.code = 0;
    errorCallback(error as GeolocationPositionError);
    return {
      clear: () => {},
      getWatchId: () => null,
    };
  }

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 30000,
    fallbackTimeout = 10000,
  } = options || {};

  const clear = () => {
    isCleared = true;
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };

  const startWatch = (highAccuracy: boolean) => {
    if (isCleared) return;

    const currentTimeout = highAccuracy ? Math.min(timeout, 5000) : fallbackTimeout;

    console.log(
      `[Geolocation] Starting watchPosition (highAccuracy: ${highAccuracy}, timeout: ${currentTimeout}ms)...`
    );

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (isCleared) return;
        successCallback(position);
      },
      (error) => {
        if (isCleared) return;

        // If high accuracy fails with timeout or position unavailable, clear and restart with low accuracy
        if (
          highAccuracy &&
          (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)
        ) {
          console.warn(
            `[Geolocation] High accuracy watchPosition failed (code: ${error.code}). Restarting watch with low accuracy...`
          );
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }
          startWatch(false);
        } else {
          // Pass the error to the callback
          errorCallback(error);
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: currentTimeout,
        maximumAge,
      }
    );
  };

  startWatch(enableHighAccuracy);

  return {
    clear,
    getWatchId: () => watchId,
  };
}
