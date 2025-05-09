-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Tabla de Clientes
CREATE TABLE Clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Empresa TEXT NOT NULL,
    Cuit TEXT UNIQUE NOT NULL, -- Assuming Cuit is required and unique
    Contacto TEXT,
    Telefono TEXT,
    Mail TEXT,
    Direccion TEXT
);

-- Tabla de Ventas
CREATE TABLE Ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    Fecha TEXT,
    Fact_Nro TEXT UNIQUE, -- Assuming Fact_Nro is unique
    Cliente_id INTEGER, -- Link to Clientes table
    Estado TEXT, -- Consider adding CHECK constraints for allowed values ('entregado', 'en maquina', etc.)
    Pago TEXT, -- Consider adding CHECK constraints for allowed values ('abonado', 'seña', 'debe')
    Subtotal REAL, -- Will be calculated/managed by logic
    IVA REAL, -- Storing the IVA amount or the percentage? Let's store the percentage value selected.
    Total REAL, -- Will be calculated/managed by logic (Subtotal + IVA amount)
    FOREIGN KEY (Cliente_id) REFERENCES Clientes(id)
    -- Removed ventas_items dependency as it was not listed
);

-- Tabla de Productos
CREATE TABLE Productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE NOT NULL, -- Assuming codigo is required and unique
    Descripcion TEXT NOT NULL,
    eti_x_rollo REAL, -- Mapeado de 'Eti x rollo'
    costo_x_1000 REAL, -- Mapeado de 'Costo x 1.000'
    costo_x_rollo REAL, -- Storing the calculated value now as it's listed as a field
    precio REAL -- Mapeado de 'Precio'
    -- Removed categoria_id dependency as it was not listed
);

-- Removed all other tables from the original schema (usuarios, cotizaciones_dolar, expresos, categorias,
-- ventas_items, proveedores, competidores, presupuestos_cabecera, presupuestos_items,
-- compras_cabecera, compras_items, movimientos_stock, gastos_categorias, gastos,
-- precios_proveedor_producto, precios_competidor_producto)