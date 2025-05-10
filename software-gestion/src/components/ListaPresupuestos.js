// src/components/ListaPresupuestos.js
import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker'; // Assuming you have react-datepicker installed
import 'react-datepicker/dist/react-datepicker.css'; // Import datepicker styles
import PresupuestoItemsEditor from './presupuestos/PresupuestoItemsEditor'; // Import the new component
import PresupuestoShareModal from './presupuestos/PresupuestoShareModal'; // Import the new share modal component
import { format } from 'date-fns'; // Import the format function from date-fns


// Acceder a la API expuesta globalmente por el script de precarga
const electronAPI = window.electronAPI;

function ListaPresupuestos() {
    // --- MODIFIED STATE: Store all budgets and displayed budgets ---
    // REMOVED the original 'presupuestos' state
    const [allPresupuestos, setAllPresupuestos] = useState([]); // Stores the full list fetched initially
    const [displayedPresupuestos, setDisplayedPresupuestos] = useState([]); // Stores the currently displayed (filtered) list
    // --- END MODIFIED STATE ---

    // --- NEW STATE FOR SEARCH ---
    const [searchTerm, setSearchTerm] = useState('');
    // --- END NEW STATE ---

    // Estado para la lista de clientes (necesaria para el selector en el formulario)
    const [clientes, setClientes] = useState([]);
    // Estado para la lista de productos (necesaria para el selector de ítems de producto)
    const [productos, setProductos] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Error general de la lista o formulario

    // Estado para controlar qué presupuesto está seleccionado en la tabla
    const [selectedPresupuestoId, setSelectedPresupuestoId] = useState(null);
    // Estado para controlar qué presupuesto se está editando (para mostrar el formulario)
    const [editingPresupuestoId, setEditingPresupuestoId] = useState(null);

    // Estado para los datos del presupuesto que se está agregando o editando
    const [currentPresupuestoData, setCurrentPresupuestoData] = useState({
        id: null,
        Numero: '', // Puede ser generado en backend al agregar
        Fecha: new Date(), // Usar objeto Date para DatePicker
        Cliente_id: '', // ID del cliente seleccionado
        ValidezOferta: '',
        Comentarios: '',
        CondicionesPago: '',
        DatosPago: '',
        Subtotal: 0,
        IVA_Porcentaje: 21, // Valor por defecto de IVA
        IVA_Monto: 0,
        Otro_Monto: 0,
        Total_USD: 0,
        Cotizacion_Dolar: '', // Cotización del dólar usada
        Total_ARS: 0,
        items: [], // Array combinado de ítems (productos y personalizados)
    });

    const [loadingFormData, setLoadingFormData] = useState(false); // Para cargar datos de edición
    const [savingData, setSavingData] = useState(false); // Para guardar (agregar/actualizar)
    const [deletingPresupuestoId, setDeletingPresupuestoId] = useState(null); // Para eliminar

    // Estado para controlar la visibilidad del formulario de agregar/editar
    const [showForm, setShowForm] = useState(false);

    // --- ESTADOS para la funcionalidad de compartir (Ahora solo controlan el modal) ---
    const [presupuestoToShare, setPresupuestoToShare] = useState(null); // Datos del presupuesto a mostrar en el modal
    const [loadingShare, setLoadingShare] = useState(false); // Loading para la operación de compartir
    const [shareError, setShareError] = useState(null); // Error específico de la operación de compartir


    // --- Funciones de Cálculo (La principal se queda aquí) ---

    // Calcula los totales generales del presupuesto (Subtotal, IVA, Total USD, Total ARS)
    const calculatePresupuestoTotals = (items, ivaPorcentaje, otroMonto, cotizacionDolar) => {
         // Helper function for item total (could be imported from PresupuestoItemsEditor if needed elsewhere)
         const calculateItemTotal = (cantidad, precioUnitario, descuentoPorcentaje) => {
             const qty = parseFloat(cantidad) || 0;
             const price = parseFloat(precioUnitario) || 0;
             const discount = parseFloat(descuentoPorcentaje) || 0;

             if (qty <= 0 || price <= 0) {
                 return 0;
             }

             const totalBeforeDiscount = qty * price;
             const totalAfterDiscount = totalBeforeDiscount * (1 - discount / 100);

             return parseFloat(totalAfterDiscount.toFixed(2));
         };


        const subtotal = items.reduce((sum, item) => {
            // Usar los campos correctos según el tipo de ítem
            const cantidad = item.Producto_id !== null ? item.Cantidad : item.Cantidad_Personalizada;
            const precioUnitario = item.Producto_id !== null ? item.Precio_Unitario : item.Precio_Unitario_Personalizado;
            const descuento = item.Descuento_Porcentaje;

            return sum + calculateItemTotal(cantidad, precioUnitario, descuento);
        }, 0);

        const ivaPct = parseFloat(ivaPorcentaje) || 0;
        const otro = parseFloat(otroMonto) || 0;
        const dolar = parseFloat(cotizacionDolar) || 0;

        const ivaMonto = subtotal * (ivaPct / 100);
        const totalUSD = subtotal + ivaMonto + otro;
        const totalARS = totalUSD * dolar;

        return {
            Subtotal: parseFloat(subtotal.toFixed(2)),
            IVA_Monto: parseFloat(ivaMonto.toFixed(2)),
            Total_USD: parseFloat(totalUSD.toFixed(2)),
            Total_ARS: parseFloat(totalARS.toFixed(2)),
        };
    };

    // Effect para recalcular totales cuando los ítems o campos relevantes cambian
    useEffect(() => {
        const recalculatedTotals = calculatePresupuestoTotals(
            currentPresupuestoData.items,
            currentPresupuestoData.IVA_Porcentaje,
            currentPresupuestoData.Otro_Monto,
            currentPresupuestoData.Cotizacion_Dolar
        );
        // Actualizar el estado solo si los totales calculados son diferentes
        // Esto previene loops infinitos si el cálculo no siempre produce el mismo resultado exacto
        // o si hay problemas de floating point. Comparar JSON stringify es una forma simple.
        if (JSON.stringify(recalculatedTotals) !== JSON.stringify({
             Subtotal: currentPresupuestoData.Subtotal,
             IVA_Monto: currentPresupuestoData.IVA_Monto,
             Total_USD: currentPresupuestoData.Total_USD,
             Total_ARS: currentPresupuestoData.Total_ARS,
        })) {
             setCurrentPresupuestoData(prevState => ({
                 ...prevState,
                 ...recalculatedTotals
             }));
        }

    }, [currentPresupuestoData.items, currentPresupuestoData.IVA_Porcentaje, currentPresupuestoData.Otro_Monto, currentPresupuestoData.Cotizacion_Dolar]); // Dependencias para recalcular


    // --- Fetching Data ---

    // NUEVO: Función async para obtener la lista principal de presupuestos
    const fetchPresupuestos = async () => {
        console.log('[ListaPresupuestos] Fetching all budgets...');
        setLoading(true);
        setError(null);
        // No deseleccionamos el presupuesto seleccionado aquí si el modo de edición o adición no está activo,
        // para que los detalles de ventas se mantengan visibles al refrescar la lista (si el cliente sigue ahí).
        // Si estamos añadiendo o editando, sí deseleccionamos para evitar inconsistencias.
        if (!showForm && editingPresupuestoId === null) {
           // Don't change selectedPresupuestoId
        } else {
            setSelectedPresupuestoId(null);
            setEditingPresupuestoId(null);
        }


        try {
            // Usar await con la nueva función API
            const budgetsData = await electronAPI.getPresupuestos();
            console.log('Presupuestos cargados:', budgetsData);
            setAllPresupuestos([...budgetsData]); // Store the full list
            setDisplayedPresupuestos([...budgetsData]); // Initially display all

            // If there was a selected budget before refreshing and it's still in the list, maintain the selection
            if (selectedPresupuestoId && budgetsData.find(p => p.id === selectedPresupuestoId)) {
                 // selectedPresupuestoId state is already set, no need to do anything
                 console.log(`[ListaPresupuestos] Kept selected budget ID: ${selectedPresupuestoId}`);
            } else if (selectedPresupuestoId !== null) {
                 // If the selected budget no longer exists in the list or there was no prior selection,
                 // and selectedPresupuestoId was not null before, clear the selection.
                setSelectedPresupuestoId(null);
                 console.log('[ListaPresupuestos] Cleared selected budget because it was not found after refresh.');
            }

        } catch (err) {
            console.error('Error fetching presupuestos:', err);
            setError(err.message || 'Error al cargar los presupuestos.');
            setAllPresupuestos([]); // Limpiar la lista completa en caso de error
            setDisplayedPresupuestos([]); // Limpiar la lista mostrada en caso de error
            setSelectedPresupuestoId(null); // Clear selection on error
        } finally {
            setLoading(false); // Ocultar loading al finalizar
        }
    };


    // NUEVO: Función async para obtener la lista de clientes
    const fetchClientes = async () => {
        console.log('[ListaPresupuestos] Fetching clients...');
        try {
            // Usar await con la nueva función API
            const clientsData = await electronAPI.getClients();
            console.log('Clientes cargados:', clientsData);
            setClientes(clientsData);
        } catch (err) {
            console.error('Error fetching clients:', err);
             // Consider how to handle this error
        }
    };

    // NUEVO: Función async para obtener la lista de productos
    const fetchProductos = async () => {
        console.log('[ListaPresupuestos] Fetching products...');
        try {
            // Usar await con la nueva función API
            const productsData = await electronAPI.getProductos();
            console.log('Productos cargados:', productsData);
            setProductos(productsData);
        } catch (err) {
            console.error('Error fetching products:', err);
            // Consider how to handle this error
        }
    };


    // Effect para fetching inicial de datos (presupuestos, clientes, productos)
    useEffect(() => {
        // Llamar a las funciones async para obtener datos
        fetchPresupuestos();
        fetchClientes();
        fetchProductos();

        // Eliminar listeners IPC que ya no se usan (si aún existieran por error en preload)
        // Con el preload.js actualizado, ya no son necesarios los removeAllListeners aquí
        return () => {
             console.log('[ListaPresupuestos] Initial fetch effect cleanup.');
             // Si hubieras usado `on` listeners para algo más, los limpiarías aquí.
        };
    }, []); // Se ejecuta solo una vez al montar el componente


   // --- NEW useEffect for Frontend Filtering ---
   // This effect runs whenever the search term or the full budget list changes
   useEffect(() => {
       console.log('Filtering budgets useEffect triggered. Search term:', searchTerm);
       if (searchTerm === '') {
           setDisplayedPresupuestos(allPresupuestos); // If search term is empty, show all budgets
       } else {
           const lowerCaseSearchTerm = searchTerm.toLowerCase();
           // Filter based on Numero, Nombre_Cliente, Cuit_Cliente
           const filtered = allPresupuestos.filter(presupuesto =>
               (presupuesto.Numero && String(presupuesto.Numero).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (presupuesto.Nombre_Cliente && String(presupuesto.Nombre_Cliente).toLowerCase().includes(lowerCaseSearchTerm)) ||
               (presupuesto.Cuit_Cliente && String(presupuesto.Cuit_Cliente).toLowerCase().includes(lowerCaseSearchTerm))
           );
           setDisplayedPresupuestos(filtered); // Update displayed list with filtered results
       }
   }, [searchTerm, allPresupuestos]); // Re-run effect when searchTerm or allPresupuestos changes
   // --- END NEW useEffect ---


    // --- Row Selection & Form Visibility ---

    // Maneja la selección de una fila de presupuesto en la tabla (Keep this)
    const handleRowClick = (presupuestoId) => {
        if (selectedPresupuestoId === presupuestoId) {
            setSelectedPresupuestoId(null); // Deseleccionar si ya estaba seleccionado
        } else {
            setSelectedPresupuestoId(presupuestoId);
             // Si hay un formulario abierto para otro presupuesto, cerrarlo
            if (editingPresupuestoId !== null && editingPresupuestoId !== presupuestoId) {
                setEditingPresupuestoId(null);
                setShowForm(false);
            }
        }
        setError(null); // Limpiar errores al cambiar de selección
    };

    // Muestra el formulario para agregar un nuevo presupuesto (Keep this)
    const handleNewPresupuestoClick = () => {
        setShowForm(true);
        setEditingPresupuestoId(null); // Asegurarse de que no estamos en modo edición
        setSelectedPresupuestoId(null); // Deseleccionar cualquier presupuesto
        setError(null); // Limpiar errores
        // Resetear el estado del formulario para un nuevo presupuesto
        setCurrentPresupuestoData({
            id: null,
            Numero: '',
            Fecha: new Date(), // Usar objeto Date para DatePicker
            Cliente_id: '', // ID del cliente seleccionado
            ValidezOferta: '',
            Comentarios: '',
            CondicionesPago: '',
            DatosPago: '',
            Subtotal: 0,
            IVA_Porcentaje: 21, // Valor por defecto de IVA
            IVA_Monto: 0,
            Otro_Monto: 0,
            Total_USD: 0,
            Cotizacion_Dolar: '', // Cotización del dólar usada
            Total_ARS: 0,
            items: [], // Empezar con lista de ítems vacía
        });
         // Los estados de nuevos ítems ahora están en PresupuestoItemsEditor y se resetearán al montar/desmontar
         // Re-fetch clients and products just in case for the dropdowns
         fetchClientes();
         fetchProductos();
    };

    // Muestra el formulario para editar el presupuesto seleccionado
    const handleEditPresupuestoClick = async () => { // Make async
        if (selectedPresupuestoId === null) return;

        setShowForm(true);
        setEditingPresupuestoId(selectedPresupuestoId); // Establecer ID para modo edición
        setLoadingFormData(true); // Indicar que estamos cargando datos para el formulario
        setError(null); // Limpiar errores

        try {
            // Usar await con la nueva función API para obtener los datos completos
             const presupuesto = await electronAPI.getPresupuestoById(selectedPresupuestoId);
             console.log(`Datos de presupuesto ID ${selectedPresupuestoId} cargados para edición:`, presupuesto);

             // Formatear la fecha para el DatePicker
             const fechaDate = presupuesto.Fecha ? new Date(presupuesto.Fecha) : new Date();

             // Cargar los datos en el estado del formulario
             setCurrentPresupuestoData({
                 id: presupuesto.id,
                 Numero: presupuesto.Numero || '',
                 Fecha: fechaDate,
                 Cliente_id: presupuesto.Cliente_id || '',
                 ValidezOferta: presupuesto.ValidezOferta || '',
                 Comentarios: presupuesto.Comentarios || '',
                 CondicionesPago: presupuesto.CondicionesPago || '',
                 DatosPago: presupuesto.DatosPago || '',
                 Subtotal: presupuesto.Subtotal || 0,
                 IVA_Porcentaje: presupuesto.IVA_Porcentaje || 0,
                 IVA_Monto: presupuesto.IVA_Monto || 0,
                 Otro_Monto: presupuesto.Otro_Monto || 0,
                 Total_USD: presupuesto.Total_USD || 0,
                 Cotizacion_Dolar: presupuesto.Cotizacion_Dolar !== null ? String(presupuesto.Cotizacion_Dolar) : '', // Convertir a string para el input
                 Total_ARS: presupuesto.Total_ARS || 0,
                 items: presupuesto.items || [], // Cargar los ítems existentes
             });
             // Re-fetch clients and products just in case for the dropdowns
             fetchClientes();
             fetchProductos();

        } catch (err) {
            console.error(`Error fetching presupuesto ID ${selectedPresupuestoId} for edit:`, err);
            setError(err.message || `Error al cargar datos del presupuesto.`);
            setShowForm(false); // Ocultar formulario si falla la carga
            setEditingPresupuestoId(null);
             // Reset edited data structure
             setCurrentPresupuestoData({
                 id: null, Numero: '', Fecha: new Date(), Cliente_id: '', ValidezOferta: '',
                 Comentarios: '', CondicionesPago: '', DatosPago: '', Subtotal: 0, IVA_Porcentaje: 21, IVA_Monto: 0,
                 Otro_Monto: 0, Total_USD: 0, Cotizacion_Dolar: '', Total_ARS: 0, items: []
             });
        } finally {
            setLoadingFormData(false); // Finalizar carga de datos del formulario
        }
     };

    // Cancela la operación de agregar/editar y oculta el formulario (Keep this)
    const handleCancelForm = () => {
        setShowForm(false);
        setEditingPresupuestoId(null);
        setSelectedPresupuestoId(null); // Deseleccionar al cancelar
        setError(null); // Limpiar errores
         // Opcional: Resetear el estado del formulario aquí también si no se hace al abrir
    };


    // --- Handlers para el Formulario Principal del Presupuesto ---

    // Maneja cambios en los campos principales del formulario de presupuesto (Keep this)
    const handlePresupuestoInputChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

        // Convertir a número si es un campo numérico
        if (['ValidezOferta', 'IVA_Porcentaje', 'Otro_Monto', 'Cotizacion_Dolar'].includes(name)) {
             updatedValue = value !== '' ? parseFloat(value) : ''; // Usar '' para permitir borrar el input
        }

        setCurrentPresupuestoData(prevState => {
            const updatedData = { ...prevState, [name]: updatedValue };
            // Los totales se recalcularán automáticamente en el useEffect cuando cambien las dependencias
            return updatedData;
        });
    };

    // Maneja el cambio de fecha en el DatePicker (Keep this)
    const handleFechaChange = (date) => {
        setCurrentPresupuestoData(prevState => ({
            ...prevState,
            Fecha: date
        }));
    };

     // Maneja el cambio de cliente seleccionado (Keep this)
    const handleClienteChange = (e) => {
        setCurrentPresupuestoData(prevState => ({
            ...prevState,
            Cliente_id: e.target.value
        }));
    };

    // Handler para cuando la lista de ítems cambia en el componente hijo (Keep this)
    const handleItemsChange = (newItems) => {
        setCurrentPresupuestoData(prevState => ({
            ...prevState,
            items: newItems
            // Los totales se recalcularán automáticamente en el useEffect
        }));
    };


    // --- Handlers para Guardar y Eliminar Presupuesto ---

    // Maneja el envío del formulario (Agregar o Actualizar)
    const handleSavePresupuesto = async (e) => { // Make async
        e.preventDefault();
        setSavingData(true);
        setError(null);

        // Validaciones generales del presupuesto
        if (!currentPresupuestoData.Fecha || !currentPresupuestoData.Cliente_id || currentPresupuestoData.items.length === 0) {
            setError('Fecha, Cliente y al menos un ítem son obligatorios.');
            setSavingData(false);
            return;
        }

         // Validar campos numéricos principales si no están vacíos
         if (currentPresupuestoData.ValidezOferta !== '' && currentPresupuestoData.ValidezOferta !== null && isNaN(parseFloat(currentPresupuestoData.ValidezOferta))) {
             setError('Validez de la oferta debe ser un número válido si se proporciona.');
             setSavingData(false);
             return;
         }
          if (currentPresupuestoData.IVA_Porcentaje !== '' && currentPresupuestoData.IVA_Porcentaje !== null && isNaN(parseFloat(currentPresupuestoData.IVA_Porcentaje))) {
             setError('IVA (%) debe ser un número válido si se proporciona.');
             setSavingData(false);
             return;
         }
           if (currentPresupuestoData.Otro_Monto !== '' && currentPresupuestoData.Otro_Monto !== null && isNaN(parseFloat(currentPresupuestoData.Otro_Monto))) {
             setError('Otro (USD) debe ser un número válido si se proporciona.');
             setSavingData(false);
             return;
         }
          if (currentPresupuestoData.Cotizacion_Dolar === '' || currentPresupuestoData.Cotizacion_Dolar === null || isNaN(parseFloat(currentPresupuestoData.Cotizacion_Dolar)) || parseFloat(currentPresupuestoData.Cotizacion_Dolar) <= 0) {
             setError('Cotización Dólar es obligatoria y debe ser un número válido (> 0).');
             setSavingData(false);
             return;
         }

         // Validar ítems: asegurar que los campos numéricos en los ítems sean válidos si no están vacíos
         // Esto es importante antes de enviar, aunque el backend también debería validar
         for (const item of currentPresupuestoData.items) {
             if (item.Producto_id !== null && item.Producto_id !== undefined) { // Product item
                 if (item.Cantidad !== null && item.Cantidad !== '' && isNaN(parseFloat(item.Cantidad))) {
                     setError(`Cantidad inválida en ítem de producto ${item.codigo || item.Descripcion}.`);
                     setSavingData(false);
                     return;
                 }
                 if (item.Precio_Unitario !== null && item.Precio_Unitario !== '' && isNaN(parseFloat(item.Precio_Unitario))) {
                      setError(`Precio Unitario inválido en ítem de producto ${item.codigo || item.Descripcion}.`);
                      setSavingData(false);
                      return;
                 }
                  if (item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && isNaN(parseFloat(item.Descuento_Porcentaje))) {
                      setError(`Descuento inválido en ítem de producto ${item.codigo || item.Descripcion}.`);
                      setSavingData(false);
                      return;
                 }
             } else { // Custom item
                 if (item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' && isNaN(parseFloat(item.Cantidad_Personalizada))) {
                      setError(`Cantidad inválida en ítem personalizado "${item.Descripcion_Personalizada}".`);
                      setSavingData(false);
                      return;
                 }
                 if (item.Precio_Unitario_Personalizado !== null && item.Precio_Unitario_Personalizado !== '' && isNaN(parseFloat(item.Precio_Unitario_Personalizado))) {
                     setError(`Precio Unitario inválido en ítem personalizado "${item.Descripcion_Personalizada}".`);
                     setSavingData(false);
                     return;
                 }
                  if (item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' && isNaN(parseFloat(item.Descuento_Porcentaje))) {
                      setError(`Descuento inválido en ítem personalizado "${item.Descripcion_Personalizada}".`);
                      setSavingData(false);
                      return;
                 }
             }
             // Validar total si está presente
             if (item.Total_Item !== null && item.Total_Item !== '' && isNaN(parseFloat(item.Total_Item)) || parseFloat(item.Total_Item) < 0) {
                  setError(`Total inválido en un ítem.`);
                  setSavingData(false);
                  return;
             }
         }


        // Preparar los datos para enviar al backend
        // Asegurarse de que los campos numéricos sean números o null, no strings vacíos, al enviar
        const dataToSend = {
            id: currentPresupuestoData.id, // Será null si es nuevo
            Numero: currentPresupuestoData.Numero || null, // Se usará si es edición, backend genera si es nuevo
            Fecha: currentPresupuestoData.Fecha instanceof Date && !isNaN(currentPresupuestoData.Fecha) ? currentPresupuestoData.Fecha.toISOString().split('T')[0] : null, // FormatoYYYY-MM-DD, check if valid Date object
            Cliente_id: currentPresupuestoData.Cliente_id !== '' ? parseInt(currentPresupuestoData.Cliente_id, 10) : null,
            ValidezOferta: currentPresupuestoData.ValidezOferta !== '' && currentPresupuestoData.ValidezOferta !== null ? parseFloat(currentPresupuestoData.ValidezOferta) : null,
            Comentarios: currentPresupuestoData.Comentarios || null,
            CondicionesPago: currentPresupuestoData.CondicionesPago || null,
            DatosPago: currentPresupuestoData.DatosPago || null,
            Subtotal: currentPresupuestoData.Subtotal !== null && currentPresupuestoData.Subtotal !== '' ? parseFloat(currentPresupuestoData.Subtotal) : null, // Ya calculado (float)
            IVA_Porcentaje: currentPresupuestoData.IVA_Porcentaje !== '' && currentPresupuestoData.IVA_Porcentaje !== null ? parseFloat(currentPresupuestoData.IVA_Porcentaje) : null,
            IVA_Monto: currentPresupuestoData.IVA_Monto !== null && currentPresupuestoData.IVA_Monto !== '' ? parseFloat(currentPresupuestoData.IVA_Monto) : null, // Ya calculado (float)
            Otro_Monto: currentPresupuestoData.Otro_Monto !== '' && currentPresupuestoData.Otro_Monto !== null ? parseFloat(currentPresupuestoData.Otro_Monto) : null, // Usar valor del frontend
            Total_USD: currentPresupuestoData.Total_USD !== null && currentPresupuestoData.Total_USD !== '' ? parseFloat(currentPresupuestoData.Total_USD) : null, // Ya calculado (float)
            Cotizacion_Dolar: currentPresupuestoData.Cotizacion_Dolar !== '' ? parseFloat(currentPresupuestoData.Cotizacion_Dolar) : null, // Ya validado (float)
            Total_ARS: currentPresupuestoData.Total_ARS !== null && currentPresupuestoData.Total_ARS !== '' ? parseFloat(currentPresupuestoData.Total_ARS) : null, // Ya calculado (float)
            items: currentPresupuestoData.items.map(item => ({
                 // Incluir campos relevantes para ambos tipos de ítems
                 // El backend usará Producto_id para diferenciar
                 id: item.id || undefined, // Incluir ID si existe (para ítems existentes en edición), sino undefined
                 // Presupuesto_id is not needed when sending items back to backend for update/add
                 Producto_id: item.Producto_id !== null && item.Producto_id !== undefined ? parseInt(item.Producto_id, 10) : null, // Ensure integer or null
                 Cantidad: item.Cantidad !== null && item.Cantidad !== '' ? parseFloat(item.Cantidad) : null, // Parse float or null
                 Precio_Unitario: item.Precio_Unitario !== null && item.Precio_Unitario !== '' ? parseFloat(item.Precio_Unitario) : null, // Parse float or null
                 Descuento_Porcentaje: item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== '' ? parseFloat(item.Descuento_Porcentaje) : 0, // Parse float or 0
                 Total_Item: item.Total_Item !== null && item.Total_Item !== '' ? parseFloat(item.Total_Item) : null, // Parse float or null

                 // Campos personalizados
                 Descripcion_Personalizada: item.Descripcion_Personalizada || null,
                 Cantidad_Personalizada: item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== '' ? parseFloat(item.Cantidad_Personalizada) : null, // Parse float or null
                 Precio_Unitario_Personalizado: item.Precio_Unitario_Personalizado !== null && item.Precio_Unitario_Personalizado !== '' ? parseFloat(item.Precio_Unitario_Personalizado) : null, // Parse float or null
            })),
        };

        // Determinar si es una operación de agregar o actualizar
        if (currentPresupuestoData.id === null) {
            // Agregar nuevo presupuesto
            try {
                // Usar await con la nueva función API
                 const response = await electronAPI.addPresupuesto(dataToSend);
                 console.log('Presupuesto added successfully:', response.success);
                 // Limpiar formulario y recargar lista
                 handleCancelForm(); // Oculta el formulario y limpia el estado
                 fetchPresupuestos(); // Recargar la lista principal
            } catch (err) {
                console.error('Error adding presupuesto:', err);
                setError(err.message || `Error al agregar el presupuesto: ${err.message}`);
            } finally {
                 setSavingData(false);
            }

        } else {
            // Actualizar presupuesto existente
            try {
                // Usar await con la nueva función API
                // El backend espera el ID en la URL y los datos en el cuerpo
                 const response = await electronAPI.updatePresupuesto(dataToSend.id, dataToSend);
                 console.log('Presupuesto updated successfully:', response.success);
                 // Limpiar formulario y recargar lista
                 handleCancelForm(); // Oculta el formulario y limpia el estado
                 fetchPresupuestos(); // Recargar la lista principal
            } catch (err) {
                console.error('Error updating presupuesto:', err);
                setError(err.message || `Error al actualizar el presupuesto: ${err.message}`);
            } finally {
                 setSavingData(false);
            }
        }
    };

    // Maneja la eliminación del presupuesto seleccionado
    const handleDeletePresupuesto = async () => { // Make async
        if (selectedPresupuestoId === null) return;

        if (window.confirm(`¿Está seguro de eliminar el presupuesto con ID ${selectedPresupuestoId}? Esta acción también eliminará todos los ítems asociados.`)) { // Mensaje actualizado
            setDeletingPresupuestoId(selectedPresupuestoId);
            setError(null);

            try {
                // Usar await con la nueva función API
                await electronAPI.deletePresupuesto(selectedPresupuestoId);
                console.log(`Presupuesto with ID ${selectedPresupuestoId} deleted successfully.`);
                setSelectedPresupuestoId(null); // Deseleccionar el presupuesto eliminado
                fetchPresupuestos(); // Recargar la lista

            } catch (err) {
                console.error(`Error deleting presupuesto with ID ${selectedPresupuestoId}:`, err);
                setError(err.message || `Error al eliminar el presupuesto: ${err.message}`);
            } finally {
                setDeletingPresupuestoId(null);
            }
        }
    };

    // --- FUNCIÓN para compartir presupuesto (Ahora solo activa la carga y setea el estado para el modal) ---
    const handleSharePresupuesto = async () => { // Make async
        if (selectedPresupuestoId === null) return;

        setLoadingShare(true);
        setShareError(null); // Limpiar errores de compartir
        setPresupuestoToShare(null); // Limpiar datos anteriores

        try {
             // Usar await con la nueva función API para obtener los datos completos
             const presupuestoData = await electronAPI.getPresupuestoById(selectedPresupuestoId);
             console.log(`Datos de presupuesto ID ${selectedPresupuestoId} cargados para compartir:`, presupuestoData);
             setPresupuestoToShare(presupuestoData); // Establecer los datos para el modal
        } catch (err) {
            console.error(`Error fetching presupuesto ID ${selectedPresupuestoId} for sharing:`, err);
             setShareError(err.message || `Error al obtener datos del presupuesto para compartir: ${err.message}`);
             setPresupuestoToShare(null); // Asegurarse de que no haya datos parciales
        } finally {
             setLoadingShare(false); // Finalizar loading
        }
    };

    // Función para cerrar el área de contenido compartido (Ahora solo limpia el estado) (Keep this)
    const handleCloseShareContent = () => {
        setPresupuestoToShare(null);
        setShareError(null); // Limpiar errores de compartir al cerrar
    };


    // --- Renderizado ---

    return (
        <div className="container">
            <h2>Gestión de Presupuestos</h2>

             {/* Botones principales de acción */}
            {!showForm && (
                 <div style={{ margin: '20px 0' }}>
                    <button onClick={handleNewPresupuestoClick} disabled={loading || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare}>
                        Nuevo
                    </button>
                    <button
                        onClick={handleEditPresupuestoClick}
                        disabled={selectedPresupuestoId === null || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare}
                        style={{
                            marginLeft: '10px',
                            // Aplicar color amarillito solo si el botón NO está deshabilitado
                            backgroundColor: (selectedPresupuestoId === null || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare)
                                ? undefined // No definir background-color inline cuando está deshabilitado
                                : '#FFC107', // Un tono de amarillo (puedes ajustar este color)
                            color: (selectedPresupuestoId === null || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare)
                                 ? undefined // No definir color de texto inline cuando está deshabilitado
                                 : '#212121', // Texto oscuro para contrastar (puedes ajustar)
                        }}
                    >
                        Editar
                    </button>
                    <button
                        onClick={handleDeletePresupuesto}
                        disabled={selectedPresupuestoId === null || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare}
                        style={{ marginLeft: '10px', backgroundColor: '#ef9a9a', color: '#212121' }}
                    >
                        Eliminar
                    </button>
                    {/* --- BOTÓN COMPARTIR (Llama a la función que activa la carga para el modal) --- */}
                    <button
                         onClick={handleSharePresupuesto}
                         disabled={selectedPresupuestoId === null || loading || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare}
                         style={{
                             marginLeft: '10px',
                             // Aplicar color verde solo si el botón NO está deshabilitado
                             backgroundColor: (selectedPresupuestoId === null || loading || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare)
                                 ? undefined // No definir background-color inline cuando está deshabilitado
                                 : '#4CAF50', // Un tono de verde cuando está habilitado (puedes ajustar este color)
                             color: (selectedPresupuestoId === null || loading || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare)
                                  ? undefined // No definir color de texto inline cuando está deshabilitado
                                  : '#FFFFFF', // Texto blanco para contrastar con el verde (puedes ajustar)
                         }}
                    >
                        {loadingShare ? 'Generando...' : 'Compartir'}
                    </button>
                 </div>
            )}

            {/* --- Renderizar el Modal de Compartir (Condicional) --- */}
            {/* Se muestra si hay datos para compartir, está cargando o hay un error de compartir */}
            {(presupuestoToShare || loadingShare || shareError) && (
                 <PresupuestoShareModal
                     presupuestoData={presupuestoToShare}
                     onClose={handleCloseShareContent}
                     loading={loadingShare}
                     error={shareError}
                 />
            )}


            {/* Formulario de Agregar/Editar Presupuesto (Condicional) */}
            {showForm && (
                <div style={{ marginTop: '20px' }}>
                    <h3>{editingPresupuestoId ? 'Editar Presupuesto' : 'Agregar Nuevo Presupuesto'}</h3>
                    {loadingFormData && <p>Cargando datos del presupuesto...</p>}
                    {savingData && <p>Guardando presupuesto...</p>}

                    {!loadingFormData && (
                        <form onSubmit={handleSavePresupuesto}>
                            {/* Campos principales del presupuesto */}
                            <div>
                                <label htmlFor="numero">Número:</label>
                                <input
                                    type="text"
                                    id="numero"
                                    name="Numero"
                                    value={currentPresupuestoData.Numero}
                                    disabled={true} // El número se genera o se carga, no se edita directamente aquí
                                    style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                />
                            </div>
                            <div>
                                <label htmlFor="fecha">Fecha:</label>
                                {/* Usar react-datepicker para la fecha */}
                                <DatePicker
                                    id="fecha"
                                    selected={currentPresupuestoData.Fecha}
                                    onChange={handleFechaChange}
                                    dateFormat="dd/MM/yyyy"
                                    disabled={savingData}
                                />
                            </div>
                            <div>
                                <label htmlFor="cliente">Cliente:</label>
                                <select
                                    id="cliente"
                                    name="Cliente_id"
                                    value={currentPresupuestoData.Cliente_id}
                                    onChange={handleClienteChange}
                                    required
                                    disabled={savingData || clientes.length === 0}
                                >
                                    <option value="">Seleccione Cliente</option>
                                    {clientes.map(cliente => (
                                        <option key={cliente.id} value={cliente.id}>{cliente.Empresa}</option>
                                    ))}
                                </select>
                            </div>
                             {/* Mostrar CUIT del cliente seleccionado si hay uno */}
                             {currentPresupuestoData.Cliente_id && clientes.length > 0 && (
                                 <div>
                                     <label>CUIT Cliente:</label>
                                     <p>{clientes.find(c => c.id === parseInt(currentPresupuestoData.Cliente_id))?.Cuit || 'N/A'}</p>
                                 </div>
                             )}
                            <div>
                                <label htmlFor="validezOferta">Validez de la oferta (días):</label>
                                <input
                                    type="number"
                                    id="validezOferta"
                                    name="ValidezOferta"
                                    value={currentPresupuestoData.ValidezOferta}
                                    onChange={handlePresupuestoInputChange}
                                    disabled={savingData}
                                />
                            </div>
                             <div>
                                <label htmlFor="cotizacionDolar">Cotización Dólar:</label>
                                <input
                                    type="number"
                                    id="cotizacionDolar"
                                    name="Cotizacion_Dolar"
                                    value={currentPresupuestoData.Cotizacion_Dolar}
                                    onChange={handlePresupuestoInputChange}
                                    required
                                    disabled={savingData}
                                    step="0.01" // Permitir decimales
                                />
                            </div>

                            {/* --- Sección de Ítems del Presupuesto (Usando el nuevo componente) --- */}
                            {/* Pasa los ítems actuales y la función para actualizarlos */}
                            <PresupuestoItemsEditor
                                items={currentPresupuestoData.items}
                                onItemsChange={handleItemsChange} // Pasa la función para actualizar ítems
                                productos={productos} // Pasa la lista de productos
                                savingData={savingData} // Pasa el estado de guardado
                            />
                             {/* Mensaje de carga/disponibilidad de productos en el editor de ítems */}
                             {productos.length === 0 && !loadingFormData && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems.</p>}


                            {/* Totales del Presupuesto */}
                            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                                <h4>Totales</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                    <div>
                                        <label>Subtotal (USD):</label>
                                        <input type="text" value={currentPresupuestoData.Subtotal !== null && currentPresupuestoData.Subtotal !== undefined ? parseFloat(currentPresupuestoData.Subtotal).toFixed(2) : 'N/A'} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                    </div>
                                     <div>
                                        <label htmlFor="ivaPorcentaje">IVA (%):</label>
                                        <input
                                            type="number"
                                            id="ivaPorcentaje"
                                            name="IVA_Porcentaje"
                                            value={currentPresupuestoData.IVA_Porcentaje}
                                            onChange={handlePresupuestoInputChange}
                                            disabled={savingData}
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label>IVA Monto (USD):</label>
                                        <input type="text" value={currentPresupuestoData.IVA_Monto !== null && currentPresupuestoData.IVA_Monto !== undefined ? parseFloat(currentPresupuestoData.IVA_Monto).toFixed(2) : 'N/A'} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                    </div>
                                     <div>
                                        <label htmlFor="otroMonto">Otro (USD):</label>
                                        <input
                                            type="number"
                                            id="otroMonto"
                                            name="Otro_Monto"
                                            value={currentPresupuestoData.Otro_Monto}
                                            onChange={handlePresupuestoInputChange}
                                            disabled={savingData}
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label>Total (USD):</label>
                                        <input type="text" value={currentPresupuestoData.Total_USD !== null && currentPresupuestoData.Total_USD !== undefined ? parseFloat(currentPresupuestoData.Total_USD).toFixed(2) : 'N/A'} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                    </div>
                                     <div>
                                        <label>Total (ARS):</label>
                                        <input type="text" value={currentPresupuestoData.Total_ARS !== null && currentPresupuestoData.Total_ARS !== undefined ? parseFloat(currentPresupuestoData.Total_ARS).toFixed(2) : 'N/A'} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                    </div>
                                </div>
                            </div>


                            {/* Campos adicionales del presupuesto */}
                            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                                <h4>Información Adicional</h4>
                                <div>
                                    <label htmlFor="comentarios">Comentarios:</label>
                                    <textarea
                                        id="comentarios"
                                        name="Comentarios"
                                        value={currentPresupuestoData.Comentarios}
                                        onChange={handlePresupuestoInputChange}
                                        disabled={savingData}
                                        rows="4"
                                    ></textarea>
                                </div>
                                <div>
                                    <label htmlFor="condicionesPago">Condiciones de Pago:</label>
                                    <textarea
                                        id="condicionesPago"
                                        name="CondicionesPago"
                                        value={currentPresupuestoData.CondicionesPago}
                                        onChange={handlePresupuestoInputChange}
                                        disabled={savingData}
                                        rows="4"
                                    ></textarea>
                                </div>
                                <div>
                                    <label htmlFor="datosPago">Datos de Pago:</label>
                                    <textarea
                                        id="datosPago"
                                        name="DatosPago"
                                        value={currentPresupuestoData.DatosPago}
                                        onChange={handlePresupuestoInputChange}
                                        disabled={savingData}
                                        rows="4"
                                    ></textarea>
                                </div>
                            </div>


                            {/* Botones de acción del formulario */}
                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                                <button type="submit" disabled={savingData}>
                                    {editingPresupuestoId ? 'Guardar Cambios' : 'Agregar Presupuesto'}
                                </button>
                                <button type="button" onClick={handleCancelForm} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white' }}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* Mostrar errores generales */}
            {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

            {/* Lista principal de presupuestos (Condicional) */}
            {!showForm && (
                <>
                    <h3>Presupuestos Existentes</h3>

                    {/* --- NEW SEARCH INPUT --- */}
                    <div style={{ marginBottom: '20px' }}>
                       <label htmlFor="search-term">Buscar:</label>
                       <input
                         type="text"
                         id="search-term"
                         value={searchTerm}
                         onChange={(e) => {
                             console.log('Budget search term changed:', e.target.value);
                             setSearchTerm(e.target.value); // Update only the search term state
                             // Filtering happens in the useEffect
                         }}
                         placeholder="Buscar por número, cliente, CUIT, etc."
                         disabled={loading || loadingFormData || savingData || deletingPresupuestoId !== null || loadingShare}
                        />
                    </div>
                    {/* --- END NEW SEARCH INPUT --- */}


                    {/* Mensajes de estado (cargando, eliminando) */}
                    {loading && <p>Cargando presupuestos...</p>}
                    {deletingPresupuestoId && <p>Eliminando presupuesto...</p>}

                    {/* Tabla de Presupuestos (Ahora usa displayedPresupuestos) */}
                    {/* Use displayedPresupuestos for rendering */}
                    {!loading && displayedPresupuestos.length > 0 && (
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Número</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>CUIT Cliente</th>
                                    <th>Total (USD)</th>
                                    <th>Cotización Dólar</th>
                                    <th>Total (ARS)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Map over displayedPresupuestos */}
                                {displayedPresupuestos.map((presupuesto) => (
                                    <tr
                                        key={presupuesto.id}
                                        onClick={() => handleRowClick(presupuesto.id)}
                                        style={{ cursor: 'pointer', backgroundColor: selectedPresupuestoId === presupuesto.id ? '#424242' : 'transparent' }}
                                    >
                                        <td>{presupuesto.id}</td>
                                        <td>{presupuesto.Numero}</td>
                                        {/* MODIFICACIÓN: Formatear la fecha a dd/MM/yy */}
                                        <td>{presupuesto.Fecha ? format(new Date(presupuesto.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                                        <td>{presupuesto.Nombre_Cliente}</td>
                                        <td>{presupuesto.Cuit_Cliente}</td>
                                        <td>{presupuesto.Total_USD !== null && presupuesto.Total_USD !== undefined ? parseFloat(presupuesto.Total_USD).toFixed(2) : 'N/A'}</td> {/* Ensure parsing and toFixed */}
                                        <td>{presupuesto.Cotizacion_Dolar !== null && presupuesto.Cotizacion_Dolar !== undefined ? parseFloat(presupuesto.Cotizacion_Dolar).toFixed(2) : 'N/A'}</td> {/* Ensure parsing and toFixed */}
                                        <td>{presupuesto.Total_ARS !== null && presupuesto.Total_ARS !== undefined ? parseFloat(presupuesto.Total_ARS).toFixed(2) : 'N/A'}</td> {/* Ensure parsing and toFixed */}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                     {/* Mostrar mensajes cuando no hay presupuestos */}
                     {/* Check both loading state and displayedPresupuestos length */}
                     {!loading && displayedPresupuestos.length === 0 && searchTerm === '' && <p>No hay presupuestos registrados.</p>}
                     {/* Show message if no budgets found for the current search term */}
                     {!loading && displayedPresupuestos.length === 0 && searchTerm !== '' && <p>No se encontraron presupuestos para el término "{searchTerm}".</p>}
                </>
            )}
        </div>
    );
}

export default ListaPresupuestos;