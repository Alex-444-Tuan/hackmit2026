import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { createPetWindow, getPetWindow, hidePetWindow, showPetWindow } from './petWindow'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Only YouTube watch pages may be opened externally. */
function isAllowedExternal(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'www.youtube.com' && parsed.pathname === '/watch'
  } catch {
    return false
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.studypet')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:close', () => mainWindow?.close())

  ipcMain.on('pet:show', () => showPetWindow())
  ipcMain.on('pet:hide', () => hidePetWindow())

  // Main window pushes session state; we relay it to the pet window.
  // No polling, no backend round trip.
  ipcMain.on('session-state', (_event, state) => {
    getPetWindow()?.webContents.send('session-state-changed', state)
  })

  ipcMain.on('open-external', (_event, url: string) => {
    if (typeof url === 'string' && isAllowedExternal(url)) {
      void shell.openExternal(url)
    }
  })

  createWindow()
  createPetWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
