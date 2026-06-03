import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from './storage-keys'

const MIGRATION_FLAG = 'prep-engine-storage-migrated-v1'

export function migrateLegacyStorage() {
  if (localStorage.getItem(MIGRATION_FLAG)) return

  const pairs = Object.keys(STORAGE_KEYS) as (keyof typeof STORAGE_KEYS)[]
  for (const key of pairs) {
    const next = STORAGE_KEYS[key]
    const legacy = LEGACY_STORAGE_KEYS[key]
    if (!localStorage.getItem(next) && localStorage.getItem(legacy)) {
      localStorage.setItem(next, localStorage.getItem(legacy)!)
    }
  }

  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
}

export function exportUserData() {
  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    app: 'prep-engine',
    version: '1.0.0',
  }
  for (const value of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(value)
    if (raw) {
      try {
        payload[value] = JSON.parse(raw)
      } catch {
        payload[value] = raw
      }
    }
  }
  return payload
}

export function clearAllUserData() {
  for (const value of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(value)
  }
  for (const value of Object.values(LEGACY_STORAGE_KEYS)) {
    localStorage.removeItem(value)
  }
  localStorage.removeItem(MIGRATION_FLAG)
}
