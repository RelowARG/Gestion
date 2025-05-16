// src/components/presupuestos/PresupuestoShareModal.js
import React, { useEffect, useState, useRef } from 'react'; // Importar useRef

// Componente para mostrar el contenido de un presupuesto para compartir de forma estética
function PresupuestoShareModal({ presupuestoData, onClose, loading, error }) {
    // presupuestoData: Objeto con los datos completos del presupuesto a mostrar
    // onClose: Función para cerrar el modal
    // loading: Booleano que indica si se están cargando los datos
    // error: String con mensaje de error si ocurrió uno

    // Estado para el contenido formateado en texto (se mantiene para el botón Guardar .txt)
    const [formattedTextContent, setFormattedTextContent] = useState('');
    // Referencia al div del contido para obtener su HTML
    const contentRef = useRef(null);
    // Estado para loading específico del guardado PDF
    const [savingPdf, setSavingPdf] = useState(false);
    // Estado para error específico del guardado PDF
    const [savePdfError, setSavePdfError] = useState(null);


    useEffect(() => {
        // Generar el contenido formateado en texto solo si hay datos de presupuesto (para .txt)
        if (presupuestoData) {
            // --- Generar el contenido formateado en texto (para el botón Guardar .txt) ---
            let textContent = `PRESUPUESTO ${presupuestoData.Numero || ''}\n\n`;
            textContent += `Fecha: ${presupuestoData.Fecha || 'N/A'}\n`;
            textContent += `Validez de la oferta: ${presupuestoData.ValidezOferta || 'N/A'} días\n\n`;

            textContent += `Cliente:\n`;
            textContent += `  Empresa: ${presupuestoData.Nombre_Cliente || 'N/A'}\n`;
            textContent += `  CUIT: ${presupuestoData.Cuit_Cliente || 'N/A'}\n`;
            // Agregar solo Contacto y Email para el texto plano
            if (presupuestoData.Contacto_Cliente) {
                 textContent += `  Contacto: ${presupuestoData.Contacto_Cliente}\n`;
            }
            if (presupuestoData.Mail_Cliente) {
                 textContent += `  Email: ${presupuestoData.Mail_Cliente}\n`;
            }


            textContent += `\nElementos:\n`;
            if (presupuestoData.items && presupuestoData.items.length > 0) {
                 // Calculate column widths for better formatting in text - ADJUSTED FOR NEW COLUMNS
                 const colWidths = {
                     descripcion: 'Descripción'.length, // Updated header
                     cantidad: 'Cantidad'.length,
                     etiRollo: 'Eti x rollo'.length, // New column
                     precio: 'Precio Unitario (USD)'.length, // Updated header text
                     descuento: 'Descuento (%)'.length,
                     total: 'Total Elemento (USD)'.length,
                 };

                 presupuestoData.items.forEach(item => {
                      // Check Producto_id to determine item type for text content generation
                      const isProductItem = item.Producto_id !== null && item.Producto_id !== undefined;

                      const descripcion = isProductItem
                          ? `${item.codigo || ''} - ${item.Producto_Descripcion || item.Descripcion || ''}` // Use Producto_Descripcion if available, fallback to Descripcion
                          : item.Descripcion_Personalizada || '';
                      const cantidad = isProductItem ? item.Cantidad : item.Cantidad_Personalizada;
                      const etiRollo = isProductItem ? item.eti_x_rollo || 'N/A' : 'N/A'; // Get eti_x_rollo for products
                      const precioUnitario = isProductItem ? item.Precio_Unitario : item.Precio_Unitario_Personalizado;
                      const descuento = item.Descuento_Porcentaje || 0; // Discount applies to product items, default to 0 for custom in text
                      const totalItem = item.Total_Item || 0;


                     colWidths.descripcion = Math.max(colWidths.descripcion, String(descripcion).length);
                     colWidths.cantidad = Math.max(colWidths.cantidad, String(cantidad).length);
                     colWidths.etiRollo = Math.max(colWidths.etiRollo, String(etiRollo).length); // Calculate width for new column
                     colWidths.precio = Math.max(colWidths.precio, String(precioUnitario).length);
                     colWidths.descuento = Math.max(colWidths.descuento, String(descuento).length);
                     colWidths.total = Math.max(colWidths.total, String(totalItem).length);
                 });

                 // Add a little extra padding
                 colWidths.descripcion += 2;
                 colWidths.cantidad += 2;
                 colWidths.etiRollo += 2; // Add padding for new column
                 colWidths.precio += 2;
                 colWidths.descuento += 2;
                 colWidths.total += 2;


                 // Table Header - ADJUSTED FOR NEW COLUMNS
                 textContent += `| ${'Descripción'.padEnd(colWidths.descripcion)} | ${'Cantidad'.padEnd(colWidths.cantidad)} | ${'Eti x rollo'.padEnd(colWidths.etiRollo)} | ${'Precio Unitario (USD)'.padEnd(colWidths.precio)} | ${'Descuento (%)'.padEnd(colWidths.descuento)} | ${'Total Elemento (USD)'.padEnd(colWidths.total)} |\n`;
                 // Separator - ADJUSTED FOR NEW COLUMNS
                 textContent += `|${'-'.repeat(colWidths.descripcion + 2)}|${'-'.repeat(colWidths.cantidad + 2)}|${'-'.repeat(colWidths.etiRollo + 2)}|${'-'.repeat(colWidths.precio + 2)}|${'-'.repeat(colWidths.descuento + 2)}|${'-'.repeat(colWidths.total + 2)}|\n`;

                 // Table Rows - ADJUSTED FOR NEW COLUMNS
                 presupuestoData.items.forEach(item => {
                     // Check Producto_id to determine item type for text content generation
                     const isProductItem = item.Producto_id !== null && item.Producto_id !== undefined;

                     const descripcion = isProductItem
                         ? `${item.codigo || ''} - ${item.Producto_Descripcion || item.Descripcion || ''}`
                         : item.Descripcion_Personalizada || '';
                     const cantidad = isProductItem ? item.Cantidad : item.Cantidad_Personalizada;
                     const etiRollo = isProductItem ? item.eti_x_rollo || 'N/A' : 'N/A'; // Get eti_x_rollo for products
                     const precioUnitario = isProductItem ? item.Precio_Unitario : item.Precio_Unitario_Personalizado;
                     const descuento = item.Descuento_Porcentaje || 0; // Discount applies to product items, default to 0 for custom in text
                     const totalItem = item.Total_Item || 0;

                     textContent += `| ${String(descripcion).padEnd(colWidths.descripcion)} | ${String(cantidad).padEnd(colWidths.cantidad)} | ${String(etiRollo).padEnd(colWidths.etiRollo)} | ${String(precioUnitario).padEnd(colWidths.precio)} | ${String(descuento).padEnd(colWidths.descuento)} | ${String(totalItem).padEnd(colWidths.total)} |\n`;
                 });

             } else {
                 textContent += `No hay elementos en este presupuesto.\n`;
             }

            textContent += `\nTotales:\n`;
            textContent += `  Subtotal (USD): ${presupuestoData.Subtotal || 0}\n`;
            textContent += `  IVA (${presupuestoData.IVA_Porcentaje || 0}%): ${presupuestoData.IVA_Monto || 0} USD\n`;
            textContent += `  Otro (USD): ${presupuestoData.Otro_Monto || 0}\n`;
            textContent += `  Total (USD): ${presupuestoData.Total_USD || 0}\n`;
            textContent += `  Cotización Dólar: ${presupuestoData.Cotizacion_Dolar || 'N/A'}\n`;
            textContent += `  Total (ARS): ${presupuestoData.Total_ARS || 0}\n\n`;

            textContent += `Comentarios:\n${presupuestoData.Comentarios || 'N/A'}\n\n`;
            textContent += `Condiciones de Pago:\n${presupuestoData.CondicionesPago || 'N/A'}\n\n`;
            textContent += `Datos de Pago:\n${presupuestoData.DatosPago || 'N/A'}\n\n`;

            // --- Fin de la generación de contenido en texto ---
            setFormattedTextContent(textContent);
        } else {
            // Limpiar contenido formateado si no hay datos de presupuesto
            setFormattedTextContent('');
        }
    }, [presupuestoData]); // Regenerar contenido si cambian los datos del presupuesto

    // --- Función para guardar el contenido como .txt (Opcional, si quieres mantenerla) ---
    const handleSaveTextContent = () => {
       // ... (lógica para guardar .txt) ...
       if (!formattedTextContent || !presupuestoData) return;

        const numeroPresupuesto = presupuestoData.Numero || 'SinNumero';
        const nombreCliente = presupuestoData.Nombre_Cliente || 'SinCliente';
        // Limpiar el nombre del cliente para que sea un nombre de archivo válido
        const cleanNombreCliente = nombreCliente.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
        const fileName = `${numeroPresupuesto}-${cleanNombreCliente}.txt`;

        const blob = new Blob([formattedTextContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    };


    // --- Función para guardar como PDF ---
    const handleSavePdfContent = async () => {
        if (!presupuestoData || !contentRef.current) {
             setSavePdfError('No hay contenido para guardar como PDF.');
             return;
        }

        setSavingPdf(true);
        setSavePdfError(null);

        // Obtener el HTML del contenido visible en el modal
        const contentToPrint = contentRef.current.cloneNode(true);

        // --- MODIFICACION: Remover estilos del modal que afectan la impresión ---
        // Remover estilos directos del contenedor principal del modal-content
        // Estos estilos ya se anulan o no son relevantes para la impresión debido a @media print
        if (contentToPrint.style) {
             contentToPrint.style.maxHeight = 'none';
             contentToPrint.style.overflowY = 'visible';
             contentToPrint.style.boxShadow = 'none';
             contentToPrint.style.padding = '0';
             // No forzamos el fondo blanco y texto negro aquí para que el tema oscuro se mantenga si es el tema activo
             contentToPrint.style.backgroundColor = ''; // Limpiar fondo
             contentToPrint.style.color = ''; // Limpiar color
             contentToPrint.style.width = 'auto';
             contentToPrint.style.minWidth = 'auto';
             contentToPrint.style.maxWidth = 'none';
        }

        // Remover estilos de overflow/max-height de elementos específicos si los tienen
         const elementsWithScroll = contentToPrint.querySelectorAll('[style*="overflow"], [style*="max-height"]');
         elementsWithScroll.forEach(el => {
             el.style.overflow = 'visible';
             el.style.maxHeight = 'none';
         });

         // Remover estilos de display flex/grid que puedan interferir con el layout de impresión si es necesario
         // Esto es más complejo y depende de tus estilos CSS. Puedes necesitar un CSS de impresión más sofisticado.
         // Exemplo:
         // const flexContainers = contentToPrint.querySelectorAll('[style*="display: flex"]');
         // flexContainers.forEach(el => { el.style.display = 'block'; });


        // --- Agregar estilos CSS específicos para el PDF (@media print) ---
        // Estos estilos solo se inyectan para la generación del PDF
        const pdfPrintStyleTag = document.createElement('style');
        pdfPrintStyleTag.textContent = `
            /* Estilos específicos para impresión - Diseñados para PRESERVAR ESTRUCTURA, usar TEMA CLARO y OCULTAR SECCIONES */
            @media print {
                /* Asegurar que el body y el contenedor principal tengan fondos CLAROS y texto OSCURO */
                body {
                    margin: 0 !important; /* Eliminar márgenes */
                    padding: 0 !important; /* Eliminar relleno */
                    height: auto !important; /* Altura automática para que fluya el contenido */
                    /* Usar colores CLAROS para impresión */
                    -webkit-print-color-adjust: exact !important; /* Asegurar impresión de colores */
                    print-color-adjust: exact !important;
                    background-color: #ffffff !important; /* Fondo blanco */
                    color: #000000 !important; /* Texto negro */
                    width: 100% !important; /* Asegurar que el body utilice el ancho completo */
                    box-sizing: border-box !important;
                    min-width: 0 !important;
                    font-family: 'Roboto', sans-serif; /* Asegurar fuente */
                    font-size: 11pt; /* Tamaño de fuente común para impresión */
                    line-height: 1.5; /* Espaciado entre líneas */
                }

                .modal-overlay, .modal-content {
                    position: static !important;
                    width: 100% !important;
                    height: auto !important; /* Altura automática */
                    max-width: none !important;
                    max-height: none !important;
                    overflow: visible !important;
                    box-shadow: none !important;
                    /* Usar colores CLAROS para el contenido */
                    background-color: #ffffff !important; /* Fondo blanco */
                    color: #000000 !important; /* Texto negro */
                    padding: 0 !important; /* Eliminar relleno */
                    box-sizing: border-box !important;
                    margin: 0 !important; /* Eliminar margen */
                    float: none !important;
                }

                .button-area {
                    display: none !important; /* Ocultar botones */
                }

                /* Asegurar que los elementos de contenido interno se adapten al ancho disponible sin padding interno */
                .pdf-header,
                .pdf-section,
                table,
                .totals-section,
                .preformatted-text {
                    width: 100% !important;
                    box-sizing: border-box !important;
                    padding: 0 !important; /* Eliminar padding interno */
                }

                /* Ocultar secciones específicas */
                .print-hidden-section {
                    display: none !important;
                }


                /* Estilos para secciones y títulos en IMPRESION (Tema Claro) */
                .pdf-header {
                     display: flex; /* Mantener flexbox para la estructura */
                     justify-content: space-between;
                     align-items: center;
                     margin-bottom: 20px !important; /* Ajustar espacio */
                     border-bottom: 1px solid #eeeeee !important; /* Borde sutil claro */
                     padding-bottom: 10px !important; /* Ajustar padding */
                }

                .pdf-header h3 {
                    color: #000000 !important; /* Título negro */
                    font-size: 18pt !important; /* Tamaño de título */
                    margin: 0;
                    padding: 0;
                }

                .header-info {
                    font-size: 10pt !important; /* Tamaño de fuente */
                    text-align: right;
                    color: #333333 !important; /* Color para la info */
                }

                .header-info div {
                    margin-bottom: 2px !important; /* Espacio entre líneas */
                }

                .header-info strong {
                    font-weight: bold !important;
                    color: #000000 !important; /* Color para las etiquetas */
                }


                .pdf-section {
                    margin-bottom: 15px !important;
                    padding-top: 10px !important;
                    border-top: 1px dashed #eeeeee !important; /* Borde superior sutil */
                    page-break-inside: avoid; /* Evitar cortes */
                }

                .pdf-section:first-of-type {
                    border-top: none !important;
                    padding-top: 0 !important;
                }

                .section-title {
                    font-size: 14pt !important; /* Título de sección */
                    font-weight: bold !important;
                    color: #000000 !important; /* Título negro */
                    margin-top: 0 !important;
                    margin-bottom: 10px !important;
                    border-bottom: 1px solid #eeeeee !important; /* Borde bajo el título sutil */
                    padding-bottom: 4px !important;
                }

                /* Estilos para filas de detalle (Tema Claro) */
                .detail-row {
                    margin-bottom: 3px !important;
                    font-size: 11pt !important; /* Tamaño de fuente */
                    display: flex !important;
                    justify-content: space-between !important;
                    border-bottom: 1px dotted #dddddd !important; /* Borde punteado muy sutil */
                    padding-bottom: 1px !important;
                }

                .detail-row:last-child {
                     border-bottom: none !important;
                     padding-bottom: 0 !important;
                }

                .detail-label {
                    font-weight: bold !important;
                    color: #000000 !important; /* Color para etiquetas */
                    min-width: 100px !important; /* Ajustar ancho mínimo */
                    margin-right: 5px !important; /* Espacio reducido */
                    flex-shrink: 0 !important;
                    text-align: left !important;
                }
                .detail-row span {
                    word-break: break-word !important;
                    flex-basis: 50% !important;
                    text-align: right !important;
                    color: #333333 !important; /* Color para valores */
                }


                /* Estilos para tabla en IMPRESION (Tema Claro) */
                table {
                    border-collapse: collapse !important;
                    margin-top: 10px !important;
                    margin-bottom: 15px !important;
                    border: 1px solid #eeeeee !important; /* Borde general de tabla muy claro */
                    font-size: 10pt !important;
                    background-color: #ffffff !important; /* Fondo blanco */
                    box-shadow: none !important;
                    table-layout: auto !important;
                    page-break-inside: avoid;
                 }

                th, td {
                    text-align: left !important;
                    padding: 6px 8px !important; /* Ajustar padding */
                    border-bottom: 1px solid #eeeeee !important; /* Borde inferior de celda muy claro */
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    vertical-align: top !important;
                    color: #000000 !important;
                    background-color: transparent !important;
                }

                th {
                    background-color: #f5f5f5 !important; /* Ligero fondo para encabezado */
                    font-weight: bold !important;
                    font-size: 9pt !important;
                    text-transform: uppercase !important;
                    color: #000000 !important;
                    border-bottom: 1px solid #eeeeee !important; /* Borde bajo encabezado muy claro */
                }

                tbody tr:nth-child(even) {
                    background-color: #fafafa !important; /* Fondo alternado muy claro */
                }

                tbody tr:hover {
                    background-color: transparent !important; /* Remover hover */
                }


                /* Estilos para sección de totales (Tema Claro) */
                .totals-section {
                    margin-top: 15px !important;
                    border-top: 1px solid #eeeeee !important; /* Borde superior muy claro */
                    padding-top: 10px !important;
                    background-color: #f5f5f5 !important; /* Ligero fondo */
                    padding: 8px !important;
                    border-radius: 3px !important;
                    page-break-inside: avoid;
                }

                .total-row {
                    display: flex !important;
                    justify-content: space-between !important;
                    margin-bottom: 3px !important;
                    font-size: 11pt !important;
                    font-weight: bold !important;
                    color: #000000 !important;
                }

                .total-label {
                     font-weight: bold !important;
                     margin-right: 10px !important;
                     flex-basis: 50%;
                     text-align: left;
                     color: #000000 !important;
                }

                 .total-row span:last-child {
                     flex-basis: 50%;
                     text-align: right;
                     color: #000000 !important;
                 }

                /* --- NUEVO ESTILO PARA LA SECCIÓN DE CLIENTE EN PDF --- */
                .client-section {
                    margin-bottom: 15px !important; /* Mantener el espacio inferior */
                    padding: 8px !important; /* Padding dentro de la tarjeta */
                    background-color: #f5f5f5 !important; /* Fondo gris claro */
                    border-radius: 3px !important; /* Bordes redondeados suaves */
                    border: 1px solid #eeeeee !important; /* Borde sutil opcional */
                    page-break-inside: avoid; /* Evitar cortes en medio de la sección */
                }
                /* Asegurar que el título de la sección dentro de client-section use el color negro */
                 .client-section .section-title {
                     color: #000000 !important;
                 }
                 /* Asegurar que las filas de detalle dentro de client-section usen los colores correctos */
                 .client-section .detail-row span {
                      color: #333333 !important; /* Color para los valores */
                 }
                 .client-section .detail-label {
                      color: #000000 !important; /* Color para las etiquetas */
                 }


                /* Estilos para texto preformateado (Tema Claro) */
                .preformatted-text {
                    white-space: pre-wrap !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    font-family: sans-serif !important;
                    font-size: 10pt !important;
                    line-height: 1.5 !important;
                    color: #333333 !important;
                    background-color: #f5f5f5 !important;
                    border: 1px solid #eeeeee !important;
                    padding: 8px !important;
                    border-radius: 4px !important;
                    max-height: none !important;
                    overflow: visible !important;
                    page-break-inside: avoid;
                }

                /* Anulaciones adicionales para Tema Claro */
                p, div, span {
                    color: inherit !important; /* Heredar color */
                }

                a {
                    text-decoration: none !important;
                    color: inherit !important;
                }

                img {
                    display: inline-block !important;
                    max-width: 100% !important;
                    height: auto !important;
                }
            } /* Fin @media print */
        `;
        // Inyectar solo los estilos de impresión en el contenido para el PDF
        contentToPrint.insertBefore(pdfPrintStyleTag, contentToPrint.firstChild);


        const numeroPresupuesto = presupuestoData.Numero || 'SinNumero';
        const nombreCliente = presupuestoData.Nombre_Cliente || 'SinCliente';
        const cleanNombreCliente = nombreCliente.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
        const suggestedFileName = `${numeroPresupuesto}-${cleanNombreCliente}.pdf`;


        try {
            // Enviar el HTML modificado al proceso principal
            const response = await electronAPI.savePresupuestoPdf(contentToPrint.outerHTML, suggestedFileName);

            if (response.success) {
                console.log('PDF guardado exitosamente:', response.filePath);
            } else {
                console.error('Error al guardar PDF:', response.message);
                if (response.message !== 'canceled') {
                     setSavePdfError(`Error al guardar el PDF: ${response.message}`);
                } else {
                     console.log('Guardado de PDF cancelado por el usuario.');
                }
            }
        } catch (err) {
            console.error('Error IPC al guardar PDF:', err);
            setSavePdfError(`Error interno al intentar guardar el PDF: ${err.message}`);
        } finally {
            setSavingPdf(false);
        }
    };

    // --- Función para renderizar la tabla de elementos ---
    const renderItemsTable = (items) => {
        if (!items || items.length === 0) {
            return <p>No hay elementos en este presupuesto.</p>;
        }

        // Usar las clases CSS que definimos en el bloque <style> en el JSX
        return (
            <table>
                <thead>
                    <tr>
                        <th>Descripción</th> {/* Updated header */}
                        <th>Cantidad</th>
                        <th>Eti x rollo</th> {/* New column header */}
                        <th>Precio (USD)</th> {/* Updated header text */}
                        <th>Descuento (%)</th>
                        <th>Total (USD)</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        // Usar index como key temporal si no hay ID de ítem
                        <tr key={item.id || index}>
                            <td>
                                {/* Display Description based on item type (check Producto_id directly) */}
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? `${item.codigo || ''} - ${item.Producto_Descripcion || item.Descripcion || ''}` // Use Producto_Descripcion if available, fallback to Descripcion
                                    : item.Descripcion_Personalizada || ''
                                }
                            </td>
                            <td>
                                {/* Display Quantity based on item type (check Producto_id directly) */}
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? (item.Cantidad !== null && item.Cantidad !== undefined ? item.Cantidad : 'N/A')
                                    : (item.Cantidad_Personalizada !== null && item.Cantidad_Personalizada !== undefined ? item.Cantidad_Personalizada : 'N/A')
                                }
                            </td>
                            <td>
                                {/* Display Eti x rollo only for product items (check Producto_id directly) */}
                                {item.Producto_id !== null && item.Producto_id !== undefined ? item.eti_x_rollo || 'N/A' : 'N/A'}
                            </td>
                            <td>
                                {/* Display Unit Price based on item type, format to 2 decimals (check Producto_id directly) */}
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? (item.Precio_Unitario !== null && item.Precio_Unitario !== undefined && !isNaN(parseFloat(item.Precio_Unitario)) ? parseFloat(item.Precio_Unitario).toFixed(2) : 'N/A')
                                    : (item.Precio_Unitario_Personalizada !== null && item.Precio_Unitario_Personalizada !== undefined && !isNaN(parseFloat(item.Precio_Unitario_Personalizada)) ? parseFloat(item.Precio_Unitario_Personalizada).toFixed(2) : 'N/A')
                                }
                            </td>
                            <td>
                                {/* Display Discount (%) only for products (check Producto_id directly) */}
                                {item.Producto_id !== null && item.Producto_id !== undefined
                                    ? (item.Descuento_Porcentaje !== null && item.Descuento_Porcentaje !== undefined ? parseFloat(item.Descuento_Porcentaje).toFixed(2) : '0.00')
                                    : 'N/A'
                                }
                            </td>
                            <td>
                                {/* Display Total Item, format to 2 decimals */}
                                {item.Total_Item !== null && item.Total_Item !== undefined && !isNaN(parseFloat(item.Total_Item)) ? parseFloat(item.Total_Item).toFixed(2) : 'N/A'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };
    // --- Fin Función renderItemsTable ---


    // Estilos básicos para el modal y overlay (manejados con un esquema de color oscuro para la vista en pantalla)
    const modalOverlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)', // Overlay más oscuro
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    };

    const modalContentStyle = {
        backgroundColor: '#2c2c2c', // Fondo oscuro
        padding: '40px', // Más padding
        borderRadius: '10px', // Bordes más redondeados
        maxWidth: '90%', // Más ancho
        maxHeight: '90%', // Más alto
        overflowY: 'auto', // Mantener scroll para la vista en pantalla
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)', // Sombra más pronunciada y oscura
        color: '#e0e0e0', // Color de texto general claro
        fontFamily: "'Arial', sans-serif", // Fuente cambiada
        fontSize: '1.1rem', // Fuente un poco más grande
        lineHeight: '1.7',
        position: 'relative',
        minWidth: '600px', // Ancho mínimo para mejor presentación
        display: 'flex', // Usar flexbox para el contenido principal
        flexDirection: 'column', // Apilar secciones verticalmente
    };

    // Estilos para los botones en pantalla (Tema Oscuro)
    const buttonStyle = {
        padding: '10px 20px',
        borderRadius: '5px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, opacity 0.3s ease', // Añadir opacidad a la transición
    };

    // Los colores y fondos de los botones en pantalla se definirán en las clases CSS de abajo

    return (
        <div className="modal-overlay" style={modalOverlayStyle}>

            {/* Bloque de estilos CSS para la apariencia en pantalla (Tema Oscuro) y base para PDF (Tema Claro) */}
            {/* Estos estilos se renderizan con el componente. @media print anulará los estilos de pantalla. */}
             <style>{`
                /* Estilos generales para el contenido dentro del modal (Vista en pantalla - Tema Oscuro) */
                .modal-content {
                    /* Estilos ya definidos en modalContentStyle en línea (backgroundColor, color, font-family, padding, etc.) */
                    /* Asegurarse de que los estilos de flexbox también se apliquen si están definidos en modalContentStyle */
                }

                .pdf-container {
                    width: 100%;
                    margin: 0 auto;
                    padding: 0;
                }

                .pdf-header {
                     display: flex;
                     justify-content: space-between;
                     align-items: center; /* Alinear al centro verticalmente */
                     margin-bottom: 30px; /* Más espacio */
                     border-bottom: 2px solid #555; /* Borde más grueso y oscuro */
                     padding-bottom: 15px; /* Más padding */
                }

                .pdf-header h3 {
                    color: #ffffff; /* Título blanco */
                    font-size: 22px; /* Título más grande */
                    margin: 0;
                    padding: 0;
                    text-align: left;
                    flex-grow: 1;
                    font-weight: bold;
                }

                .header-info {
                    font-size: 14px; /* Tamaño de fuente */
                    text-align: right;
                    color: #bbb; /* Color para la info del header */
                }

                .header-info div {
                    margin-bottom: 4px; /* Más espacio entre líneas de info */
                }

                .header-info strong {
                    font-weight: bold;
                    color: #e0e0e0; /* Color para las etiquetas de info */
                }


                /* Estilos para secciones en PANTALLA (Tema Oscuro) */
                .pdf-section {
                    margin-bottom: 15px;
                    padding-top: 10px;
                    border-top: 1px dashed #444; /* Borde superior punteado oscuro */
                }

                 /* Ajuste específico para la sección de totales en PANTALLA */
                 .pdf-section.totals-section {
                     margin-bottom: 10px;
                 }

                .pdf-section:first-of-type {
                     border-top: none;
                     padding-top: 0;
                }


                /* Estilos para títulos de sección en PANTALLA (Tema Oscuro) */
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #ffffff; /* Título de sección blanco */
                    margin-top: 0;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #555; /* Borde bajo el título de sección oscuro */
                    padding-bottom: 5px;
                }

                /* Estilos para las filas de detalle en PANTALLA (Tema Oscuro) */
                .detail-row {
                    margin-bottom: 4px;
                    font-size: 14px;
                    display: flex;
                    justify-content: space-between;
                     border-bottom: 1px dotted #444; /* Borde punteado sutil oscuro */
                     padding-bottom: 2px;
                }

                .detail-row:last-child {
                     border-bottom: none;
                     padding-bottom: 0;
                }

                .detail-row span {
                    word-break: break-word;
                     flex-basis: 50%;
                     text-align: right;
                     color: #bbb; /* Color para el valor */
                }


                .detail-label {
                    font-weight: bold;
                    color: #e0e0e0; /* Color para las etiquetas */
                    min-width: 120px;
                    margin-right: 8px;
                    flex-shrink: 0;
                    text-align: left;
                }

                /* Estilos para tabla en PANTALLA (Tema Oscuro) */
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    margin-bottom: 15px;
                    border: 1px solid #555; /* Borde general de la tabla oscuro */
                    font-size: 0.9rem;
                }

                th, td {
                    text-align: left;
                    padding: 8px 10px;
                    border-bottom: 1px solid #444; /* Borde inferior de celda oscuro */
                    word-wrap: break-word;
                    vertical-align: top;
                    color: #e0e0e0; /* Color de texto para celdas */
                }

                th {
                    background-color: #3a3a3a; /* Fondo gris oscuro para header */
                    font-weight: bold;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    color: #ffffff; /* Texto blanco en header */
                    border-bottom: 1px solid #555; /* Borde más fino para header oscuro */
                }

                tbody tr:nth-child(even) {
                    background-color: #333; /* Fondo ligeramente más oscuro para filas pares */
                }

                 tbody tr:hover {
                     background-color: #444; /* Fondo al pasar el mouse */
                 }


                /* Estilos para la sección de totales en PANTALLA (Tema Oscuro) */
                .totals-section {
                    margin-top: 10px;
                    border-top: 1px solid #555;
                    padding-top: 8px;
                    background-color: #3a3a3a; /* Preservar fondo */
                    padding: 8px;
                    border-radius: 3px;
                }

                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 4px;
                    font-size: 0.9rem;
                    font-weight: bold;
                    color: #ffffff; /* Preservar color */
                }

                .total-label {
                     font-weight: bold;
                     margin-right: 10px;
                     flex-basis: 50%;
                     text-align: left;
                     color: #ffffff; /* Asegurar color */
                }

                 .total-row span:last-child {
                     flex-basis: 50%;
                     text-align: right;
                     color: #ffffff; /* Asegurar color */
                 }

                /* Estilos para la sección de cliente en PANTALLA (Tema Oscuro) - Puedes ajustarlos si quieres que la vista en pantalla también sea una tarjeta */
                 .client-section {
                     /* Por defecto, usa los estilos de .pdf-section */
                 }
                 /* Si quieres un estilo de tarjeta en pantalla también: */
                 /*
                 .client-section {
                     margin-bottom: 15px;
                     padding: 15px;
                     background-color: #3a3a3a;
                     border-radius: 8px;
                     border: 1px solid #555;
                 }
                 .client-section .section-title {
                     border-bottom: 1px solid #666;
                     margin-bottom: 15px;
                 }
                 .client-section .detail-row {
                      border-bottom: 1px dotted #555;
                      padding-bottom: 5px;
                      margin-bottom: 8px;
                 }
                  .client-section .detail-row:last-child {
                      border-bottom: none;
                      padding-bottom: 0;
                      margin-bottom: 0;
                 }
                 .client-section .detail-label {
                      color: #ffffff;
                 }
                 .client-section .detail-row span {
                     color: #e0e0e0;
                 }
                 */


                /* Estilos para texto preformateado en PANTALLA (Tema Oscuro) */
                .preformatted-text {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                    font-family: sans-serif;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    color: #bbb;
                    background-color: #3a3a3a;
                    border: 1px solid #555;
                    padding: 10px;
                    border-radius: 5px;
                    /* Estas propiedades se anulan para el PDF en @media print */
                }

                 /* Estilos para los botones en pantalla */
                .button-area button {
                    padding: 10px 20px;
                    border-radius: 5px;
                    border: none;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: bold;
                    transition: background-color 0.3s ease, opacity 0.3s ease;
                    margin-left: 10px;
                     color: #ffffff;
                }

                .button-area button:first-child {
                    margin-left: 0;
                }

                .button-area button.primary {
                     background-color: #5cb85c;
                }

                .button-area button.secondary {
                    background-color: #d9534f;
                }

                 .button-area button:disabled {
                     background-color: #555;
                     color: #aaa;
                     cursor: not-allowed;
                 }


                /* --- Estilos específicos para impresión (PDF) - TEMA CLARO --- */
                @media print {
                    /* Asegurar que el body y el contenedor principal tengan fondos CLAROS y texto OSCURO */
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important; /* Altura automática para que fluya el contenido */
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        background-color: #ffffff !important; /* Fondo blanco */
                        color: #000000 !important; /* Texto negro */
                        width: 100% !important;
                        box-sizing: border-box !important;
                        min-width: 0 !important;
                        font-family: 'Roboto', sans-serif;
                        font-size: 11pt;
                        line-height: 1.5;
                    }

                    .modal-overlay, .modal-content {
                        position: static !important;
                        width: 100% !important;
                        height: auto !important; /* Altura automática */
                        max-width: none !important;
                        max-height: none !important;
                        overflow: visible !important;
                        box-shadow: none !important;
                        background-color: #ffffff !important; /* Fondo blanco */
                        color: #000000 !important; /* Texto negro */
                        padding: 0 !important;
                        box-sizing: border-box !important;
                        margin: 0 !important;
                        float: none !important;
                    }

                    .button-area {
                        display: none !important; /* Ocultar botones */
                    }

                    /* Asegurar que los elementos de contenido interno se adapten al ancho disponible sin padding interno */
                    .pdf-header,
                    .pdf-section,
                    table,
                    .totals-section,
                    .preformatted-text {
                        width: 100% !important;
                        box-sizing: border-box !important;
                        padding: 0 !important; /* Eliminar padding interno */
                    }

                    /* Ocultar secciones específicas */
                    .print-hidden-section {
                        display: none !important;
                    }


                    /* Estilos para secciones y títulos en IMPRESION (Tema Claro) */
                    .pdf-header {
                         display: flex;
                         justify-content: space-between;
                         align-items: center;
                         margin-bottom: 20px !important;
                         border-bottom: 1px solid #eeeeee !important; /* Borde sutil claro */
                         padding-bottom: 10px !important;
                    }

                    .pdf-header h3 {
                        color: #000000 !important;
                        font-size: 18pt !important;
                        margin: 0;
                        padding: 0;
                    }

                    .header-info {
                        font-size: 10pt !important;
                        text-align: right;
                        color: #333333 !important;
                    }

                    .header-info div {
                        margin-bottom: 2px !important;
                    }

                    .header-info strong {
                        font-weight: bold !important;
                        color: #000000 !important;
                    }


                    .pdf-section {
                        margin-bottom: 15px !important;
                        padding-top: 10px !important;
                        border-top: 1px dashed #eeeeee !important; /* Borde superior sutil */
                        page-break-inside: avoid;
                    }

                    .pdf-section:first-of-type {
                        border-top: none !important;
                        padding-top: 0 !important;
                    }

                    .section-title {
                        font-size: 14pt !important;
                        font-weight: bold !important;
                        color: #000000 !important;
                        margin-top: 0 !important;
                        margin-bottom: 10px !important;
                        border-bottom: 1px solid #eeeeee !important; /* Borde bajo el título sutil */
                        padding-bottom: 4px !important;
                    }

                    /* Estilos para filas de detalle (Tema Claro) */
                    .detail-row {
                        margin-bottom: 3px !important;
                        font-size: 11pt !important;
                        display: flex !important;
                        justify-content: space-between !important;
                        border-bottom: 1px dotted #dddddd !important; /* Borde punteado muy sutil */
                        padding-bottom: 1px !important;
                    }

                    .detail-row:last-child {
                         border-bottom: none !important;
                         padding-bottom: 0 !important;
                    }

                    .detail-label {
                        font-weight: bold !important;
                        color: #000000 !important;
                        min-width: 100px !important;
                        margin-right: 5px !important;
                        flex-shrink: 0 !important;
                        text-align: left !important;
                    }
                    .detail-row span {
                        word-break: break-word !important;
                        flex-basis: 50% !important;
                        text-align: right !important;
                        color: #333333 !important;
                    }


                    /* Estilos para tabla en IMPRESION (Tema Claro) */
                    table {
                        border-collapse: collapse !important;
                        margin-top: 10px !important;
                        margin-bottom: 15px !important;
                        border: 1px solid #eeeeee !important; /* Borde general de tabla muy claro */
                        font-size: 10pt !important;
                        background-color: #ffffff !important; /* Fondo blanco */
                        box-shadow: none !important;
                        table-layout: auto !important;
                        page-break-inside: avoid;
                     }

                    th, td {
                        text-align: left !important;
                        padding: 6px 8px !important;
                        border-bottom: 1px solid #eeeeee !important; /* Borde inferior de celda muy claro */
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        vertical-align: top !important;
                        color: #000000 !important;
                        background-color: transparent !important;
                    }

                    th {
                        background-color: #f5f5f5 !important; /* Ligero fondo para encabezado */
                        font-weight: bold !important;
                        font-size: 9pt !important;
                        text-transform: uppercase !important;
                        color: #000000 !important;
                        border-bottom: 1px solid #eeeeee !important; /* Borde bajo encabezado muy claro */
                    }

                    tbody tr:nth-child(even) {
                        background-color: #fafafa !important; /* Fondo alternado muy claro */
                    }

                    tbody tr:hover {
                        background-color: transparent !important; /* Remover hover */
                    }


                    /* Estilos para sección de totales (Tema Claro) */
                    .totals-section {
                        margin-top: 15px !important;
                        border-top: 1px solid #eeeeee !important; /* Borde superior muy claro */
                        padding-top: 10px !important;
                        background-color: #f5f5f5 !important; /* Ligero fondo */
                        padding: 8px !important;
                        border-radius: 3px !important;
                        page-break-inside: avoid;
                    }

                    .total-row {
                        display: flex !important;
                        justify-content: space-between !important;
                        margin-bottom: 3px !important;
                        font-size: 11pt !important;
                        font-weight: bold !important;
                        color: #000000 !important;
                    }

                    .total-label {
                         font-weight: bold !important;
                         margin-right: 10px !important;
                         flex-basis: 50%;
                         text-align: left;
                         color: #000000 !important;
                    }

                     .total-row span:last-child {
                         flex-basis: 50%;
                         text-align: right;
                         color: #000000 !important;
                     }

                    /* --- NUEVO ESTILO PARA LA SECCIÓN DE CLIENTE EN PDF --- */
                    .client-section {
                        margin-bottom: 15px !important; /* Mantener el espacio inferior */
                        padding: 8px !important; /* Padding dentro de la tarjeta */
                        background-color: #f5f5f5 !important; /* Fondo gris claro */
                        border-radius: 3px !important; /* Bordes redondeados suaves */
                        border: 1px solid #eeeeee !important; /* Borde sutil opcional */
                        page-break-inside: avoid; /* Evitar cortes en medio de la sección */
                    }
                    /* Asegurar que el título de la sección dentro de client-section use el color negro */
                     .client-section .section-title {
                         color: #000000 !important;
                     }
                     /* Asegurar que las filas de detalle dentro de client-section usen los colores correctos */
                     .client-section .detail-row span {
                          color: #333333 !important; /* Color para los valores */
                     }
                     .client-section .detail-label {
                          color: #000000 !important; /* Color para las etiquetas */
                     }


                    /* Estilos para texto preformateado (Tema Claro) */
                    .preformatted-text {
                        white-space: pre-wrap !important;
                        word-wrap: break-word !important;
                        overflow-wrap: break-word !important;
                        font-family: sans-serif !important;
                        font-size: 10pt !important;
                        line-height: 1.5 !important;
                        color: #333333 !important;
                        background-color: #f5f5f5 !important;
                        border: 1px solid #eeeeee !important;
                        padding: 8px !important;
                        border-radius: 4px !important;
                        max-height: none !important;
                        overflow: visible !important;
                        page-break-inside: avoid;
                    }

                    /* Anulaciones adicionales para Tema Claro */
                    p, div, span {
                    color: inherit !important; /* Heredar color */
                    }

                    a {
                        text-decoration: none !important;
                        color: inherit !important;
                    }

                    img {
                        display: inline-block !important;
                        max-width: 100% !important;
                        height: auto !important;
                    }
                } /* Fin @media print */
            `}</style>


            {/* Asignar la referencia al div del contenido que se capturará */}
            {/* Aplicar estilos para la apariencia en pantalla aquí (Tema Oscuro) */}
            {/* Las clases CSS dentro de este div usarán los estilos definidos en el bloque <style> de arriba */}
            <div className="modal-content" style={modalContentStyle} ref={contentRef}>
                {/* --- Renderizar contenido condicionalmente basado en loading, error y presupuestoData --- */}
                {loading && <p style={{textAlign: 'center', color: '#bbb'}}>Cargando datos del presupuesto para compartir...</p>} {/* Color de texto claro */}
                {error && <p style={{ color: '#f08080', textAlign: 'center' }}>Error al cargar el presupuesto: {error}</p>} {/* Color de error rojo claro */}
                {!loading && !error && presupuestoData && (
                    <>
                        {/* Usar clases CSS para la estructura */}
                        <div className="pdf-header"> {/* Encabezado */}
                             <h3 className="pdf-title">PRESUPUESTO</h3>
                             <div className="header-info">
                                  <div><strong>N°</strong> {presupuestoData.Numero || ''}</div>
                                  <div>
                                      <div><strong>Fecha:</strong> {presupuestoData.Fecha || 'N/A'}</div>
                                      <div><strong>Validez de la oferta:</strong> {presupuestoData.ValidezOferta || 'N/A'} días</div>
                                  </div>
                             </div>
                        </div>

                        {/* --- Sección Cliente - MODIFICADA para mostrar solo Empresa, CUIT, Contacto y Mail --- */}
                        <div className="pdf-section client-section"> {/* Sección Cliente */}
                            <div className="section-title">Cliente</div>
                            <div className="detail-row">
                                <span className="detail-label">Empresa:</span>
                                <span>{presupuestoData.Nombre_Cliente || 'N/A'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">CUIT:</span>
                                <span>{presupuestoData.Cuit_Cliente || 'N/A'}</span>
                            </div>
                             {/* Mostrar solo Contacto si existe */}
                             {presupuestoData.Contacto_Cliente && (
                                <div className="detail-row">
                                    <span className="detail-label">Contacto:</span>
                                    <span>{presupuestoData.Contacto_Cliente}</span>
                                </div>
                             )}
                             {/* Mostrar solo Email si existe */}
                             {presupuestoData.Mail_Cliente && (
                                <div className="detail-row">
                                    <span className="detail-label">Email:</span>
                                    <span>{presupuestoData.Mail_Cliente}</span>
                                </div>
                             )}
                        </div>
                        {/* --- Fin Sección Cliente Modificada --- */}


                        <div className="pdf-section"> {/* Sección Elementos */}
                            <div className="section-title">Elementos</div>
                            {renderItemsTable(presupuestoData.items)} {/* renderItemsTable ya usa clases de tabla */}
                        </div>


                        <div className="pdf-section totals-section"> {/* Sección Totales */}
                            <div className="section-title">Totales</div>
                            <div className="totals-section"> {/* Usar clase para estilos de totales */}
                                <div className="total-row">
                                    <span className="total-label">Subtotal (USD):</span>
                                    <span>{presupuestoData.Subtotal !== null && presupuestoData.Subtotal !== undefined ? parseFloat(presupuestoData.Subtotal).toFixed(2) : 'N/A'}</span> {/* Ensure parsing and toFixed */}
                                </div>
                                <div className="total-row">
                                    <span className="total-label">IVA ({presupuestoData.IVA_Porcentaje !== null && presupuestoData.IVA_Porcentaje !== undefined ? parseFloat(presupuestoData.IVA_Porcentaje) : 0}%):</span> {/* Ensure parsing */}
                                    <span>{presupuestoData.IVA_Monto !== null && presupuestoData.IVA_Monto !== undefined ? parseFloat(presupuestoData.IVA_Monto).toFixed(2) : 'N/A'} USD</span> {/* Ensure parsing and toFixed */}
                                </div>
                                 <div className="total-row">
                                     <span className="total-label">Otro (USD):</span>
                                     <span>{presupuestoData.Otro_Monto !== null && presupuestoData.Otro_Monto !== undefined ? parseFloat(presupuestoData.Otro_Monto).toFixed(2) : 'N/A'}</span> {/* Ensure parsing and toFixed */}
                                 </div>
                                <div className="total-row">
                                    <span className="total-label">Total (USD):</span>
                                    <span>{presupuestoData.Total_USD !== null && presupuestoData.Total_USD !== undefined ? parseFloat(presupuestoData.Total_USD).toFixed(2) : 'N/A'}</span> {/* Ensure parsing and toFixed */}
                                </div>
                                 <div className="total-row">
                                     <span className="total-label">Cotización Dólar:</span>
                                     <span>{presupuestoData.Cotizacion_Dolar !== null && presupuestoData.Cotizacion_Dolar !== undefined ? parseFloat(presupuestoData.Cotizacion_Dolar).toFixed(2) : 'N/A'}</span> {/* Ensure parsing and toFixed */}
                                 </div>
                                <div className="total-row">
                                    <span className="total-label">Total (ARS):</span>
                                    <span>{presupuestoData.Total_ARS !== null && presupuestoData.Total_ARS !== undefined ? parseFloat(presupuestoData.Total_ARS).toFixed(2) : 'N/A'}</span> {/* Ensure parsing and toFixed */}
                                </div>
                            </div>
                        </div>

                        {/* SECCIONES A OCULTAR EN EL PDF */}
                        <div className="pdf-section comments-section print-hidden-section"> {/* Sección Comentarios */}
                            <div className="section-title">Comentarios</div>
                            <div className="preformatted-text">{presupuestoData.Comentarios || 'N/A'}</div> {/* Usar clase */}
                        </div>

                        <div className="pdf-section conditions-section print-hidden-section"> {/* Sección Condiciones de Pago */}
                            <div className="section-title">Condiciones de Pago</div>
                            <div className="preformatted-text">{presupuestoData.CondicionesPago || 'N/A'}</div> {/* Usar clase */}
                        </div>

                        <div className="pdf-section payment-section print-hidden-section"> {/* Sección Datos de Pago */}
                            <div className="section-title">Datos de Pago</div>
                            <div className="preformatted-text">{presupuestoData.DatosPago || 'N/A'}</div> {/* Usar clase */}
                        </div>

                    </>
                )}

            </div> {/* Fin del div con ref="contentRef" */}

            {/* Área de botones fuera del contenido a imprimir */}
            <div className="button-area" style={{
                 position: 'absolute',
                 bottom: '30px', // Ajustar posición
                 right: '40px', // Ajustar posición para que coincida con el padding del modal
                 textAlign: 'right',
                 zIndex: 1001,
                 width: 'auto', // Ajustar ancho
                 display: 'flex', // Usar flexbox para alinear botones
                 gap: '10px', // Espacio entre botones
                 flexWrap: 'wrap', // Permitir que los botones envuelvan si la pantalla es pequeña
                 justifyContent: 'flex-end', // Alinear botones a la derecha
            }}>
                 {/* Mostrar errores específicos del guardado PDF */}
                 {savePdfError && <p style={{ color: '#f08080', marginBottom: '15px', textAlign: 'right', width: '100%' }}>{savePdfError}</p>} {/* Color de error rojo claro */}
                 {/* Botón Guardar como Texto (opcional) */}
                 {/* <button className="secondary" onClick={handleSaveTextContent}>Guardar como Texto</button> */}
                 {/* BOTÓN GUARDAR COMO PDF */}
                 {!loading && !error && presupuestoData && (
                     <button
                         className="primary"
                         onClick={handleSavePdfContent}
                         disabled={savingPdf}
                     >
                         {savingPdf ? 'Generando PDF...' : 'Guardar como PDF'}
                     </button>
                 )}
                 <button
                     className="secondary"
                     onClick={onClose}
                 >
                     Cerrar
                 </button>
            </div>

        </div>
    );
}

export default PresupuestoShareModal;