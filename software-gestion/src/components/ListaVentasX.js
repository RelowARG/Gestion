// ListaVentasX.js (Basado en la versión original, adaptado para usar VentaItemsEditorX con búsqueda y sin validación de personalizado)
// Este componente gestiona la sección de VentasX sin incluir IVA.
// Incluye comprobaciones de seguridad para evitar errores de acceso a propiedades de undefined.

import React, { useState, useEffect } from 'react';
import VentaItemsEditorX from './ventasx/VentaItemsEditorX'; // Usamos la versión con búsqueda y sin validación de personalizado
import ImportPresupuestoModalX from './ventasx/ImportPresupuestoModalX';
import { format } from 'date-fns'; // Import the format function from date-fns


// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaVentasX() {
  const [ventas, setVentas] = useState([]); // Note: This state name is 'ventas' but stores VentasX data
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]); // Needed for product dropdown in VentaItemsEditorX
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVentaId, setSelectedVentaId] = useState(null);
  const [editingVentaId, setEditingVentaId] = useState(null);

  // Removed IVA from state definitions
  const [editedVentaData, setEditedVentaData] = useState({
      id: null,
      Fecha: '',
      Nro_VentaX: '', // Keep here for display in edit form
      Cliente_id: '',
      Estado: '',
      Pago: '',
      Subtotal: '', // Now equal to Total
      Total: '', // Now equal to Subtotal
      Cotizacion_Dolar: '',
      Total_ARS: '',
      items: [], // Inicializado como array vacío
  });

  // Removed IVA from state definitions
  const [newVentaData, setNewVentaData] = useState({
      Fecha: '',
      // Nro_VentaX is removed from newVentaData state as it's auto-generated
      Cliente_id: '',
      Estado: '',
      Pago: '',
      Subtotal: '', // This will now be auto-calculated
      Total: '', // Now equal to Subtotal
      Cotizacion_Dolar: '',
      Total_ARS: '',
      items: [], // Inicializado como array vacío
  });

  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingVentaId, setDeletingVentaId] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false); // State to control modal visibility

  // Eliminado el estado clearItemsEditorErrorsTrigger


  // Function to fetch VentasX using the new API
  const fetchVentas = async () => { // Make the function async
    setLoading(true);
    setError(null);
     setSelectedVentaId(null);
    setEditingVentaId(null);
    // Removed IVA from reset data structure
    setEditedVentaData({
        id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
        Estado: '', Pago: '', Subtotal: '', Total: '',
        Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
    });

    try {
         // Call the async API function and await its result
        const data = await electronAPI.getVentasX(); // New API call (GET /ventasx)
        console.log('VentasX cargadas:', data);
        // Safely parse numerical values before setting state
        const parsedVentas = data.map(venta => ({
            ...venta,
            Subtotal: venta.Subtotal !== null && venta.Subtotal !== undefined && !isNaN(parseFloat(venta.Subtotal)) ? parseFloat(venta.Subtotal) : null,
            Total: venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total) : null,
            Cotizacion_Dolar: venta.Cotizacion_Dolar !== null && venta.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(venta.Cotizacion_Dolar)) ? parseFloat(venta.Cotizacion_Dolar) : null,
            Total_ARS: venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS) : null,
        }));
        setVentas(parsedVentas); // Set the parsed data

    } catch (err) {
        console.error('Error fetching ventasx:', err);
        setError(err.message || 'Error al cargar las VentasX.');
        setVentas([]); // Clear the list on error
         setSelectedVentaId(null); // Clear selection on error
    } finally {
        setLoading(false); // Always set loading to false
    }
    // Removed all IPC listener setup and cleanup for fetching ventasx
  };

  // Function to fetch clients using the new API
  const fetchClients = async () => { // Make the function async
      try {
          const data = await electronAPI.getClients(); // New API call (GET /clients)
          console.log('Clientes cargados para ventasx:', data);
          setClientes(data);
      } catch (err) {
         console.error('Error fetching clients for ventasx:', err);
         // Decide how to handle error
      }
      // No loading state controlled here
      // Removed IPC listener setup and cleanup for fetching clients
   };

    // Function to fetch products using the new API
  const fetchProductos = async () => { // Make the function async
      try {
          const data = await electronAPI.getProductos(); // New API call (GET /productos)
          console.log('Products loaded for ventax items:', data);
          setProductos(data); // Asegurado que productos es un array
      } catch (err) {
          console.error('Error fetching products for ventax items:', err);
          setProductos([]); // Asegurar que productos sea un array vacío en caso de error
      }
       // No loading state controlled here
       // Removed IPC listener setup and cleanup for fetching products
   };

  // Function to fetch stock (needed to refresh stock view) using the new API
  const fetchStock = async () => { // Make the function async
       try {
            const data = await electronAPI.getStock(); // New API call (GET /stock)
            console.log('Stock data fetched for refresh (VentasX):', data);
             // Do something with stock data if needed, or just rely on it being fetched
             // by ListaStock.js itself if that component is mounted elsewhere.
             // If this fetch is purely to trigger a refresh in ListaStock,
             // consider if simply calling fetchStock() in ListaStock is sufficient
             // when needed from here.
       } catch (err) {
           console.error('Error fetching stock data for refresh (VentasX):', err);
           // Handle error
       }
       // No loading state controlled here
       // Removed IPC listener setup and cleanup for fetching stock
   };


  useEffect(() => {
    // Call the async fetch functions directly
    fetchVentas();
    fetchClients();
    fetchProductos(); // Asegurarse de que productos se carga al montar

    // Removed IPC listener setup and cleanup from here
    // return () => { ... }; // REMOVED
  }, []);


   const handleRowClick = (ventaId) => { // Keep this
       if (selectedVentaId === ventaId) {
           setSelectedVentaId(null);
           setEditingVentaId(null);
            // Removed IVA from reset data structure
           setEditedVentaData({
               id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
               Estado: '', Pago: '', Subtotal: '', Total: '',
               Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
           });
       } else {
           setSelectedVentaId(ventaId);
           if(editingVentaId !== null && editingVentaId !== ventaId) {
                setEditingVentaId(null);
                 // Removed IVA from reset data structure
               setEditedVentaData({
                   id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
                   Estado: '', Pago: '', Subtotal: '', Total: '',
                   Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
               });
           }
       }
        setError(null);
   };


  // Handle input change for New VentaX form (Keep calculation logic)
  // Removed IVA from calculation logic
  const handleNewVentaInputChange = (e) => {
       const { name, value } = e.target;
       let updatedNewVentaData = { ...newVentaData, [name]: value };

       setNewVentaData(updatedNewVentaData);

       // Recalculate totals based on the updated state
       // This logic is now primarily in the useEffect below,
       // but this is kept for immediate feedback on input change.
       if (name === 'Cotizacion_Dolar') { // Only recalculate ARS when Cotizacion_Dolar changes
           const subtotal = parseFloat(updatedNewVentaData.Subtotal); // Subtotal is updated by items change
           const cotizacion = parseFloat(updatedNewVentaData.Cotizacion_Dolar);

           let calculatedTotalUSD = '';
           // Total USD is now simply Subtotal if Subtotal is a valid number
           if (!isNaN(subtotal)) {
               calculatedTotalUSD = subtotal.toFixed(2); // Total USD = Subtotal
           }


           let calculatedTotalARS = '';
           // Calculate Total ARS only if Total USD and Cotizacion Dolar are valid numbers
           if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
               calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
           }

           setNewVentaData(prevData => ({
               ...prevData,
               Total: calculatedTotalUSD, // Total USD = Subtotal
               Total_ARS: calculatedTotalARS
           }));
       }
       // If items change, handleNewVentaItemsChange already recalculates Subtotal and Total USD and triggers useEffect
  };

   // Handler for when the items list changes in the VentaItemsEditor child component
   // This handler is responsible for calculating the Subtotal and Total USD for NEW sales.
   // The useEffect below will then calculate Total ARS.
   const handleNewVentaItemsChange = (newItems) => {
       // Añadir comprobación de seguridad: asegurar que newItems es un array
       const itemsArray = Array.isArray(newItems) ? newItems : [];

       const calculatedSubtotal = itemsArray.reduce((sum, item) => {
           const itemTotal = parseFloat(item.Total_Item);
           return sum + (isNaN(itemTotal) ? 0 : itemTotal);
       }, 0).toFixed(2); // Keep 2 decimal places for currency

       setNewVentaData(prevState => {
           const updatedState = {
               ...prevState,
               items: itemsArray, // Usar el array asegurado
               Subtotal: calculatedSubtotal // Update Subtotal based on items
           };

           // Recalculate Total USD based on the new Subtotal (no IVA)
           const subtotal = parseFloat(updatedState.Subtotal);
            if (!isNaN(subtotal)) {
                updatedState.Total = subtotal.toFixed(2); // Total USD = Subtotal
            } else {
                updatedState.Total = '';
            }


            // Recalculate Total ARS based on the new Total USD and current Cotizacion_Dolar
            const cotizacion = parseFloat(updatedState.Cotizacion_Dolar);
            if (updatedState.Total !== '' && !isNaN(parseFloat(updatedState.Total)) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedState.Total_ARS = (parseFloat(updatedState.Total) * cotizacion).toFixed(2);
            } else {
                 updatedState.Total_ARS = '';
            }


           return updatedState;
       });
   };

    // useEffect to recalculate totals for New VentaX form (Keep calculation logic)
    // Removed IVA dependency and calculation
    useEffect(() => {
        if (showAddForm) {
            console.log('[ListaVentasX] Recalculating totals due to items or Cotizacion_Dolar change in add form (no IVA).');
             // Añadir comprobación de seguridad: asegurar que newVentaData.items es un array
             const itemsArray = Array.isArray(newVentaData.items) ? newVentaData.items : [];

            const calculatedSubtotal = itemsArray.reduce((sum, item) => {
                const itemTotal = parseFloat(item.Total_Item);
                return sum + (isNaN(itemTotal) ? 0 : itemTotal);
            }, 0).toFixed(2);

            const subtotal = parseFloat(calculatedSubtotal);
            // No IVA calculation needed here
            const cotizacion = parseFloat(newVentaData.Cotizacion_Dolar);

            let calculatedTotalUSD = '';
            // Total USD is now simply Subtotal if Subtotal is valid
            if (!isNaN(subtotal)) {
                calculatedTotalUSD = subtotal.toFixed(2);
            }

            let calculatedTotalARS = '';
            if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
                calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
            }


            // Update state only if values have changed to prevent infinite loops
            setNewVentaData(prevState => {
                if (prevState.Subtotal !== calculatedSubtotal || prevState.Total !== calculatedTotalUSD || prevState.Total_ARS !== calculatedTotalARS) {
                     console.log(`[ListaVentasX] Updating totals: Subtotal ${calculatedSubtotal}, Total USD ${calculatedTotalUSD}, Total ARS ${calculatedTotalARS}`);
                    return {
                        ...prevState,
                        Subtotal: calculatedSubtotal,
                        Total: calculatedTotalUSD, // Total USD = Subtotal
                        Total_ARS: calculatedTotalARS,
                    };
                }
                return prevState;
            });
        }
    }, [newVentaData.items, newVentaData.Cotizacion_Dolar, showAddForm]);
  // Removed Fact_Nro from newVentaData state as it's auto-generated


    // Handle form submission for New VentaX
    // Removed IVA validation and inclusion in dataToSend
  const handleAddVentaSubmit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Removed Nro_VentaX from validation
      // Añadir comprobación de seguridad para items
      if (!newVentaData.Fecha || !newVentaData.Cliente_id || !newVentaData.Estado || !newVentaData.Pago || !Array.isArray(newVentaData.items) || newVentaData.items.length === 0 || newVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(newVentaData.Cotizacion_Dolar)) || parseFloat(newVentaData.Cotizacion_Dolar) <= 0) {
           // Updated validation message
           setError('Fecha, Cliente, Estado, Pago, Cotización Dólar (válida) y al menos un ítem son campos obligatorios para VentasX.');
           setSavingData(false);
           return;
      }

       // Subtotal, Total (USD), and Total ARS are calculated, but ensure they are numbers if not empty.
         if (newVentaData.Subtotal !== '' && isNaN(parseFloat(newVentaData.Subtotal))) {
             setError('Error interno: Subtotal calculado no es un número válido.');
             setSavingData(false);
             return;
         }
          if (newVentaData.Total !== '' && isNaN(parseFloat(newVentaData.Total))) {
              setError('Error interno: Total USD calculado no es un número válido.');
              setSavingData(false);
              return;
          }
          if (newVentaData.Total_ARS !== '' && isNaN(parseFloat(newVentaData.Total_ARS))) {
              setError('Error interno: Total ARS calculado no es un número válido.');
              setSavingData(false);
              return;
          }


      // Data to send to backend, keys match VentasX DB column names (excluding IVA).
      // Nro_VentaX is NOT sent here, backend will generate it
      const dataToSend = {
          Fecha: newVentaData.Fecha,
          // Nro_VentaX is removed from dataToSend
          Cliente_id: parseInt(newVentaData.Cliente_id, 10),
          Estado: newVentaData.Estado,
          Pago: newVentaData.Pago,
          // Ensure numerical fields are numbers or null, not empty strings
          Subtotal: newVentaData.Subtotal !== '' ? parseFloat(newVentaData.Subtotal) : null,
          // Removed IVA field
          Total: newVentaData.Total !== '' ? parseFloat(newVentaData.Total) : null, // Send calculated total USD (Subtotal)
          Cotizacion_Dolar: newVentaData.Cotizacion_Dolar !== '' ? parseFloat(newVentaData.Cotizacion_Dolar) : null,
          Total_ARS: newVentaData.Total_ARS !== '' ? parseFloat(newVentaData.Total_ARS) : null,
           // Include the items array (asegurado que es array por la validación)
          items: newVentaData.items.map(item => ({
              // id is NOT included for new items
              type: item.type, // Send the type

              Total_Item: item.Total_Item !== null ? parseFloat(item.Total_Item) : null, // Ensure Total_Item is float or null
              // Include fields based on item type
              ...(item.type === 'product' && {
                  Producto_id: item.Producto_id,
                  Cantidad: item.Cantidad !== null ? parseFloat(item.Cantidad) : null, // Ensure Quantity is float or null
                  Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null ? parseFloat(item.Precio_Unitario_Venta) : null, // Ensure Price is float or null
              }),
              ...(item.type === 'custom' && {
                   Descripcion_Personalizada: item.Descripcion_Personalizada,
                   Cantidad_Personalizada: item.Cantidad_Personalizada !== null ? parseFloat(item.Cantidad_Personalizada) : null, // Ensure Quantity is float or null
                   Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null ? parseFloat(item.Precio_Unitario_Personalizada) : null, // Ensure Price is float or null
               }),
          })),
      };

      console.log('[ListaVentasX] Enviando dataToSend.items al backend:', dataToSend.items);

      // *** VERIFICAR QUE electronAPI.addVentaX ESTÉ DEFINIDO ANTES DE LLAMAR ***
      if (!electronAPI || typeof electronAPI.addVentaX !== 'function') {
          console.error('electronAPI.addVentaX is not defined or not a function.');
          setError('Error interno: La función para agregar Venta X no está disponible.');
          setSavingData(false);
          return;
      }


      try {
          // Call the async API function for adding
          const response = await electronAPI.addVentaX(dataToSend); // New API call (POST /ventasx)
          console.log('VentaX added successfully:', response.success);
           // Handle success response (e.g., { success: { id: newId, Nro_VentaX: generatedNumber } })

          // Clear form using new column names and items, including dolar fields
          setNewVentaData({
              Fecha: '', // Nro_VentaX is not in state anymore
              Cliente_id: '', Estado: '',
              Pago: '', Subtotal: '', Total: '',
              Cotizacion_Dolar: '', Total_ARS: '', items: [], // Asegurado como array vacío
          });
          setShowAddForm(false);
          fetchVentas(); // Refresh the list of sales

          // Recargar la lista de stock después de agregar una venta (solo afecta a ítems de producto)
          fetchStock(); // Call the async fetchStock

      } catch (err) {
          console.error('Error adding ventaX:', err);
          setError(err.message || `Error al agregar la VentaX: ${err.message}`); // Use error.message
      } finally {
          setSavingData(false);
      }
      // Removed IPC listener setup and cleanup for adding
  };


    // Handle Edit click for VentaX
    // Removed IVA from state and fetching logic
  const handleEditClick = async () => { // Make the function async
       if (selectedVentaId === null) return;

       setEditingVentaId(selectedVentaId);
       setLoadingEditData(true);
       setError(null);

       try {
           // Call the async API function to get ventaX data by ID
           const data = await electronAPI.getVentaXById(selectedVentaId); // New API call (GET /ventasx/:id)
           console.log(`VentaX ID ${selectedVentaId} data loaded (no IVA):`, data);
           // Populate editedVentaData including items (which can be product or custom) and dolar fields
           const ventaData = data; // Data is the direct response
           // Format date for input
           const formattedFecha = ventaData.Fecha ? format(new Date(ventaData.Fecha), 'yyyy-MM-dd') : '';
           setEditedVentaData({
               id: ventaData.id, // Keep ID
               Fecha: formattedFecha || '', // Use formatted date
               Nro_VentaX: ventaData.Nro_VentaX || '', // Nro_VentaX is kept for display in edit form
               Cliente_id: ventaData.Cliente_id || '',
               Estado: ventaData.Estado || '',
               Pago: ventaData.Pago || '',
               Subtotal: ventaData.Subtotal !== null ? String(ventaData.Subtotal) : '',
               // Removed IVA field
               Total: ventaData.Total !== null ? String(ventaData.Total) : '', // Total USD (Subtotal)
               Cotizacion_Dolar: ventaData.Cotizacion_Dolar !== null ? String(ventaData.Cotizacion_Dolar) : '',
               Total_ARS: ventaData.Total_ARS !== null ? String(ventaData.Total_ARS) : '',
               items: Array.isArray(ventaData.items) ? ventaData.items : [], // Asegurado como array
           });
            // Re-fetch clients and products just in case for the dropdowns
            fetchClients();
            fetchProductos(); // Asegurarse de que productos se carga al editar
       } catch (err) {
           console.error(`Error fetching ventaX by ID ${selectedVentaId}:`, err);
           setError(err.message || `Error al cargar los datos de la VentaX.`);
           setEditingVentaId(null);
           setSelectedVentaId(null);
            // Removed IVA from reset data structure
           setEditedVentaData({
               id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
               Estado: '', Pago: '', Subtotal: '', Total: '',
               Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
           });
       } finally {
           setLoadingEditData(false);
       }
       // Removed IPC listener setup and cleanup for fetching data for edit
   };

  // Handle input change for Edit VentaX form (Keep calculation logic)
  // Removed IVA from calculation logic
  const handleEditFormChange = (e) => {
       const { name, value } = e.target;
       let processedValue = value;

        // Update state with new column names
        let updatedEditedVentaData = { ...editedVentaData, [name]: processedValue };
        setEditedVentaData(updatedEditedVentaData);


        // Recalculate totals based on the updated state
        // Removed IVA calculation
        if (['Subtotal', 'Cotizacion_Dolar'].includes(name)) {
            const subtotal = parseFloat(updatedEditedVentaData.Subtotal);
            const cotizacion = parseFloat(updatedEditedVentaData.Cotizacion_Dolar);

            let calculatedTotalUSD = '';
            // Total USD is now simply Subtotal if Subtotal is a valid number
            if (!isNaN(subtotal)) {
                calculatedTotalUSD = subtotal.toFixed(2);
            }

            let calculatedTotalARS = '';
            if (calculatedTotalUSD !== '' && !isNaN(parseFloat(calculatedTotalUSD)) && !isNaN(cotizacion) && cotizacion > 0) {
                calculatedTotalARS = (parseFloat(calculatedTotalUSD) * cotizacion).toFixed(2);
            }

            setEditedVentaData(prevData => ({
                ...prevData,
                Total: calculatedTotalUSD, // Total USD = Subtotal
                Total_ARS: calculatedTotalARS
            }));
        }
  };

   // Handler for when the items list changes in the VentaItemsEditor child component during edit
   // NOTE: This calculation is for DISPLAY purposes in the edit form only.
   // The backend update handler currently does NOT use this calculated subtotal from the frontend.
   // Modified to also trigger Total ARS recalculation (Keep this logic)
   const handleEditedVentaItemsChange = (newItems) => {
        // Añadir comprobación de seguridad: asegurar que newItems es un array
        const itemsArray = Array.isArray(newItems) ? newItems : [];

       const calculatedSubtotal = itemsArray.reduce((sum, item) => {
            const itemTotal = parseFloat(item.Total_Item);
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
       }, 0).toFixed(2);

       setEditedVentaData(prevState => {
            const updatedState = {
                ...prevState,
                items: itemsArray, // Usar el array asegurado
                // Optionally update Subtotal state in the edit form based on item changes
                // Subtotal: calculatedSubtotal // Uncomment this if you want the Subtotal field to update visually during edit
            };

            // Recalculate Total USD based on the (potentially updated) Subtotal (no IVA)
            const subtotal = parseFloat(updatedState.Subtotal);
            if (!isNaN(subtotal)) {
                updatedState.Total = subtotal.toFixed(2); // Total USD = Subtotal
            } else {
                 updatedState.Total = '';
            }


            // Recalculate Total ARS based on the new Total USD and current Cotizacion_Dolar
            const cotizacion = parseFloat(updatedState.Cotizacion_Dolar);
            if (updatedState.Total !== '' && !isNaN(parseFloat(updatedState.Total)) && !isNaN(cotizacion) && cotizacion > 0) {
                 updatedState.Total_ARS = (parseFloat(updatedState.Total) * cotizacion).toFixed(2); // Total ARS
            } else {
                 updatedState.Total_ARS = ''; // Clear Total ARS if Total USD or Cotizacion is invalid
            }


            return updatedState;
       });
   };


    // Handle Save for Edit VentaX form
    // **** CORRECCIÓN PRINCIPAL: Incluir items en dataToSend y validar items ****
    // NOTE: The backend update-ventax handler *does* process items and manages CashFlow.
  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // VALIDACIÓN FRONTAL MEJORADA
      // Removed Nro_VentaX from validation
      // Añadir comprobación de seguridad para items
      if (!editedVentaData.Fecha || !editedVentaData.Cliente_id || !editedVentaData.Estado || !editedVentaData.Pago || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0) {
           // Updated validation message
           setError('Fecha, Cliente, Estado, Pago y Cotización Dólar (válida) son campos obligatorios.');
           setSavingData(false);
           return;
      }
      // **** AÑADIR VALIDACIÓN DE ITEMS ****
      if (!Array.isArray(editedVentaData.items) || editedVentaData.items.length === 0) {
          setError('La Venta X debe tener al menos un ítem.');
          setSavingData(false);
          return;
      }
      // **** FIN VALIDACIÓN DE ITEMS ****

       if (editedVentaData.Subtotal !== '' && isNaN(parseFloat(editedVentaData.Subtotal))) {
           setError('Subtotal debe ser un número válido.');
           setSavingData(false);
           return;
       }
        // Total (USD) and Total ARS are calculated, but ensure they are numbers if not empty.
         if (editedVentaData.Total !== '' && isNaN(parseFloat(editedVentaData.Total))) {
             setError('Error interno: Total USD calculado no es un número válido.');
             setSavingData(false);
             return;
         }
          if (editedVentaData.Total_ARS !== '' && isNaN(parseFloat(editedVentaData.Total_ARS))) {
              setError('Error interno: Total ARS calculado no es un número válido.');
              setSavingData(false);
              return;
          }

      // Format the date toYYYY-MM-DD before sending
      const formattedFecha = editedVentaData.Fecha ? new Date(editedVentaData.Fecha).toISOString().split('T')[0] : '';
      if (!formattedFecha) {
          setError('Formato de fecha no válido.');
          setSavingData(false);
          return;
      }


      // Send data to backend - includes all main details and the items array.
      // The backend update handler is expected to handle item deletion/re-insertion and CashFlow.
      // Nro_VentaX is NOT sent here for update
      const dataToSend = {
          id: editedVentaData.id,
          Fecha: formattedFecha, // Use the formatted date
          // Nro_VentaX is removed from dataToSend
          Cliente_id: parseInt(editedVentaData.Cliente_id, 10),
          Estado: editedVentaData.Estado,
          Pago: editedVentaData.Pago,
          // Ensure numerical fields are numbers or null, not empty strings
          Subtotal: editedVentaData.Subtotal !== '' ? parseFloat(editedVentaData.Subtotal) : null,
          // Removed IVA field
          Total: editedVentaData.Total !== '' ? parseFloat(editedVentaData.Total) : null, // Send potentially recalculated total USD
          Cotizacion_Dolar: editedVentaData.Cotizacion_Dolar !== '' ? parseFloat(editedVentaData.Cotizacion_Dolar) : null, // Send Cotizacion_Dolar
          Total_ARS: editedVentaData.Total_ARS !== '' ? parseFloat(editedVentaData.Total_ARS) : null, // Send potentially recalculated Total ARS
          // **** INCLUIR ITEMS EN dataToSend ****
          // Asegurado que editedVentaData.items es array por la validación
          items: editedVentaData.items.map(item => ({
              id: item.id || undefined, // Include ID if it exists (for existing items)
              type: item.type, // Send the type
              Total_Item: item.Total_Item !== null ? parseFloat(item.Total_Item) : null,
              ...(item.type === 'product' && {
                  Producto_id: item.Producto_id,
                  Cantidad: item.Cantidad !== null ? parseFloat(item.Cantidad) : null,
                  Precio_Unitario_Venta: item.Precio_Unitario_Venta !== null ? parseFloat(item.Precio_Unitario_Venta) : null,
              }),
              ...(item.type === 'custom' && {
                   Descripcion_Personalizada: item.Descripcion_Personalizada,
                   Cantidad_Personalizada: item.Cantidad_Personalizada !== null ? parseFloat(item.Cantidad_Personalizada) : null,
                   Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada !== null ? parseFloat(item.Precio_Unitario_Personalizada) : null,
               }),
          })),
          // **** FIN INCLUIR ITEMS ****
      };

      try {
           // Call the async API function for updating
           // The backend expects the ID in the URL and data in the body
           // *** VERIFICAR QUE electronAPI.updateVentaX ESTÉ DEFINIDO ANTES DE LLAMAR ***
           if (!electronAPI || typeof electronAPI.updateVentaX !== 'function') {
               console.error('electronAPI.updateVentaX is not defined or not a function.');
               setError('Error interno: La función para actualizar Venta X no está disponible.');
               setSavingData(false);
               return;
           }
          const response = await electronAPI.updateVentaX(dataToSend.id, dataToSend); // New API call (PUT /ventasx/:id)
           console.log('VentaX updated successfully:', response.success);
           // Handle success response

          setEditingVentaId(null);
           // Reset edited data structure with dolar fields
          setEditedVentaData({
              id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
              Estado: '', Pago: '', Subtotal: '', Total: '',
              Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
          });
          setSelectedVentaId(null);
          fetchVentas(); // Refresh the list
          // NOTE: Stock is handled by backend during update

      } catch (err) {
           console.error('Error updating ventaX:', err);
          setError(err.message || `Error al actualizar la VentaX.`);
      } finally {
          setSavingData(false);
      }
      // Removed IPC listener setup and cleanup for updating
  };

  const handleCancelEdit = () => { // Keep this
      setEditingVentaId(null);
      // Reset edited data structure with dolar fields
      setEditedVentaData({
          id: null, Fecha: '', Nro_VentaX: '', Cliente_id: '',
          Estado: '', Pago: '', Subtotal: '', Total: '',
          Cotizacion_Dolar: '', Total_ARS: '', items: [] // Asegurado como array vacío
      });
      setError(null);
  };


  // --- Delete Functionality ---

  // Handle Delete for VentaX (No changes needed for IVA)
  // NOTE: The backend delete-ventax handler *does* reverse stock changes.
  // The confirmation message text should be updated to reflect this if desired.
  const handleDeleteClick = async () => { // Make the function async
       if (selectedVentaId === null) return;

      // Updated confirmation message to reflect stock reversal
      if (window.confirm(`¿Está seguro de eliminar la VentaX con ID ${selectedVentaId}? Esta acción eliminará los ítems y revertirá los cambios de stock para los productos vendidos.`)) {
          setDeletingVentaId(selectedVentaId);
          setError(null);

          // *** VERIFICAR QUE electronAPI.deleteVentaX ESTÉ DEFINIDO ANTES DE LLAMAR ***
          if (!electronAPI || typeof electronAPI.deleteVentaX !== 'function') {
              console.error('electronAPI.deleteVentaX is not defined or not a function.');
              setError('Error interno: La función para eliminar Venta X no está disponible.');
              setDeletingVentaId(null);
              return;
          }

          try {
               // Call the async API function for deleting
              const response = await electronAPI.deleteVentaX(selectedVentaId); // New API call (DELETE /ventasx/:id)
               console.log(`VentaX with ID ${selectedVentaId} deleted successfully.`, response.success);
               // Handle success response
              setSelectedVentaId(null);
              fetchVentas(); // Refresh the list
               // Refresh stock view after deleting a sale (since stock is reversed)
               fetchStock(); // Call the async fetchStock

          } catch (err) {
              console.error(`Error deleting ventaX with ID ${selectedVentaId}:`, err);
              setError(err.message || `Error al eliminar la VentaX.`);
          } finally {
              setDeletingVentaId(null);
          }
      }
      // Removed IPC listener setup and cleanup for deleting
   };

    // Handle click on "Nueva VentaX" button (Keep this)
    const handleNewVentaClick = () => {
        setShowAddForm(true);
        setError(null);
         // Removed Nro_VentaX from reset state
         setNewVentaData({
             Fecha: '', // Nro_VentaX is not in state anymore
             Cliente_id: '', Estado: '',
             Pago: '', Subtotal: '', Total: '',
             Cotizacion_Dolar: '', Total_ARS: '', items: [], // Asegurado como array vacío
         });
        setSelectedVentaId(null);
        setEditingVentaId(null);
         fetchClients();
         fetchProductos(); // Asegurarse de que productos se carga al abrir el formulario
         // Eliminado el reset del clearItemsEditorErrorsTrigger
    };

    // Handle click on "Cancelar" button in the add form (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
        // Eliminado el reset del clearItemsEditorErrorsTrigger
    };

    // NUEVO: Define the function to handle opening the Import Presupuesto modal (Keep this)
    const handleImportPresupuestoClick = () => {
        setShowImportModal(true); // Show the import modal
        setError(null); // Clear any previous errors
        // The modal component itself (ImportPresupuestoModalX) will be adapted separately
        // to use the new API to fetch the list of budgets and budget details.
        // This component (ListaVentasX) just needs to open the modal.
    };


    // Handle data imported from PresupuestoModalX (Keep this logic)
    // Removed IVA from mapping
    const handlePresupuestoImported = (presupuestoData) => {
        console.log("Presupuesto imported:", presupuestoData);
        console.log("Presupuesto items received:", presupuestoData.items);

        // Añadir comprobación de seguridad: asegurar que presupuestoData.items es un array
        const importedItems = (Array.isArray(presupuestoData.items) ? presupuestoData.items : []).map(item => {
            console.log("Mapping item before transformation:", item); // Log original item

            let mappedItem = {};

            // Determine item type based on Producto_id or other properties
             // The backend's getPresupuestoById should provide enough info for this mapping.
            if (item.Producto_id !== null && item.Producto_id !== undefined) {
                // It's a product item from the budget
                mappedItem = {
                    type: 'product', // Identificar el tipo de ítem
                    Producto_id: item.Producto_id,
                    Cantidad: item.Cantidad, // Quantity is the same
                    // Calculate Precio_Unitario_Venta based on Total_Item and Quantity
                    // Or use item.Precio_Unitario from the budget if provided and valid
                    Precio_Unitario_Venta: (item.Total_Item !== null && item.Cantidad > 0)
                                            ? parseFloat((item.Total_Item / item.Cantidad).toFixed(2))
                                            : (item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && item.Precio_Unitario !== '')
                                                ? parseFloat(item.Precio_Unitario) // Fallback to original item price from budget
                                                : '', // If neither is possible, leave empty
                    Total_Item: item.Total_Item, // Total is the same
                    // Include product details for display in VentaItemsEditorX
                    codigo: item.codigo, // This should come from the JOIN in the backend query for presupuestos
                    Descripcion: item.Descripcion, // This should come from the JOIN
                };
                 // Ensure custom-specific fields are null for product items
                 mappedItem.Descripcion_Personalizada = null;
                 mappedItem.Cantidad_Personalizada = null;
                 mappedItem.Precio_Unitario_Personalizada = null;

                 // LOGGING para depurar item mapeado de producto
                 console.log("Mapped product item:", mappedItem);
                 return mappedItem;

            } else {
                // Assume it's a custom item
                // Map Presupuesto_Items personalized fields to Venta_Items personalized fields
                const mappedItem = {
                    type: 'custom', // Identificar el tipo de ítem
                    Descripcion_Personalizada: item.Descripcion_Personalizada,
                    Cantidad_Personalizada: item.Cantidad_Personalizada, // Quantity is the same
                    Precio_Unitario_Personalizada: item.Precio_Unitario_Personalizada, // Price is the same
                    Total_Item: item.Total_Item, // Total is the same
                };
                 // Ensure product-specific fields are null for custom items
                 mappedItem.Producto_id = null;
                 mappedItem.Cantidad = null;
                 mappedItem.Precio_Unitario_Venta = null;
                 mappedItem.codigo = null;
                 mappedItem.Descripcion = null;


                 // LOGGING para depurar item mapeado personalizado
                 console.log("Mapped custom item:", mappedItem);
                 return mappedItem;
            }
        });

        // Update the newVentaData state with imported data
        setNewVentaData(prevState => {
             const updatedState = {
                 ...prevState,
                 // Copy relevant fields from the budget
                 Fecha: new Date().toISOString().split('T')[0], // Use current date for the sale
                 // Nro_VentaX: '', // Keep empty for manual entry
                 Cliente_id: presupuestoData.Cliente_id || '', // Set client ID
                 // Estado: '', // Keep empty
                 // Pago: '', // Keep empty
                 items: importedItems, // Set the imported items (asegurado como array)
                 // No IVA in VentasX
                 // Import Cotizacion_Dolar from budget
                 Cotizacion_Dolar: presupuestoData.Cotizacion_Dolar !== null ? String(presupuestoData.Cotizacion_Dolar) : '',

                 // The useEffect watching items and Cotizacion_Dolar will handle the total recalculation
                 // No need to call handleNewVentaItemsChange directly here anymore.

                 // Keep other fields as they were
                 // Nro_VentaX is not in newVentaData state anymore
                 Estado: prevState.Estado,
                 Pago: prevState.Pago,
                 Subtotal: prevState.Subtotal,
                 Total: prevState.Total,
                 Total_ARS: prevState.Total_ARS,
             };


             return updatedState; // Return the state with updated items and potentially updated Cotizacion_Dolar
        });

        // Close the modal is handled by the modal's onImport callback
        // setShowImportModal(false); // This is handled by the modal's onClose prop callback
    };

    // Helper functions for Estado and Pago (Keep these)
    const getEstadoDisplayText = (estado) => {
      switch (estado) {
          case 'entregado': return 'Entregado';
          case 'en maquina': return 'En Máquina';
          case 'pedido': return 'Pedido';
          case 'cancelado': return 'Cancelado';
          case 'listo': return 'Listo';
          default: return estado;
      }
    };

    const getEstadoColor = (estado) => {
      switch (estado) {
          case 'entregado': return '#4CAF50'; // Green
          case 'en maquina':
          case 'pedido': return '#FF9800'; // Orange
          case 'cancelado': return '#F4436'; // Red (usar el mismo rojo que para "debe")
          case 'listo': return '#2196F3'; // Blue
          default: return 'inherit'; // Default color
      }
    };

   const getPagoDisplayText = (pago) => {
       switch (pago) {
           case 'abonado': return 'Abonado';
           case 'seña': return 'Seña';
           case 'debe': return 'Debe';
           default: return pago;
       }
    };

    const getPagoColor = (pago) => {
        switch (pago) {
            case 'abonado': return '#2196F3'; // Blue
            case 'seña': return '#FF9800'; // Orange
            case 'debe': return '#F44336'; // Red
            default: return 'inherit'; // Default color
        }
    };


  return (
    <div className="container">
      <h2>Gestión de Ventas X</h2>

       {/* Button to show the add form */}
       {!showAddForm && (
           <button onClick={handleNewVentaClick} disabled={loading || loadingEditData || savingData || deletingVentaId !== null}>
               Nueva Venta X
           </button>
       )}

      {/* Form to Add New VentaX (Conditional Rendering) */}
      {showAddForm && (
          <>
              <h3>Agregar Nueva Venta X</h3>
               {/* Use new column names in the form for adding, map UI labels */}
               <form onSubmit={handleAddVentaSubmit}>
                    {/* --- Import Presupuesto Button --- */}
                    <div style={{ marginBottom: '20px' }}>
                         <button
                             type="button"
                             onClick={handleImportPresupuestoClick}
                             disabled={savingData || loadingEditData || deletingVentaId !== null}
                             style={{ backgroundColor: '#0288d1', color: 'white' }} // Blue color for import button
                         >
                             Importar Presupuesto
                         </button>
                    </div>

                    <div>
                        <label htmlFor="new-fecha">Fecha:</label>
                        <input type="date" id="new-fecha" name="Fecha" value={newVentaData.Fecha} onChange={handleNewVentaInputChange} required disabled={savingData || loadingEditData || deletingVentaId !== null} />
                    </div>
                    {/* Removed Nro VentaX input field */}
                     <div>
                        <label htmlFor="new-cliente-id">Cliente:</label>
                        <select
                            id="new-cliente-id"
                            name="Cliente_id"
                            value={newVentaData.Cliente_id}
                            onChange={handleNewVentaInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingVentaId !== null || clientes.length === 0}
                        >
                            <option value="">Seleccione Cliente</option>
                            {clientes.map(cliente => (
                                <option key={cliente.id} value={cliente.id}>{cliente.Empresa}</option>
                            ))}
                        </select>
                         {clientes.length === 0 && loading && <p>Cargando clientes...</p>}
                         {clientes.length === 0 && !loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay clientes disponibles. Agregue clientes primero.</p>} {/* Dark theme warning color */}
                    </div>
                     {/* Cuit (Derived) - Display only */}
                    {newVentaData.Cliente_id && clientes.find(c => c.id === parseInt(newVentaData.Cliente_id)) && (
                         <div>
                            <label>Cuit:</label>
                            <p>{clientes.find(c => c.id === parseInt(newVentaData.Cliente_id)).Cuit}</p>
                         </div>
                    )}
                     <div>
                        <label htmlFor="new-estado">Estado:</label>
                        <select
                            id="new-estado"
                            name="Estado"
                            value={newVentaData.Estado}
                            onChange={handleNewVentaInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingVentaId !== null}
                        >
                            <option value="">Seleccione Estado</option>
                            <option value="entregado">Entregado</option>
                            <option value="en maquina">En Máquina</option>
                            <option value="pedido">Pedido</option>
                            <option value="cancelado">Cancelado</option>
                            <option value="listo">Listo</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="new-pago">Pago:</label>
                         <select
                            id="new-pago"
                            name="Pago"
                            value={newVentaData.Pago}
                            onChange={handleNewVentaInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingVentaId !== null}
                        >
                            <option value="">Seleccione Pago</option> {/* Default option */}
                            <option value="abonado">Abonado</option>
                            <option value="seña">Seña</option>
                            <option value="debe">Debe</option>
                        </select>
                    </div>
                     <div>
                        <label htmlFor="new-subtotal">Subtotal:</label>
                        <input type="number" id="new-subtotal" name="Subtotal" value={newVentaData.Subtotal} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                    </div>
                    {/* Removed IVA Select Field */}
             <div>
                <label htmlFor="new-total">Total USD:</label>
                <input type="text" id="new-total" name="Total" value={newVentaData.Total} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
            </div>
             <div>
                 <label htmlFor="new-cotizacion-dolar">Cotización Dólar:</label>
                 <input
                     type="number"
                     id="new-cotizacion-dolar"
                     name="Cotizacion_Dolar"
                     value={newVentaData.Cotizacion_Dolar}
                     onChange={handleNewVentaInputChange}
                     required
                     disabled={savingData || loadingEditData || deletingVentaId !== null}
                     min="0.01"
                     step="0.01"
                 />
             </div>
             <div>
                 <label htmlFor="new-total-ars">Total ARS:</label>
                 <input
                     type="text"
                     id="new-total-ars"
                     name="Total_ARS"
                     value={newVentaData.Total_ARS}
                     readOnly
                     disabled={true}
                     style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                 />
             </div>

                    <VentaItemsEditorX
                         items={newVentaData.items}
                         onItemsChange={handleNewVentaItemsChange}
                         productos={productos} // Asegurado que productos es array
                         savingData={savingData || loadingEditData || deletingVentaId !== null}
                         // Eliminado el clearTrigger
                    />
                    {/* Añadir comprobación de seguridad antes de acceder a length */}
                    {(!Array.isArray(productos) || productos.length === 0) && !loadingEditData && !loading && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems.</p>}


                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                       <button type="submit" disabled={savingData || loadingEditData || deletingVentaId !== null || !Array.isArray(newVentaData.items) || newVentaData.items.length === 0 || newVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(newVentaData.Cotizacion_Dolar)) || parseFloat(newVentaData.Cotizacion_Dolar) <= 0}>Agregar Venta X</button>
                       <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingVentaId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                           Cancelar
                       </button>
                   </div>
               </form>
          </>
      )}

      {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

      {!showAddForm && (
          <>
              <h3>Ventas X Existentes</h3>

               <div style={{ margin: '20px 0' }}>
                   <button
                       onClick={handleEditClick}
                       disabled={selectedVentaId === null || loadingEditData || savingData || deletingVentaId !== null}
                   >
                       Editar Venta X Seleccionada
                   </button>
                   <button
                       onClick={handleDeleteClick}
                       disabled={selectedVentaId === null || loadingEditData || savingData || deletingVentaId !== null}
                       style={{ marginLeft: '10px' }}
                   >
                       Eliminar Venta X Seleccionada
                   </button>
               </div>

              {loading && <p>Cargando ventas X...</p>}
              {loadingEditData && <p>Cargando datos de venta X para editar...</p>}
              {savingData && <p>Guardando cambios de venta X...</p>}
              {deletingVentaId && <p>Eliminando venta X...</p>}

              {!loading && Array.isArray(ventas) && ventas.length > 0 && ( // Añadir comprobación de seguridad para ventas
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Nro VentaX</th>
                      <th>Cliente</th>
                      <th>Cuit</th>
                      <th>Estado</th>
                      <th>Pago</th>
                      <th>Subtotal</th>
                      <th>Total USD</th>
                      <th>Cotización Dólar</th>
                      <th>Total ARS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Añadir comprobación de seguridad antes de mapear */}
                    {Array.isArray(ventas) && ventas.map((venta) => ( // Using 'venta' temporarily for iteration, but it's a VentaX object
                      <React.Fragment key={venta.id}>
                        <tr
                            onClick={() => handleRowClick(venta.id)}
                            style={{ cursor: 'pointer', backgroundColor: selectedVentaId === venta.id ? '#424242' : 'transparent' }}
                        >
                          {/* Format the date here */}
                          <td>{venta.Fecha ? format(new Date(venta.Fecha), 'dd/MM/yy') : 'N/A'}</td>
                          <td>{venta.Nro_VentaX}</td>
                          <td>{venta.Nombre_Cliente}</td>
                          <td>{venta.Cuit_Cliente}</td>

                          <td style={{ backgroundColor: getEstadoColor(venta.Estado), color: '#212121', fontWeight: 'bold' }}>
                              {getEstadoDisplayText(venta.Estado)}
                          </td>

                          <td style={{ backgroundColor: getPagoColor(venta.Pago), color: '#212121', fontWeight: 'bold' }}>
                              {getPagoDisplayText(venta.Pago)}
                           </td>

                          {/* Safely access and format numerical values */}
                          <td>{venta.Subtotal !== null && venta.Subtotal !== undefined && !isNaN(parseFloat(venta.Subtotal)) ? parseFloat(venta.Subtotal).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Total !== null && venta.Total !== undefined && !isNaN(parseFloat(venta.Total)) ? parseFloat(venta.Total).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Cotizacion_Dolar !== null && venta.Cotizacion_Dolar !== undefined && !isNaN(parseFloat(venta.Cotizacion_Dolar)) ? parseFloat(venta.Cotizacion_Dolar).toFixed(2) : 'N/A'}</td>
                          <td>{venta.Total_ARS !== null && venta.Total_ARS !== undefined && !isNaN(parseFloat(venta.Total_ARS)) ? parseFloat(venta.Total_ARS).toFixed(2) : 'N/A'}</td>
                        </tr>
                        {editingVentaId === venta.id && !showAddForm && (
                            <tr>
                                {/* Update colSpan to match the new number of columns (10 data columns) */}
                                <td colSpan="10">
                                    <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                        <h4>Editar Venta X (ID: {venta.id})</h4>
                                        <form onSubmit={handleSaveEdit}> {/* Added onSubmit for form */}
                                             <div>
                                                <label htmlFor={`edit-fecha-${venta.id}`}>Fecha:</label>
                                                 {/* The date input type expectsYYYY-MM-DD format, so we format the fetched date for the input */}
                                                <input type="date" id={`edit-fecha-${venta.id}`} name="Fecha" value={editedVentaData.Fecha || ''} onChange={handleEditFormChange} disabled={savingData} />
                                            </div>
                                            {/* Display Nro VentaX as read-only */}
                                            <div>
                                                <label htmlFor={`edit-nro-ventax-${venta.id}`}>Nro VentaX:</label>
                                                <input type="text" id={`edit-nro-ventax-${venta.id}`} name="Nro_VentaX" value={editedVentaData.Nro_VentaX || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-cliente-${venta.id}`}>Cliente:</label>
                                                <select
                                                    id={`edit-cliente-${venta.id}`}
                                                    name="Cliente_id"
                                                    value={editedVentaData.Cliente_id || ''}
                                                    onChange={handleEditFormChange}
                                                    required
                                                     disabled={savingData || clientes.length === 0}
                                                >
                                                    <option value="">Seleccione Cliente</option>
                                                    {clientes.map(cliente => (
                                                        <option key={cliente.id} value={cliente.id}>{cliente.Empresa}</option>
                                                    ))}
                                                </select>
                                                {clientes.length === 0 && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando clientes...</p>}
                                                {editedVentaData.Cliente_id && clientes.find(c => c.id === parseInt(editedVentaData.Cliente_id)) && (
                                                     <div style={{marginTop: '5px', fontSize: '14px', color: '#bdbdbd'}}>
                                                        Cuit: {clientes.find(c => c.id === parseInt(editedVentaData.Cliente_id)).Cuit}
                                                     </div>
                                                )}
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-estado-${venta.id}`}>Estado:</label>
                                                 <select
                                                    id={`edit-estado-${venta.id}`}
                                                    name="Estado"
                                                    value={editedVentaData.Estado || ''}
                                                    onChange={handleEditFormChange}
                                                     disabled={savingData}
                                                >
                                                    <option value="">Seleccione Estado</option>
                                                    <option value="entregado">Entregado</option>
                                                    <option value="en maquina">En Máquina</option>
                                                    <option value="pedido">Pedido</option>
                                                    <option value="cancelado">Cancelado</option>
                                                    <option value="listo">Listo</option>
                                                </select>
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-pago-${venta.id}`}>Pago:</label>
                                                 <select
                                                    id={`edit-pago-${venta.id}`}
                                                    name="Pago"
                                                    value={editedVentaData.Pago || ''}
                                                    onChange={handleEditFormChange}
                                                     disabled={savingData}
                                                >
                                                    <option value="">Seleccione Pago</option>
                                                    <option value="abonado">Abonado</option>
                                                    <option value="seña">Seña</option>
                                                    <option value="debe">Debe</option>
                                                </select>
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-subtotal-${venta.id}`}>Subtotal:</label>
                                                <input type="number" id={`edit-subtotal-${venta.id}`} name="Subtotal" value={editedVentaData.Subtotal || ''} onChange={handleEditFormChange} disabled={savingData} step="0.01"/>
                                            </div>
                                             {/* Removed IVA Select Field */}
                                             <div>
                                                <label htmlFor={`edit-total-${venta.id}`}>Total USD:</label>
                                                <input type="text" id={`edit-total-${venta.id}`} name="Total" value={editedVentaData.Total || ''} readOnly disabled={true} style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} />
                                            </div>
                                             <div>
                                                 <label htmlFor={`edit-cotizacion-dolar-${venta.id}`}>Cotización Dólar:</label>
                                                 <input
                                                     type="number"
                                                     id={`edit-cotizacion-dolar-${venta.id}`}
                                                     name="Cotizacion_Dolar"
                                                     value={editedVentaData.Cotizacion_Dolar || ''}
                                                     onChange={handleEditFormChange}
                                                     required
                                                     disabled={savingData}
                                                     min="0.01"
                                                     step="0.01"
                                                 />
                                             </div>
                                             <div>
                                                 <label htmlFor={`edit-total-ars-${venta.id}`}>Total ARS:</label>
                                                 <input
                                                     type="text"
                                                     id={`edit-total-ars-${venta.id}`}
                                                     name="Total_ARS"
                                                     value={editedVentaData.Total_ARS || ''}
                                                     readOnly
                                                     disabled={true}
                                                     style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                                 />
                                             </div>

                                            {/* VentaItemsEditorX para EDITAR */}
                                             <VentaItemsEditorX
                                                  items={editedVentaData.items} // Asegurado que items es array
                                                  onItemsChange={handleEditedVentaItemsChange}
                                                  productos={productos} // Asegurado que productos es array
                                                  savingData={savingData || clientes.length === 0 || productos.length === 0}
                                                  // Eliminado el clearTrigger
                                             />
                                              {/* Añadir comprobación de seguridad antes de acceder a length */}
                                              {(!Array.isArray(productos) || productos.length === 0) && loadingEditData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles para los ítems.</p>}
                                               {/* Añadir comprobación de seguridad antes de acceder a length */}
                                               {(!Array.isArray(productos) || productos.length === 0) && !loadingEditData && !loading && !savingData && editingVentaId !== null && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Agregue productos primero.</p>}


                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                                 {/* Botón Guardar Cambios */}
                                                 <button type="submit" disabled={savingData || !editedVentaData.Cliente_id || editedVentaData.Cotizacion_Dolar === '' || isNaN(parseFloat(editedVentaData.Cotizacion_Dolar)) || parseFloat(editedVentaData.Cotizacion_Dolar) <= 0 || !Array.isArray(editedVentaData.items) || editedVentaData.items.length === 0}> {/* Added validation to submit button */}
                                                     Guardar Cambios
                                                </button>
                                                 <button type="button" onClick={handleCancelEdit} disabled={savingData} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Cancelar Edición</button>
                                            </div>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
              {!loading && Array.isArray(ventas) && ventas.length === 0 && !error && <p>No hay ventas X registradas.</p>} {/* Añadir comprobación de seguridad */}
               {/* Mostrar un mensaje de error si ventas no es un array */}
                {!Array.isArray(ventas) && !loading && <p style={{ color: '#ef9a9a' }}>Error interno: La lista de ventas no es válida.</p>}
          </>
      )}

        {/* Render the Import Presupuesto ModalX */}
        {/* The modal component itself will need to be adapted separately */}
        {showImportModal && (
             <ImportPresupuestoModalX
                 onClose={() => setShowImportModal(false)} // Function to close the modal
                 onImport={handlePresupuestoImported} // Callback to receive imported data
                 existingClientId={newVentaData.Cliente_id} // Pass the selected client ID for filtering
             />
        )}

    </div>
  );
}

export default ListaVentasX;
