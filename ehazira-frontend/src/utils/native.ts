/**
 * Platform-aware native utilities.
 * Uses Capacitor plugins on mobile, browser APIs on web.
 */

let Capacitor: { isNativePlatform: () => boolean; getPlatform: () => string } | null = null
let GeolocationPlugin: { requestPermissions: () => Promise<{ location: string }>; getCurrentPosition: (opts: { enableHighAccuracy: boolean; timeout: number }) => Promise<{ coords: { latitude: number; longitude: number } }> } | null = null
let DevicePlugin: { getId: () => Promise<{ identifier: string }>; getInfo: () => Promise<{ manufacturer: string; model: string; operatingSystem: string; osVersion: string; platform: string }> } | null = null

// Lazy-load Capacitor modules (they won't exist on web until installed)
async function loadCapacitor() {
  if (Capacitor) return
  try {
    const core = await import('@capacitor/core')
    Capacitor = core.Capacitor
  } catch {
    Capacitor = null
  }
}

async function loadGeolocationPlugin() {
  if (GeolocationPlugin) return
  try {
    const mod = await import('@capacitor/geolocation')
    GeolocationPlugin = mod.Geolocation
  } catch {
    GeolocationPlugin = null
  }
}

async function loadDevicePlugin() {
  if (DevicePlugin) return
  try {
    const mod = await import('@capacitor/device')
    DevicePlugin = mod.Device
  } catch {
    DevicePlugin = null
  }
}

function isNative(): boolean {
  return Capacitor?.isNativePlatform() ?? false
}

/**
 * Get the current platform string: 'WEB', 'IOS', or 'ANDROID'
 */
export async function getPlatform(): Promise<string> {
  await loadCapacitor()
  if (isNative()) {
    return (Capacitor!.getPlatform() || 'web').toUpperCase()
  }
  return 'WEB'
}

/**
 * Get current GPS position.
 * On native: uses @capacitor/geolocation with permission request.
 * On web: uses navigator.geolocation.
 */
export async function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  await loadCapacitor()

  if (isNative()) {
    await loadGeolocationPlugin()
    if (GeolocationPlugin) {
      const perm = await GeolocationPlugin.requestPermissions()
      if (perm.location !== 'granted') {
        throw new Error('Location permission denied')
      }
      const pos = await GeolocationPlugin.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      })
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    }
  }

  // Web fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  })
}

/**
 * Get a stable device UUID.
 * On native: uses @capacitor/device (hardware identifier).
 * On web: generates and persists a UUID in localStorage.
 */
export async function getDeviceUUID(): Promise<string> {
  await loadCapacitor()

  if (isNative()) {
    await loadDevicePlugin()
    if (DevicePlugin) {
      const info = await DevicePlugin.getId()
      return info.identifier
    }
  }

  // Web fallback
  let uuid = localStorage.getItem('device_uuid')
  if (!uuid) {
    uuid = crypto.randomUUID()
    localStorage.setItem('device_uuid', uuid)
  }
  return uuid
}

/**
 * Generate a device fingerprint string.
 * On native: uses device manufacturer, model, OS info.
 * On web: uses navigator/screen properties.
 */
export async function getDeviceFingerprint(): Promise<string> {
  await loadCapacitor()

  if (isNative()) {
    await loadDevicePlugin()
    if (DevicePlugin) {
      const info = await DevicePlugin.getInfo()
      const data = [
        info.manufacturer,
        info.model,
        info.operatingSystem,
        info.osVersion,
        info.platform,
      ].join('|')
      return btoa(data).substring(0, 64)
    }
  }

  // Web fallback
  const data = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width + 'x' + screen.height,
    screen.colorDepth,
  ].join('|')
  return btoa(data).substring(0, 64)
}
