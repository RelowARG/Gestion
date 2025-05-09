// routes/ventasx.js (Revisado - CON COSTO HISTÓRICO EN /filtered)
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Ventas X

// Helper para obtener ítems de VentasX por VentaX_id
async function getVentaXItemsByVentaXId(db, ventaXId) {
    // Fetch items associated with a specific VentaX_id
    const [itemRows, itemFields] = await db.execute(`
        SELECT
            vxi.id, vxi.VentaX_id, vxi.Producto_id, vxi.Cantidad, vxi.Precio_Unitario_Venta,
            vxi.Descripcion_Personalizada, vxi.Precio_Unitario_Personalizada, vxi.Cantidad_Personalizada,
            vxi.Total_Item,
            p.codigo, p.Descripcion AS Producto_Descripcion, p.costo_x_rollo, p.costo_x_1000, p.eti_x_rollo
        FROM VentasX_Items vxi
        LEFT JOIN Productos p ON vxi.Producto_id = p.id
        WHERE vxi.VentaX_id = ?
        ORDER BY vxi.id ASC`, [ventaXId]);

    // Add 'type' property and parse numbers
    const itemsWithType = itemRows.map(item => ({
        ...item,
        Cantidad: parseFloat(item.Cantidad) || null,
        Precio_Unitario_Venta: parseFloat(item.Precio_Unitario_Venta) || null,
        Cantidad_Personalizada: parseFloat(item.Cantidad_Personalizada) || null,
        Precio_Unitario_Personalizada: parseFloat(item.Precio_Unitario_Personalizada) || null,
        Total_Item: parseFloat(item.Total_Item) || null,
        type: item.Producto_id !== null ? 'product' : 'custom'
    }));

    return itemsWithType;
}

// Obtener Ventas X pendientes
router.get('/pending', async (req, res) => {
  try {
    // Fetch VentasX with specific pending statuses or payment statuses
    const [rows, fields] = await req.db.execute(`
      SELECT
          vx.id, vx.Fecha, vx.Nro_VentaX, vx.Estado, vx.Pago, vx.Total, vx.Total_ARS,
          c.Empresa AS Nombre_Cliente
      FROM VentasX vx
      JOIN Clientes c ON vx.Cliente_id = c.id
      WHERE vx.Estado IN ('en maquina', 'pedido', 'listo') OR vx.Pago IN ('seña', 'debe')
      ORDER BY vx.Fecha DESC, vx.id DESC;`);

     // Parse numerical fields
     const parsedVentasX = rows.map(venta => ({
        ...venta,
        Total: parseFloat(venta.Total) || null,
        Total_ARS: parseFloat(venta.Total_ARS) || null,
    }));

    res.json(parsedVentasX);
  } catch (error) {
    console.error('Error al obtener VentasX pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener VentasX pendientes.' });
  }
});

// Obtener Ventas X por Cliente ID, con filtros opcionales de fecha
router.get('/by-client/:clientId', async (req, res) => {
  const clientId = req.params.clientId;
  const { startDate, endDate } = req.query;

  // Base SQL query
  let sql = `
    SELECT
        vx.id, vx.Fecha, vx.Nro_VentaX, vx.Estado, vx.Pago, vx.Subtotal, vx.Total, vx.Cotizacion_Dolar, vx.Total_ARS,
        c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
    FROM VentasX vx
    JOIN Clientes c ON vx.Cliente_id = c.id
    WHERE vx.Cliente_id = ?
  `;

  const params = [clientId];
  const whereClauses = [];

  // Add date filters if provided
  if (startDate && endDate) {
    whereClauses.push(`vx.Fecha BETWEEN ? AND ?`);
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClauses.push(`vx.Fecha >= ?`);
    params.push(startDate);
  } else if (endDate) {
    whereClauses.push(`vx.Fecha <= ?`);
    params.push(endDate);
  }

  // Append WHERE clauses if any
  if (whereClauses.length > 0) {
    sql += ` AND ` + whereClauses.join(' AND ');
  }

  // Add ordering
  sql += ` ORDER BY vx.Fecha DESC, vx.id DESC;`;

  try {
    // Execute the query
    const [rows, fields] = await req.db.execute(sql, params);
     // Parse numerical fields
     const parsedVentasX = rows.map(venta => ({
        ...venta,
        Subtotal: parseFloat(venta.Subtotal) || null,
        Total: parseFloat(venta.Total) || null,
        Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
        Total_ARS: parseFloat(venta.Total_ARS) || null,
    }));
    res.json(parsedVentasX);
  } catch (error) {
    console.error(`Error al obtener VentasX para cliente ID ${clientId}:`, error);
    res.status(500).json({ error: 'Error interno del servidor al obtener VentasX por cliente.' });
  }
});


// Obtener TODAS las Ventas X, con filtros de fecha E ITEMS (CON COSTO HISTÓRICO)
router.get('/filtered', async (req, res) => {
    const { startDate, endDate } = req.query;

    // SQL query modified to include historical cost join
    let sql = `
        SELECT
            vx.id, vx.Fecha, vx.Nro_VentaX, vx.Cliente_id, vx.Estado, vx.Pago, vx.Subtotal, vx.Total, vx.Cotizacion_Dolar, vx.Total_ARS,
            c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente,
            JSON_ARRAYAGG(
                CASE WHEN vxi.id IS NOT NULL THEN
                    JSON_OBJECT(
                        'id', vxi.id,
                        'VentaX_id', vxi.VentaX_id,
                        'Producto_id', vxi.Producto_id,
                        'Cantidad', vxi.Cantidad,
                        'Precio_Unitario_Venta', vxi.Precio_Unitario_Venta,
                        'Descripcion_Personalizada', vxi.Descripcion_Personalizada,
                        'Precio_Unitario_Personalizada', vxi.Precio_Unitario_Personalizada,
                        'Cantidad_Personalizada', vxi.Cantidad_Personalizada,
                        'Total_Item', vxi.Total_Item,
                        'type', CASE WHEN vxi.Producto_id IS NOT NULL THEN 'product' ELSE 'custom' END,
                        'codigo', p.codigo,
                        'Producto_Descripcion', p.Descripcion,
                        -- *** INICIO: SELECCIONAR COSTO HISTÓRICO ***
                        -- Select the historical cost based on the sale date
                        -- Use COALESCE to fallback to current product cost if no history found for that date
                        'costo_historico_x_1000', COALESCE(pch.costo_x_1000, p.costo_x_1000),
                        'costo_historico_x_rollo', COALESCE(pch.costo_x_rollo, p.costo_x_rollo)
                        -- *** FIN: SELECCIONAR COSTO HISTÓRICO ***
                    )
                ELSE NULL END
            ) AS items_json
        FROM VentasX vx
        JOIN Clientes c ON vx.Cliente_id = c.id
        LEFT JOIN VentasX_Items vxi ON vx.id = vxi.VentaX_id
        LEFT JOIN Productos p ON vxi.Producto_id = p.id
        -- *** INICIO: JOIN COMPLEJO CON HISTORIAL DE COSTOS ***
        -- Join with the historical cost table
        LEFT JOIN Producto_Costo_Historico pch ON vxi.Producto_id = pch.Producto_id
            AND pch.Fecha_Valido_Desde = (
                -- Subquery to find the most recent cost record valid ON or BEFORE the sale date
                SELECT MAX(pch_inner.Fecha_Valido_Desde)
                FROM Producto_Costo_Historico pch_inner
                WHERE pch_inner.Producto_id = vxi.Producto_id
                  AND pch_inner.Fecha_Valido_Desde <= vx.Fecha -- Compare with the VentaX date
            )
        -- *** FIN: JOIN COMPLEJO CON HISTORIAL DE COSTOS ***
    `;

    const params = [];
    const whereClauses = [];

    // Add date filters if provided
    if (startDate && endDate) {
        whereClauses.push(`vx.Fecha BETWEEN ? AND ?`);
        params.push(startDate, endDate);
    } else if (startDate) {
        whereClauses.push(`vx.Fecha >= ?`);
        params.push(startDate);
    } else if (endDate) {
        whereClauses.push(`vx.Fecha <= ?`);
        params.push(endDate);
    }

    // Append WHERE clauses if any
    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    // Group by sale to aggregate items
    sql += ` GROUP BY vx.id`;
    // Add ordering
    sql += ` ORDER BY vx.Fecha DESC, vx.id DESC;`;

    try {
        // Execute the query
        const [rows, fields] = await req.db.execute(sql, params);

        // Process results: parse main sale numbers and item JSON (including historical costs)
        const ventasXWithItems = rows.map(row => {
             // Parse main sale numerical fields
             const parsedVentaXData = {
                 ...row,
                 Subtotal: parseFloat(row.Subtotal) || null,
                 Total: parseFloat(row.Total) || null,
                 Cotizacion_Dolar: parseFloat(row.Cotizacion_Dolar) || null,
                 Total_ARS: parseFloat(row.Total_ARS) || null,
             };

             // Parse the items JSON string into an array of objects
             let items = [];
             if (row.items_json) {
                 try {
                    // Ensure items_json is treated as an array
                     const parsedJson = Array.isArray(row.items_json) ? row.items_json : JSON.parse(row.items_json);
                     if (Array.isArray(parsedJson)) {
                          items = parsedJson
                            .filter(item => item !== null) // Filter out any NULLs from LEFT JOIN
                            .map(item => ({ // Parse numbers within each item, including historical costs
                                ...item,
                                Cantidad: parseFloat(item.Cantidad) || null,
                                Precio_Unitario_Venta: parseFloat(item.Precio_Unitario_Venta) || null,
                                Cantidad_Personalizada: parseFloat(item.Cantidad_Personalizada) || null,
                                Precio_Unitario_Personalizada: parseFloat(item.Precio_Unitario_Personalizada) || null,
                                Total_Item: parseFloat(item.Total_Item) || null,
                                // Parse historical costs
                                costo_historico_x_1000: parseFloat(item.costo_historico_x_1000) || null,
                                costo_historico_x_rollo: parseFloat(item.costo_historico_x_rollo) || null,
                            }));
                     } else {
                         console.warn(`items_json for ventaX ID ${row.id} was not an array:`, parsedJson);
                     }
                 } catch (parseError) {
                      console.error(`Error parsing items_json for ventaX ID ${row.id}:`, parseError, 'JSON string:', row.items_json);
                      items = []; // Default to empty array on parse error
                  }
             }

             // Remove the original JSON string property
             delete parsedVentaXData.items_json;

             // Return the ventaX object with the processed items array
             return { ...parsedVentaXData, items: items };
         });

        // Send the processed data
        res.json(ventasXWithItems);
    } catch (error) {
        console.error('Error al obtener todas las VentasX filtradas con costo histórico:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener listado de VentasX con costo histórico.' });
    }
});


// Obtener las 10 Ventas X más recientes
router.get('/', async (req, res) => {
  try {
    // Fetch the 10 most recent VentasX
    const [rows, fields] = await req.db.execute(`
      SELECT
          vx.id, vx.Fecha, vx.Nro_VentaX, vx.Estado, vx.Pago, vx.Subtotal, vx.Total, vx.Cotizacion_Dolar, vx.Total_ARS,
          c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
      FROM VentasX vx
      JOIN Clientes c ON vx.Cliente_id = c.id
      ORDER BY vx.Fecha DESC, vx.id DESC
      LIMIT 10`);

    // Parse numerical fields
    const parsedVentasX = rows.map(venta => ({
       ...venta,
       Subtotal: parseFloat(venta.Subtotal) || null,
       Total: parseFloat(venta.Total) || null,
       Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
       Total_ARS: parseFloat(venta.Total_ARS) || null,
   }));

    res.json(parsedVentasX);
  } catch (error) {
    console.error('Error al obtener VentasX:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener VentasX.' });
  }
});

// Obtener una Venta X específica por su ID, incluyendo sus ítems
router.get('/:id', async (req, res) => {
  const ventaXId = req.params.id;

  try {
    // Start transaction
    await req.db.beginTransaction();

    // Fetch main VentaX data
    const [ventaXRows, ventaXFields] = await req.db.execute(`
      SELECT
          vx.id, vx.Fecha, vx.Nro_VentaX, vx.Cliente_id, vx.Estado, vx.Pago, vx.Subtotal, vx.Total, vx.Cotizacion_Dolar, vx.Total_ARS,
          c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
      FROM VentasX vx
      JOIN Clientes c ON vx.Cliente_id = c.id
      WHERE vx.id = ?`, [ventaXId]);

    // Check if VentaX exists
    if (ventaXRows.length === 0) {
      await req.db.rollback();
      return res.status(404).json({ error: `VentaX con ID ${ventaXId} no encontrada.` });
    }

    const ventaXData = ventaXRows[0];
    // Fetch associated items using the helper function
    const itemRows = await getVentaXItemsByVentaXId(req.db, ventaXId);

    // Commit transaction
    await req.db.commit();

    // Parse main VentaX numerical fields
    const parsedVentaXData = {
        ...ventaXData,
        Subtotal: parseFloat(ventaXData.Subtotal) || null,
        Total: parseFloat(ventaXData.Total) || null,
        Cotizacion_Dolar: parseFloat(ventaXData.Cotizacion_Dolar) || null,
        Total_ARS: parseFloat(ventaXData.Total_ARS) || null,
    };

    // Combine main VentaX data with its items
    const fullVentaXData = {
      ...parsedVentaXData,
      items: itemRows || [] // itemRows are already parsed by the helper
    };

    // Send the complete VentaX data
    res.json(fullVentaXData);

  } catch (error) {
    console.error(`Error al obtener VentaX con ID ${ventaXId}:`, error);
    await req.db.rollback(); // Rollback on error
    res.status(500).json({ error: 'Error interno del servidor al obtener VentaX.' });
  }
});


// Agregar una nueva Venta X, incluyendo ítems y actualizando stock
router.post('/', async (req, res) => {
  // Destructure data from request body (Nro_VentaX is generated by backend)
  const {
    Fecha, Cliente_id, Estado, Pago, Subtotal, Total,
    Cotizacion_Dolar, Total_ARS,
    items
  } = req.body;

  // Validation
  if (!Fecha || !Cliente_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son obligatorios para Ventas X.' });
  }
   if (Subtotal !== undefined && Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal inválido.' }); }
   if (Total !== undefined && Total !== null && Total !== '' && isNaN(parseFloat(Total))) { return res.status(400).json({ error: 'Total inválido.' }); }
   if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS inválido.' }); }

  try {
    // Start transaction
    await req.db.beginTransaction();

    // 1. Generate the next sequential Nro_VentaX and ensure it's unique
    let nextNumber = 1;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!isUnique && attempts < MAX_ATTEMPTS) {
        // Find the highest existing Nro_VentaX (treating as number)
        const [rows, fields] = await req.db.execute('SELECT Nro_VentaX FROM VentasX ORDER BY CAST(Nro_VentaX AS UNSIGNED) DESC, Nro_VentaX DESC LIMIT 1');
        let lastNumericValue = 0;
        if (rows.length > 0 && rows[0].Nro_VentaX) {
            const lastNumero = rows[0].Nro_VentaX;
             const parsedLast = parseInt(lastNumero, 10);
              if (!isNaN(parsedLast)) {
                 lastNumericValue = parsedLast;
             }
        }
         // Determine next number
         if (attempts === 0) {
              nextNumber = lastNumericValue + 1;
         } else {
              nextNumber++;
         }

        const generatedNroVentaX = String(nextNumber);

        // Check for uniqueness
        const [existingRows] = await req.db.execute('SELECT Nro_VentaX FROM VentasX WHERE Nro_VentaX = ?', [generatedNroVentaX]);

        if (existingRows.length === 0) {
            isUnique = true;
        } else {
            console.warn(`[Backend] Generated Nro_VentaX ${generatedNroVentaX} already exists. Retrying.`);
            attempts++;
        }
    }

    // Throw error if unique number generation failed
    if (!isUnique) {
        throw new Error('Failed to generate a unique Nro_VentaX after multiple attempts.');
    }

    const finalGeneratedNroVentaX = String(nextNumber); // The final unique number

    // 2. Insert the main VentaX record
    const insertVentaXSql = `
      INSERT INTO VentasX (Fecha, Nro_VentaX, Cliente_id, Estado, Pago, Subtotal, Total, Cotizacion_Dolar, Total_ARS)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;

    // Prepare values for insert
    const ventaXValues = [
      Fecha,
      finalGeneratedNroVentaX, // Use generated number
      parseInt(Cliente_id, 10),
      Estado,
      Pago,
      Subtotal !== null && Subtotal !== '' && !isNaN(parseFloat(Subtotal)) ? parseFloat(Subtotal) : null,
      Total !== null && Total !== '' && !isNaN(parseFloat(Total)) ? parseFloat(Total) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== null && Total_ARS !== '' && !isNaN(parseFloat(Total_ARS)) ? parseFloat(Total_ARS) : null,
    ];

    // Execute insert
    const [result] = await req.db.execute(insertVentaXSql, ventaXValues);
    const nuevaVentaXId = result.insertId;

    // 3. Insert the items and update stock
    if (items.length > 0) {
      const insertItemSql = `
        INSERT INTO VentasX_Items (VentaX_id, Producto_id, Cantidad, Precio_Unitario_Venta, Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada, Total_Item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;

      const itemValues = [];
      const stockUpdates = [];

      // Prepare item data and stock updates
      for (const item of items) {
          let productoIdToSave = null;
          let cantidadProductoToSave = null;
          let precioUnitarioVentaProductoToSave = null;
          let descripcionPersonalizadaToSave = null;
          let precioUnitarioPersonalizadaToSave = null;
          let cantidadPersonalizadaToSave = null;
          let totalItemToSave = item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null;

          if (item.type === 'product') {
              productoIdToSave = item.Producto_id !== null && item.Producto_id !== undefined ? parseInt(item.Producto_id, 10) : null;
              cantidadProductoToSave = item.Cantidad !== null && item.Cantidad !== undefined ? parseFloat(item.Cantidad) : null;
              precioUnitarioVentaProductoToSave = item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== undefined ? parseFloat(item.Precio_Unitario_Venta) : null;

              if (productoIdToSave !== null && cantidadProductoToSave > 0) {
                 stockUpdates.push({
                     Producto_id: productoIdToSave,
                     Cantidad_Vendida: cantidadProductoToSave
                 });
              }
          } else if (item.type === 'custom') {
              descripcionPersonalizadaToSave = item.Descripcion_Personalizada || null;
              precioUnitarioPersonalizadaToSave = item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined ? parseFloat(item.Precio_Unitario_Personalizada) : null;
              cantidadPersonalizadaToSave = item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== undefined ? parseFloat(item.Cantidad_Personalizada) : null;
          }

          itemValues.push([
              nuevaVentaXId,
              productoIdToSave,
              cantidadProductoToSave,
              precioUnitarioVentaProductoToSave,
              descripcionPersonalizadaToSave,
              precioUnitarioPersonalizadaToSave,
              cantidadPersonalizadaToSave,
              totalItemToSave,
          ]);
      }

      // Execute item inserts
       if (itemValues.length > 0) {
            for(const itemValue of itemValues) {
                await req.db.execute(insertItemSql, itemValue);
            }
       }

       // Update stock
       const updateStockSql = `UPDATE Stock SET Cantidad = Cantidad - ? WHERE Producto_id = ?;`;
       for (const update of stockUpdates) {
           try {
                const [stockResult] = await req.db.execute(updateStockSql, [update.Cantidad_Vendida, update.Producto_id]);
                 if (stockResult.affectedRows === 0) {
                      console.warn(`No se encontró entrada de stock para Producto_id ${update.Producto_id} al vender (VentaX). Stock no actualizado.`);
                 }
           } catch (stockError) {
                console.error(`Error al actualizar stock para Producto_id ${update.Producto_id} (VentaX):`, stockError);
                // Consider rollback
           }
       }
    }

    // Commit transaction
    await req.db.commit();

    // Respond with success
    res.status(201).json({ success: { id: nuevaVentaXId, Nro_VentaX: finalGeneratedNroVentaX } });

  } catch (error) {
    // Rollback on error
    console.error('Error al agregar VentaX:', error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al agregar VentaX.';
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Cliente o Producto seleccionado en los ítems no válido.';
     } else if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Nro_VentaX')) {
          userMessage = 'Error: El número de Venta X generado ya existe. Intente de nuevo.';
     } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
     } else if (error.message.includes('Failed to generate a unique Nro_VentaX')) {
         userMessage = error.message;
     }
    res.status(500).json({ error: userMessage });
  }
});

// Actualizar una Venta X existente por su ID (Solo detalles principales y re-inserción de ítems)
router.put('/:id', async (req, res) => {
  const ventaXId = req.params.id;
  // Destructure data (Nro_VentaX is not updated)
  const {
    Fecha, Nro_VentaX, Cliente_id, Estado, Pago, Subtotal, Total,
    Cotizacion_Dolar, Total_ARS,
    items
  } = req.body;

  // Validation
  if (!Fecha || !Cliente_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son obligatorios para actualizar Ventas X.' });
  }
   if (Subtotal !== undefined && Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal inválido.' }); }
   if (Total !== undefined && Total !== null && Total !== '' && isNaN(parseFloat(Total))) { return res.status(400).json({ error: 'Total inválido.' }); }
   if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS inválido.' }); }

  try {
    // Start transaction
    await req.db.beginTransaction();

    // 1. Update main VentaX details (excluding Nro_VentaX)
    const updateVentaXSql = `
      UPDATE VentasX
      SET
        Fecha = ?, Cliente_id = ?, Estado = ?, Pago = ?, Subtotal = ?, Total = ?,
        Cotizacion_Dolar = ?, Total_ARS = ?
      WHERE id = ?;`;

    // Prepare values for update
    const ventaXValues = [
      Fecha,
      parseInt(Cliente_id, 10),
      Estado,
      Pago,
      Subtotal !== null && Subtotal !== '' && !isNaN(parseFloat(Subtotal)) ? parseFloat(Subtotal) : null,
      Total !== null && Total !== '' && !isNaN(parseFloat(Total)) ? parseFloat(Total) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== null && Total_ARS !== '' && !isNaN(parseFloat(Total_ARS)) ? parseFloat(Total_ARS) : null,
      ventaXId
    ];

    // Execute update
    const [updateResult] = await req.db.execute(updateVentaXSql, ventaXValues);

    // Check if VentaX was found and updated
     if (updateResult.affectedRows === 0) {
          await req.db.rollback();
          return res.status(404).json({ error: `No se encontró VentaX con ID ${ventaXId} para actualizar.` });
     }

    // --- Stock Reversal Logic (IMPORTANT for Edit) ---
    // 2. Get existing product items BEFORE deleting them
    const [existingProductItems] = await req.db.execute(
        `SELECT Producto_id, Cantidad FROM VentasX_Items WHERE VentaX_id = ? AND Producto_id IS NOT NULL`,
        [ventaXId]
    );

    // 3. Delete existing items for this VentaX
    const deleteItemsSql = `DELETE FROM VentasX_Items WHERE VentaX_id = ?`;
    await req.db.execute(deleteItemsSql, [ventaXId]);

    // 4. Insert the NEW items provided in the request body
    const insertItemSql = `
      INSERT INTO VentasX_Items (VentaX_id, Producto_id, Cantidad, Precio_Unitario_Venta, Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada, Total_Item)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;

    const newItemValues = [];
    const newStockUpdates = []; // Stock updates based on NEW items

    if (items.length > 0) {
        for (const item of items) {
            // Prepare item data (same logic as in POST)
            let productoIdToSave = null;
            let cantidadProductoToSave = null;
            let precioUnitarioVentaProductoToSave = null;
            let descripcionPersonalizadaToSave = null;
            let precioUnitarioPersonalizadaToSave = null;
            let cantidadPersonalizadaToSave = null;
            let totalItemToSave = item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null;

            if (item.type === 'product') {
                productoIdToSave = item.Producto_id !== null && item.Producto_id !== undefined ? parseInt(item.Producto_id, 10) : null;
                cantidadProductoToSave = item.Cantidad !== null && item.Cantidad !== undefined ? parseFloat(item.Cantidad) : null;
                precioUnitarioVentaProductoToSave = item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== undefined ? parseFloat(item.Precio_Unitario_Venta) : null;

                if (productoIdToSave !== null && cantidadProductoToSave > 0) {
                    newStockUpdates.push({
                        Producto_id: productoIdToSave,
                        Cantidad_Vendida: cantidadProductoToSave
                    });
                }
            } else if (item.type === 'custom') {
                descripcionPersonalizadaToSave = item.Descripcion_Personalizada || null;
                precioUnitarioPersonalizadaToSave = item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined ? parseFloat(item.Precio_Unitario_Personalizada) : null;
                cantidadPersonalizadaToSave = item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== undefined ? parseFloat(item.Cantidad_Personalizada) : null;
            }

            newItemValues.push([
                ventaXId, // Link to the updated VentaX ID
                productoIdToSave,
                cantidadProductoToSave,
                precioUnitarioVentaProductoToSave,
                descripcionPersonalizadaToSave,
                precioUnitarioPersonalizadaToSave,
                cantidadPersonalizadaToSave,
                totalItemToSave,
            ]);
        }

        // Execute item inserts
        if (newItemValues.length > 0) {
             for(const itemValue of newItemValues) {
                 await req.db.execute(insertItemSql, itemValue);
             }
        }
    }

    // 5. Adjust stock: Revert old quantities, then subtract new quantities
    const stockAdjustmentSql = `UPDATE Stock SET Cantidad = Cantidad + ? WHERE Producto_id = ?;`; // Add back old quantity
    const stockSubtractionSql = `UPDATE Stock SET Cantidad = Cantidad - ? WHERE Producto_id = ?;`; // Subtract new quantity

    // Revert stock based on OLD items
    for (const oldItem of existingProductItems) {
        try {
            await req.db.execute(stockAdjustmentSql, [oldItem.Cantidad, oldItem.Producto_id]);
        } catch (stockError) {
            console.error(`Error reverting stock for Producto_id ${oldItem.Producto_id} (VentaX Edit):`, stockError);
            // Consider rollback
        }
    }

    // Subtract stock based on NEW items
    for (const newItemUpdate of newStockUpdates) {
        try {
            await req.db.execute(stockSubtractionSql, [newItemUpdate.Cantidad_Vendida, newItemUpdate.Producto_id]);
        } catch (stockError) {
            console.error(`Error subtracting new stock for Producto_id ${newItemUpdate.Producto_id} (VentaX Edit):`, stockError);
            // Consider rollback
        }
    }

    // Commit the transaction
    await req.db.commit();

    // Respond with success
    res.json({ success: { id: ventaXId, changes: updateResult.affectedRows } });

  } catch (error) {
    // Rollback on any error
    console.error(`Error al actualizar VentaX con ID ${ventaXId}:`, error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al actualizar VentaX.';
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Cliente o Producto seleccionado en los ítems no válido.';
     } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
     }
    res.status(500).json({ error: userMessage });
  }
});


// Actualizar el estado y/o pago de una venta X pendiente por su ID
router.put('/pending/:id', async (req, res) => {
    const ventaXId = req.params.id;
    const { Estado, Pago } = req.body;

    const updates = [];
    const values = [];

    // Validate input
    if (Estado === undefined && Pago === undefined) {
        return res.status(400).json({ error: 'No se proporcionó Estado o Pago para actualizar.' });
    }
     if (Estado !== undefined && (Estado === null || Estado === '')) {
         return res.status(400).json({ error: 'El campo Estado no puede estar vacío si se proporciona.' });
     }
     if (Pago !== undefined && (Pago === null || Pago === '')) {
         return res.status(400).json({ error: 'El campo Pago no puede estar vacío si se proporciona.' });
     }

    // Build SET clause dynamically
    if (Estado !== undefined) {
        updates.push('Estado = ?');
        values.push(Estado);
    }
    if (Pago !== undefined) {
        updates.push('Pago = ?');
        values.push(Pago);
    }

    // Prepare SQL query
    let sql = `UPDATE VentasX SET ${updates.join(', ')} WHERE id = ?;`;
    values.push(ventaXId);

    try {
        // Execute update query
        const [result] = await req.db.execute(sql, values);

        // Check if any row was affected
        if (result.affectedRows === 0) {
             return res.status(404).json({ error: `No se encontró VentaX pendiente con ID ${ventaXId} para actualizar.` });
        }

        // Respond with success
        res.json({ success: { id: ventaXId, changes: result.affectedRows } });

    } catch (error) {
        console.error(`Error al actualizar VentaX pendiente con ID ${ventaXId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar VentaX pendiente.' });
    }
});


// Eliminar una Venta X por ID, incluyendo sus ítems y revirtiendo stock
router.delete('/:id', async (req, res) => {
  const ventaXId = req.params.id;

  try {
    // Start transaction
    await req.db.beginTransaction();

    // 1. Get associated product items to revert stock
    const [productItemsToRevert, fields] = await req.db.execute(`
        SELECT Producto_id, Cantidad
        FROM VentasX_Items
        WHERE VentaX_id = ? AND Producto_id IS NOT NULL`, [ventaXId]);

    // 2. Revert stock quantities
    const updateStockSql = `UPDATE Stock SET Cantidad = Cantidad + ? WHERE Producto_id = ?;`;
    for (const item of productItemsToRevert) {
        try {
             const [stockResult] = await req.db.execute(updateStockSql, [item.Cantidad, item.Producto_id]);
             if (stockResult.affectedRows === 0) {
                  console.warn(`No se encontró entrada de stock para Producto_id ${item.Producto_id} al eliminar VentaX. Stock no revertido completamente.`);
             }
        } catch (stockError) {
             console.error(`Error al revertir stock para Producto_id ${item.Producto_id} (VentaX):`, stockError);
             // Consider rollback
        }
    }

    // 3. Delete associated items
    const deleteItemsSql = `DELETE FROM VentasX_Items WHERE VentaX_id = ?`;
    await req.db.execute(deleteItemsSql, [ventaXId]);

    // 4. Delete the main VentaX record
    const deleteVentaXSql = `DELETE FROM VentasX WHERE id = ?`;
    const [result] = await req.db.execute(deleteVentaXSql, [ventaXId]);

    // Check if VentaX was found and deleted
    if (result.affectedRows === 0) {
      await req.db.rollback();
      return res.status(404).json({ error: `No se encontró VentaX con ID ${ventaXId} para eliminar.` });
    }

    // Commit transaction
    await req.db.commit();

    // Respond with success
    res.json({ success: { id: ventaXId, changes: result.affectedRows } });

  } catch (error) {
    // Rollback on any error
    console.error(`Error al eliminar VentaX con ID ${ventaXId}:`, error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al eliminar VentaX.';
     if (error.code === 'ER_ROW_IS_REFERENCED_2') {
          userMessage = 'Error: No se puede eliminar la VentaX debido a registros asociados inesperados.';
     }
    res.status(500).json({ error: userMessage });
  }
});


module.exports = router;
