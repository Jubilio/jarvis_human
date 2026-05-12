/**
 * JARVIS AI OS — Electron Main Process
 * Este ficheiro é o núcleo do aplicativo desktop.
 * Ele cria a janela nativa e inicia o servidor FastAPI em background.
 */

const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;

// ============================================================
// INICIAR O BACKEND FASTAPI EM BACKGROUND
// ============================================================

function startBackend() {
  const projectRoot = path.join(__dirname, '..', '..');
  const backendDir = path.join(projectRoot, 'backend');
  const venvPython = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
  const uvicornPath = path.join(backendDir, 'venv', 'Scripts', 'uvicorn.exe');

  console.log('[JARVIS] Iniciando motor neural FastAPI...');

  backendProcess = spawn(uvicornPath, ['main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: backendDir,
    windowsHide: true, // Sem janela de terminal visível
    env: { ...process.env }
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[BACKEND] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[BACKEND] ${data}`);
  });

  backendProcess.on('close', (code) => {
    console.log(`[JARVIS] Backend encerrado com código: ${code}`);
  });
}

// ============================================================
// AGUARDAR O BACKEND ESTAR PRONTO
// ============================================================

function waitForBackend(maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get('http://127.0.0.1:8000/', (res) => {
        if (res.statusCode === 200) {
          console.log('[JARVIS] Motor neural online!');
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.setTimeout(800, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Backend não respondeu a tempo.'));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

// ============================================================
// CRIAR A JANELA PRINCIPAL
// ============================================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1200,
    minHeight: 700,
    frame: false,           // Sem barra de título nativa (HUD puro)
    transparent: false,
    backgroundColor: '#010308',
    icon: path.join(__dirname, '..', 'public', 'favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hidden',
    show: false,            // Não mostrar até carregar
  });

  // Carregar o app React (em dev usa o servidor Vite, em produção usa os ficheiros compilados)
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Abrir DevTools em modo dev (opcional)
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Mostrar a janela quando estiver pronta (evita flash branco)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('[JARVIS] Interface holográfica activa.');
  });

  // Abrir links externos no browser do sistema
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================================
// CONTROLOS DA JANELA (via IPC)
// ============================================================

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

// ============================================================
// CICLO DE VIDA DO APP
// ============================================================

app.whenReady().then(async () => {
  console.log('[JARVIS] Sistema a inicializar...');
  
  // Iniciar backend
  startBackend();
  
  // Aguardar backend estar pronto
  try {
    await waitForBackend(30, 1000);
  } catch (e) {
    console.error('[JARVIS] Aviso: Backend pode não estar pronto:', e.message);
  }
  
  // Criar a janela
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Encerrar o backend quando o app fechar
  if (backendProcess) {
    console.log('[JARVIS] Encerrando motor neural...');
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});
