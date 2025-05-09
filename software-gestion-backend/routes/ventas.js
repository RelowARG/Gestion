// routes/ventas.js (Revisado - CON COSTO HISTÓRICO EN /filtered)
const express = require('express');
const router = express.Router();

// Rutas para la gestión de Ventas (Factura A)

// Helper para obtener ítems de venta por Venta_id
async function getVentaItemsByVentaId(db, ventaId) {
    // Fetch items associated with a specific Venta_id
    const [itemRows, itemFields] = await db.execute(`
        SELECT
            vi.id, vi.Venta_id, vi.Producto_id, vi.Cantidad, vi.Precio_Unitario_Venta,
            vi.Descripcion_Personalizada, vi.Precio_Unitario_Personalizada, vi.Cantidad_Personalizada,
            vi.Total_Item,
            p.codigo, p.Descripcion AS Producto_Descripcion, p.costo_x_rollo, p.costo_x_1000, p.eti_x_rollo
        FROM Venta_Items vi
        LEFT JOIN Productos p ON vi.Producto_id = p.id
        WHERE vi.Venta_id = ?
        ORDER BY vi.id ASC`, [ventaId]);

    // Add 'type' property to each item based on whether Producto_id is null
    // Also parse numerical fields for safety
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

// Obtener ventas pendientes (para el dashboard/home)
router.get('/pending', async (req, res) => {
  try {
    // Fetch sales with specific pending statuses or payment statuses
    const [rows, fields] = await req.db.execute(`
      SELECT
          v.id, v.Fecha, v.Fact_Nro, v.Estado, v.Pago, v.Total, v.Total_ARS,
          c.Empresa AS Nombre_Cliente
      FROM Ventas v
      JOIN Clientes c ON v.Cliente_id = c.id
      WHERE v.Estado IN ('en maquina', 'pedido', 'listo') OR v.Pago IN ('seña', 'debe')
      ORDER BY v.Fecha DESC, v.id DESC`);

    // Parse numerical fields before sending response
    const parsedVentas = rows.map(venta => ({
        ...venta,
        Total: parseFloat(venta.Total) || null,
        Total_ARS: parseFloat(venta.Total_ARS) || null,
    }));

    res.json(parsedVentas);
  } catch (error) {
    console.error('Error al obtener ventas pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener ventas pendientes.' });
  }
});

// Obtener ventas por Cliente ID, con filtros opcionales de fecha
router.get('/by-client/:clientId', async (req, res) => {
  const clientId = req.params.clientId;
  const { startDate, endDate } = req.query;

  // Base SQL query
  let sql = `
    SELECT
        v.id, v.Fecha, v.Fact_Nro, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
        c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
    FROM Ventas v
    JOIN Clientes c ON v.Cliente_id = c.id
    WHERE v.Cliente_id = ?
  `;

  const params = [clientId];
  const whereClauses = [];

  // Add date filters if provided
  if (startDate && endDate) {
    whereClauses.push(`v.Fecha BETWEEN ? AND ?`);
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClauses.push(`v.Fecha >= ?`);
    params.push(startDate);
  } else if (endDate) {
    whereClauses.push(`v.Fecha <= ?`);
    params.push(endDate);
  }

  // Append WHERE clauses if any
  if (whereClauses.length > 0) {
    sql += ` AND ` + whereClauses.join(' AND ');
  }

  // Add ordering
  sql += ` ORDER BY v.Fecha DESC, v.id DESC;`;

  try {
    // Execute the query
    const [rows, fields] = await req.db.execute(sql, params);
     // Parse numerical fields before sending response
     const parsedVentas = rows.map(venta => ({
        ...venta,
        Subtotal: parseFloat(venta.Subtotal) || null,
        IVA: parseFloat(venta.IVA) || null,
        Total: parseFloat(venta.Total) || null,
        Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
        Total_ARS: parseFloat(venta.Total_ARS) || null,
    }));
    res.json(parsedVentas);
  } catch (error) {
    console.error(`Error al obtener ventas para cliente ID ${clientId}:`, error);
    res.status(500).json({ error: 'Error interno del servidor al obtener ventas por cliente.' });
  }
});

// Obtener TODAS las ventas, con filtros de fecha E ITEMS (CON COSTO HISTÓRICO)
router.get('/filtered', async (req, res) => {
    const { startDate, endDate } = req.query;

    // SQL query modified to include historical cost join
    let sql = `
        SELECT
            v.id, v.Fecha, v.Fact_Nro, v.Cliente_id, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
            c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente,
            JSON_ARRAYAGG(
                 CASE WHEN vi.id IS NOT NULL THEN
                    JSON_OBJECT(
                        'id', vi.id,
                        'Venta_id', vi.Venta_id,
                        'Producto_id', vi.Producto_id,
                        'Cantidad', vi.Cantidad,
                        'Precio_Unitario_Venta', vi.Precio_Unitario_Venta,
                        'Descripcion_Personalizada', vi.Descripcion_Personalizada,
                        'Precio_Unitario_Personalizada', vi.Precio_Unitario_Personalizada,
                        'Cantidad_Personalizada', vi.Cantidad_Personalizada,
                        'Total_Item', vi.Total_Item,
                        'type', CASE WHEN vi.Producto_id IS NOT NULL THEN 'product' ELSE 'custom' END,
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
        FROM Ventas v
        JOIN Clientes c ON v.Cliente_id = c.id
        LEFT JOIN Venta_Items vi ON v.id = vi.Venta_id
        LEFT JOIN Productos p ON vi.Producto_id = p.id
        -- *** INICIO: JOIN COMPLEJO CON HISTORIAL DE COSTOS ***
        -- Join with the historical cost table
        LEFT JOIN Producto_Costo_Historico pch ON vi.Producto_id = pch.Producto_id
            AND pch.Fecha_Valido_Desde = (
                -- Subquery to find the most recent cost record valid ON or BEFORE the sale date
                SELECT MAX(pch_inner.Fecha_Valido_Desde)
                FROM Producto_Costo_Historico pch_inner
                WHERE pch_inner.Producto_id = vi.Producto_id
                  AND pch_inner.Fecha_Valido_Desde <= v.Fecha -- Compare with the SALE date
            )
        -- *** FIN: JOIN COMPLEJO CON HISTORIAL DE COSTOS ***
    `;

    const params = [];
    const whereClauses = [];

    // Add date filters if provided
    if (startDate && endDate) {
        whereClauses.push(`v.Fecha BETWEEN ? AND ?`);
        params.push(startDate, endDate);
    } else if (startDate) {
        whereClauses.push(`v.Fecha >= ?`);
        params.push(startDate);
    } else if (endDate) {
        whereClauses.push(`v.Fecha <= ?`);
        params.push(endDate);
    }

    // Append WHERE clauses if any
    if (whereClauses.length > 0) {
        sql += ` WHERE ` + whereClauses.join(' AND ');
    }

    // Group by sale to aggregate items
    sql += ` GROUP BY v.id`;
    // Add ordering
    sql += ` ORDER BY v.Fecha DESC, v.id DESC;`;

    try {
        // Execute the query
        const [rows, fields] = await req.db.execute(sql, params);

        // Process results: parse main sale numbers and item JSON (including historical costs)
        const ventasWithItems = rows.map(row => {
             // Parse main sale numerical fields
             const parsedVentaData = {
                 ...row,
                 Subtotal: parseFloat(row.Subtotal) || null,
                 IVA: parseFloat(row.IVA) || null,
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
                        console.warn(`items_json for venta ID ${row.id} was not an array:`, parsedJson);
                    }
                 } catch (parseError) {
                      console.error(`Error parsing items_json for venta ID ${row.id}:`, parseError, 'JSON string:', row.items_json);
                      items = []; // Default to empty array on parse error
                  }
             }

             // Remove the original JSON string property
             delete parsedVentaData.items_json;

             // Return the venta object with the processed items array
             return { ...parsedVentaData, items: items };
         });

        // Send the processed data
        res.json(ventasWithItems);
    } catch (error) {
        console.error('Error al obtener todas las ventas filtradas con costo histórico:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener listado de ventas con costo histórico.' });
    }
});


// Obtener las 10 ventas más recientes (para la lista principal)
router.get('/', async (req, res) => {
  try {
    // Fetch the 10 most recent sales
    const [rows, fields] = await req.db.execute(`
      SELECT
          v.id, v.Fecha, v.Fact_Nro, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
          c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
      FROM Ventas v
      JOIN Clientes c ON v.Cliente_id = c.id
      ORDER BY v.Fecha DESC, v.id DESC
      LIMIT 10`);

    // Parse numerical fields before sending response
    const parsedVentas = rows.map(venta => ({
       ...venta,
       Subtotal: parseFloat(venta.Subtotal) || null,
       IVA: parseFloat(venta.IVA) || null,
       Total: parseFloat(venta.Total) || null,
       Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
       Total_ARS: parseFloat(venta.Total_ARS) || null,
   }));

    res.json(parsedVentas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener ventas.' });
  }
});

// Obtener una venta específica por su ID, incluyendo sus ítems
router.get('/:id', async (req, res) => {
  const ventaId = req.params.id;

  try {
    // Start transaction
    await req.db.beginTransaction();

    // Fetch main sale data
    const [ventaRows, ventaFields] = await req.db.execute(`
      SELECT
          v.id, v.Fecha, v.Fact_Nro, v.Cliente_id, v.Estado, v.Pago, v.Subtotal, v.IVA, v.Total, v.Cotizacion_Dolar, v.Total_ARS,
          c.Empresa AS Nombre_Cliente, c.Cuit AS Cuit_Cliente
      FROM Ventas v
      JOIN Clientes c ON v.Cliente_id = c.id
      WHERE v.id = ?`, [ventaId]);

    // Check if sale exists
    if (ventaRows.length === 0) {
      await req.db.rollback();
      return res.status(404).json({ error: `Venta con ID ${ventaId} no encontrada.` });
    }

    const ventaData = ventaRows[0];
    // Fetch associated items using the helper function
    const itemRows = await getVentaItemsByVentaId(req.db, ventaId);

    // Commit transaction
    await req.db.commit();

     // Parse main sale numerical fields
     const parsedVentaData = {
        ...ventaData,
        Subtotal: parseFloat(ventaData.Subtotal) || null,
        IVA: parseFloat(ventaData.IVA) || null,
        Total: parseFloat(ventaData.Total) || null,
        Cotizacion_Dolar: parseFloat(ventaData.Cotizacion_Dolar) || null,
        Total_ARS: parseFloat(ventaData.Total_ARS) || null,
    };

    // Combine main sale data with its items
    const fullVentaData = {
      ...parsedVentaData,
      items: itemRows || [] // itemRows are already parsed by the helper
    };

    // Send the complete sale data
    res.json(fullVentaData);

  } catch (error) {
    console.error(`Error al obtener venta con ID ${ventaId}:`, error);
    await req.db.rollback(); // Rollback on error
    res.status(500).json({ error: 'Error interno del servidor al obtener venta.' });
  }
});


// Agregar una nueva venta, incluyendo ítems y actualizando stock
router.post('/', async (req, res) => {
  // Destructure data from request body (Fact_Nro is generated by backend)
  const {
    Fecha, Cliente_id, Estado, Pago, Subtotal, IVA, Total,
    Cotizacion_Dolar, Total_ARS,
    items
  } = req.body;
  console.log('[Backend] Items recibidos en POST /ventas:', items);

  // Validation for required fields
  if (!Fecha || !Cliente_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son obligatorios para Ventas.' });
  }
   // Optional validation for numerical fields
   if (Subtotal !== undefined && Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal inválido.' }); }
   if (IVA !== undefined && IVA !== null && IVA !== '' && isNaN(parseFloat(IVA))) { return res.status(400).json({ error: 'IVA inválido.' }); }
   if (Total !== undefined && Total !== null && Total !== '' && isNaN(parseFloat(Total))) { return res.status(400).json({ error: 'Total inválido.' }); }
   if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS inválido.' }); }

  try {
    // Start transaction
    await req.db.beginTransaction();

    // 1. Generate the next sequential Fact_Nro and ensure it's unique
    let nextNumber = 1;
    let isUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10; // Prevent infinite loops

    while (!isUnique && attempts < MAX_ATTEMPTS) {
        // Find the highest existing Fact_Nro (treating it as a number)
        const [rows, fields] = await req.db.execute('SELECT Fact_Nro FROM Ventas ORDER BY CAST(Fact_Nro AS UNSIGNED) DESC, Fact_Nro DESC LIMIT 1');
        let lastNumericValue = 0;
        if (rows.length > 0 && rows[0].Fact_Nro) {
            const lastNumero = rows[0].Fact_Nro;
             const parsedLast = parseInt(lastNumero, 10);
             if (!isNaN(parsedLast)) {
                 lastNumericValue = parsedLast;
             }
        }
         // Determine the next number based on attempt count
         if (attempts === 0) {
              nextNumber = lastNumericValue + 1;
         } else {
              nextNumber++;
         }

        const generatedFactNro = String(nextNumber);

        // Check if this generated number already exists
        const [existingRows] = await req.db.execute('SELECT Fact_Nro FROM Ventas WHERE Fact_Nro = ?', [generatedFactNro]);

        if (existingRows.length === 0) {
            isUnique = true; // Found a unique number
        } else {
            console.warn(`[Backend] Generated Fact_Nro ${generatedFactNro} already exists. Retrying.`);
            attempts++;
        }
    }

    // Throw error if a unique number couldn't be generated
    if (!isUnique) {
        throw new Error('Failed to generate a unique Fact_Nro after multiple attempts.');
    }

    const finalGeneratedFactNro = String(nextNumber); // The final unique number

    // 2. Insert the main Venta record with the generated number
    const insertVentaSql = `
      INSERT INTO Ventas (Fecha, Fact_Nro, Cliente_id, Estado, Pago, Subtotal, IVA, Total, Cotizacion_Dolar, Total_ARS)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

    // Prepare values for the insert query
    const ventaValues = [
      Fecha,
      finalGeneratedFactNro, // Use the generated unique number
      parseInt(Cliente_id, 10),
      Estado,
      Pago,
      Subtotal !== null && Subtotal !== '' && !isNaN(parseFloat(Subtotal)) ? parseFloat(Subtotal) : null,
      IVA !== null && IVA !== '' && !isNaN(parseFloat(IVA)) ? parseFloat(IVA) : null,
      Total !== null && Total !== '' && !isNaN(parseFloat(Total)) ? parseFloat(Total) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== null && Total_ARS !== '' && !isNaN(parseFloat(Total_ARS)) ? parseFloat(Total_ARS) : null,
    ];

    // Execute the insert query
    const [result] = await req.db.execute(insertVentaSql, ventaValues);
    const nuevaVentaId = result.insertId;

    // 3. Insert the items associated with the new Venta
    if (items.length > 0) {
      const insertItemSql = `
        INSERT INTO Venta_Items (Venta_id, Producto_id, Cantidad, Precio_Unitario_Venta, Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada, Total_Item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;

      const itemValues = [];
      const stockUpdates = [];

      // Prepare item data and stock updates
      for (const item of items) {
        console.log('[Backend] Procesando item con type:', item.type);
          let productoIdToSave = null;
          let cantidadProductoToSave = null;
          let precioUnitarioVentaProductoToSave = null;
          let descripcionPersonalizadaToSave = null;
          let precioUnitarioPersonalizadaToSave = null;
          let cantidadPersonalizadaToSave = null;
          let totalItemToSave = item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item) : null;

          // Assign values based on item type
          if (item.type === 'product') {
              productoIdToSave = item.Producto_id !== null && item.Producto_id !== undefined ? parseInt(item.Producto_id, 10) : null;
              cantidadProductoToSave = item.Cantidad !== null && item.Cantidad !== undefined ? parseFloat(item.Cantidad) : null;
              precioUnitarioVentaProductoToSave = item.Precio_Unitario_Venta !== null && item.Precio_Unitario_Venta !== undefined ? parseFloat(item.Precio_Unitario_Venta) : null;

              // Add to stock updates only for product items with valid quantity
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

          // Add values for this item to the batch insert array
          itemValues.push([
              nuevaVentaId,
              productoIdToSave,
              cantidadProductoToSave,
              precioUnitarioVentaProductoToSave,
              descripcionPersonalizadaToSave,
              precioUnitarioPersonalizadaToSave,
              cantidadPersonalizadaToSave,
              totalItemToSave,
          ]);
      }

      // Execute item inserts (individually or batch)
       if (itemValues.length > 0) {
            for(const itemValue of itemValues) {
                await req.db.execute(insertItemSql, itemValue);
            }
       }

       // Update stock for sold product items
       const updateStockSql = `UPDATE Stock SET Cantidad = Cantidad - ? WHERE Producto_id = ?;`;
       for (const update of stockUpdates) {
           try {
                const [stockResult] = await req.db.execute(updateStockSql, [update.Cantidad_Vendida, update.Producto_id]);
                 if (stockResult.affectedRows === 0) {
                      console.warn(`No se encontró entrada de stock para Producto_id ${update.Producto_id} al vender. Stock no actualizado.`);
                 }
           } catch (stockError) {
                console.error(`Error al actualizar stock para Producto_id ${update.Producto_id}:`, stockError);
                // Consider rolling back transaction if stock update fails critically
           }
       }
    }

    // Commit the transaction if everything succeeded
    await req.db.commit();

    // Respond with success, including the new ID and generated Fact_Nro
    res.status(201).json({ success: { id: nuevaVentaId, Fact_Nro: finalGeneratedFactNro } });

  } catch (error) {
    // Rollback transaction on any error
    console.error('Error al agregar venta:', error);
    await req.db.rollback();
    // Provide specific error messages
    let userMessage = 'Error interno del servidor al agregar venta.';
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Cliente o Producto seleccionado en los ítems no válido.';
     } else if (error.code === 'ER_DUP_ENTRY' && error.message.includes('Fact_Nro')) {
          userMessage = 'Error: El número de factura generado ya existe. Intente de nuevo.';
     } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
     } else if (error.message.includes('Failed to generate a unique Fact_Nro')) {
          userMessage = error.message;
     }
    res.status(500).json({ error: userMessage });
  }
});

// Actualizar una venta existente por su ID (Solo detalles principales y re-inserción de ítems)
router.put('/:id', async (req, res) => {
  const ventaId = req.params.id;
  // Destructure data (Fact_Nro is not updated)
  const {
    Fecha, Cliente_id, Estado, Pago, Subtotal, IVA, Total,
    Cotizacion_Dolar, Total_ARS,
    items
  } = req.body;

  // Validation
  if (!Fecha || !Cliente_id || !Estado || !Pago || !Array.isArray(items) || items.length === 0 || Cotizacion_Dolar === undefined || Cotizacion_Dolar === null || isNaN(parseFloat(Cotizacion_Dolar)) || parseFloat(Cotizacion_Dolar) <= 0) {
       return res.status(400).json({ error: 'Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son obligatorios para actualizar Ventas.' });
  }
   // Optional validation for numerical fields
    if (Subtotal !== undefined && Subtotal !== null && Subtotal !== '' && isNaN(parseFloat(Subtotal))) { return res.status(400).json({ error: 'Subtotal inválido.' }); }
    if (IVA !== undefined && IVA !== null && IVA !== '' && isNaN(parseFloat(IVA))) { return res.status(400).json({ error: 'IVA inválido.' }); }
    if (Total !== undefined && Total !== null && Total !== '' && isNaN(parseFloat(Total))) { return res.status(400).json({ error: 'Total inválido.' }); }
    if (Total_ARS !== undefined && Total_ARS !== null && Total_ARS !== '' && isNaN(parseFloat(Total_ARS))) { return res.status(400).json({ error: 'Total ARS inválido.' }); }

  try {
    // Start transaction
    await req.db.beginTransaction();

    // 1. Update main sale details (excluding Fact_Nro)
    const updateVentaSql = `
      UPDATE Ventas
      SET
        Fecha = ?, Cliente_id = ?, Estado = ?, Pago = ?, Subtotal = ?, IVA = ?, Total = ?,
        Cotizacion_Dolar = ?, Total_ARS = ?
      WHERE id = ?;`;

    // Prepare values for update
    const ventaValues = [
      Fecha,
      parseInt(Cliente_id, 10),
      Estado,
      Pago,
      Subtotal !== null && Subtotal !== '' && !isNaN(parseFloat(Subtotal)) ? parseFloat(Subtotal) : null,
      IVA !== null && IVA !== '' && !isNaN(parseFloat(IVA)) ? parseFloat(IVA) : null,
      Total !== null && Total !== '' && !isNaN(parseFloat(Total)) ? parseFloat(Total) : null,
      parseFloat(Cotizacion_Dolar),
      Total_ARS !== null && Total_ARS !== '' && !isNaN(parseFloat(Total_ARS)) ? parseFloat(Total_ARS) : null,
      ventaId
    ];

    // Execute update
    const [updateResult] = await req.db.execute(updateVentaSql, ventaValues);

    // Check if sale was found and updated
     if (updateResult.affectedRows === 0) {
          await req.db.rollback();
          return res.status(404).json({ error: `No se encontró venta con ID ${ventaId} para actualizar.` });
     }

    // --- Stock Reversal Logic (IMPORTANT for Edit) ---
    // 2. Get existing product items BEFORE deleting them to calculate stock reversal
    const [existingProductItems] = await req.db.execute(
        `SELECT Producto_id, Cantidad FROM Venta_Items WHERE Venta_id = ? AND Producto_id IS NOT NULL`,
        [ventaId]
    );

    // 3. Delete existing items for this Venta
    const deleteItemsSql = `DELETE FROM Venta_Items WHERE Venta_id = ?`;
    await req.db.execute(deleteItemsSql, [ventaId]);

    // 4. Insert the NEW items provided in the request body
    const insertItemSql = `
      INSERT INTO Venta_Items (Venta_id, Producto_id, Cantidad, Precio_Unitario_Venta, Descripcion_Personalizada, Precio_Unitario_Personalizada, Cantidad_Personalizada, Total_Item)
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

                // Add to NEW stock updates
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
                ventaId, // Link to the updated Venta ID
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
            console.error(`Error reverting stock for Producto_id ${oldItem.Producto_id} (Venta Edit):`, stockError);
            // Consider rollback if critical
        }
    }

    // Subtract stock based on NEW items
    for (const newItemUpdate of newStockUpdates) {
        try {
            await req.db.execute(stockSubtractionSql, [newItemUpdate.Cantidad_Vendida, newItemUpdate.Producto_id]);
        } catch (stockError) {
            console.error(`Error subtracting new stock for Producto_id ${newItemUpdate.Producto_id} (Venta Edit):`, stockError);
            // Consider rollback if critical
        }
    }

    // Commit the transaction
    await req.db.commit();

    // Respond with success
    res.json({ success: { id: ventaId, changes: updateResult.affectedRows } });

  } catch (error) {
    // Rollback on any error
    console.error(`Error al actualizar venta con ID ${ventaId}:`, error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al actualizar venta.';
     if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          userMessage = 'Error: Cliente o Producto seleccionado en los ítems no válido.';
     } else if (error.code === 'ER_PARSE_ERROR' || error.code === 'ER_TRUNCATED_WRONG_VALUE') {
          userMessage = `Error de formato de datos o sintaxis SQL: ${error.sqlMessage}`;
     }
    res.status(500).json({ error: userMessage });
  }
});

// Actualizar el estado y/o pago de una venta pendiente por su ID
router.put('/pending/:id', async (req, res) => {
    const ventaId = req.params.id;
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

    // Build the SET clause dynamically
    if (Estado !== undefined) {
        updates.push('Estado = ?');
        values.push(Estado);
    }
    if (Pago !== undefined) {
        updates.push('Pago = ?');
        values.push(Pago);
    }

    // Prepare SQL query
    let sql = `UPDATE Ventas SET ${updates.join(', ')} WHERE id = ?;`;
    values.push(ventaId);

    try {
        // Execute the update query
        const [result] = await req.db.execute(sql, values);

        // Check if any row was affected
        if (result.affectedRows === 0) {
             return res.status(404).json({ error: `No se encontró venta pendiente con ID ${ventaId} para actualizar.` });
        }

        // Respond with success
        res.json({ success: { id: ventaId, changes: result.affectedRows } });

    } catch (error) {
        console.error(`Error al actualizar venta pendiente con ID ${ventaId}:`, error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar venta pendiente.' });
    }
});


// Eliminar una venta por ID, incluyendo sus ítems y revirtiendo stock
router.delete('/:id', async (req, res) => {
  const ventaId = req.params.id;

  try {
    // Start transaction
    await req.db.beginTransaction();

    // 1. Get associated product items to revert stock
    const [productItemsToRevert, fields] = await req.db.execute(`
        SELECT Producto_id, Cantidad
        FROM Venta_Items
        WHERE Venta_id = ? AND Producto_id IS NOT NULL`, [ventaId]);

    // 2. Revert stock quantities
    const updateStockSql = `UPDATE Stock SET Cantidad = Cantidad + ? WHERE Producto_id = ?;`;
    for (const item of productItemsToRevert) {
        try {
             const [stockResult] = await req.db.execute(updateStockSql, [item.Cantidad, item.Producto_id]);
             if (stockResult.affectedRows === 0) {
                  console.warn(`No se encontró entrada de stock para Producto_id ${item.Producto_id} al eliminar venta. Stock no revertido completamente.`);
             }
        } catch (stockError) {
             console.error(`Error al revertir stock para Producto_id ${item.Producto_id}:`, stockError);
             // Consider rolling back if stock reversal is critical
        }
    }

    // 3. Delete associated items
    const deleteItemsSql = `DELETE FROM Venta_Items WHERE Venta_id = ?`;
    await req.db.execute(deleteItemsSql, [ventaId]);

    // 4. Delete the main sale record
    const deleteVentaSql = `DELETE FROM Ventas WHERE id = ?`;
    const [result] = await req.db.execute(deleteVentaSql, [ventaId]);

    // Check if sale was found and deleted
    if (result.affectedRows === 0) {
      await req.db.rollback();
      return res.status(404).json({ error: `No se encontró venta con ID ${ventaId} para eliminar.` });
    }

    // Commit transaction
    await req.db.commit();

    // Respond with success
    res.json({ success: { id: ventaId, changes: result.affectedRows } });

  } catch (error) {
    // Rollback on any error
    console.error(`Error al eliminar venta con ID ${ventaId}:`, error);
    await req.db.rollback();
    let userMessage = 'Error interno del servidor al eliminar venta.';
     if (error.code === 'ER_ROW_IS_REFERENCED_2') {
          userMessage = 'Error: No se puede eliminar la venta debido a registros asociados inesperados.';
     }
    res.status(500).json({ error: userMessage });
  }
});


module.exports = router;
