/**
 * Preload Script — Ponte segura entre o Electron e o React
 * Expõe apenas as funções necessárias para controlar a janela.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isElectron: true,
});
