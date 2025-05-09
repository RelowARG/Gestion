// src/components/ListaVentasGlobal.js (MODIFICADO con Filtros de Fecha y Costo Histórico)
import React, { useState, useEffect } from 'react';
// --- IMPORTACIONES AÑADIDAS ---
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
// ------------------------------

const electronAPI = window.electronAPI;

function ListaVentasGlobal() {
    const [ventas, setVentas] = useState([]);
    // const [productos, setProductos] = useState([]); // Ya no es estrictamente necesario para el cálculo de costo histórico si viene en el item
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- ESTADOS DE FILTRO AÑADIDOS ---
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    // ----------------------------------

    const [totalSalesCount, setTotalSalesCount] = useState(0);
    const [totalRealGain, setTotalRealGain] = useState(0);

    // --- Calculation Functions ---

    // Calculate taxes (IIBB, Transf, Ganancias) and Total Desc Imp for a single sale
    const calculateSaleTaxesAndNetTotal = (venta) => {
         // Use parsed Subtotal and Total (USD)
         const subtotal = venta.Subtotal !== null ? venta.Subtotal : 0;
         const totalUSD = venta.Total !== null ? venta.Total : 0;

         const iibbRate = 0.035; // 3.5%
         const transfRate = 0.023; // 2.3%
         const gananciasRate = 0.15; // 15%

         // Calculate taxes in USD based on Subtotal
         const iibb = subtotal * iibbRate;
         const transf = subtotal * transfRate;
         const ganancias = subtotal * gananciasRate;

         // Calculate Total Desc Imp (Total USD minus calculated taxes in USD)
         const totalDescImp = totalUSD - iibb - transf - ganancias;

         return {
             iibb: parseFloat(iibb.toFixed(2)),
             transf: parseFloat(transf.toFixed(2)),
             ganancias: parseFloat(ganancias.toFixed(2)),
             totalDescImp: parseFloat(totalDescImp.toFixed(2)),
         };
    };

     // *** FUNCIÓN DE CÁLCULO DE COSTO DE MATERIAL (MODIFICADA) ***
     // Ahora usa los costos históricos que vienen en cada 'item' de la 'venta'
     const calculateMaterialCost = (venta) => {
        // console.log('[Calc Cost VentaGlobal - HIST] Input venta:', venta); // Descomentar para depurar

        if (!venta.items || venta.items.length === 0) {
            // console.log('[Calc Cost VentaGlobal - HIST] No items, returning 0.'); // Descomentar para depurar
            return 0;
        }

        let totalMaterialCost = 0;

        venta.items.forEach((item, index) => {
            // console.log(`[Calc Cost VentaGlobal - HIST] Processing item ${index}:`, item); // Descomentar para depurar

            // Solo procesar ítems de producto con datos de costo histórico
            if (item.type === 'product' && item.Producto_id && (item.Cantidad !== null && item.Cantidad > 0)) {

                // *** USA LOS COSTOS HISTÓRICOS DEL ITEM ***
                const costo1000Hist = item.costo_historico_x_1000; // Costo histórico por 1000 (puede ser null)
                const costoRolloHist = item.costo_historico_x_rollo; // Costo histórico por rollo (puede ser null)
                const cantidadRollosVendidos = parseFloat(item.Cantidad); // Asumiendo que item.Cantidad son rollos

                // console.log(`[Calc Cost VentaGlobal - HIST] Item ${index} data: Cant=${cantidadRollosVendidos}, C1K_H=${costo1000Hist}, CR_H=${costoRolloHist}`); // Descomentar para depurar

                let itemCost = 0;

                // Priorizar usar costo_historico_x_rollo si está disponible y es válido
                if (costoRolloHist !== null && !isNaN(parseFloat(costoRolloHist)) && !isNaN(cantidadRollosVendidos)) {
                     const costoRolloFloat = parseFloat(costoRolloHist);
                     itemCost = costoRolloFloat * cantidadRollosVendidos;
                     // console.log(`[Calc Cost VentaGlobal - HIST] Usando costo_historico_x_rollo (${costoRolloFloat}) para item prod ID ${item.Producto_id}. Item cost: ${itemCost}`); // Descomentar para depurar
                }
                 else {
                     console.warn(`[Calc Cost VentaGlobal - HIST] No se pudo determinar costo histórico (rollo o 1000) para item prod ID ${item.Producto_id}. Costo del item = 0.`);
                 }

                totalMaterialCost += itemCost;
            } else {
                // console.log(`[Calc Cost VentaGlobal - HIST] Item ${index} skipped (not product or invalid quantity).`); // Descomentar para depurar
            }
        });

        // console.log('[Calc Cost VentaGlobal - HIST] Final calculated totalMaterialCost:', totalMaterialCost); // Descomentar para depurar
        return parseFloat(totalMaterialCost.toFixed(2));
    };


    // Función async para obtener todas las ventas filtradas (ya trae costo histórico)
    const fetchFilteredVentas = async (start, end) => {
        console.log('[ListaVentasGlobal] Fetching filtered ventas...');
        setLoading(true);
        setError(null);
        setVentas([]);
        setTotalSalesCount(0);
        setTotalRealGain(0);

        const formattedStartDate = start ? format(start, 'yyyy-MM-dd') : null;
        const formattedEndDate = end ? format(end, 'yyyy-MM-dd') : null;

        try {
            // La API ya devuelve los items con costo histórico
            const ventasData = await electronAPI.getAllVentasFiltered(formattedStartDate, formattedEndDate);
            console.log('Raw ventasData received from API (with historical cost):', ventasData.length);

            // Parsear números principales y dentro de items (incluyendo históricos)
            const parsedVentas = ventasData.map(venta => ({
                ...venta,
                Fecha: venta.Fecha ? new Date(venta.Fecha) : null,
                Subtotal: parseFloat(venta.Subtotal) || null,
                IVA: parseFloat(venta.IVA) || null,
                Total: parseFloat(venta.Total) || null,
                Cotizacion_Dolar: parseFloat(venta.Cotizacion_Dolar) || null,
                Total_ARS: parseFloat(venta.Total_ARS) || null,
                items: venta.items ? venta.items.map(item => ({
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

            setVentas(parsedVentas);

            // Calcular estadísticas de resumen usando la función de costo modificada
            const count = parsedVentas.length;
            const totalGain = parsedVentas.reduce((sum, venta) => {
                 const materialCost = calculateMaterialCost(venta); // Usa la función modificada
                 const taxesAndNet = calculateSaleTaxesAndNetTotal(venta);
                 const realGain = (taxesAndNet.totalDescImp !== null ? taxesAndNet.totalDescImp : 0) - materialCost;
                 return sum + realGain;
            }, 0);

            setTotalSalesCount(count);
            setTotalRealGain(totalGain);

        } catch (err) {
            console.error('Error fetching all ventas:', err);
            setError(err.message || 'Error al cargar el listado de ventas.');
            setVentas([]);
            setTotalSalesCount(0);
            setTotalRealGain(0);
        } finally {
            setLoading(false);
             console.log('[ListaVentasGlobal] Data loading finished.');
        }
    };

    /*
    // Ya no necesitamos cargar la lista completa de productos para este cálculo
    const fetchProducts = async () => { ... };
    useEffect(() => { fetchProducts(); }, []);
    */

    // Fetch all sales data based on date range
    // --- useEffect MODIFICADO ---
    useEffect(() => {
        console.log('[ListaVentasGlobal] useEffect (dates) triggered with startDate:', startDate, 'endDate:', endDate);
        // Ya no depende de 'productos' para el cálculo principal
        fetchFilteredVentas(startDate, endDate); // Llama a la función con las fechas actuales

        return () => {
             console.log('[ListaVentasGlobal] Cleaning up dates effect listener.');
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
     if (loading && ventas.length === 0 && !error && !startDate && !endDate) {
         return <p>Cargando datos...</p>;
     }


    return (
        <div className="container">
            <h2>Listado General de Ventas</h2>

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
                 <p><strong>Cantidad de Ventas:</strong> {totalSalesCount}</p>
                 <p><strong>Ganancia Real Total (USD):</strong> {totalRealGain !== null && !isNaN(parseFloat(totalRealGain)) ? parseFloat(totalRealGain).toFixed(2) : 'N/A'}</p>
             </div>


            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}
            {loading && <p>Cargando Ventas...</p>}

            {!loading && ventas.length === 0 && !error && (
                <p>No hay Ventas registradas para el rango de fechas seleccionado.</p>
            )}

            {/* Tabla de Ventas */}
            {!loading && ventas.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nro Factura</th>
                            <th>Cliente</th>
                            <th>Subtotal</th>
                            <th>IVA</th>
                            <th>Total (USD)</th>
                            <th>IIBB (3.5%)</th>
                            <th>Transf (2.3%)</th>
                            <th>Ganancias (15%)</th>
                            <th>Total Desc Imp (USD)</th>
                            <th>Costo Material (USD)</th> {/* Columna para costo histórico */}
                            <th>Ganancia Real (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventas.map(venta => {
                            // Calculate dynamic fields for each sale
                            const taxesAndNet = calculateSaleTaxesAndNetTotal(venta);
                            // *** LLAMA A LA FUNCIÓN DE COSTO MODIFICADA ***
                            const materialCost = calculateMaterialCost(venta); // Ya no necesita 'productos'
                            const totalDescImpNum = taxesAndNet.totalDescImp !== null && !isNaN(taxesAndNet.totalDescImp) ? taxesAndNet.totalDescImp : 0;
                            // materialCost ya es un número o 0 de la función
                            const realGain = totalDescImpNum - materialCost;


                            return (
                                <tr key={venta.id}>
                                    {/* Format the date here */}
                                    <td>{venta.Fecha ? format(venta.Fecha, 'dd/MM/yy') : 'N/A'}</td>
                                    <td>{venta.Fact_Nro}</td>
                                    <td>{venta.Nombre_Cliente}</td>
                                    {/* Safely format numbers */}
                                    <td>{venta.Subtotal !== null && !isNaN(venta.Subtotal) ? venta.Subtotal.toFixed(2) : 'N/A'}</td>
                                    <td>{venta.IVA !== null && !isNaN(venta.IVA) ? venta.IVA.toFixed(2) : 'N/A'}</td>
                                    <td>{venta.Total !== null && !isNaN(venta.Total) ? venta.Total.toFixed(2) : 'N/A'}</td>
                                    <td>{taxesAndNet.iibb.toFixed(2)}</td>
                                    <td>{taxesAndNet.transf.toFixed(2)}</td>
                                    <td>{taxesAndNet.ganancias.toFixed(2)}</td>
                                    <td>{taxesAndNet.totalDescImp.toFixed(2)}</td>
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

export default ListaVentasGlobal;