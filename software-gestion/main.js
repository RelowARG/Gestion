// main.js (Updated - Balance handler included)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'src', 'preload.js'),
    },
    minWidth: 800,
    minHeight: 600,
    maximizable: true,
    fullscreenable: true,
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));

  mainWindow.once('ready-to-show', () => {
      mainWindow.show();
  });

  // mainWindow.webContents.openDevTools(); // Descomentar si necesitas dev tools
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  console.log('Electron main process is ready.');
  createWindow(); // Create the window
});

// --- Manejador IPC para guardar Presupuesto como PDF ---
ipcMain.handle('save-presupuesto-pdf', async (event, htmlContent, suggestedFileName) => {
    let pdfWindow = null;
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Guardar Presupuesto como PDF',
            defaultPath: suggestedFileName,
            filters: [{ name: 'Archivos PDF', extensions: ['pdf'] }],
        });

        if (result.canceled) {
            console.log('Guardado de PDF cancelado por el usuario.');
            return { success: false, message: 'canceled' };
        }

        const filePath = result.filePath;

        pdfWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        const htmlDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        await pdfWindow.loadURL(htmlDataUrl);

        const pdfBuffer = await pdfWindow.webContents.printToPDF({
            printBackground: true,
            marginsType: 1,
        });

        await fs.writeFile(filePath, pdfBuffer);

        console.log(`PDF guardado exitosamente en: ${filePath}`);

        if (pdfWindow && !pdfWindow.isDestroyed()) {
             pdfWindow.close();
        }

        return { success: true, filePath: filePath };

    } catch (error) {
        console.error('Error en el manejador save-presupuesto-pdf:', error);
        if (pdfWindow && !pdfWindow.isDestroyed()) {
            pdfWindow.close();
        }
        return { success: false, message: error.message };
    }
});


// Menu.setApplicationMenu(null);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.whenReady().then(() => {
    console.log('Electron main process is ready.');
});