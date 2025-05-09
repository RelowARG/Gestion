// src/components/ventasx/VentaItemsEditorX.js
// Este componente gestiona la adición y listado de ítems de VentaX (productos y personalizados).
// Incluye funcionalidad de búsqueda y tabla para seleccionar productos (similar a VentaItemsEditor).
// NO valida los campos del ítem personalizado al agregarlo a la lista.
// Utiliza clearTrigger para limpiar estados internos.

import React, { useState, useEffect, useRef } from 'react'; // Importa useRef

// Componente para gestionar la adición y listado de ítems de VentaX (productos y personalizados)
// Ahora acepta clearTrigger como prop
function VentaItemsEditorX({ items, onItemsChange, productos, savingData, clearTrigger }) {
    // items: Array de ítems de la venta X actual (recibido del componente padre).
    //        Puede contener objetos de producto (con Producto_id) o personalizados (con Descripcion_Personalizada).
    // onItemsChange: Función callback para notificar al padre cuando los ítems cambian
    // productos: Lista COMPLETA de productos del catálogo (se usará para mostrar la lista y filtrar)
    // savingData: Booleano para deshabilitar inputs mientras se guarda
    // clearTrigger: Prop que cambia para indicar que se limpie el estado interno (errores, búsqueda)

    // Estado para controlar qué tipo de ítem se está agregando ('product' o 'custom')
    const [itemTypeToAdd, setItemTypeToAdd] = useState('product');

    // Estado para los datos del nuevo ítem de producto a agregar
    const [newItemProductoData, setNewItemProductoData] = useState({
        Producto_id: '', // ID del producto seleccionado (ahora viene de la selección en la lista filtrada)
        Cantidad: '', // Cantidad para productos
        Precio_Unitario_Venta: '', // Precio de venta unitario para productos (precargado desde el producto seleccionado)
        // Campos para mostrar detalles del producto seleccionado en la UI
        codigo: '',
        Descripcion: '',
    });

    // Estado para los datos del nuevo ítem personalizado a agregar
    const [newItemCustomData, setNewItemCustomData] = useState({
        Descripcion_Personalizada: '',
        Cantidad_Personalizada: '', // Cantidad para ítems personalizados
        Precio_Unitario_Personalizada: '', // Precio unitario para ítems personalizados
    });

    // Estado para manejar errores específicos de la sección de ítems
    const [itemError, setItemError] = useState(null);

    // --- Estados para la búsqueda y lista visible (Implementación similar a VentaItemsEditor) ---
    const [productSearchTerm, setProductSearchTerm] = useState(''); // Lo que el usuario escribe en el input de búsqueda/filtro
    // Lista de productos actualmente mostrada (filtrada o completa)
    // Inicialmente vacía, se llenará con el efecto al recibir la prop 'productos'
    const [displayList, setDisplayList] = useState([]);
    // --- FIN Estados de búsqueda ---


    // --- Efecto para inicializar la lista mostrada cuando los productos cambian (Similar a VentaItemsEditor) ---
    useEffect(() => {
        // Añadir comprobación de seguridad: solo actualizar si productos es un array
        if (Array.isArray(productos)) {
            console.log('[VentaItemsEditorX] Productos prop changed. Initializing displayList.');
            setDisplayList(productos);
            setProductSearchTerm(''); // Limpiar el término de búsqueda por si había algo escrito de una carga anterior
        } else {
             console.warn('[VentaItemsEditorX] Productos prop is not an array:', productos);
             setDisplayList([]); // Asegurar que displayList sea un array vacío si productos no lo es
             setProductSearchTerm('');
        }
    }, [productos]); // Dependencia: la lista completa de productos

    // --- Efecto para limpiar errores internos y estado de búsqueda cuando se dispara el trigger (Similar a VentaItemsEditor) ---
    useEffect(() => {
        console.log('[VentaItemsEditorX] Clear trigger fired. Clearing internal state.');
        setItemError(null); // Limpiar el error interno del editor
        // Limpiar también el estado de búsqueda y los formularios
        setProductSearchTerm('');
        // Asegurar que displayList se resetee a un array, incluso si productos es undefined temporalmente
        setDisplayList(Array.isArray(productos) ? productos : []);
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '', codigo: '', Descripcion: '' });
        setNewItemCustomData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });

    }, [clearTrigger, productos]); // Dependencias: clearTrigger y productos (para resetear displayList correctamente)


    // --- Handlers para el Selector de Tipo de Ítem ---
    const handleItemTypeChange = (e) => {
        setItemTypeToAdd(e.target.value);
        // Limpiar los formularios y el estado de búsqueda/errores al cambiar de tipo
        setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '', codigo: '', Descripcion: '' });
        setNewItemCustomData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });
        setProductSearchTerm(''); // Limpiar el término de búsqueda
         // Asegurar que displayList se resetee a un array, incluso si productos es undefined temporalmente
        setDisplayList(Array.isArray(productos) ? productos : []);
        setItemError(null); // Limpiar errores
    };


    // --- Handlers para Ítems de Producto de VentaX (Con Filtrado Frontend - Similar a VentaItemsEditor) ---

    // Maneja cambios en el input de búsqueda/filtro de producto
    const handleProductSearchInputChange = (e) => {
        const term = e.target.value.toLowerCase(); // Convertir a minúsculas para búsqueda insensible a mayúsculas/minúsculas
        setProductSearchTerm(term); // Actualiza el término de búsqueda

        // Añadir comprobación de seguridad antes de filtrar
        if (term === '' && Array.isArray(productos)) {
            // Si el término está vacío, mostrar la lista completa (si productos es un array)
            setDisplayList(productos);
        } else if (Array.isArray(productos)) {
            // Si hay un término, filtrar la lista COMPLETA de productos recibida como prop (si productos es un array)
            const filtered = productos.filter(producto =>
                (producto.codigo && String(producto.codigo).toLowerCase().includes(term)) || // Buscar en código
                (producto.Descripcion && String(producto.Descripcion).toLowerCase().includes(term)) // Buscar en descripción
            );
            setDisplayList(filtered); // Actualiza la lista mostrada con los resultados filtrados
        } else {
             // Si productos no es un array, limpiar la lista mostrada
             setDisplayList([]);
        }

        // Limpiar los detalles del producto SELECCIONADO si el usuario empieza a escribir de nuevo
        // Esto es importante porque si ya había seleccionado uno, ahora quiere seleccionar otro.
        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: '', // Limpiar ID del producto seleccionado (ya no hay un producto válido seleccionado)
            codigo: '', // Limpiar detalles del producto seleccionado
            Descripcion: '',
            // Mantener Cantidad y Precio_Unitario_Venta si ya estaban ingresados para facilitar re-selección
        }));
         setItemError(null); // Limpiar errores al empezar a escribir
    };

    // Maneja la selección de un producto de la lista mostrada (filtrada o completa)
    // Adaptado para funcionar con la tabla filtrable
    const handleProductSelect = (product) => {
        console.log('Product selected from list:', product);
        // Rellenar el estado con los detalles del producto seleccionado
        setNewItemProductoData(prevState => ({
            ...prevState,
            Producto_id: product.id, // Establecer el ID del producto seleccionado
            codigo: product.codigo || '', // Rellenar código y descripción
            Descripcion: product.Descripcion || '',
            // Usar el precio del producto seleccionado, convertir a string para el input type="number"
            Precio_Unitario_Venta: product.precio !== null ? String(product.precio) : '',
            Cantidad: '', // Limpiar cantidad para nueva entrada (es un nuevo ítem)
        }));
        // Establecer el valor del input de búsqueda/filtro con el código y descripción del producto seleccionado
        // Esto es útil visualmente para confirmar la selección
        setProductSearchTerm(`${product.codigo || ''} - ${product.Descripcion || ''}`);
        // Opcional: Limpiar la lista mostrada después de seleccionar (para que no se vea la tabla)
        // setDisplayList([]); // Si descomentas esto, la tabla de productos se ocultará al seleccionar
         setItemError(null); // Limpiar errores de ítems al seleccionar
    };


    // Maneja cambios en los campos Cantidad y Precio Unitario Venta para el nuevo ítem de producto
    const handleNewItemProductoDetailChange = (e) => {
        const { name, value } = e.target;
         let updatedValue = value;

         if (['Cantidad', 'Precio_Unitario_Venta'].includes(name)) {
              // Parsear a número o dejar vacío. La validación final a número se hace en handleAddItem
              updatedValue = value !== '' ? parseFloat(value) : '';
         }

         setNewItemProductoData(prevState => ({ ...prevState, [name]: updatedValue }));
         setItemError(null); // Limpiar errores al cambiar estos campos
    };


    // --- Handlers para Ítems Personalizados de VentaX ---

     // Maneja cambios en los campos del formulario para agregar nuevo ítem personalizado
     const handleNewItemCustomChange = (e) => {
         const { name, value } = e.target;
         let updatedValue = value;

         if (['Cantidad_Personalizada', 'Precio_Unitario_Personalizada'].includes(name)) {
              updatedValue = value !== '' ? parseFloat(value) : ''; // Parsear a número o dejar vacío
         }

         setNewItemCustomData(prevState => ({ ...prevState, [name]: updatedValue }));
         setItemError(null); // Limpiar errores al cambiar estos campos
     };


    // --- Handler para Agregar Ítem (Común para ambos tipos) ---
    const handleAddItem = () => {
        setItemError(null); // Reset previous errors for the current add attempt

        let newItem = null;
        let totalItem = 0;

        if (itemTypeToAdd === 'product') {
            // Validaciones para ítem de producto (Mantenemos estas validaciones)
            // Validar que se haya SELECCIONADO un producto válido (Producto_id != '')
            if (!newItemProductoData.Producto_id) {
                setItemError('Debe seleccionar un producto de la lista de abajo.');
                return;
            }
            // Validar Cantidad
            if (newItemProductoData.Cantidad === '' || isNaN(parseFloat(newItemProductoData.Cantidad)) || parseFloat(newItemProductoData.Cantidad) <= 0) {
                setItemError('Debe ingresar una cantidad válida (> 0) para el producto seleccionado.');
                return;
            }
             // Validar Precio Unitario
             if (newItemProductoData.Precio_Unitario_Venta === '' || isNaN(parseFloat(newItemProductoData.Precio_Unitario_Venta)) || parseFloat(newItemProductoData.Precio_Unitario_Venta) < 0) {
                  setItemError('Debe ingresar un precio unitario de venta válido (>= 0) para el producto seleccionado.');
                  return;
             }


             // Calcular Total_Item para producto
             const cantidad = parseFloat(newItemProductoData.Cantidad) || 0; // Usar || 0 para evitar NaN * Number = NaN
             const precioUnitario = parseFloat(newItemProductoData.Precio_Unitario_Venta) || 0; // Usar || 0
             totalItem = (cantidad * precioUnitario); // Calculate raw total

            newItem = {
                // Estructura del item a agregar al array 'items' en el estado padre
                type: 'product', // Identificar el tipo de ítem
                Producto_id: parseInt(newItemProductoData.Producto_id), // ID del producto seleccionado
                Cantidad: cantidad,
                Precio_Unitario_Venta: precioUnitario,
                Total_Item: parseFloat(totalItem.toFixed(2)), // Agregar el Total_Item calculado

                // Incluir detalles para mostrarlos en la tabla (si no se buscan al renderizar la tabla)
                 codigo: newItemProductoData.codigo, // Usar el código del estado (obtenido al seleccionar)
                 Descripcion: newItemProductoData.Descripcion, // Usar la descripción del estado (obtenida al seleccionar)
            };

             // Resetear el formulario de nuevo ítem de producto
            setNewItemProductoData({ Producto_id: '', Cantidad: '', Precio_Unitario_Venta: '', codigo: '', Descripcion: '' });
            setProductSearchTerm(''); // Limpiar el input de búsqueda/filtro
            // Asegurar que displayList se resetee a un array, incluso si productos es undefined temporalmente
            setDisplayList(Array.isArray(productos) ? productos : []);


        } else { // itemTypeToAdd === 'custom'
             // --- VALIDACIONES ELIMINADAS PARA ITEM PERSONALIZADO ---
             // if (!newItemCustomData.Descripcion_Personalizada) {
             //     setItemError('Debe ingresar una descripción para el ítem personalizado.');
             //     return;
             // }
             // if (newItemCustomData.Cantidad_Personalizada === '' || isNaN(parseFloat(newItemCustomData.Cantidad_Personalizada)) || parseFloat(newItemCustomData.Cantidad_Personalizada) <= 0) {
             //     setItemError('Debe ingresar una cantidad válida (> 0) para el ítem personalizado.');
             //     return;
             // }
             // if (newItemCustomData.Precio_Unitario_Personalizada === '' || isNaN(parseFloat(newItemCustomData.Precio_Unitario_Personalizada)) || parseFloat(newItemCustomData.Precio_Unitario_Personalizada) < 0) {
             //      setItemError('Debe ingresar un precio unitario válido (>= 0) para el ítem personalizado.');
             //      return;
             // }
             // --- FIN VALIDACIONES ELIMINADAS ---


             // Calcular Total_Item para ítem personalizado (Se mantiene el cálculo aunque no se valide)
             const cantidadPersonalizada = parseFloat(newItemCustomData.Cantidad_Personalizada) || 0;
             const precioUnitarioPersonalizada = parseFloat(newItemCustomData.Precio_Unitario_Personalizada) || 0;
             totalItem = (cantidadPersonalizada * precioUnitarioPersonalizada); // Calculate raw total

             newItem = {
                 type: 'custom', // Identificar el tipo de ítem
                 Descripcion_Personalizada: newItemCustomData.Descripcion_Personalizada,
                 Cantidad_Personalizada: cantidadPersonalizada,
                 Precio_Unitario_Personalizada: precioUnitarioPersonalizada,
                 Total_Item: parseFloat(totalItem.toFixed(2)), // Agregar el Total_Item calculado
             };

             // Resetear el formulario de nuevo ítem personalizado
             setNewItemCustomData({ Descripcion_Personalizada: '', Cantidad_Personalizada: '', Precio_Unitario_Personalizada: '' });
        }

        console.log('[VentaItemsEditorX] Nuevo item creado:', newItem);
        // Notificar al padre que la lista de ítems ha cambiado
        // Añadir comprobación de seguridad: solo si items es un array
        if (Array.isArray(items)) {
            onItemsChange([...items, newItem]);
        } else {
             console.error('[VentaItemsEditorX] Cannot add item, items prop is not an array:', items);
             // Opcional: Mostrar un error al usuario si items no es un array
             setItemError('Error interno: La lista de ítems no es válida.');
        }


        setItemError(null); // Limpiar errores si la adición fue exitosa
    };


    // --- Handlers para la Tabla de Ítems (Eliminar Ítem) ---

    // Elimina un ítem de la lista de ítems
    const handleRemoveItem = (indexToRemove) => {
        // Añadir comprobación de seguridad: solo si items es un array
        if (Array.isArray(items)) {
            const updatedItems = items.filter((_, index) => index !== indexToRemove);
            // Notificar al padre que la lista de ítems ha cambiado
            onItemsChange(updatedItems);
        } else {
             console.error('[VentaItemsEditorX] Cannot remove item, items prop is not an array:', items);
             // Opcional: Mostrar un error al usuario si items no es un array
             setItemError('Error interno: La lista de ítems no es válida.');
        }
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


    // Helper para encontrar los detalles completos de un producto por su ID (usado para mostrar ítems agregados en la tabla)
    // Usa la lista completa de productos pasada como prop
    const getProductDetails = (productId) => {
        // Añadir comprobación de seguridad: solo buscar si productos es un array
        if (Array.isArray(productos)) {
            // Busca en la lista completa de productos recibida como prop
            return productos.find(p => p.id === productId);
        }
        return null; // Retornar null si productos no es un array
    };


    // --- Renderizado ---

    return (
        <>
            {/* Mostrar errores específicos de ítems */}
            {itemError && <p style={{ color: '#ef9a9a' }}>{itemError}</p>}

            {/* No necesitamos estado de carga de búsqueda si el filtro es frontend */}
            {/* {loadingSearch && <p>Buscando productos...</p>} */}


            {/* --- Sección para Agregar Nuevo Ítem de VentaX --- */}
            <div style={{ marginTop: '30px', borderTop: '1px solid #424242', paddingTop: '20px' }}>
                <h4>Agregar Ítem a Venta X</h4> {/* Updated UI text */}

                {/* Selector de Tipo de Ítem */}
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="item-type-select">Tipo de Ítem a Agregar:</label>
                    <select id="item-type-select" value={itemTypeToAdd} onChange={handleItemTypeChange} disabled={savingData}>
                        <option value="product">Producto del Catálogo</option>
                        <option value="custom">Ítem Personalizado</option>
                    </select>
                </div>

                {/* Formulario para agregar ítem de producto (Condicional - Con Filtrado Frontend) */}
                {itemTypeToAdd === 'product' && (
                    // Usamos key para forzar re-render si cambia el itemTypeToAdd, limpiando el estado interno
                    <div key="add-product-item-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
                         {/* Input de búsqueda/filtro */}
                         <div style={{ flex: 2 }}>
                             <label htmlFor="product-search-input">Buscar/Filtrar Producto:</label>
                             <input
                                 type="text"
                                 id="product-search-input"
                                 value={productSearchTerm}
                                 onChange={handleProductSearchInputChange} // Manejador de cambio para filtrar
                                 placeholder="Escribe código o descripción para filtrar..."
                                 disabled={savingData}
                             />
                         </div>

                         {/* Mostrar detalles del producto SELECCIONADO */}
                         {/* Mostrar solo si un producto ha sido seleccionado (tiene Producto_id) */}
                         {newItemProductoData.Producto_id ? (
                             <>
                                  <div style={{ flex: 2, fontSize: '0.9rem', color: '#bdbdbd', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                                     {/* Mostrar código y descripción del producto seleccionado */}
                                      <p style={{margin: 0}}><strong>Seleccionado:</strong></p>
                                      <p style={{margin: 0}}>{newItemProductoData.codigo} - {newItemProductoData.Descripcion}</p>
                                  </div>
                                  <div style={{ flex: 1 }}>
                                     <label htmlFor="item-producto-cantidad">Cantidad:</label>
                                     <input
                                         type="number"
                                         id="item-producto-cantidad"
                                         name="Cantidad"
                                         value={newItemProductoData.Cantidad}
                                         onChange={handleNewItemProductoDetailChange} // Usar manejador específico
                                         disabled={savingData}
                                         min="0"
                                         step="any"
                                         required
                                     />
                                 </div>
                                 <div style={{ flex: 1 }}>
                                     <label htmlFor="item-producto-precio">Precio Unitario Venta:</label>
                                     <input
                                         type="number"
                                         id="item-producto-precio"
                                         name="Precio_Unitario_Venta"
                                         value={newItemProductoData.Precio_Unitario_Venta}
                                         onChange={handleNewItemProductoDetailChange} // Usar manejador específico
                                         disabled={savingData}
                                         min="0"
                                         step="0.01"
                                         required
                                     />
                                 </div>
                                  <div style={{ flex: 0.5 }}>
                                      <label>Total Ítem:</label>
                                       {/* Calcular Total Ítem basado en los valores actuales de Cantidad y Precio Unitario */}
                                      <input
                                          type="text"
                                           value={parseFloat(parseFloat(newItemProductoData.Cantidad || 0) * parseFloat(newItemProductoData.Precio_Unitario_Venta || 0)).toFixed(2)}
                                          readOnly
                                          disabled={true}
                                           style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                                      />
                                  </div>
                                   {/* Botón Agregar Producto - Solo si se ha seleccionado Y campos válidos */}
                                   <div>
                                     <button
                                         type="button"
                                         onClick={handleAddItem}
                                          disabled={
                                              savingData ||
                                              !newItemProductoData.Producto_id || // Debe tener un producto seleccionado
                                              newItemProductoData.Cantidad === '' || isNaN(parseFloat(newItemProductoData.Cantidad)) || parseFloat(newItemProductoData.Cantidad) <= 0 || // Validar Cantidad
                                              newItemProductoData.Precio_Unitario_Venta === '' || isNaN(parseFloat(newItemProductoData.Precio_Unitario_Venta)) || parseFloat(newItemProductoData.Precio_Unitario_Venta) < 0 // Validar Precio
                                          }
                                      >
                                         Agregar Producto a VentaX
                                    </button>
                                 </div>
                             </>
                         ) : (
                             // Mostrar mensaje si NO se ha seleccionado un producto aún
                             <div style={{ flex: 4, fontSize: '0.9rem', color: '#ffcc80', display: 'flex', alignItems: 'center' }}>
                                 Seleccione un producto de la lista de abajo.
                             </div>
                         )}
                    </div>
                )}

                {/* Formulario para agregar ítem personalizado (Condicional - SIN VALIDACION FRONTAL) */}
                {itemTypeToAdd === 'custom' && (
                     <div key="add-custom-item-form" style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
                         <div style={{ flex: 3 }}>
                             <label htmlFor="item-custom-descripcion">Descripción:</label>
                             <input
                                 type="text"
                                 id="item-custom-descripcion"
                                 name="Descripcion_Personalizada"
                                 value={newItemCustomData.Descripcion_Personalizada}
                                 onChange={handleNewItemCustomChange}
                                 disabled={savingData}
                                 // Eliminado el atributo 'required'
                                 // required
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
                                 // Eliminado el atributo 'required'
                                 // required
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
                                 // Eliminado el atributo 'required'
                                 // required
                             />
                         </div>
                           <div style={{ flex: 0.5 }}>
                               <label>Total Ítem:</label>
                               {/* Calcular Total Ítem basado en los valores actuales de Cantidad y Precio Unitario */}
                               <input
                                   type="text"
                                   value={parseFloat(parseFloat(newItemCustomData.Cantidad_Personalizada || 0) * parseFloat(newItemCustomData.Precio_Unitario_Personalizada || 0)).toFixed(2)}
                                   readOnly
                                   disabled={true}
                                    style={{ backgroundColor: '#3a3a3a', color: '#e0e0e0', borderBottomColor: '#424242' }}
                               />
                           </div>
                         <div>
                             {/* El botón de agregar ítem personalizado ya no tiene validaciones frontales */}
                             {/* Se habilita si no se está guardando */}
                             <button type="button" onClick={handleAddItem} disabled={savingData}>
                                 Agregar Ítem Personalizado a VentaX
                             </button>
                         </div>
                     </div>
                )}


            </div>


            {/* --- Lista de Productos para Seleccionar (Filtrada por el input - Similar a VentaItemsEditor) --- */}
            {/* Mostrar esta lista solo si se está agregando un ítem de producto */}
            {itemTypeToAdd === 'product' && (
                 <div style={{ marginTop: '20px' }}>
                    <h4>Seleccione un Producto:</h4>
                    {/* Mostrar mensaje si no hay productos cargados inicialmente */}
                    {/* Considerar si loading de ListaVentasX debería pasar a este componente */}
                    {/* Añadir comprobación de seguridad antes de acceder a length */}
                    {(!Array.isArray(productos) || productos.length === 0) && !savingData && <p style={{fontSize: '14px', color: '#ffcc80'}}>No hay productos disponibles. Asegúrese de que la lista de productos se cargue correctamente.</p>}

                    {/* Mostrar la lista filtrada/completa (displayList) si hay productos cargados inicialmente */}
                     {/* Añadir comprobación de seguridad antes de acceder a length */}
                     {Array.isArray(productos) && productos.length > 0 && (
                         Array.isArray(displayList) && displayList.length > 0 ? (
                             <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #424242', borderRadius: '4px', backgroundColor: '#2c2c2c' }}> {/* Contenedor con scroll y estilo oscuro */}
                                 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                     <thead>
                                         <tr>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Código</th>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Descripción</th>
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Tipo</th> {/* Mostrar Tipo */}
                                             <th style={{ textAlign: 'left', padding: '10px' }}>Precio Unitario Catálogo</th> {/* Mostrar Precio de catálogo */}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {/* Añadir comprobación de seguridad antes de mapear */}
                                         {Array.isArray(displayList) && displayList.map(producto => (
                                             <tr
                                                 key={producto.id}
                                                 onClick={() => handleProductSelect(producto)} // Manejar selección al hacer clic en la fila
                                                 style={{ cursor: 'pointer', borderBottom: '1px solid #424242' }}
                                                 onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#424242'} // Efecto hover en fila
                                                 onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                             >
                                                 <td style={{ padding: '10px' }}>{producto.codigo}</td>
                                                 <td style={{ padding: '10px' }}>{producto.Descripcion}</td>
                                                  <td style={{ padding: '10px' }}>{producto.tipo || 'N/A'}</td> {/* Mostrar Tipo */}
                                                 <td style={{ padding: '10px' }}>{producto.precio !== null ? parseFloat(producto.precio).toFixed(2) : 'N/A'}</td> {/* Mostrar Precio */}
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         ) : (
                              /* Mostrar mensaje si la lista filtrada está vacía pero hay productos cargados inicialmente */
                             productSearchTerm !== '' && !savingData && (
                                 <p style={{fontSize: '14px', color: '#ffcc80'}}>
                                     No se encontraron productos con "{productSearchTerm}".
                                 </p>
                             )
                         )
                     )}
                 </div>
            )}
            {/* --- Fin Lista de Productos para Seleccionar --- */}


            {/* Tabla de Ítems de la VentaX */}
            <div style={{ marginTop: '20px' }}>
                <h4>Lista de Ítems Vendidos (Venta X)</h4> {/* Updated UI text */}
                {/* Añadir comprobación de seguridad antes de acceder a length */}
                {Array.isArray(items) && items.length > 0 ? (
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
                            {/* Añadir comprobación de seguridad antes de mapear */}
                            {Array.isArray(items) && items.map((item, index) => {
                                // Buscar detalles del producto si es un ítem de tipo 'product'
                                // Añadir comprobación de seguridad antes de buscar en productos
                                const productDetails = item.type === 'product' && item.Producto_id !== null && Array.isArray(productos)
                                    ? productos.find(p => p.id === item.Producto_id)
                                    : null;

                                // Safely access numerical values
                                const cantidad = item.type === 'product' ? item.Cantidad : item.Cantidad_Personalizada;
                                const precioUnitario = item.type === 'product' ? item.Precio_Unitario_Venta : item.Precio_Unitario_Personalizada;
                                const totalItem = item.Total_Item; // Total_Item is already calculated and stored

                                return (
                                    // Usar el id del ítem si existe (al editar), sino el index
                                    <tr key={item.id || index}>
                                        <td>{item.type === 'product' ? 'Producto' : 'Personalizado'}</td> {/* Mostrar el tipo */}
                                        <td>
                                            {/* Mostrar detalle según el tipo de ítem */}
                                            {item.type === 'product'
                                                // Usar detalles encontrados o fallback a los del ítem si existen (para compatibilidad)
                                                ? `${productDetails?.codigo || item.codigo || 'N/A'} - ${productDetails?.Descripcion || item.Descripcion || 'N/A'}`
                                                : item.Descripcion_Personalizada || 'N/A'
                                            }
                                        </td>
                                        <td>
                                             {/* Display cantidad safely */}
                                            {cantidad !== null && cantidad !== undefined && !isNaN(parseFloat(cantidad)) ? parseFloat(cantidad) : 'N/A'}
                                        </td>
                                        <td>
                                             {/* Display precio unitario safely */}
                                            {precioUnitario !== null && precioUnitario !== undefined && !isNaN(parseFloat(precioUnitario)) ? parseFloat(precioUnitario).toFixed(2) : 'N/A'}
                                        </td>
                                        {/* Mostrar Total_Item (es común a ambos tipos) - Safely access and format */}
                                        <td>{totalItem !== null && totalItem !== undefined && !isNaN(parseFloat(totalItem)) ? parseFloat(totalItem).toFixed(2) : 'N/A'}</td>
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
                     // Mostrar este mensaje solo si items es un array vacío
                    Array.isArray(items) && items.length === 0 && <p>No hay ítems agregados a esta venta X.</p>
                )}
                {/* Mostrar un mensaje de error si items no es un array */}
                {!Array.isArray(items) && <p style={{ color: '#ef9a9a' }}>Error interno: La lista de ítems no es válida.</p>}
            </div>
        </>
    );
}

export default VentaItemsEditorX;
