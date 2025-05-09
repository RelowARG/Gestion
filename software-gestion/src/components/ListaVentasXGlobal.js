// src/components/ListaVentasXGlobal.js (MODIFICADO con Filtros de Fecha y Costo Histórico)
import React, { useState, useEffect } from 'react';
// --- IMPORTACIONES AÑADIDAS ---
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
// ------------------------------

const electronAPI = window.electronAPI;

function ListaVentasXGlobal() {
    const [ventasX, setVentasX] = useState([]);
    // const [productos, setProductos] = useState([]); // Ya no es estrictamente necesario para el cálculo de costo histórico si viene en el item
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- ESTADOS DE FILTRO AÑADIDOS ---
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    // ----------------------------------

    const [totalVentasXCount, setTotalVentasXCount] = useState(0);
    const [totalVentasXRealGain, setTotalVentasXRealGain] = useState(0);

     // *** FUNCIÓN DE CÁLCULO DE COSTO DE MATERIAL (MODIFICADA) ***
     // Ahora usa los costos históricos que vienen en cada 'item' de la 'ventaX'
     const calculateMaterialCost = (ventaX) => {
        // console.log('[Calc Cost VentaXGlobal - HIST] Input ventaX:', ventaX); // Descomentar para depurar

        if (!ventaX.items || ventaX.items.length === 0) {
            // console.log('[Calc Cost VentaXGlobal - HIST] No items, returning 0.'); // Descomentar para depurar
            return 0;
        }

        let totalMaterialCost = 0;

        ventaX.items.forEach((item, index) => {
            // console.log(`[Calc Cost VentaXGlobal - HIST] Processing item ${index}:`, item); // Descomentar para depurar

            // Solo procesar ítems de producto con datos de costo histórico
            if (item.type === 'product' && item.Producto_id && (item.Cantidad !== null && item.Cantidad > 0)) {

                // *** USA LOS COSTOS HISTÓRICOS DEL ITEM ***
                const costo1000Hist = item.costo_historico_x_1000; // Costo histórico por 1000 (puede ser null)
                const costoRolloHist = item.costo_historico_x_rollo; // Costo histórico por rollo (puede ser null)
                const cantidadRollosVendidos = parseFloat(item.Cantidad); // Asumiendo que item.Cantidad son rollos

                // console.log(`[Calc Cost VentaXGlobal - HIST] Item ${index} data: Cant=${cantidadRollosVendidos}, C1K_H=${costo1000Hist}, CR_H=${costoRolloHist}`); // Descomentar para depurar

                let itemCost = 0;

                // Priorizar usar costo_historico_x_rollo si está disponible y es válido
                if (costoRolloHist !== null && !isNaN(parseFloat(costoRolloHist)) && !isNaN(cantidadRollosVendidos)) {
                     const costoRolloFloat = parseFloat(costoRolloHist);
                     itemCost = costoRolloFloat * cantidadRollosVendidos;
                     // console.log(`[Calc Cost VentaXGlobal - HIST] Usando costo_historico_x_rollo (${costoRolloFloat}) para item prod ID ${item.Producto_id}. Item cost: ${itemCost}`); // Descomentar para depurar
                }
                 else {
                     console.warn(`[Calc Cost VentaXGlobal - HIST] No se pudo determinar costo histórico (rollo o 1000) para item prod ID ${item.Producto_id}. Costo del item = 0.`);
                 }

                totalMaterialCost += itemCost;
            } else {
                // console.log(`[Calc Cost VentaXGlobal - HIST] Item ${index} skipped (not product or invalid quantity).`); // Descomentar para depurar
            }
        });

        // console.log('[Calc Cost VentaXGlobal - HIST] Final calculated totalMaterialCost:', totalMaterialCost); // Descomentar para depurar
        return parseFloat(totalMaterialCost.toFixed(2));
    };

    // Función async para obtener todas las Ventas X filtradas (ya trae costo histórico)
    const fetchFilteredVentasX = async (start, end) => {
        console.log('[ListaVentasXGlobal] Fetching filtered ventas X...');
        setLoading(true);
        setError(null);
        setVentasX([]);
        setTotalVentasXCount(0);
        setTotalVentasXRealGain(0);

        const formattedStartDate = start ? format(start, 'yyyy-MM-dd') : null;
        const formattedEndDate = end ? format(end, 'yyyy-MM-dd') : null;

        try {
            // La API ya devuelve los items con costo histórico
            const ventasXData = await electronAPI.getAllVentasXFiltered(formattedStartDate, formattedEndDate);
            console.log('Raw ventasXData received from API (with historical cost):', ventasXData.length);

            // Parsear números principales y dentro de items (incluyendo históricos)
            const parsedVentasX = ventasXData.map(ventaX => ({
                ...ventaX,
                 Fecha: ventaX.Fecha ? new Date(ventaX.Fecha) : null,
                Subtotal: parseFloat(ventaX.Subtotal) || null,
                Total: parseFloat(ventaX.Total) || null,
                Cotizacion_Dolar: parseFloat(ventaX.Cotizacion_Dolar) || null,
                Total_ARS: parseFloat(ventaX.Total_ARS) || null,
                items: ventaX.items ? ventaX.items.map(item => ({
                     ...item,
                     Cantidad: parseFloat(item.Cantidad) || null,
                     Precio_Unitario_Venta: parseFloat(item.Precio_Unitario_Venta) || null,
                     Cantidad_Personalizada: parseFloat(item.Cantidad_Personalizada) || null,
                     Precio_Unitario_Personalizada: parseFloat(item.Precio_Unitario_Personalizada) || null,
                     Total_Item: parseFloat(item.Total_Item) || null,
                     // Parsear costos históricos recibidos
                     costo_historico_x_1000: parseFloat(item.costo_historico_x_1000) || null,
                     costo_historico_x_rollo: parseFloat(item.costo_historico_x_rollo) || null,
                     // type ya viene del backend
                 })) : []
            }));


            setVentasX(parsedVentasX);

            // Calcular estadísticas de resumen usando la función de costo modificada
            const count = parsedVentasX.length;
            const totalGain = parsedVentasX.reduce((sum, ventaX) => {
                 const materialCost = calculateMaterialCost(ventaX); // Usa la función modificada
                 // Ganancia Real para VentaX = Total USD - Costo Material
                 const totalVentaXNum = ventaX.Total !== null ? ventaX.Total : 0;
                 const realGain = totalVentaXNum - materialCost;
                 return sum + realGain;
            }, 0);


            setTotalVentasXCount(count);
            setTotalVentasXRealGain(totalGain);

        } catch (err) {
            console.error('Error fetching all ventas X:', err);
            setError(err.message || 'Error al cargar el listado de Ventas X.');
            setVentasX([]);
            setTotalVentasXCount(0);
            setTotalVentasXRealGain(0);
        } finally {
            setLoading(false);
             console.log('[ListaVentasXGlobal] Data loading finished.');
        }
    };

    /*
    // Ya no necesitamos cargar la lista completa de productos para este cálculo
    const fetchProducts = async () => { ... };
    useEffect(() => { fetchProducts(); }, []);
    */

    // Fetch all Ventas X data based on date range
    // --- useEffect MODIFICADO ---
    useEffect(() => {
        console.log('[ListaVentasXGlobal] useEffect (dates) triggered with startDate:', startDate, 'endDate:', endDate);
        // Ya no depende de 'productos' para el cálculo principal
        fetchFilteredVentasX(startDate, endDate); // Llama a la función con las fechas actuales

        return () => {
            console.log('[ListaVentasXGlobal] Cleaning up dates effect listener.');
        };
    }, [startDate, endDate]); // Depend on startDate and endDate
    // --------------------------

    // --- HANDLERS DE FILTRO AÑADIDOS ---
    const setFilterToday = () => {
        const today = new Date();
        setStartDate(startOfDay(today));
        setEndDate(endOfDay(today));
    };

    const setFilterThisWeek = () => {
        const today = new Date();
        setStartDate(startOfWeek(today));
        setEndDate(endOfWeek(today));
    };

    const setFilterThisMonth = () => {
        const today = new Date();
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
    };

    const clearFilters = () => {
        setStartDate(null);
        setEndDate(null);
    };
    // ---------------------------------

    // Helper function to get the display text for Estado
    const getEstadoDisplayText = (estado) => { /* ... (sin cambios) ... */ };

    // Render nothing while loading initially
     if (loading && ventasX.length === 0 && !error && !startDate && !endDate) {
         return <p>Cargando datos...</p>;
     }


    return (
        <div className="container">
            <h2>Listado General de Ventas X</h2>

             {/* --- CONTROLES DE FILTRO AÑADIDOS --- */}
             <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}> {/* Added flexWrap */}
                 <label>Filtrar por Fecha:</label>
                 <label htmlFor="startDate">Desde:</label>
                 <DatePicker
                     id="startDate"
                     selected={startDate}
                     onChange={(date) => setStartDate(date)}
                     dateFormat="dd/MM/yyyy"
                     isClearable
                     placeholderText="Inicio"
                     className="date-picker-input"
                     disabled={loading} // Disable while loading
                 />
                 <label htmlFor="endDate">Hasta:</label>
                  <DatePicker
                     id="endDate"
                     selected={endDate}
                     onChange={(date) => setEndDate(date)}
                     dateFormat="dd/MM/yyyy"
                     isClearable
                     placeholderText="Fin"
                     className="date-picker-input"
                     disabled={loading} // Disable while loading
                 />
                 {/* Predetermined date filter buttons */}
                  <button onClick={setFilterToday} disabled={loading}>Hoy</button>
                  <button onClick={setFilterThisWeek} disabled={loading}>Esta Semana</button>
                  <button onClick={setFilterThisMonth} disabled={loading}>Este Mes</button>
                  <button onClick={clearFilters} disabled={loading || (!startDate && !endDate)}>Limpiar Filtros</button>
             </div>
             {/* ------------------------------------- */}

             {/* Área de resumen/header con estadísticas */}
             <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #424242', borderRadius: '5px', backgroundColor: '#2c2c2c' }}>
                 <h4>Resumen del Período Seleccionado</h4>
                 <p><strong>Cantidad de Ventas X:</strong> {totalVentasXCount}</p>
                 <p><strong>Ganancia Real Total (USD):</strong> {totalVentasXRealGain !== null && !isNaN(parseFloat(totalVentasXRealGain)) ? parseFloat(totalVentasXRealGain).toFixed(2) : 'N/A'}</p>
             </div>


            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {loading && <p>Cargando Ventas X...</p>}

            {!loading && ventasX.length === 0 && !error && (
                <p>No hay Ventas X registradas para el rango de fechas seleccionado.</p>
            )}

            {/* Tabla de Ventas X */}
            {!loading && ventasX.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nro VentaX</th>
                            <th>Cliente</th>
                            <th>Subtotal</th>
                            <th>Total (USD)</th>
                            <th>Costo Material (USD)</th> {/* Columna para costo histórico */}
                            <th>Ganancia Real (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventasX.map(venta => {
                            // Calculate dynamic fields for each Venta X
                            // *** LLAMA A LA FUNCIÓN DE COSTO MODIFICADA ***
                            const materialCost = calculateMaterialCost(venta); // Ya no necesita 'productos'
                            // Ganancia Real = Total USD - Costo Material
                            const totalVentaXNum = venta.Total !== null ? venta.Total : 0;
                            const realGain = totalVentaXNum - materialCost;


                            return (
                                <tr key={venta.id}>
                                    {/* Format the date here */}
                                    <td>{venta.Fecha ? format(venta.Fecha, 'dd/MM/yy') : 'N/A'}</td>
                                    <td>{venta.Nro_VentaX}</td>
                                    <td>{venta.Nombre_Cliente}</td>
                                    {/* Safely format numbers */}
                                    <td>{venta.Subtotal !== null && !isNaN(venta.Subtotal) ? venta.Subtotal.toFixed(2) : 'N/A'}</td>
                                    <td>{venta.Total !== null && !isNaN(venta.Total) ? venta.Total.toFixed(2) : 'N/A'}</td>
                                     {/* Muestra el costo histórico calculado */}
                                    <td>{materialCost !== null ? materialCost.toFixed(2) : 'N/A'}</td>
                                    <td style={{ color: realGain >= 0 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                                        {realGain !== null ? realGain.toFixed(2) : 'N/A'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default ListaVentasXGlobal;