// src/components/CompraItemsEditor.js (New Component)
import React, { useState, useEffect } from 'react';

// Componente para gestionar la adición y listado de ítems de compra
function CompraItemsEditor({ items, onItemsChange, productos, savingData }) {
    // items: Array de ítems de la compra actual (recibido del componente padre)
    // onItemsChange: Función callback para notificar al padre cuando los ítems cambian
    // productos: Lista de productos del catálogo (para el selector de ítems de producto)
    // savingData: Booleano para deshabilitar inputs mientras se guarda

    // Estado para los datos del nuevo ítem de producto a agregar
    const [newItemProductoData, setNewItemProductoData] = useState({
        Producto_id: '',
        Cantidad: '',
        Precio_Unitario: '', // Opcional: precio al que se compró (no está en tu DB, pero puede ser útil)
        // Total_Item no se guarda en la DB de Compra_Items según tu esquema actual,
        // pero podemos calcularlo y mostrarlo aquí si quieres.
    });

     // Estado para manejar errores específicos de la sección de ítems
    const [itemError, setItemError] = useState(null);


    // --- Handlers para Ítems de Producto ---

    // Maneja cambios en los campos del formulario para agregar nuevo ítem de producto
    const handleNewItemProductoChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

        if (['Cantidad', 'Precio_Unitario'].includes(name)) {
             updatedValue = value !== '' ? parseFloat(value) : '';
        }

        setNewItemProductoData(prevState => ({ ...prevState, [name]: updatedValue }));
    };

    // Cuando se selecciona un producto del dropdown
    const handleProductoSelectChange = (e) => {
        const productoId = e.target.value;
        // No necesitamos buscar el precio unitario aquí, ya que lo ingresa el usuario en la compra
        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: productoId,
            Precio_Unitario: '', // Limpiar precio unitario anterior al cambiar de producto
            Cantidad: '', // Limpiar cantidad anterior al cambiar de producto
        }));
    };


    // Agrega el nuevo ítem de producto a la lista de ítems
    const handleAddItemProducto = () => {
        // Validaciones básicas para ítem de producto
        if (!newItemProductoData.Producto_id || newItemProductoData.Cantidad === '' || newItemProductoData.Cantidad <= 0) {
            setItemError('Debe seleccionar un producto e ingresar una cantidad válida (> 0).');
            return;
        }

         // Validación del precio unitario si se está utilizando
         if (newItemProductoData.Precio_Unitario !== '' && isNaN(parseFloat(newItemProductoData.Precio_Unitario))) {
              setItemError('El precio unitario debe ser un número válido.');
              return;
         }


        const selectedProducto = productos.find(p => p.id === parseInt(newItemProductoData.Producto_id));
        if (!selectedProducto) {
             setItemError('Producto seleccionado no válido.');
             return;
        }

         // Calcular Total_Item (opcional, si quieres mostrarlo o guardarlo)
         const cantidad = parseFloat(newItemProductoData.Cantidad) || 0;
         const precioUnitario = parseFloat(newItemProductoData.Precio_Unitario) || 0;
         const totalItem = (cantidad * precioUnitario).toFixed(2);


        const newItem = {
            // Campos de ítem de compra (Productos)
            Producto_id: parseInt(newItemProductoData.Producto_id),
            Cantidad: parseFloat(newItemProductoData.Cantidad),
            Precio_Unitario: newItemProductoData.Precio_Unitario !== '' ? parseFloat(newItemProductoData.Precio_Unitario) : null,
            Total_Item: totalItem !== 'NaN' ? parseFloat(totalItem) : null, // Agregar Total_Item si se calcula
            // Incluir algunos datos del producto para mostrar en la tabla (opcional)
            codigo: selectedProducto.codigo,
            Descripcion: selectedProducto.Descripcion,
        };

        // Notificar al padre que la lista de ítems ha cambiado
        onItemsChange([...items, newItem]);

        // Resetear el formulario de nuevo ítem de producto
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario: '' });
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


    // --- Renderizado ---

    return (
        <>
            {/* Mostrar errores específicos de ítems */}
            {itemError && <p style={{ color: '#ef9a9a' }}>{itemError}</p>}

            {/* --- Sección de Ítems de la Compra (Productos) --- */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Productos Comprados</h4>
                {/* Formulario para agregar ítem de producto a la compra */}
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
                        <label htmlFor="item-producto-precio">Precio Unitario (Opcional):</label> {/* Etiqueta actualizada */}
                        <input
                            type="number"
                            id="item-producto-precio"
                            name="Precio_Unitario"
                            value={newItemProductoData.Precio_Unitario}
                            onChange={handleNewItemProductoChange}
                            disabled={savingData}
                            min="0"
                            step="0.01"
                        />
                    </div>
                     {/* Opcional: Mostrar Total Ítem si quieres */}
                     {/*
                      <div style={{ flex: 0.5 }}>
                          <label>Total Ítem:</label>
                          <input
                              type="text"
                              value={(parseFloat(newItemProductoData.Cantidad) * parseFloat(newItemProductoData.Precio_Unitario) || 0).toFixed(2)}
                              readOnly
                              disabled={true}
                               style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                          />
                      </div>
                      */}
                    <div>
                        <button type="button" onClick={handleAddItemProducto} disabled={savingData || productos.length === 0}>
                            Agregar Producto a Compra
                        </button>
                    </div>
                </div>
            </div>


            {/* Tabla de Ítems de la Compra */}
            <div style={{ marginTop: '20px' }}>
                <h4>Lista de Productos Comprados</h4>
                {items.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Descripción</th>
                                <th>Cantidad</th>
                                <th>Precio Unitario</th> {/* Opcional si se muestra */}
                                <th>Total Ítem</th> {/* Opcional si se muestra */}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                // Si item tiene un id (viene de la DB al editar), usarlo como key, sino usar index
                                <tr key={item.id || index}>
                                    <td>{item.codigo || 'N/A'}</td> {/* Mostrar código del producto */}
                                    <td>{item.Descripcion || 'N/A'}</td> {/* Mostrar descripción del producto */}
                                    <td>{item.Cantidad}</td>
                                    <td>{item.Precio_Unitario !== null ? item.Precio_Unitario : 'N/A'}</td> {/* Mostrar precio unitario si existe */}
                                    <td>{(parseFloat(item.Cantidad) * parseFloat(item.Precio_Unitario) || 0).toFixed(2)}</td> {/* Calcular y mostrar Total_Item */}
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
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No hay productos agregados a esta compra.</p>
                )}
            </div>
        </>
    );
}

export default CompraItemsEditor;