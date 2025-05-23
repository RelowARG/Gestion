// software-gestion/main.js (Con manejador de exportación llamando al backend Express y la IP del servidor)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
// fetch está disponible globalmente en Electron a partir de versiones recientes.
// No es necesario 'node-fetch' a menos que uses una versión muy antigua de Electron.

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

  // mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  console.log('Electron main process is ready.');
  createWindow();

  ipcMain.handle('save-presupuesto-pdf', async (event, htmlContent, suggestedFileName) => {
    let pdfWindow = null;
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Presupuesto como PDF',
        defaultPath: suggestedFileName,
        filters: [{ name: 'Archivos PDF', extensions: ['pdf'] }],
      });

      if (result.canceled) {
        console.log('[Backend] Guardado de PDF cancelado por el usuario.');
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
      console.log(`[Backend] PDF guardado exitosamente en: ${filePath}`);

      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
      return { success: true, filePath: filePath };

    } catch (error) {
      console.error('[Backend] Error en el manejador save-presupuesto-pdf:', error);
      if (pdfWindow && !pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
      return { success: false, error: error.message || 'Error desconocido en el backend PDF.' };
    }
  });

  ipcMain.handle('exportProductosCsv', async (event) => {
    try {
      console.log('[Backend Export] Solicitando datos de productos al backend Express...');

      // MODIFICACIÓN: Usar la IP del servidor backend
      const API_URL = 'http://192.168.0.7:3001/api/productos'; // <--- IP DEL SERVIDOR BACKEND
      const AUTH_TOKEN = 'fake-auth-token'; // <--- ¡AJUSTA ESTO! Debes usar el token REAL del usuario logueado

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[Backend Export] Error al obtener productos del backend:', response.status, errorData);
        return { success: false, error: `Error del backend (${response.status}): ${errorData.error || response.statusText}` };
      }

      const productos = await response.json();
      console.log(`[Backend Export] ${productos.length} productos recibidos del backend.`);

      if (!productos || productos.length === 0) {
        return { success: false, error: 'No hay productos para exportar recibidos del backend.' };
      }

      const columns = [
        'id', 'codigo', 'Descripcion', 'eti_x_rollo',
        'costo_x_1000', 'costo_x_rollo', 'precio',
        'banda', 'material', 'Buje'
      ];
      const csvHeader = columns.join(';');
      const csvRows = productos.map(producto =>
        columns.map(col => {
          let value = producto[col];
          if (value === null || value === undefined) {
            value = '';
          }
          if (typeof value === 'string') {
            if (value.includes(';') || value.includes('"') || value.includes('\n')) {
              value = value.replace(/"/g, '""');
              value = `"${value}"`;
            }
          }
          return value;
        }).join(';')
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar Lista de Productos',
        defaultPath: path.join(app.getPath('documents'), `productos_export_${Date.now()}.csv`),
        filters: [
          { name: 'Archivos CSV', extensions: ['csv'] },
          { name: 'Todos los Archivos', extensions: ['*'] }
        ]
      });

      if (canceled || !filePath) {
        console.log('[Backend Export] Exportación cancelada por el usuario.');
        return { success: false, message: 'Exportación cancelada por el usuario.' };
      }

      await fs.writeFile(filePath, csvContent, 'utf8');
      console.log(`[Backend Export] Archivo CSV de productos guardado exitosamente en: ${filePath}`);
      return { success: true, filePath: filePath };

    } catch (error) {
      console.error('[Backend Export] Error en el manejador exportProductosCsv:', error);
      return { success: false, error: error.message || 'Error desconocido en el backend durante la exportación CSV.' };
    }
  });
});

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
  console.log('Electron main process is ready. Ensure backend is running and accessible at 192.168.0.7:3001');
});
