// main.js (Con manejador de exportación llamando al backend Express)
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
// No necesitamos requerir el módulo de base de datos aquí directamente para la exportación
// const { getAllProductosFromDb } = require('./src/backend/database'); // <-- Ya no es necesario aquí

// Necesitamos una forma de hacer llamadas HTTP. Node.js tiene 'http'/'https'
// o podrías usar una librería como 'node-fetch' si la tienes instalada.
// Usaremos la API fetch estándar que está disponible en Electron.
// const fetch = require('node-fetch'); // Si usas la librería


let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'src', 'preload.js'),
      // Nota: Hacer llamadas a HTTP/S requiere que webSecurity NO esté completamente deshabilitado,
      // pero la llamada fetch la haremos desde el proceso main de Node.js, no desde la ventana render.
      // Esto es seguro si no deshabilitas webSecurity en la ventana render.
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

  // --- Registrar manejadores IPC ---

  // Manejador IPC para guardar Presupuesto como PDF (este ya lo tienes)
  ipcMain.handle('save-presupuesto-pdf', async (event, htmlContent, suggestedFileName) => {
      // ... (código existente para guardar PDF)
       let pdfWindow = null;
    try {
        const result = await dialog.showSaveDialog(mainWindow, { // Usa mainWindow
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


  // *** NUEVO *** Manejador IPC para exportar productos a CSV (llamando al backend Express)
  ipcMain.handle('exportProductosCsv', async (event) => {
    try {
        console.log('[Backend Export] Solicitando datos de productos al backend Express...');

        // 1. Obtener datos desde tu backend Express API
        // ¡IMPORTANTE! Necesitas ajustar la URL si tu backend no está en localhost:3001
        // ¡IMPORTANTE! Necesitas incluir el token de autenticación si la API lo requiere (y lo hace según server.js)
        // Debes tener acceso a este token en el proceso main después del login.
        const API_URL = 'http://localhost:3001/api/productos'; // <--- AJUSTA SI ES NECESARIO
        const AUTH_TOKEN = 'fake-auth-token'; // <--- ¡AJUSTA ESTO! Debes usar el token REAL del usuario logueado

        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                // Incluye el token de autenticación requerido por tu middleware en server.js
                'Authorization': `Bearer ${AUTH_TOKEN}`, // <--- Esto es crucial para pasar la autenticación
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Backend Export] Error al obtener productos del backend:', response.status, errorData);
            return { success: false, error: `Error del backend (${response.status}): ${errorData.error || response.statusText}` };
        }

        const productos = await response.json(); // Asume que la API devuelve un array de productos en JSON

        console.log(`[Backend Export] ${productos.length} productos recibidos del backend.`);


        if (!productos || productos.length === 0) {
             return { success: false, error: 'No hay productos para exportar recibidos del backend.' };
        }

        // 2. Formatear datos a CSV
        // Define las columnas que quieres exportar. ¡AJUSTA ESTA LISTA!
        // Basado en la estructura que tu API de productos probablemente devuelve:
        const columns = [
          'id', 'codigo', 'Descripcion', 'eti_x_rollo',
          'costo_x_1000', 'costo_x_rollo', 'precio',
          'banda', 'material', 'Buje'
        ];

        // Crea el encabezado CSV (usando ; como separador)
        const csvHeader = columns.join(';');

        // Crea las filas CSV
        const csvRows = productos.map(producto =>
            columns.map(col => {
                let value = producto[col];
                if (value === null || value === undefined) {
                     value = ''; // Manejar valores nulos/indefinidos
                }
                // Simple manejo de comas, puntos y comillas para CSV
                 if (typeof value === 'string') {
                     if (value.includes(';') || value.includes('"') || value.includes('\n')) {
                         value = value.replace(/"/g, '""'); // Escapar comillas dobles internas
                         value = `"${value}"`; // Encerrar en comillas dobles
                     }
                 } else if (typeof value === 'number') {
                      // Opcional: Formatear números, ej: cambiar punto decimal a coma si se desea para algunas regiones
                      // value = String(value).replace('.', ',');
                 }

                return value;
            }).join(';') // Unir valores de cada fila con punto y coma
        );

        // Unir todo: encabezado + filas
        const csvContent = [csvHeader, ...csvRows].join('\n');

        // 3. Mostrar diálogo para guardar archivo (adjunto a mainWindow)
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Guardar Lista de Productos',
            defaultPath: path.join(app.getPath('documents'), `productos_export_${Date.now()}.csv`), // Sugiere guardar en la carpeta Documentos
            filters: [
                { name: 'Archivos CSV', extensions: ['csv'] },
                { name: 'Todos los Archivos', extensions: ['*'] }
            ]
        });

        if (canceled || !filePath) {
            // Si el usuario cancela
            console.log('[Backend Export] Exportación cancelada por el usuario.');
            return { success: false, message: 'Exportación cancelada por el usuario.' };
        }

        // 4. Escribir el archivo
        await fs.writeFile(filePath, csvContent, 'utf8');

        console.log(`[Backend Export] Archivo CSV de productos guardado exitosamente en: ${filePath}`);

        // 5. Enviar respuesta de éxito al frontend
        return { success: true, filePath: filePath };

    } catch (error) {
        console.error('[Backend Export] Error en el manejador exportProductosCsv:', error);
        // Enviar respuesta de error
        return { success: false, error: error.message || 'Error desconocido en el backend durante la exportación CSV.' };
    }
  });
   // *** FIN NUEVO MANEJADOR (Llamando a la API) ***


  // ... (otros manejadores IPC si tienes)

  // Menu.setApplicationMenu(null); // Esto lo tenías, lo dejo comentado

}); // Fin app.on('ready')


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
    // Asegúrate de que tu backend Express (server.js) esté corriendo antes de intentar esto.
});

// Si usas un archivo preload.js para exponer electronAPI,
// asegúrate de que 'exportProductosCsv' esté expuesto allí también.