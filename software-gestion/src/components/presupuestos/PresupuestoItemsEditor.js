// src/components/PresupuestoItemsEditor.js
import React, { useState, useEffect } from 'react';

// Componente para gestionar la adición y listado de ítems de presupuesto
function PresupuestoItemsEditor({ items, onItemsChange, productos, savingData }) {
    // items: Array de ítems del presupuesto actual (recibido del componente padre)
    // onItemsChange: Función callback para notificar al padre cuando los ítems cambian
    // productos: Lista de productos del catálogo (para el selector de ítems de producto)
    // savingData: Booleano para deshabilitar inputs mientras se guarda

    // Estado para los datos del nuevo ítem de producto a agregar
    const [newItemProductoData, setNewItemProductoData] = useState({
        Producto_id: '',
        Cantidad: '',
        Precio_Unitario: '', // Puede venir del producto seleccionado, pero permitir edición
        Descuento_Porcentaje: 0,
    });

    // Estado para los datos del nuevo ítem personalizado a agregar
    const [newItemPersonalizadoData, setNewItemPersonalizadoData] = useState({
        Descripcion_Personalizada: '',
        Cantidad_Personalizada: '',
        Precio_Unitario_Personalizado: '',
        Descuento_Porcentaje: 0, // Permitir descuento también en personalizados
    });

    // Estado para manejar errores específicos de la sección de ítems
    const [itemError, setItemError] = useState(null);


    // --- Funciones de Cálculo (Movidas aquí o podrían ir a un archivo de utils) ---

    // Calcula el total de un ítem (aplicando descuento)
    const calculateItemTotal = (cantidad, precioUnitario, descuentoPorcentaje) => {
        const qty = parseFloat(cantidad) || 0;
        const price = parseFloat(precioUnitario) || 0;
        const discount = parseFloat(descuentoPorcentaje) || 0;

        if (qty <= 0 || price <= 0) {
            return 0;
        }

        const totalBeforeDiscount = qty * price;
        const totalAfterDiscount = totalBeforeDiscount * (1 - discount / 100);

        return parseFloat(totalAfterDiscount.toFixed(2)); // Formatear a 2 decimales
    };


    // --- Handlers para Ítems de Producto ---

    // Maneja cambios en los campos del formulario para agregar nuevo ítem de producto
    const handleNewItemProductoChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

        if (['Cantidad', 'Precio_Unitario', 'Descuento_Porcentaje'].includes(name)) {
             updatedValue = value !== '' ? parseFloat(value) : '';
        }

        setNewItemProductoData(prevState => ({ ...prevState, [name]: updatedValue }));
    };

    // Cuando se selecciona un producto del dropdown, cargar su precio unitario por defecto
    const handleProductoSelectChange = (e) => {
        const productoId = e.target.value;
        const selectedProducto = productos.find(p => p.id === parseInt(productoId));

        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: productoId,
            Precio_Unitario: selectedProducto ? selectedProducto.precio : '', // Cargar precio del producto
        }));
    };


    // Agrega el nuevo ítem de producto a la lista de ítems
    const handleAddItemProducto = () => {
        // Validaciones básicas para ítem de producto
        if (!newItemProductoData.Producto_id || newItemProductoData.Cantidad === '' || newItemProductoData.Precio_Unitario === '') {
            setItemError('Debe seleccionar un producto e ingresar cantidad y precio unitario.');
            return;
        }

        const selectedProducto = productos.find(p => p.id === parseInt(newItemProductoData.Producto_id));
        if (!selectedProducto) {
             setItemError('Producto seleccionado no válido.');
             return;
        }

        const totalItem = calculateItemTotal(
            newItemProductoData.Cantidad,
            newItemProductoData.Precio_Unitario,
            newItemProductoData.Descuento_Porcentaje
        );

        const newItem = {
            // Campos de ítem de producto
            Producto_id: parseInt(newItemProductoData.Producto_id),
            Cantidad: parseFloat(newItemProductoData.Cantidad),
            Precio_Unitario: parseFloat(newItemProductoData.Precio_Unitario),
            Descuento_Porcentaje: parseFloat(newItemProductoData.Descuento_Porcentaje) || 0,
            Total_Item: totalItem,
            // Incluir algunos datos del producto para mostrar en la tabla (opcional, podrías buscarlo por ID también)
            codigo: selectedProducto.codigo,
            Descripcion: selectedProducto.Descripcion, // Usar Descripcion del producto
            // Otros campos del producto si quieres mostrarlos en la tabla de ítems
            banda: selectedProducto.banda,
            material: selectedProducto.material,
            Buje: selectedProducto.Buje,

            // Campos personalizados serán null/undefined
            Descripcion_Personalizada: null,
            Cantidad_Personalizada: null,
            Precio_Unitario_Personalizado: null,
        };

        // Notificar al padre que la lista de ítems ha cambiado
        onItemsChange([...items, newItem]);

        // Resetear el formulario de nuevo ítem de producto
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario: '', Descuento_Porcentaje: 0 });
        setItemError(null); // Limpiar errores si la adición fue exitosa
    };


    // --- Handlers para Ítems Personalizados ---

    // Maneja cambios en los campos del formulario para agregar nuevo ítem personalizado
    const handleNewItemPersonalizadoChange = (e) => {
        const { name, value } = e.target;
        let updatedValue = value;

        if (['Cantidad_Personalizada', 'Precio_Unitario_Personalizado', 'Descuento_Porcentaje'].includes(name)) {
             updatedValue = value !== '' ? parseFloat(value) : '';
        }

        setNewItemPersonalizadoData(prevState => ({ ...prevState, [name]: updatedValue }));
    };

    // Agrega el nuevo ítem personalizado a la lista de ítems
    const handleAddItemPersonalizado = () => {
        // Validaciones básicas para ítem personalizado
        if (!newItemPersonalizadoData.Descripcion_Personalizada || newItemPersonalizadoData.Cantidad_Personalizada === '' || newItemPersonalizadoData.Precio_Unitario_Personalizado === '') {
            setItemError('Debe ingresar descripción, cantidad y precio unitario para el ítem personalizado.');
            return;
        }

         const totalItem = calculateItemTotal(
            newItemPersonalizadoData.Cantidad_Personalizada,
            newItemPersonalizadoData.Precio_Unitario_Personalizado,
            newItemPersonalizadoData.Descuento_Porcentaje
        );

        const newItem = {
            // Campos de ítem personalizado
            Producto_id: null, // Marcar como ítem personalizado
            Descripcion_Personalizada: newItemPersonalizadoData.Descripcion_Personalizada,
            Cantidad_Personalizada: parseFloat(newItemPersonalizadoData.Cantidad_Personalizada),
            Precio_Unitario_Personalizado: parseFloat(newItemPersonalizadoData.Precio_Unitario_Personalizado),
            Descuento_Porcentaje: parseFloat(newItemPersonalizadoData.Descuento_Porcentaje) || 0,
            Total_Item: totalItem,

            // Campos de ítem de producto serán null/undefined
            Cantidad: null,
            Precio_Unitario: null,
            codigo: null,
            Descripcion: null,
            banda: null,
            material: null,
            Buje: null,
        };

        // Notificar al padre que la lista de ítems ha cambiado
        onItemsChange([...items, newItem]);


        // Resetear el formulario de nuevo ítem personalizado
        setNewItemPersonalizadoData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizado: '', Descuento_Porcentaje: 0 });
        setItemError(null); // Limpiar errores si la adición fue exitosa
    };


    // --- Handlers para la Tabla de Ítems (Eliminar/Editar Ítem) ---

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

            {/* --- Sección de Ítems del Presupuesto (Productos) --- */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Ítems del Presupuesto (Productos del Catálogo)</h4>
                {/* Formulario para agregar ítem de producto */}
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
                        <label htmlFor="item-producto-precio">Precio Unitario (USD):</label>
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
                    <div style={{ flex: 0.5 }}>
                        <label htmlFor="item-producto-descuento">Descuento (%):</label>
                        <input
                            type="number"
                            id="item-producto-descuento"
                            name="Descuento_Porcentaje"
                            value={newItemProductoData.Descuento_Porcentaje}
                            onChange={handleNewItemProductoChange}
                            disabled={savingData}
                            min="0"
                            max="100"
                            step="0.01"
                        />
                    </div>
                     <div style={{ flex: 0.5 }}>
                         <label>Total Ítem (USD):</label>
                         <input
                             type="text"
                             value={calculateItemTotal(newItemProductoData.Cantidad, newItemProductoData.Precio_Unitario, newItemProductoData.Descuento_Porcentaje)}
                             readOnly
                             disabled={true}
                              style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                         />
                     </div>
                    <div>
                        <button type="button" onClick={handleAddItemProducto} disabled={savingData}>
                            Agregar Producto
                        </button>
                    </div>
                </div>
            </div>

             {/* --- Sección de Ítems Personalizados --- */}
             <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Ítems Personalizados</h4>
                {/* Formulario para agregar ítem personalizado */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
                     <div style={{ flex: 3 }}>
                        <label htmlFor="item-personalizado-descripcion">Descripción:</label>
                        <input
                            type="text"
                            id="item-personalizado-descripcion"
                            name="Descripcion_Personalizada"
                            value={newItemPersonalizadoData.Descripcion_Personalizada}
                            onChange={handleNewItemPersonalizadoChange}
                            disabled={savingData}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="item-personalizado-cantidad">Cantidad:</label>
                        <input
                            type="number"
                            id="item-personalizado-cantidad"
                            name="Cantidad_Personalizada"
                            value={newItemPersonalizadoData.Cantidad_Personalizada}
                            onChange={handleNewItemPersonalizadoChange}
                            disabled={savingData}
                            min="0"
                            step="any" // Permitir decimales
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="item-personalizado-precio">Precio Unitario (USD):</label>
                        <input
                            type="number"
                            id="item-personalizado-precio"
                            name="Precio_Unitario_Personalizado"
                            value={newItemPersonalizadoData.Precio_Unitario_Personalizado}
                            onChange={handleNewItemPersonalizadoChange}
                            disabled={savingData}
                            min="0"
                            step="0.01"
                        />
                    </div>
                     <div style={{ flex: 0.5 }}>
                        <label htmlFor="item-personalizado-descuento">Descuento (%):</label>
                        <input
                            type="number"
                            id="item-personalizado-descuento"
                            name="Descuento_Porcentaje"
                            value={newItemPersonalizadoData.Descuento_Porcentaje}
                            onChange={handleNewItemPersonalizadoChange}
                            disabled={savingData}
                            min="0"
                            max="100"
                            step="0.01"
                        />
                    </div>
                     <div style={{ flex: 0.5 }}>
                         <label>Total Ítem (USD):</label>
                         <input
                             type="text"
                             value={calculateItemTotal(newItemPersonalizadoData.Cantidad_Personalizada, newItemPersonalizadoData.Precio_Unitario_Personalizado, newItemPersonalizadoData.Descuento_Porcentaje)}
                             readOnly
                             disabled={true}
                              style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                         />
                     </div>
                    <div>
                        <button type="button" onClick={handleAddItemPersonalizado} disabled={savingData}>
                            Agregar Personalizado
                        </button>
                    </div>
                </div>
             </div>


            {/* Tabla combinada de Ítems (Productos y Personalizados) */}
            <div style={{ marginTop: '20px' }}>
                <h4>Lista de Ítems</h4>
                {items.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Código/Descripción</th>
                                <th>Cantidad</th>
                                <th>Precio Unitario (USD)</th>
                                <th>Descuento (%)</th>
                                <th>Total Ítem (USD)</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}> {/* Usar index como key temporal si no hay ID de ítem */}
                                    <td>{item.Producto_id !== null ? 'Producto' : 'Personalizado'}</td>
                                    <td>
                                        {item.Producto_id !== null
                                            ? `${item.codigo || ''} - ${item.Descripcion || ''}`
                                            : item.Descripcion_Personalizada || ''
                                        }
                                    </td>
                                    <td>
                                        {item.Producto_id !== null
                                            ? item.Cantidad
                                            : item.Cantidad_Personalizada
                                        }
                                    </td>
                                    <td>
                                        {item.Producto_id !== null
                                            ? item.Precio_Unitario
                                            : item.Precio_Unitario_Personalizado
                                        }
                                    </td>
                                    <td>{item.Descuento_Porcentaje}</td>
                                    <td>{item.Total_Item}</td>
                                    <td>
                                         {/* TODO: Implementar botón de Editar Ítem */}
                                         {/* <button type="button" onClick={() => handleEditItem(index)} disabled={savingData} style={{ marginRight: '5px' }}>Editar</button> */}
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
                    <p>No hay ítems agregados a este presupuesto.</p>
                )}
            </div>
        </>
    );
}

export default PresupuestoItemsEditor;