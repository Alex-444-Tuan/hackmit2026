import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

export type PetMood = 'studying' | 'distracted' | 'celebrating' | 'idle'

export interface SessionState {
  mood: PetMood
  secondsLeft: number
  streak: number
}

const studypet = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  close: (): void => ipcRenderer.send('window:close'),

  showPet: (): void => ipcRenderer.send('pet:show'),
  hidePet: (): void => ipcRenderer.send('pet:hide'),

  sendSessionState: (state: SessionState): void => ipcRenderer.send('session-state', state),

  onSessionState: (cb: (state: SessionState) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, state: SessionState): void => cb(state)
    ipcRenderer.on('session-state-changed', handler)
    return () => ipcRenderer.removeListener('session-state-changed', handler)
  },

  openExternal: (url: string): void => ipcRenderer.send('open-external', url)
}

// Nothing beyond this is exposed. No raw ipcRenderer, no Node in the renderer.
contextBridge.exposeInMainWorld('studypet', studypet)

export type StudyPetBridge = typeof studypet
