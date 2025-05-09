// src/components/ListaStock.js (Modified for Backend API Communication)
import React, { useState, useEffect } from 'react';

// Acceder a la API expuesta globalmente (ahora usa fetch/async)
const electronAPI = window.electronAPI;

function ListaStock() {
  const [stockItems, setStockItems] = useState([]);
  const [productos, setProductos] = useState([]); // To populate product dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStockId, setSelectedStockId] = useState(null);
  const [editingStockId, setEditingStockId] = useState(null);

  const [newStockData, setNewStockData] = useState({
      Producto_id: '', // Will be selected from dropdown
      Cantidad: '',
  });

  const [editedStockData, setEditedStockData] = useState({
      id: null,
      Cantidad: '', // Only quantity is editable directly in this form
  });
  // Store the product details for the item being edited/selected for display
  const [selectedStockProductDetails, setSelectedStockProductDetails] = useState(null);


  const [loadingEditData, setLoadingEditData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [deletingStockId, setDeletingStockId] = useState(null);

  // State to control visibility of the add form
  const [showAddForm, setShowAddForm] = useState(false);


  // Function to fetch stock items using the new API
  const fetchStock = async () => { // Make the function async
    setLoading(true);
    setError(null);
    setSelectedStockId(null);
    setEditingStockId(null);
    setSelectedStockProductDetails(null); // Clear product details on refetch
    setEditedStockData({ id: null, Cantidad: '' });

    try {
        // Call the async API function and await its result
        const data = await electronAPI.getStock(); // New API call (GET /stock)
        console.log('Stock loaded:', data);
        setStockItems(data); // Data is the direct response from the backend API

    } catch (err) {
        // Handle errors from the API call
        console.error('Error fetching stock:', err);
        setError(err.message || 'Error al cargar el stock.');
        setStockItems([]); // Clear the list on error
         setSelectedStockId(null); // Clear selection on error
    } finally {
        setLoading(false); // Always set loading to false
    }
    // Removed all IPC listener setup and cleanup for fetching stock
  };

   // Function to fetch products (for the dropdown) using the new API
   const fetchProducts = async () => { // Make the function async
       try {
           const data = await electronAPI.getProductos(); // New API call (GET /productos)
           console.log('Products loaded for stock dropdown:', data);
           setProductos(data); // Store products for the dropdown
       } catch (err) {
            console.error('Error fetching products for stock dropdown:', err);
            // Decide how to handle this error. Could set a specific product error state
            // setProductError(err.message || 'Error al cargar productos para el dropdown.');
       }
       // No loading state controlled here, as main loading is for stock items
       // No finally block for loading status for products fetch
       // Removed IPC listener setup and cleanup for products fetch
   };


  // Effect to fetch initial data (stock and products)
  useEffect(() => {
    // Call the async fetch functions directly
    fetchStock();
    fetchProducts(); // Fetch products for the dropdown

    // Removed IPC listener setup and cleanup from here
    // return () => { ... }; // REMOVED
  }, []); // Empty dependency array means this effect runs once on mount


   // --- Row Selection Logic --- (Keep this)
   const handleRowClick = (stockItem) => {
       // stockItem will be the row object, including product details
       if (selectedStockId === stockItem.id) {
           setSelectedStockId(null);
           setEditingStockId(null);
           setSelectedStockProductDetails(null);
           setEditedStockData({ id: null, Cantidad: '' });
       } else {
           setSelectedStockId(stockItem.id);
           // Store product details of selected item for potential edit/display
           setSelectedStockProductDetails(stockItem);
           if(editingStockId !== null && editingStockId !== stockItem.id) {
                setEditingStockId(null);
                setEditedStockData({ id: null, Cantidad: '' });
           }
       }
       setError(null);
   };


  // --- Add Stock Functionality ---
  const handleNewStockInputChange = (e) => { // Keep this
       const { name, value } = e.target;
       setNewStockData({ ...newStockData, [name]: value });
  };

  // Handle form submission (Add/Update stock quantity for a product)
  const handleAddStockSubmit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation
      if (!newStockData.Producto_id || newStockData.Cantidad === '' || isNaN(parseFloat(newStockData.Cantidad)) || parseFloat(newStockData.Cantidad) <= 0) {
           setError('Debe seleccionar un Producto e ingresar una Cantidad válida (> 0).');
           setSavingData(false);
           return;
      }

      // Data to send to backend - uses Producto_id and Cantidad
      // This will be sent to POST /api/stock
      const dataToSend = {
          Producto_id: parseInt(newStockData.Producto_id, 10),
          Cantidad: parseFloat(newStockData.Cantidad),
      };

      try {
           // Call the async API function for adding/updating stock
           const response = await electronAPI.addOrUpdateStock(dataToSend); // New API call (POST /stock)
           console.log('Stock added/updated successfully:', response.success);
           // Handle success response (e.g., { success: { id: ..., changes: ... } })

           setNewStockData({ Producto_id: '', Cantidad: '' }); // Clear form
           setShowAddForm(false); // Hide the add form
           fetchStock(); // Refresh the list
           // Optional: Re-fetch products if adding stock might affect product data display elsewhere
           // fetchProducts();

      } catch (err) {
          // Handle errors (e.g., product not found via FK)
          console.error('Error adding stock:', err);
          setError(err.message || `Error al agregar/actualizar el stock.`);
      } finally {
          setSavingData(false);
      }
      // Removed IPC listener setup and cleanup for adding stock
  };


  // --- Edit Functionality ---

  // Handle click on Edit button (uses selectedStockId and selectedStockProductDetails) (Keep this)
  const handleEditClick = () => {
       if (selectedStockId === null || selectedStockProductDetails === null) return;

       setEditingStockId(selectedStockId);
       setLoadingEditData(true);
       setError(null);

       // When editing, we already have the product details from the selected row state
       // We just need the quantity for the edit input
       setEditedStockData({
            id: selectedStockProductDetails.id, // Stock ID
            Cantidad: selectedStockProductDetails.Cantidad !== null ? String(selectedStockProductDetails.Cantidad) : '',
       });

       setLoadingEditData(false); // No backend fetch needed just to populate quantity for edit
       // Removed IPC listener setup and cleanup for fetching data for edit
   };


  // Handle changes in the edit form (only for Cantidad) (Keep this)
  const handleEditFormChange = (e) => {
       const { name, value } = e.target;
       // Ensure only Cantidad can be changed via this handler
       if (name === 'Cantidad') {
           setEditedStockData({ ...editedStockData, [name]: value });
       }
  };


  const handleSaveEdit = async (e) => { // Make the function async
      e.preventDefault();
      setSavingData(true);
      setError(null);

      // Basic validation for edited quantity
      if (!editedStockData.id || editedStockData.Cantidad === '' || isNaN(parseFloat(editedStockData.Cantidad)) || parseFloat(editedStockData.Cantidad) < 0) { // Allow 0 quantity
           setError('Debe ingresar una Cantidad válida (>= 0) para actualizar.');
           setSavingData(false);
           return;
      }

      // Data to send to backend - uses Stock ID and updated Cantidad
      // This will be sent to PUT /api/stock/:id
      const dataToSend = {
          id: editedStockData.id,
          Cantidad: parseFloat(editedStockData.Cantidad),
      };

      try {
           // Call the async API function for updating stock quantity by ID
           const response = await electronAPI.updateStockQuantity(dataToSend.id, { Cantidad: dataToSend.Cantidad }); // New API call (PUT /stock/:id)
           console.log('Stock updated successfully:', response.success);
           // Handle success response (e.g., { success: { id: ..., changes: ... } })

           setEditingStockId(null); // Close edit form
           setEditedStockData({ id: null, Cantidad: '' }); // Clear edit data
           setSelectedStockId(null); // Deselect after saving
           setSelectedStockProductDetails(null); // Clear selected product details
           fetchStock(); // Refresh the list

      } catch (err) {
           console.error('Error updating stock:', err);
           setError(err.message || `Error al actualizar el stock.`);
      } finally {
          setSavingData(false);
      }
      // Removed IPC listener setup and cleanup for updating
  };

  // Handle cancelling edit mode (Keep this)
  const handleCancelEdit = () => {
      setEditingStockId(null);
      setEditedStockData({ id: null, Cantidad: '' });
      setError(null);
       // Keep selected row highlighted, but clear product details shown in edit form
       // setSelectedStockProductDetails(null); // Decide if you want to clear this on cancel edit
  };


  // --- Delete Functionality ---

  // Handle click on Delete button (now uses selectedStockId)
  const handleDeleteClick = async () => { // Make the function async
       if (selectedStockId === null) return;

      if (window.confirm(`¿Está seguro de eliminar la entrada de stock con ID ${selectedStockId} (${selectedStockProductDetails?.codigo})?`)) {
          setDeletingStockId(selectedStockId);
          setError(null);

          try {
              // Call the async API function for deleting a stock entry by ID
              const response = await electronAPI.deleteStock(selectedStockId); // New API call (DELETE /stock/:id)
              console.log(`Stock entry with ID ${selectedStockId} deleted successfully.`, response.success);
               // Handle success response

              setSelectedStockId(null); // Deselect after deleting
              setSelectedStockProductDetails(null);
              fetchStock(); // Refresh the list

          } catch (err) {
               console.error(`Error deleting stock entry with ID ${selectedStockId}:`, err);
               setError(err.message || `Error al eliminar la entrada de stock.`);
          } finally {
              setDeletingStockId(null);
          }
      }
      // Removed IPC listener setup and cleanup for deleting
   };


    // Handle click on "Nuevo Stock" button (Keep this)
    const handleNewStockClick = () => {
        setShowAddForm(true);
        setError(null);
        setNewStockData({ Producto_id: '', Cantidad: '' }); // Reset add form data
        setSelectedStockId(null); // Deselect any stock item
        setEditingStockId(null); // Close any open edit form
        setSelectedStockProductDetails(null); // Clear selected product details
        fetchProducts(); // Re-fetch products just in case for the dropdown
    };

    // Handle click on "Cancelar" button in the add form (Keep this)
    const handleCancelAdd = () => {
        setShowAddForm(false);
        setError(null);
        setNewStockData({ Producto_id: '', Cantidad: '' }); // Reset add form data
    };


  return (
    <div className="container">
      <h2>Gestión de Stock</h2>

       {/* Button to show the add form */}
       {!showAddForm && (
           <button onClick={handleNewStockClick} disabled={loading || loadingEditData || savingData || deletingStockId !== null || productos.length === 0}>
               Nuevo Stock
           </button>
       )}
        {!showAddForm && productos.length === 0 && !loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Agregue productos primero para gestionar stock.</p>}


      {/* Form to Add New Stock (Conditional Rendering) */}
      {showAddForm && (
          <>
              <h3>Agregar Stock</h3>
               <form onSubmit={handleAddStockSubmit}>
                    <div>
                        <label htmlFor="new-producto-id">Producto:</label>
                        {/* Select dropdown for Products */}
                        <select
                            id="new-producto-id"
                            name="Producto_id"
                            value={newStockData.Producto_id}
                            onChange={handleNewStockInputChange}
                            required
                             disabled={savingData || loadingEditData || deletingStockId !== null || productos.length === 0}
                        >
                            <option value="">Seleccione Producto</option>
                            {/* Populate from fetched products */}
                            {productos.map(producto => (
                                <option key={producto.id} value={producto.id}>{producto.codigo} - {producto.Descripcion}</option>
                            ))}
                        </select>
                         {productos.length === 0 && loading && <p>Cargando productos...</p>}
                         {productos.length === 0 && !loading && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Agregue productos primero.</p>}
                    </div>
                     <div>
                        <label htmlFor="new-cantidad">Cantidad:</label>
                        <input type="number" id="new-cantidad" name="Cantidad" value={newStockData.Cantidad} onChange={handleNewStockInputChange} required disabled={savingData || loadingEditData || deletingStockId !== null} min="0" step="any" /> {/* Added step="any" */}
                    </div>

                   {/* Button container for form actions */}
                   <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '20px' }}>
                       <button type="submit" disabled={savingData || loadingEditData || deletingStockId !== null || productos.length === 0}>Agregar Stock</button>
                       {/* Cancel button for the add form */}
                       <button type="button" onClick={handleCancelAdd} disabled={savingData || loadingEditData || deletingStockId !== null} style={{ marginLeft: '10px', backgroundColor: '#616161', color: 'white', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                           Cancelar
                       </button>
                   </div>
               </form>
          </>
      )}


      {error && <p style={{ color: '#ef9a9a' }}>{error}</p>}

      {/* Display Stock List (Conditional Rendering) */}
      {!showAddForm && (
          <>
              <h3>Stock Existente</h3>

               {/* Edit and Delete Buttons */}
               <div style={{ margin: '20px 0' }}>
                   <button
                       onClick={handleEditClick}
                       disabled={selectedStockId === null || editingStockId !== null || loadingEditData || savingData || deletingStockId !== null}
                   >
                       Editar Stock Seleccionado
                   </button>
                   <button
                       onClick={handleDeleteClick}
                       disabled={selectedStockId === null || editingStockId !== null || loadingEditData || savingData || deletingStockId !== null}
                       style={{ marginLeft: '10px' }}
                   >
                       Eliminar Stock Seleccionado
                   </button>
               </div>


              {loading && <p>Cargando stock...</p>}
              {loadingEditData && <p>Cargando datos de stock para editar...</p>}
              {savingData && <p>Guardando cambios de stock...</p>}
              {deletingStockId && <p>Eliminando entrada de stock...</p>}

              {!loading && stockItems.length > 0 && (
                <table>
                  <thead>
                    <tr>
                      <th>ID Stock</th> {/* ID of the stock entry */}
                      <th>Código Prod.</th>
                      <th>Descripción</th>
                      <th>Eti x Rollo</th>
                      <th>Banda</th>   {/* New column */}
                      <th>Material</th> {/* New column */}
                      <th>Buje</th>     {/* New column */}
                      <th>Cantidad</th>     {/* Stock Quantity */}
                    </tr>
                  </thead>
                  <tbody>
                    {stockItems.map((stockItem) => (
                      <React.Fragment key={stockItem.id}>
                        <tr
                            onClick={() => handleRowClick(stockItem)} // Pass the entire item for product details
                            style={{ cursor: 'pointer', backgroundColor: selectedStockId === stockItem.id ? '#424242' : 'transparent' }}
                        >
                          <td>{stockItem.id}</td> {/* Display Stock ID */}
                          <td>{stockItem.codigo}</td>
                          <td>{stockItem.Descripcion}</td>
                          <td>{stockItem.eti_x_rollo}</td>
                          <td>{stockItem.banda}</td>   {/* Display new fields */}
                          <td>{stockItem.material}</td>
                          <td>{stockItem.Buje}</td>
                          <td>{stockItem.Cantidad}</td> {/* Display Stock Quantity */}
                        </tr>
                        {/* Inline Edit Form Row - Only show if THIS stock item is being edited */}
                        {editingStockId === stockItem.id && !showAddForm && (
                            <tr>
                                <td colSpan="8"> {/* Adjust colSpan */}
                                    <div style={{ padding: '10px', border: '1px solid #424242', margin: '10px 0', backgroundColor: '#2c2c2c' }}>
                                        <h4>Editar Stock (ID Stock: {stockItem.id})</h4>
                                        {/* Display product details of the stock item being edited (Read-only) */}
                                         {selectedStockProductDetails && (
                                             <div style={{ marginBottom: '20px', padding: '10px', border: '1px dashed #616161', borderRadius: '4px', backgroundColor: '#1e1e1e' }}>
                                                <p style={{ margin: '5px 0', color: '#bdbdbd', fontSize: '0.9rem' }}>
                                                    Producto: {selectedStockProductDetails.codigo} - {selectedStockProductDetails.Descripcion}
                                                </p>
                                                 {/* Display new fields if they exist */}
                                                 {(selectedStockProductDetails.banda || selectedStockProductDetails.material || selectedStockProductDetails.Buje) && (
                                                      <p style={{ margin: '5px 0', color: '#bdbdbd', fontSize: '0.9rem' }}>
                                                         Detalles: Banda: {selectedStockProductDetails.banda || 'N/A'}, Material: {selectedStockProductDetails.material || 'N/A'}, Buje: {selectedStockProductDetails.Buje || 'N/A'}
                                                     </p>
                                                 )}
                                            </div>
                                         )}

                                        {/* Edit form for Quantity */}
                                        <form onSubmit={handleSaveEdit}> {/* Added onSubmit */}
                                             <div>
                                                <label htmlFor={`edit-cantidad-${stockItem.id}`}>Cantidad:</label>
                                                <input type="number" id={`edit-cantidad-${stockItem.id}`} name="Cantidad" value={editedStockData.Cantidad || ''} onChange={handleEditFormChange} required disabled={savingData} min="0" step="any" /> {/* Added step="any" */}
                                            </div>

                                            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
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
              {!loading && stockItems.length === 0 && !error && <p>No hay stock registrado.</p>}
          </>
      )}
    </div>
  );
}

export default ListaStock;