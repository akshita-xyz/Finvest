const STORAGE_KEY = 'finvest_guest_session';

/**
 * @param {boolean} on
 */
export function setGuestMode(on) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, '1');
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function isGuestMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}
