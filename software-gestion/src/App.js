// src/App.js (Corregido - Error de renderizado de función en Route)
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Importar tus componentes
import Navbar from './components/Navbar';
import Home from './components/Home';
import ListaClientes from './components/ListaClientes';
import ListaVentas from './components/ListaVentas';
import ListaProductos from './components/ListaProductos';
import ListaProveedores from './components/ListaProveedores';
import ListaCompras from './components/ListaCompras';
import ListaStock from './components/ListaStock';
import ListaPresupuestos from './components/ListaPresupuestos';
import ListaVentasX from './components/ListaVentasX';
// Importar ListaVentasGlobal y el nuevo VentaEditor
import ListaVentasGlobal from './components/ListaVentasGlobal';
import VentaEditor from './components/ventas/VentaEditor';
import ListaVentasXGlobal from './components/ListaVentasXGlobal';
import ListaComprasGlobal from './components/ListaComprasGlobal';
import CashFlow from './components/CashFlow';
import Statistics from './components/Statistics';
import Balance from './components/Balance';
import Login from './components/Login';
import ListaUsuarios from './components/ListaUsuarios';

// Importar el archivo CSS
import './styles.css';

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        console.log('[App.js] Checking authentication state...');
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setIsAuthenticated(true);
                setUser(userData);
                console.log('[App.js] User found in localStorage, authenticated:', userData.username);
            } catch (e) {
                console.error('[App.js] Failed to parse user from localStorage', e);
                localStorage.removeItem('currentUser');
                setIsAuthenticated(false);
                setUser(null);
            }
        } else {
            console.log('[App.js] No user found in localStorage, not authenticated.');
            setIsAuthenticated(false);
            setUser(null);
        }
    }, []);

    const handleLoginSuccess = (userData) => {
        console.log('[App.js] Login successful, setting user:', userData);
        setIsAuthenticated(true);
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
    };

    const handleLogout = () => {
        console.log('[App.js] Logging out user:', user?.username);
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('currentUser');
    };

     const ProtectedRoute = ({ children }) => {
         if (!isAuthenticated) {
             return <Navigate to="/login" replace />;
         }
         return children;
     };


    return (
        <Router>
            <div className="app-container">
                {isAuthenticated && <Navbar onLogout={handleLogout} />}

                <div className="content">
                    <Routes>
                        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />

                        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                        <Route path="/clientes" element={<ProtectedRoute><ListaClientes /></ProtectedRoute>} />
                        <Route path="/proveedores" element={<ProtectedRoute><ListaProveedores /></ProtectedRoute>} />
                        <Route path="/ventas" element={<ProtectedRoute><ListaVentas /></ProtectedRoute>} />
                        <Route path="/compras" element={<ProtectedRoute><ListaCompras /></ProtectedRoute>} />
                        <Route path="/productos" element={<ProtectedRoute><ListaProductos /></ProtectedRoute>} />
                        <Route path="/stock" element={<ProtectedRoute><ListaStock /></ProtectedRoute>} />
                        <Route path="/presupuestos" element={<ProtectedRoute><ListaPresupuestos /></ProtectedRoute>} />
                        <Route path="/ventasx" element={<ProtectedRoute><ListaVentasX /></ProtectedRoute>} />

                        {/* --- Modificación CORREGIDA para la ruta /listados-ventas --- */}
                        {/* Creamos un componente funcional INLINE directamente como valor de la prop element */}
                        <Route
                            path="/listados-ventas"
                            element={
                                <ProtectedRoute>
                                    {/* Aquí está el componente funcional inline, notese que no está dentro de {} */}
                                    {(() => { // <--- Quitamos las llaves y el return explícito alrededor del componente interno
                                        // Estado local dentro de esta ruta para saber qué venta se está editando
                                        const [editingVentaId, setEditingVentaId] = useState(null);

                                        // Handlers para la comunicación entre componentes
                                        const handleEditFromGlobal = (ventaId) => {
                                            console.log("Solicitud de edición recibida en App.js para Venta ID:", ventaId);
                                            setEditingVentaId(ventaId);
                                        };

                                        const handleCancelEdit = () => {
                                            console.log("Edición cancelada. Volviendo a la lista.");
                                            setEditingVentaId(null);
                                        };

                                        const handleSaveSuccess = () => {
                                            console.log("Cambios guardados exitosamente. Volviendo a la lista.");
                                            setEditingVentaId(null);
                                        };

                                        // Renderizar condicionalmente VentaEditor o ListaVentasGlobal
                                        return (
                                            editingVentaId ? (
                                                <VentaEditor
                                                    ventaId={editingVentaId}
                                                    onCancel={handleCancelEdit}
                                                    onSaveSuccess={handleSaveSuccess}
                                                />
                                            ) : (
                                                <ListaVentasGlobal onEditSale={handleEditFromGlobal} />
                                            )
                                        );
                                    })()} {/* <--- Agregamos los parentesis para LLAMAR a la función inmediatamente */}
                                </ProtectedRoute>
                            }
                        />
                        {/* --- Fin Modificación CORREGIDA --- */}


                        <Route path="/listados-ventasx" element={<ProtectedRoute><ListaVentasXGlobal /></ProtectedRoute>} />
                        <Route path="/listados-compras" element={<ProtectedRoute><ListaComprasGlobal /></ProtectedRoute>} />
                        <Route path="/cashflow" element={<ProtectedRoute><CashFlow /></ProtectedRoute>} />
                        <Route path="/balance" element={<ProtectedRoute><Balance /></ProtectedRoute>} />
                        <Route path="/estadisticas" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
                        <Route path="/usuarios" element={<ProtectedRoute><ListaUsuarios /></ProtectedRoute>} />

                         {isAuthenticated && <Route path="/login" element={<Navigate to="/" replace />} />}

                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;