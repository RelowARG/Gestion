// src/components/ventas/VentaItemsEditor.js
import React, { useState, useEffect } from 'react';

// Componente para gestionar la adición y listado de ítems de venta (productos y personalizados)
function VentaItemsEditor({ items, onItemsChange, productos, savingData }) {
    // items: Array de ítems de la venta actual (recibido del componente padre).
    //        Puede contener objetos de producto (con Producto_id) o personalizados (con Descripcion_Personalizada).
    // onItemsChange: Función callback para notificar al padre cuando los ítems cambian
    // productos: Lista de productos del catálogo (para el selector de ítems de producto y para buscar detalles)
    // savingData: Booleano para deshabilitar inputs mientras se guarda

    // Estado para controlar qué tipo de ítem se está agregando ('product' o 'custom')
    const [itemTypeToAdd, setItemTypeToAdd] = useState('product');

    // Estado para los datos del nuevo ítem de producto a agregar
    const [newItemProductoData, setNewItemProductoData] = useState({
        Producto_id: '',
        Cantidad: '', // Cantidad para productos
        Precio_Unitario_Venta: '', // Precio de venta unitario para productos
    });

    // Estado para los datos del nuevo ítem personalizado a agregar
    const [newItemCustomData, setNewItemCustomData] = useState({
        Descripcion_Personalizada: '',
        Cantidad_Personalizada: '', // Cantidad para ítems personalizados
        Precio_Unitario_Personalizado: '', // Precio unitario para ítems personalizados
    });


    // Estado para manejar errores específicos de la sección de ítems
    const [itemError, setItemError] = useState(null);


    // --- Handlers para el Selector de Tipo de Ítem ---
    const handleItemTypeChange = (e) => {
        setItemTypeToAdd(e.target.value);
        // Limpiar los formularios al cambiar de tipo
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '' });
        setNewItemCustomData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizado: '' });
        setItemError(null); // Limpiar errores
    };


    // --- Handlers para Ítems de Producto de Venta ---

    // Maneja cambios en los campos del formulario para agregar nuevo ítem de producto
    const handleNewItemProductoChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

        if (['Cantidad', 'Precio_Unitario_Venta'].includes(name)) {
             updatedValue = value !== '' ? parseFloat(value) : '';
        }

        setNewItemProductoData(prevState => ({ ...prevState, [name]: updatedValue }));
    };

    // Cuando se selecciona un producto del dropdown, cargar su precio de venta por defecto
    const handleProductoSelectChange = (e) => {
        const productoId = e.target.value;
        const selectedProducto = productos.find(p => p.id === parseInt(productoId));

        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: productoId,
            // Cargar precio de venta del producto si existe, si no, dejar vacío
            Precio_Unitario_Venta: selectedProducto && selectedProducto.precio !== null ? selectedProducto.precio : '',
             Cantidad: '', // Limpiar cantidad anterior al cambiar de producto
        }));
    };


    // --- Handlers para Ítems Personalizados de Venta ---

     // Maneja cambios en los campos del formulario para agregar nuevo ítem personalizado
     const handleNewItemCustomChange = (e) => {
         const { name, value } = e.target;
         let updatedValue = value;

         if (['Cantidad_Personalizada', 'Precio_Unitario_Personalizada'].includes(name)) {
              updatedValue = value !== '' ? parseFloat(value) : '';
         }

         setNewItemCustomData(prevState => ({ ...prevState, [name]: updatedValue }));
     };


    // --- Handler para Agregar Ítem (Común para ambos tipos) ---
    const handleAddItem = () => {
        setItemError(null); // Reset previous errors

        let newItem = null;
        let totalItem = 0;

        if (itemTypeToAdd === 'product') {
            // Validaciones básicas para ítem de producto
            if (!newItemProductoData.Producto_id || newItemProductoData.Cantidad === '' || newItemProductoData.Cantidad <= 0) {
                setItemError('Debe seleccionar un producto e ingresar una cantidad válida (> 0).');
                return;
            }

             // Validación del precio unitario de venta
             if (newItemProductoData.Precio_Unitario_Venta === '' || isNaN(parseFloat(newItemProductoData.Precio_Unitario_Venta)) || parseFloat(newItemProductoData.Precio_Unitario_Venta) < 0) {
                  setItemError('Debe ingresar un precio unitario de venta válido (>= 0) para el producto.');
                  return;
             }

            const selectedProducto = productos.find(p => p.id === parseInt(newItemProductoData.Producto_id));
            if (!selectedProducto) {
                 setItemError('Producto seleccionado no válido.');
                 return;
            }

             // Calcular Total_Item para producto
             const cantidad = parseFloat(newItemProductoData.Cantidad) || 0;
             const precioUnitario = parseFloat(newItemProductoData.Precio_Unitario_Venta) || 0;
             totalItem = (cantidad * precioUnitario); // Calculate raw total

            newItem = {
                type: 'product', // Identificar el tipo de ítem
                Producto_id: parseInt(newItemProductoData.Producto_id),
                Cantidad: cantidad,
                Precio_Unitario_Venta: precioUnitario,
                // No necesitamos incluir codigo/Descripcion aquí; VentaItemsEditor los buscará por ID
            };

             // Agregar el Total_Item calculado (formateado a 2 decimales) al nuevo ítem
            newItem.Total_Item = parseFloat(totalItem.toFixed(2));

             // Resetear el formulario de nuevo ítem de producto
            setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '' });

        } else { // itemTypeToAdd === 'custom'
             // Validaciones básicas para ítem personalizado
             if (!newItemCustomData.Descripcion_Personalizada || newItemCustomData.Cantidad_Personalizada === '' || newItemCustomData.Cantidad_Personalizada <= 0 || newItemCustomData.Precio_Unitario_Personalizada === '' || isNaN(parseFloat(newItemCustomData.Precio_Unitario_Personalizada)) || parseFloat(newItemCustomData.Precio_Unitario_Personalizada) < 0) {
                 setItemError('Debe ingresar una descripción, cantidad (> 0) y precio unitario (>= 0) válidos para el ítem personalizado.');
                 return;
             }

             // Calcular Total_Item para ítem personalizado
             const cantidadPersonalizada = parseFloat(newItemCustomData.Cantidad_Personalizada) || 0;
             const precioUnitarioPersonalizada = parseFloat(newItemCustomData.Precio_Unitario_Personalizada) || 0;
             totalItem = (cantidadPersonalizada * precioUnitarioPersonalizada); // Calculate raw total

             newItem = {
                 type: 'custom', // Identificar el tipo de ítem
                 Descripcion_Personalizada: newItemCustomData.Descripcion_Personalizada,
                 Cantidad_Personalizada: cantidadPersonalizada,
                 Precio_Unitario_Personalizada: precioUnitarioPersonalizada,
             };

             // Agregar el Total_Item calculado (formateado a 2 decimales) al nuevo ítem
             newItem.Total_Item = parseFloat(totalItem.toFixed(2));

             // Resetear el formulario de nuevo ítem personalizado
             setNewItemCustomData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });
        }

        console.log('[VentaItemsEditor] Nuevo item creado:', newItem);
        // Notificar al padre que la lista de ítems ha cambiado
        onItemsChange([...items, newItem]);

        setItemError(null); // Limpiar errores si la adición fue exitosa
    };


    // --- Handlers para la Tabla de Ítems (Eliminar Ítem) ---

    // Elimina un ítem de la lista de ítems
    const handleRemoveItem = (indexToRemove) => {
        const updatedItems = items.filter((_, index) => index !== indexToRemove);
        // Notificar al padre que la lista de ítems ha cambiado
        onItemsChange(updatedItems);
        setItemError(null); // Limpiar errores si la eliminación fue exitosa
    };

    // TODO: Implementar lógica de edición de ítems si es necesario
    // Esto requeriría un estado para el ítem que se está editando en la tabla
    // y un formulario o modal para modificar sus valores. Por ahora, solo se puede eliminar.
    const handleEditItem = (indexToEdit) => {
        console.log("Edit item at index:", indexToEdit);
        // Implementar lógica de edición aquí
        // Esto podría implicar:
        // 1. Copiar el ítem a un estado de edición.
        // 2. Mostrar un modal o formulario pre-llenado con los datos del ítem.
        // 3. Al guardar en el modal/formulario, actualizar el ítem en el array `items`.
        // 4. Notificar al padre con `onItemsChange(updatedItems)`.
        setItemError('La edición de ítems aún no está implementada.'); // Mensaje temporal
    };


    // --- Renderizado ---

    return (
        <>
            {/* Mostrar errores específicos de ítems */}
            {itemError && <p style={{ color: '#ef9a9a' }}>{itemError}</p>}

            {/* --- Sección de Ítems de la Venta (Productos y Personalizados) --- */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Ítems de la Venta</h4>

                {/* Selector de Tipo de Ítem */}
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="item-type-select">Tipo de Ítem a Agregar:</label>
                    <select id="item-type-select" value={itemTypeToAdd} onChange={handleItemTypeChange} disabled={savingData}>
                        <option value="product">Producto del Catálogo</option>
                        <option value="custom">Ítem Personalizado</option>
                    </select>
                </div>

                {/* Formulario para agregar ítem de producto (Condicional) */}
                {itemTypeToAdd === 'product' && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 2 }}>
                            <label htmlFor="item-producto-id">Producto:</label>
                            <select
                                id="item-producto-id"
                                name="Producto_id"
                                value={newItemProductoData.Producto_id}
                                onChange={handleProductoSelectChange}
                                disabled={savingData || productos.length === 0}
                            >
                                <option value="">Seleccione Producto</option>
                                {productos.map(producto => (
                                    <option key={producto.id} value={producto.id}>{`${producto.codigo} - ${producto.Descripcion}`}</option>
                                ))}
                            </select>
                             {productos.length === 0 && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>Cargando productos o no hay productos disponibles.</p>}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="item-producto-cantidad">Cantidad:</label>
                            <input
                                type="number"
                                id="item-producto-cantidad"
                                name="Cantidad"
                                value={newItemProductoData.Cantidad}
                                onChange={handleNewItemProductoChange}
                                disabled={savingData}
                                min="0"
                                step="any" // Permitir decimales en cantidad si es necesario
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label htmlFor="item-producto-precio">Precio Unitario Venta:</label>
                            <input
                                type="number"
                                id="item-producto-precio"
                                name="Precio_Unitario_Venta"
                                value={newItemProductoData.Precio_Unitario_Venta}
                                onChange={handleNewItemProductoChange}
                                disabled={savingData}
                                min="0"
                                step="0.01"
                            />
                        </div>
                         {/* Mostrar Total Ítem para producto */}
                          <div style={{ flex: 0.5 }}>
                              <label>Total Ítem:</label>
                               {/* CORRECCIÓN: Parsear a float antes de toFixed */}
                              <input
                                  type="text"
                                  value={parseFloat(parseFloat(newItemProductoData.Cantidad) * parseFloat(newItemProductoData.Precio_Unitario_Venta) || 0).toFixed(2)}
                                  readOnly
                                  disabled={true}
                                   style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                              />
                          </div>
                        <div>
                            <button type="button" onClick={handleAddItem} disabled={savingData || productos.length === 0}>
                                Agregar Producto
                            </button>
                        </div>
                    </div>
                )}

                {/* Formulario para agregar ítem personalizado (Condicional) */}
                {itemTypeToAdd === 'custom' && (
                     <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
                         <div style={{ flex: 3 }}>
                             <label htmlFor="item-custom-descripcion">Descripción:</label>
                             <input
                                 type="text"
                                 id="item-custom-descripcion"
                                 name="Descripcion_Personalizada"
                                 value={newItemCustomData.Descripcion_Personalizada}
                                 onChange={handleNewItemCustomChange}
                                 disabled={savingData}
                             />
                         </div>
                         <div style={{ flex: 1 }}>
                             <label htmlFor="item-custom-cantidad">Cantidad:</label>
                             <input
                                 type="number"
                                 id="item-custom-cantidad"
                                 name="Cantidad_Personalizada"
                                 value={newItemCustomData.Cantidad_Personalizada}
                                 onChange={handleNewItemCustomChange}
                                 disabled={savingData}
                                 min="0"
                                 step="any"
                             />
                         </div>
                         <div style={{ flex: 1 }}>
                             <label htmlFor="item-custom-precio">Precio Unitario:</label>
                             <input
                                 type="number"
                                 id="item-custom-precio"
                                 name="Precio_Unitario_Personalizada"
                                 value={newItemCustomData.Precio_Unitario_Personalizada}
                                 onChange={handleNewItemCustomChange}
                                 disabled={savingData}
                                 min="0"
                                 step="0.01"
                             />
                         </div>
                          {/* Mostrar Total Ítem para personalizado */}
                           <div style={{ flex: 0.5 }}>
                               <label>Total Ítem:</label>
                                {/* CORRECCIÓN: Parsear a float antes de toFixed */}
                               <input
                                   type="text"
                                   value={parseFloat(parseFloat(newItemCustomData.Cantidad_Personalizada) * parseFloat(newItemCustomData.Precio_Unitario_Personalizada) || 0).toFixed(2)}
                                   readOnly
                                   disabled={true}
                                    style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                               />
                           </div>
                         <div>
                             <button type="button" onClick={handleAddItem} disabled={savingData}>
                                 Agregar Ítem Personalizado
                             </button>
                         </div>
                     </div>
                )}


            </div>


            {/* Tabla de Ítems de la Venta */}
            <div style={{ marginTop: '20px' }}>
                <h4>Lista de Ítems Vendidos</h4>
                {items.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th> {/* Nueva columna para indicar el tipo */}
                                <th>Detalle</th> {/* Columna para mostrar código/descripción */}
                                <th>Cantidad</th>
                                <th>Precio Unitario</th>
                                <th>Total Ítem</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                // MODIFICADO: Buscar detalles del producto si es un ítem de tipo 'product'
                                // O usar item.codigo y item.Descripcion si vienen directamente en el ítem (para compatibilidad)
                                const productDetails = item.Producto_id !== null
                                    ? productos.find(p => p.id === item.Producto_id)
                                    : null;

                                return (
                                    // Usar el id del ítem si existe (al editar), sino el index
                                    <tr key={item.id || index}>
                                        <td>{item.type === 'product' ? 'Producto' : 'Personalizado'}</td> {/* Mostrar el tipo */}
                                        <td>
                                            {/* Mostrar detalle según el tipo de ítem */}
                                            {item.type === 'product'
                                                // MODIFICADO: Usar detalles encontrados o fallback a los del ítem si existen (para compatibilidad)
                                                ? `${productDetails?.codigo || item.codigo || 'N/A'} - ${productDetails?.Descripcion || item.Descripcion || 'N/A'}`
                                                : item.Descripcion_Personalizada || 'N/A'
                                            }
                                        </td>
                                        <td>
                                             {/* Mostrar cantidad según el tipo de ítem */}
                                            {item.type === 'product'
                                                ? (item.Cantidad !== null ? item.Cantidad : 'N/A') // Asegurar que Cantidad no sea null
                                                : (item.Cantidad_Personalizada !== null ? item.Cantidad_Personalizada : 'N/A') // Asegurar que Cantidad_Personalizada no sea null
                                            }
                                        </td>
                                        <td>
                                             {/* Mostrar precio unitario según el tipo de ítem */}
                                            {item.type === 'product'
                                                ? (item.Precio_Unitario_Venta !== null ? parseFloat(item.Precio_Unitario_Venta).toFixed(2) : 'N/A') // Asegurar parsing y toFixed
                                                : (item.Precio_Unitario_Personalizada !== null ? parseFloat(item.Precio_Unitario_Personalizada).toFixed(2) : 'N/A') // Asegurar parsing y toFixed
                                            }
                                        </td>
                                        {/* Mostrar Total_Item (es común a ambos tipos) */}
                                        {/* CORRECCIÓN: Parsear a float antes de toFixed */}
                                        <td>{item.Total_Item !== null ? parseFloat(item.Total_Item).toFixed(2) : 'N/A'}</td>
                                        <td>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                disabled={savingData}
                                                style={{ backgroundColor: '#ef9a9a', color: '#212121' }}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <p>No hay ítems agregados a esta venta.</p>
                )}
            </div>
        </>
    );
}

export default VentaItemsEditor;
