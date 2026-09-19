import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let petWindow: BrowserWindow | null = null

function alive(): BrowserWindow | null {
  return petWindow && !petWindow.isDestroyed() ? petWindow : null
}

export function createPetWindow(): BrowserWindow {
  const existing = alive()
  if (existing) return existing

  const { workArea } = screen.getPrimaryDisplay()
  const width = 200
  const height = 200

  petWindow = new BrowserWindow({
    width,
    height,
    // Bottom right of the usable desktop, clear of the taskbar.
    x: workArea.x + workArea.width - width - 28,
    y: workArea.y + workArea.height - height - 28,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 'floating' keeps it above normal windows without fighting system UI.
  petWindow.setAlwaysOnTop(true, 'floating')
  petWindow.on('ready-to-show', () => alive()?.showInactive())
  petWindow.on('closed', () => {
    petWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void petWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/pet.html`)
  } else {
    void petWindow.loadFile(join(__dirname, '../renderer/pet.html'))
  }

  return petWindow
}

export function showPetWindow(): void {
  const win = createPetWindow()
  if (!win.isVisible()) win.showInactive()
}

export function hidePetWindow(): void {
  alive()?.hide()
}

export function getPetWindow(): BrowserWindow | null {
  return alive()
}
