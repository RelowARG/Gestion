// src/App.js (Updated - Authentication Logic and Routes)
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Importa Navigate para redirección

// Import your components
import Navbar from './components/Navbar';
import Home from './components/Home';
import ListaClientes from './components/ListaClientes';
import ListaVentas from './components/ListaVentas';
import ListaProductos from './components/ListaProductos'; // Asegúrate de que las rutas de importación sean correctas
import ListaProveedores from './components/ListaProveedores';
import ListaCompras from './components/ListaCompras';
import ListaStock from './components/ListaStock';
import ListaPresupuestos from './components/ListaPresupuestos';
import ListaVentasX from './components/ListaVentasX';
import ListaVentasGlobal from './components/ListaVentasGlobal';
import ListaVentasXGlobal from './components/ListaVentasXGlobal';
import ListaComprasGlobal from './components/ListaComprasGlobal';
import CashFlow from './components/CashFlow';
import Statistics from './components/Statistics';
import Balance from './components/Balance';
import Login from './components/Login'; // <-- Importar el componente Login
import ListaUsuarios from './components/ListaUsuarios';

// Import the CSS file
import './styles.css';

function App() {
    // Estado para controlar si el usuario está autenticado y quién es
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null); // Almacenar la información del usuario autenticado

    // Efecto para comprobar la autenticación al cargar la aplicación
    useEffect(() => {
        console.log('[App.js] Checking authentication state...');
        // Intentar obtener la información del usuario desde localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                // Opcional: podrías añadir una verificación aquí (ej. un token expirado si usas JWT)
                setIsAuthenticated(true);
                setUser(userData);
                console.log('[App.js] User found in localStorage, authenticated:', userData.username);
            } catch (e) {
                console.error('[App.js] Failed to parse user from localStorage', e);
                // Limpiar localStorage si los datos son inválidos
                localStorage.removeItem('currentUser');
                setIsAuthenticated(false);
                setUser(null);
            }
        } else {
            console.log('[App.js] No user found in localStorage, not authenticated.');
            setIsAuthenticated(false);
            setUser(null);
        }
    }, []); // Este efecto se ejecuta solo una vez al montar el componente

    // Función que se llama desde el componente Login al iniciar sesión con éxito
    const handleLoginSuccess = (userData) => {
        console.log('[App.js] Login successful, setting user:', userData);
        setIsAuthenticated(true);
        setUser(userData);
        // Almacenar la información del usuario en localStorage
        localStorage.setItem('currentUser', JSON.stringify(userData));
    };

    // Función para cerrar sesión
    const handleLogout = () => {
        console.log('[App.js] Logging out user:', user?.username);
        setIsAuthenticated(false);
        setUser(null);
        // Eliminar la información del usuario de localStorage
        localStorage.removeItem('currentUser');
        // Opcional: Redirigir al usuario a la página de login después de cerrar sesión
        // navigate('/login'); // Puedes usar navigate si usas useNavigation hook aquí o envolver App en otro componente de navegación
    };

     // Componente de envoltura para proteger rutas
     const ProtectedRoute = ({ children }) => {
         if (!isAuthenticated) {
             // Si no está autenticado, redirigir a la página de login
             return <Navigate to="/login" replace />;
         }
         // Si está autenticado, renderizar los componentes hijos
         return children;
     };


    return (
        <Router>
            <div className="app-container">
                {/* Mostrar Navbar solo si el usuario está autenticado */}
                {isAuthenticated && <Navbar onLogout={handleLogout} />} {/* Pasa la función de logout a Navbar (necesitarás añadir un botón de logout en Navbar) */}

                <div className="content">
                    <Routes>
                        {/* Ruta para el Login - siempre accesible */}
                        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />

                        {/* Rutas protegidas - envueltas por ProtectedRoute */}
                        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                        <Route path="/clientes" element={<ProtectedRoute><ListaClientes /></ProtectedRoute>} />
                        <Route path="/proveedores" element={<ProtectedRoute><ListaProveedores /></ProtectedRoute>} />
                        <Route path="/ventas" element={<ProtectedRoute><ListaVentas /></ProtectedRoute>} />
                        <Route path="/compras" element={<ProtectedRoute><ListaCompras /></ProtectedRoute>} />
                        <Route path="/productos" element={<ProtectedRoute><ListaProductos /></ProtectedRoute>} />
                        <Route path="/stock" element={<ProtectedRoute><ListaStock /></ProtectedRoute>} />
                        <Route path="/presupuestos" element={<ProtectedRoute><ListaPresupuestos /></ProtectedRoute>} />
                        <Route path="/ventasx" element={<ProtectedRoute><ListaVentasX /></ProtectedRoute>} />
                        <Route path="/listados-ventas" element={<ProtectedRoute><ListaVentasGlobal /></ProtectedRoute>} />
                        <Route path="/listados-ventasx" element={<ProtectedRoute><ListaVentasXGlobal /></ProtectedRoute>} />
                        <Route path="/listados-compras" element={<ProtectedRoute><ListaComprasGlobal /></ProtectedRoute>} />
                        <Route path="/cashflow" element={<ProtectedRoute><CashFlow /></ProtectedRoute>} />
                        <Route path="/balance" element={<ProtectedRoute><Balance /></ProtectedRoute>} />
                        <Route path="/estadisticas" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
                        <Route path="/usuarios" element={<ProtectedRoute><ListaUsuarios /></ProtectedRoute>} /> {/* Añadir la ruta para la gestión de usuarios */}

                        {/* Si el usuario está autenticado y navega a /login, redirigirlo a la página principal */}
                         {isAuthenticated && <Route path="/login" element={<Navigate to="/" replace />} />}


                        {/* Puedes añadir una ruta 404 si lo deseas */}
                        {/* <Route path="*" element={<NotFoundPage />} /> */}

                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;