// src/components/ListaProductos.js (Modified for Backend API Communication)
import React, { useState, useEffect } from 'react';

// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaProductos() {
  const [productos, setProductos] = useState([]);
  // Removed fetching/state for categories as they are not in the UI
  // Removed fetching/state for latestDolarQuote as it's not needed for the new calculation

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProductoId, setSelectedProductoId] = useState(null); // Selected row ID
  const [editingProductoId, setEditingProductoId] = useState(null); // ID of product being edited

  // editedProductoData state keys match the new DB column names
  const [editedProductoData, setEditedProductoData] = useState({
      id: null,
      codigo: '',
      Descripcion: '', // New column name
      eti_x_rollo: '', // New column name
      costo_x_1000: '', // New column name
      costo_x_rollo: '', // New column name (stored now)
      precio: '', // New column name
      banda: '', // New field
      material: '', // New field
      Buje: '', // New field
  });
  // newProductoData state keys match the new DB column names for sending to backend
  const [newProductoData, setNewProductoData] = useState({
    codigo: '',
    Descripcion: '',
    eti_x_rollo: '',
    costo_x_1000: '',
    costo_x_rollo: '', // Will be calculated before sending
    precio: '',
    banda: '', // New field
    material: '', // New field
    Buje: '', // New field
  });

  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingProductoId, setDeletingProductoId] = useState(null);

   // State to control visibility of the add form
   const [showAddForm, setShowAddForm] = useState(false);

   // --- Helper function: Calculate Costo x rollo ---
   // Defined within the component scope, before it's used in JSX
   const calculateCostoPorRollo = (costoPorMil, etiPorRollo) => {
       // The user's formula is (costo x 1000 dividido / 1000)*eti x rollo
       // This simplifies to costo x 1000 / 1000 * eti x rollo
       // If costoPorMil is the cost *per 1000 units*, then costoPorMil / 1000 is the cost *per unit*.
       // Multiplying by etiPorRollo (units per roll) gives the cost *per roll*.
       // The formula seems to be intended as (costo_x_1000 / 1000) * eti_x_rollo

       if (costoPorMil === null || etiPorRollo === null || costoPorMil === '' || etiPorRollo === '') {
           return 'N/A'; // Cannot calculate if inputs are missing or empty strings
       }

        const costoPorMilFloat = parseFloat(costoPorMil);
        const etiPorRolloFloat = parseFloat(etiPorRollo);

        if (isNaN(costoPorMilFloat) || isNaN(etiPorRolloFloat) || etiPorRolloFloat <= 0) { // Added check for etiPorRolloFloat <= 0
            return 'N/A'; // Cannot calculate if inputs are not valid numbers or eti is zero/negative
        }

        const costoPorRolloCalc = (costoPorMilFloat / 1000) * etiPorRolloFloat;
       return costoPorRolloCalc.toFixed(2); // Format to 2 decimal places
   };


  // Function to fetch products using the new API
  const fetchProductos = async () => { // Make the function async
    setLoading(true);
    setError(null);
    setSelectedProductoId(null);
    setEditingProductoId(null);
    // Reset edited data structure with expected fetched data (new DB column names)
    setEditedProductoData({
        id: null, codigo: '', Descripcion: '', eti_x_rollo: '',
        costo_x_1000: '', costo_x_rollo: '', precio: '',
        banda: '', material: '', Buje: '', // Reset new fields
    });

    try {
        // Call the async API function directly and await its result
        const data = await electronAPI.getProductos(); // New API call
        console.log('Productos cargados:', data);
        setProductos(data); // Data is the direct response from the backend API
    } catch (err) {
        // Handle errors from the API call
        console.error('Error fetching productos:', err);
        // Check if the error has a message property, use a default message otherwise
        setError(err.message || 'Error al cargar los productos.');
        setProductos([]); // Clear the list on error
    } finally {
        setLoading(false); // Always set loading to false when the fetch is complete
    }
    // Removed all IPC listener setup and cleanup for fetching
  };


  // Effect to fetch initial data (products only)
  useEffect(() => {
    // The fetchProductos function is now async and called directly
    fetchProductos();

    // Removed IPC listener setup and cleanup from here, as they are no longer needed for this effect
    // Cleanup for IPC listeners related to this effect are no longer necessary.
    // return () => { electronAPI.removeAllGetProductosListeners(); }; // REMOVED
  }, []); // Empty dependency array means this effect runs once on mount


   // --- Row Selection Logic --- (Keep this)
   const handleRowClick = (productoId) => {
       if (selectedProductoId === productoId) {
           setSelectedProductoId(null);
           setEditingProductoId(null);
            // Reset edited data structure
           setEditedProductoData({
               id: null, codigo: '', Descripcion: '', eti_x_rollo: '',
               costo_x_1000: '', costo_x_rollo: '', precio: '',
               banda: '', material: '', Buje: '', // Reset new fields
           });
       } else {
           setSelectedProductoId(productoId);
           if(editingProductoId !== null && editingProductoId !== productoId) {
                setEditingProductoId(null);
                // Reset edited data structure
                setEditedProductoData({
                    id: null, codigo: '', Descripcion: '', eti_x_rollo: '',
                    costo_x_1000: '', costo_x_rollo: '', precio: '',
                    banda: '', material: '', Buje: '', // Reset new fields
                });
           }
       }
        setError(null); // Clear errors on row selection change
   };


  // --- Add Producto Functionality ---
  const handleNewProductoInputChange = (e) => {
      const { name, value } = e.target;
       // Update state with new column names (for properties that directly match DB names)
       // For UI names that map to different DB names, handle mapping here
       let updatedNewProductoData = { ...newProductoData, [name]: value };

       // Optional: Calculate Costo x rollo for display in the form as user types
       // This calculation uses the values currently in the form state
       const costoPorMil = updatedNewProductoData.costo_x_1000; // Use string value directly
       const etiPorRollo = updatedNewProductoData.eti_x_rollo; // Use string value directly

       // Only calculate if both fields have non-empty values
       if (costoPorMil !== '' && etiPorRollo !== '') {
           const costoPorMilFloat = parseFloat(costoPorMil);
           const etiPorRolloFloat = parseFloat(etiPorRollo);

            if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) { // Added check for > 0
                const costoRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
                 // Update the state with the calculated value (as string for input field)
                updatedNewProductoData.costo_x_rollo = costoRollo.toFixed(2);
            } else {
                 // Clear costo_x_rollo if inputs are invalid or eti is zero/negative
                 updatedNewProductoData.costo_x_rollo = '';
            }
       } else {
            // Clear costo_x_rollo if either input is empty
             updatedNewProductoData.costo_x_rollo = '';
       }

        setNewProductoData(updatedNewProductoData);
  };

  const handleAddProductoSubmit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation
      if (!newProductoData.codigo || !newProductoData.Descripcion) {
           setError('Código y Descripción son campos obligatorios.');
           setSavingData(false);
           return;
      }
       // Validate numerical fields if they are not empty
       if (newProductoData.eti_x_rollo !== '' && isNaN(parseFloat(newProductoData.eti_x_rollo))) {
           setError('Eti x rollo debe ser un número válido.');
           setSavingData(false);
           return;
       }
        if (newProductoData.costo_x_1000 !== '' && isNaN(parseFloat(newProductoData.costo_x_1000))) {
           setError('Costo x 1.000 debe ser un número válido.');
           setSavingData(false);
           return;
       }
        if (newProductoData.precio !== '' && isNaN(parseFloat(newProductoData.precio))) {
           setError('Precio debe ser un número válido.');
           setSavingData(false);
           return;
       }
        // Validate eti_x_rollo is positive if provided
        if (newProductoData.eti_x_rollo !== '' && parseFloat(newProductoData.eti_x_rollo) <= 0) {
             setError('Eti x rollo debe ser un número positivo.');
             setSavingData(false);
             return;
        }


       // Calculate costo_x_rollo one last time before sending, based on final input values
       // Ensure values are parsed as floats for calculation
       const costoPorMilFloat = parseFloat(newProductoData.costo_x_1000);
       const etiPorRolloFloat = parseFloat(newProductoData.eti_x_rollo);
       let calculatedCostoXRollo = null;
        if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) {
            calculatedCostoXRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
        }


      // Prepare data to send to backend - keys match DB column names
      // Ensure numerical fields are numbers or null, not empty strings
      const dataToSend = {
          codigo: newProductoData.codigo,
          Descripcion: newProductoData.Descripcion,
          eti_x_rollo: newProductoData.eti_x_rollo !== '' ? parseFloat(newProductoData.eti_x_rollo) : null,
          costo_x_1000: newProductoData.costo_x_1000 !== '' ? parseFloat(newProductoData.costo_x_1000) : null,
          costo_x_rollo: calculatedCostoXRollo, // Send the calculated float value or null
          precio: newProductoData.precio !== '' ? parseFloat(newProductoData.precio) : null,
          banda: newProductoData.banda || null, // Include new fields
          material: newProductoData.material || null,
          Buje: newProductoData.Buje || null,
      };

      try {
           // Call the async API function for adding
          const response = await electronAPI.addProducto(dataToSend); // New API call
           console.log('Producto added successfully:', response.success);
           // Handle success response (e.g., { success: { id: newId } })

           // Clear form using new column names
          setNewProductoData({
              codigo: '', Descripcion: '', eti_x_rollo: '',
              costo_x_1000: '', costo_x_rollo: '', precio: '',
              banda: '', material: '', Buje: '', // Clear new fields
          });
          setShowAddForm(false); // Hide the add form after successful submission
          fetchProductos(); // Refresh the list

      } catch (err) {
          // Handle errors (e.g., duplicate codigo)
          console.error('Error adding producto:', err);
           // The backend returns { error: "message" } on failure, access err.message
          setError(err.message || 'Error al agregar el producto.');
      } finally {
          setSavingData(false); // Reset saving state
      }
      // Removed IPC listener setup and cleanup for adding
  };


  // --- Edit Functionality ---

  // Handle click on Edit button (now uses selectedProductoId)
  const handleEditClick = async () => { // Make the function async
       if (selectedProductoId === null) return;

       setEditingProductoId(selectedProductoId);
       setLoadingEditData(true);
       setError(null);

       try {
           // Call the async API function to get product data by ID
          const data = await electronAPI.getProductoById(selectedProductoId); // New API call
           console.log(`Producto ID ${selectedProductoId} data loaded:`, data);
           // Populate editedProductoData using new DB column names from fetched data
           // Ensure numerical values from DB (which might be numbers or null) are converted to strings for input fields
          setEditedProductoData({
              id: data.id, // Keep the ID for update
              codigo: data.codigo || '',
              Descripcion: data.Descripcion || '',
              eti_x_rollo: data.eti_x_rollo !== null ? String(data.eti_x_rollo) : '',
              costo_x_1000: data.costo_x_1000 !== null ? String(data.costo_x_1000) : '',
              costo_x_rollo: data.costo_x_rollo !== null ? String(data.costo_x_rollo) : '', // Populate stored value
              precio: data.precio !== null ? String(data.precio) : '',
              banda: data.banda || '', // Populate new fields
              material: data.material || '',
              Buje: data.Buje || '',
          });
      } catch (err) {
          // Handle errors
          console.error(`Error fetching producto by ID ${selectedProductoId}:`, err);
          setError(err.message || `Error al cargar los datos del producto.`);
          setEditingProductoId(null);
          setSelectedProductoId(null);
           // Reset edited data structure
          setEditedProductoData({
              id: null, codigo: '', Descripcion: '', eti_x_rollo: '',
              costo_x_1000: '', costo_x_rollo: '', precio: '',
              banda: '', material: '', Buje: '', // Reset new fields
          });
      } finally {
          setLoadingEditData(false);
      }
      // Removed IPC listener setup and cleanup for fetching data for edit
   };


  // Handle changes in the edit form (uses editedProductoData state with new DB column names)
  const handleEditFormChange = (e) => {
      const { name, value } = e.target;
       let updatedEditedData = { ...editedProductoData, [name]: value }; // Use a temporary variable

        // Optional: Recalculate Costo x rollo for display/storage on edit form input change
        if (name === 'costo_x_1000' || name === 'eti_x_rollo') {
            // Use the *updated* values for calculation from the temporary variable
            const costoPorMil = updatedEditedData.costo_x_1000; // Use string value directly
            const etiPorRollo = updatedEditedData.eti_x_rollo; // Use string value directly

            // Only calculate if both fields have non-empty values
            if (costoPorMil !== '' && etiPorRollo !== '') {
                const costoPorMilFloat = parseFloat(costoPorMil);
                const etiPorRolloFloat = parseFloat(etiPorRollo);

                 if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) { // Added check for > 0
                     const costoRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
                     // Update the temporary state with the calculated value (as string for input field)
                     updatedEditedData.costo_x_rollo = costoRollo.toFixed(2);
                 } else {
                      // Clear costo_x_rollo if inputs are invalid or eti is zero/negative
                      updatedEditedData.costo_rollo = ''; // Corrected state key
                 }
            } else {
                 // Clear costo_x_rollo if either input is empty
                  updatedEditedData.costo_x_rollo = '';
            }
        }

        setEditedProductoData(updatedEditedData); // Update the state with the temporary variable
  };


  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation
      if (!editedProductoData.codigo || !editedProductoData.Descripcion) {
           setError('Código y Descripción son campos obligatorios.');
           setSavingData(false);
           return;
      }
       if (editedProductoData.eti_x_rollo !== '' && isNaN(parseFloat(editedProductoData.eti_x_rollo))) {
           setError('Eti x rollo debe ser un número válido.');
           setSavingData(false);
           return;
       }
        if (editedProductoData.costo_x_1000 !== '' && isNaN(parseFloat(editedProductoData.costo_x_1000))) {
           setError('Costo x 1.000 debe ser un número válido.');
           setSavingData(false);
           return;
       }
        if (editedProductoData.precio !== '' && isNaN(parseFloat(editedProductoData.precio))) {
           setError('Precio debe ser un número válido.');
           setSavingData(false);
           return;
       }
        // Validate eti_x_rollo is positive if provided
        if (editedProductoData.eti_x_rollo !== '' && parseFloat(editedProductoData.eti_x_rollo) <= 0) {
             setError('Eti x rollo debe ser un número positivo.');
             setSavingData(false);
             return;
        }


       // Calculate costo_x_rollo one last time before sending, based on final input values
       // Ensure values are parsed as floats for calculation
       const costoPorMilFloat = parseFloat(editedProductoData.costo_x_1000);
       const etiPorRolloFloat = parseFloat(editedProductoData.eti_x_rollo);
       let calculatedCostoXRollo = null;
       if (!isNaN(costoPorMilFloat) && !isNaN(etiPorRolloFloat) && etiPorRolloFloat > 0) {
           calculatedCostoXRollo = (costoPorMilFloat / 1000) * etiPorRolloFloat;
       }


      // Prepare data to send to backend - keys match DB column names, includes calculated costo_x_rollo
      // Ensure numerical fields are numbers or null, not empty strings
      const dataToSend = {
           id: editedProductoData.id,
           codigo: editedProductoData.codigo,
           Descripcion: editedProductoData.Descripcion,
           eti_x_rollo: editedProductoData.eti_x_rollo !== '' ? parseFloat(editedProductoData.eti_x_rollo) : null,
           costo_x_1000: editedProductoData.costo_x_1000 !== '' ? parseFloat(editedProductoData.costo_x_1000) : null,
           costo_x_rollo: calculatedCostoXRollo, // Send the calculated float value or null
           precio: editedProductoData.precio !== '' ? parseFloat(editedProductoData.precio) : null,
           banda: editedProductoData.banda || null, // Include new fields
           material: editedProductoData.material || null,
           Buje: editedProductoData.Buje || null,
      };

      try {
           // Call the async API function for updating
           // The backend expects the ID in the URL and data in the body
          const response = await electronAPI.updateProducto(editedProductoData.id, dataToSend); // New API call
           console.log('Producto updated successfully:', response.success);
           // Handle success response (e.g., { success: { id: ..., changes: ... } })

          setEditingProductoId(null);
           // Reset edited data structure
          setEditedProductoData({
              id: null, codigo: '', Descripcion: '', eti_x_rollo: '',
              costo_x_1000: '', costo_x_rollo: '', precio: '',
              banda: '', material: '', Buje: '', // Reset new fields
          });
          setSelectedProductoId(null); // Deselect after saving
          fetchProductos(); // Refresh the list

      } catch (err) {
          // Handle errors (e.g., duplicate codigo)
           console.error('Error updating producto:', err);
          setError(err.message || `Error al actualizar el producto.`);
      } finally {
          setSavingData(false); // Reset saving state
      }
      // Removed IPC listener setup and cleanup for updating
  };

  const handleCancelEdit = () => {
      setEditingProductoId(null);
      // Reset edited data structure
      setEditedProductoData({
          id: null, codigo: '', Descripcion: '', eti_x_rollo: '',
          costo_x_1000: '', costo_x_rollo: '', precio: '',
          banda: '', material: '', Buje: '', // Reset new fields
      });
      setError(null);
  };


  // --- Delete Functionality ---

  // Handle click on Delete button (now uses selectedProductoId)
  const handleDeleteClick = async () => { // Make the function async
       if (selectedProductoId === null) return;

      if (window.confirm(`¿Está seguro de eliminar el producto con ID ${selectedProductoId}? Si el producto tiene entradas de stock asociadas, no se podrá eliminar.`)) { // Updated confirmation message
          setDeletingProductoId(selectedProductoId);
          setError(null);

          try {
              // Call the async API function for deleting
              const response = await electronAPI.deleteProducto(selectedProductoId); // New API call
               console.log(`Producto with ID ${selectedProductoId} deleted successfully.`, response.success);
               // Handle success response (e.g., { success: { id: ..., changes: ... } })

              setSelectedProductoId(null); // Deselect after deleting
              fetchProductos(); // Refresh the list

          } catch (err) {
              // Handle errors (e.g., foreign key constraint violation)
               console.error(`Error deleting producto with ID ${selectedProductoId}:`, err);
               setError(err.message || `Error al eliminar el producto.`);
          } finally {
              setDeletingProductoId(null); // Reset deleting state
          }
      }
      // Removed IPC listener setup and cleanup for deleting
   };

    // Handle click on "Nuevo Producto" button (Keep this)
    const handleNewProductoClick = () => {
        setShowAddForm(true);
        setError(null); // Clear any previous errors
         // Ensure newProductoData state is reset when opening the form
         setNewProductoData({
             codigo: '', Descripcion: '', eti_x_rollo: '',
             costo_x_1000: '', costo_x_rollo: '', precio: '',
             banda: '', material: '', Buje: '', // Reset new fields
         });
        setSelectedProductoId(null); // Deselect any product
        setEditingProductoId(null); // Close any open edit form
    };

    // Handle click on "Cancelar" button in the add form (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
         // Optional: Reset newProductoData state here too, or rely on handleNewProductoClick
    };


  return (
    <div className="container">
      <h2>Gestión de Productos</h2>

      {/* Button to show the add form */}
      {!showAddForm && (
           <button onClick={handleNewProductoClick} disabled={loading || loadingEditData || savingData || deletingProductoId !== null}>
               Nuevo Producto
           </button>
      )}

      {/* Form to Add New Producto (Conditional Rendering) */}
      {showAddForm && (
          <>
              <h3>Agregar Nuevo Producto</h3>
              {/* Use new column names in the form for adding, map UI labels */}
              <form onSubmit={handleAddProductoSubmit}>
                <div>
                  <label htmlFor="new-codigo">Código:</label>
                  <input type="text" id="new-codigo" name="codigo" value={newProductoData.codigo} onChange={handleNewProductoInputChange} required disabled={savingData || loadingEditData || deletingProductoId !== null} />
                </div>
                <div>
                  <label htmlFor="new-descripcion">Descripción:</label>
                  <input type="text" id="new-descripcion" name="Descripcion" value={newProductoData.Descripcion} onChange={handleNewProductoInputChange} required disabled={savingData || loadingEditData || deletingProductoId !== null} />
                </div>
                <div>
                  <label htmlFor="new-eti-rollo">Eti x rollo:</label>
                  <input type="number" id="new-eti-rollo" name="eti_x_rollo" value={newProductoData.eti_x_rollo} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} min="0" step="any" /> {/* Allow any step for decimals */}
                </div>
                <div>
                  <label htmlFor="new-costo-1000">Costo x 1.000:</label>
                  <input type="number" id="new-costo-1000" name="costo_x_1000" value={newProductoData.costo_x_1000} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} min="0" step="0.01" />
                </div>
                 {/* Display calculated costo x rollo in the add form */}
                 <div>
                     <label>Costo x rollo:</label>
                     <input
                         type="text"
                         value={calculateCostoPorRollo(newProductoData.costo_x_1000, newProductoData.eti_x_rollo)} /* Calculate and display */
                         readOnly
                         disabled={true} /* Always disabled as it's calculated */
                         style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} // Dark theme styles for readOnly input
                     />
                 </div>
                 <div>
                  <label htmlFor="new-precio">Precio:</label>
                  <input type="number" id="new-precio" name="precio" value={newProductoData.precio} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} min="0" step="0.01" />
                </div>
                 {/* New fields in the add form */}
                 <div>
                     <label htmlFor="new-banda">Banda:</label>
                     <input type="text" id="new-banda" name="banda" value={newProductoData.banda} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} />
                 </div>
                 <div>
                     <label htmlFor="new-material">Material:</label>
                     <input type="text" id="new-material" name="material" value={newProductoData.material} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} />
                 </div>
                 <div>
                     <label htmlFor="new-buje">Buje:</label>
                     <input type="text" id="new-buje" name="Buje" value={newProductoData.Buje} onChange={handleNewProductoInputChange} disabled={savingData || loadingEditData || deletingProductoId !== null} />
                 </div>


                {/* Button container for form actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                   <button type="submit" disabled={savingData || loadingEditData || deletingProductoId !== null}>Agregar Producto</button>
                    {/* Cancel button for the add form */}
                   <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingProductoId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                       Cancelar
                   </button>
                </div>
              </form>
          </>
      )}


       {/* Display errors if any */}
      {error && <p style={{ color: '#ef9a9a' }}>{error}</p>} {/* Use dark theme error color */}

      {/* Display Producto List (Conditional Rendering) */}
      {!showAddForm && (
          <>
              <h3>Productos Existentes</h3>

               {/* Edit and Delete Buttons */}
               <div style={{ margin: '20px 0' }}>
                   <button
                       onClick={handleEditClick}
                       disabled={selectedProductoId === null || editingProductoId !== null || loadingEditData || savingData || deletingProductoId !== null}
                   >
                       Editar Producto Seleccionado
                   </button>
                   <button
                       onClick={handleDeleteClick}
                       disabled={selectedProductoId === null || editingProductoId !== null || loadingEditData || savingData || deletingProductoId !== null}
                       style={{ marginLeft: '10px' }} // This inline style is targeted by CSS for danger color
                   >
                   Eliminar Producto Seleccionado
                   </button>
               </div>


              {loading && <p>Cargando productos...</p>}
              {loadingEditData && <p>Cargando datos de producto para editar...</p>}
              {savingData && <p>Guardando datos...</p>}
              {deletingProductoId && <p>Eliminando producto...</p>}


              {!loading && productos.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Eti x Rollo</th>
                      <th>Costo x 1.000</th>
                      <th>Costo x Rollo</th> {/* Display the stored value */}
                      <th>Precio</th>
                      <th>Banda</th> {/* New table header */}
                      <th>Material</th> {/* New table header */}
                      <th>Buje</th> {/* New table header */}
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((producto) => (
                      <React.Fragment key={producto.id}>
                        <tr
                            onClick={() => handleRowClick(producto.id)}
                            style={{ cursor: 'pointer', backgroundColor: selectedProductoId === producto.id ? '#424242' : 'transparent' }} // Use dark theme selected color
                        >
                          <td>{producto.id}</td>
                          <td>{producto.codigo}</td>
                          <td>{producto.Descripcion}</td>
                          <td>{producto.eti_x_rollo}</td>
                          <td>{producto.costo_x_1000}</td>
                          <td>{producto.costo_x_rollo}</td> {/* Display the stored value */}
                          <td>{producto.precio}</td>
                          <td>{producto.banda}</td> {/* Display new fields */}
                          <td>{producto.material}</td>
                          <td>{producto.Buje}</td>
                        </tr>
                        {/* Inline Edit Form Row - Conditionally rendered and only if not adding */}
                        {editingProductoId === producto.id && !showAddForm && (
                            <tr>
                                 <td colSpan="10"> {/* Adjusted colSpan to 10 (7 old + 3 new) */}
                                    <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}> {/* Dark theme styles */}
                                        <h4>Editar Producto (ID: {producto.id})</h4>
                                        {/* Edit form uses new DB column names as keys */}
                                        <form onSubmit={handleSaveEdit}> {/* Added onSubmit for form */}
                                             <div>
                                                <label htmlFor={`edit-codigo-${producto.id}`}>Código:</label>
                                                <input type="text" id={`edit-codigo-${producto.id}`} name="codigo" value={editedProductoData.codigo || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                            </div>
                                            <div>
                                                <label htmlFor={`edit-descripcion-${producto.id}`}>Descripción:</label>
                                                <input type="text" id={`edit-descripcion-${producto.id}`} name="Descripcion" value={editedProductoData.Descripcion || ''} onChange={handleEditFormChange} required disabled={savingData} />
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-eti-rollo-${producto.id}`}>Eti x Rollo:</label>
                                                <input type="number" id={`edit-eti-rollo-${producto.id}`} name="eti_x_rollo" value={editedProductoData.eti_x_rollo || ''} onChange={handleEditFormChange} disabled={savingData} min="0" step="any" />
                                            </div>
                                             <div>
                                                <label htmlFor={`edit-costo-1000-${producto.id}`}>Costo x 1.000:</label>
                                                <input type="number" id={`edit-costo-1000-${producto.id}`} name="costo_x_1000" value={editedProductoData.costo_x_1000 || ''} onChange={handleEditFormChange} disabled={savingData} min="0" step="0.01" />
                                            </div>
                                             {/* Display calculated costo x rollo in the edit form */}
                                             <div>
                                                 <label>Costo x rollo:</label>
                                                 <input
                                                     type="text"
                                                     value={calculateCostoPorRollo(editedProductoData.costo_x_1000, editedProductoData.eti_x_rollo)} /* Calculate and display */
                                                     readOnly
                                                     disabled={true}
                                                     style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }} // Dark theme styles for readOnly input
                                                 />
                                             </div>
                                             <div>
                                                <label htmlFor={`edit-precio-${producto.id}`}>Precio:</label>
                                                <input type="number" id={`edit-precio-${producto.id}`} name="precio" value={editedProductoData.precio || ''} onChange={handleEditFormChange} disabled={savingData} min="0" step="0.01" />
                                            </div>
                                            {/* New fields in the edit form */}
                                             <div>
                                                 <label htmlFor={`edit-banda-${producto.id}`}>Banda:</label>
                                                 <input type="text" id={`edit-banda-${producto.id}`} name="banda" value={editedProductoData.banda || ''} onChange={handleEditFormChange} disabled={savingData} />
                                             </div>
                                             <div>
                                                 <label htmlFor={`edit-material-${producto.id}`}>Material:</label>
                                                 <input type="text" id={`edit-material-${producto.id}`} name="material" value={editedProductoData.material || ''} onChange={handleEditFormChange} disabled={savingData} />
                                             </div>
                                             <div>
                                                 <label htmlFor={`edit-buje-${producto.id}`}>Buje:</label>
                                                 <input type="text" id={`edit-buje-${producto.id}`} name="Buje" value={editedProductoData.Buje || ''} onChange={handleEditFormChange} disabled={savingData} />
                                             </div>


                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}> {/* Added flex for buttons */}
                                                 <button type="submit" disabled={savingData}>Guardar Cambios</button> {/* Changed to type="submit" */}
                                                  {/* Cancel edit button */}
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
              {!loading && productos.length === 0 && !error && <p>No hay productos registrados.</p>}
          </>
      )}
    </div>
  );
}

export default ListaProductos;