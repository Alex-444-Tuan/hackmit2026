import type { StudyPetBridge } from './index'

declare global {
  interface Window {
    studypet: StudyPetBridge
  }
}

export {}
