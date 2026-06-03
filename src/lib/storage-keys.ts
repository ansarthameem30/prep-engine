/** localStorage keys — prefixed for Prep Engine */
export const STORAGE_KEYS = {
  settings: 'prep-engine-settings',
  progress: 'prep-engine-progress',
  notes: 'prep-engine-notes',
  bookmarks: 'prep-engine-bookmarks',
  gamification: 'prep-engine-gamification',
} as const

/** Legacy keys from Sprint Studio — migrated once on boot */
export const LEGACY_STORAGE_KEYS = {
  settings: 'sprint-settings',
  progress: 'sprint-progress',
  notes: 'sprint-notes',
  bookmarks: 'sprint-bookmarks',
  gamification: 'sprint-gamification',
} as const
