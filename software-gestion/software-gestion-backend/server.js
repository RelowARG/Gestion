// server.js (Modificado para incluir middleware de autenticación)
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt'); // <-- Importar bcrypt
const dbMiddleware = require('./db'); // Importa el middleware de DB

// Importa los módulos de rutas modularizados
const clientesRoutes = require('./routes/clientes');
const productosRoutes = require('./routes/productos');
const proveedoresRoutes = require('./routes/proveedores');
const gastosRoutes = require('./routes/gastos');
const stockRoutes = require('./routes/stock');
const presupuestosRoutes = require('./routes/presupuestos');
const ventasRoutes = require('./routes/ventas');
const ventasXRoutes = require('./routes/ventasx');
const cashflowRoutes = require('./routes/cashflow');
const estadisticasRoutes = require('./routes/estadisticas');
const balanceRoutes = require('./routes/balance');
const comprasRoutes = require('./routes/compras');
const usuariosRoutes = require('./routes/usuarios');


const app = express();
const port = 3001;

app.use(express.json());
app.use(cors()); // Considerar CORS más restrictivo en producción

// Usa el middleware de conexión a la base de datos
app.use(dbMiddleware);

// --- Middleware de autenticación ---
// Este middleware verifica si la solicitud tiene un encabezado 'Authorization'.
// Por ahora, solo verifica si existe y tiene un valor simple 'Bearer fake-token'.
// En una implementación real, aquí validarías un token JWT, de sesión, etc.
const authenticateToken = (req, res, next) => {
    // Permitir la ruta de login sin autenticación
    // NOTA: req.path contiene la ruta sin el prefijo '/api' si el middleware se usa en app.use('/api', ...)
    // O contiene la ruta completa si el middleware se usa en app.use(...)
    // Vamos a usarlo en app.use('/api', ...), por lo que req.path será la parte después de /api
    // Por lo tanto, verificamos si req.path es exactamente '/login'
    if (req.path === '/login') {
        console.log('[AuthMiddleware] Permitiendo acceso a /api/login sin token.');
        return next();
    }
     console.log(`[AuthMiddleware] Verificando token para ruta: ${req.method} ${req.path}`);


    const authHeader = req.headers['authorization'];
    // Esperamos el formato: Bearer TOKEN
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        // Si no hay token, denegar el acceso con 401 Unauthorized
        console.warn('[AuthMiddleware] Acceso denegado: Token no proporcionado.');
        return res.status(401).json({ error: 'No autenticado: Token no proporcionado.' });
    }

    // Aquí es donde, en un sistema real, validarías el token (ej: JWT)
    // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => { ... });
    // Para este ejemplo, solo verificamos si el token es nuestro 'fake-auth-token'.
    const FAKE_AUTH_TOKEN = 'fake-auth-token'; // <-- Define un token simple para probar

    if (token !== FAKE_AUTH_TOKEN) {
         // Si el token no coincide (en este ejemplo simple)
         console.warn('[AuthMiddleware] Acceso denegado: Token inválido.');
         return res.status(403).json({ error: 'No autorizado: Token inválido.' });
    }

    // Si el token es válido (en este ejemplo simple, si coincide),
    // puedes adjuntar información del usuario a req si la obtienes de un token JWT
    // req.user = user; // Por ejemplo, si usas JWT y verificas el payload del token

    console.log('[AuthMiddleware] Solicitud autenticada (fake) permitida.');
    next(); // Pasar al siguiente middleware o manejador de ruta
};

// Aplica el middleware de autenticación a todas las rutas bajo '/api'.
// El middleware mismo contiene la lógica para exceptuar la ruta de login.
app.use('/api', authenticateToken);
// --- FIN NUEVO Middleware de autenticación ---


// Monta los routers en sus rutas base correspondientes.
// Ahora, todas estas rutas estarán protegidas por el middleware `authenticateToken`.
// Nota: En este punto, los routers NO reciben `app` porque no se usaba broadcastUpdate aún.
app.use('/api/clientes', clientesRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/proveedores', proveedoresRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/presupuestos', presupuestosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/ventasx', ventasXRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/usuarios', usuariosRoutes);


// Ruta de login
app.post('/api/login', async (req, res) => {
    console.log('[LoginEndpoint] Solicitud de login recibida.');
    const { username, password } = req.body;
    console.log('[LoginEndpoint] Intentando iniciar sesión con usuario:', username);


    if (!username || !password) {
        console.warn('[LoginEndpoint] Validación fallida: Usuario o contraseña faltantes.');
        return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }

    try {
        console.log('[LoginEndpoint] Buscando usuario en la base de datos...');
        const [rows] = await req.db.execute('SELECT * FROM Usuarios WHERE username = ?', [username]);
        const user = rows[0];
        console.log('[LoginEndpoint] Resultado de búsqueda de usuario:', user ? 'Usuario encontrado' : 'Usuario no encontrado');


        if (!user) {
            console.warn('[LoginEndpoint] Intento de login fallido: Usuario no encontrado.');
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        }

        console.log('[LoginEndpoint] Comparando contraseñas...');
        const passwordMatch = await bcrypt.compare(password, user.password);
        console.log('[LoginEndpoint] Resultado comparación de contraseñas:', passwordMatch);


        if (passwordMatch) {
            // En una aplicación real, aquí generarías un token JWT
            // y lo enviarías de vuelta al cliente.
            // Por ahora, enviamos un mensaje de éxito y un "token" simple preestablecido.
             const FAKE_AUTH_TOKEN = 'fake-auth-token'; // <-- Define el mismo token simple aquí
             const userInfo = {
                 id: user.id,
                 username: user.username,
                 role: user.role,
                 // NO incluyas el hash de la contraseña
             };
             // Enviamos el token simple y la info básica del usuario en la respuesta.
             console.log('[LoginEndpoint] Contraseña correcta. Enviando respuesta de éxito.');
             res.json({ success: true, message: 'Inicio de sesión exitoso.', user: userInfo, token: FAKE_AUTH_TOKEN });

        } else {
            console.warn('[LoginEndpoint] Intento de login fallido: Contraseña incorrecta.');
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
        }

    } catch (error) {
        console.error('[LoginEndpoint] Error en el endpoint de login:', error);
        res.status(500).json({ error: 'Error interno del servidor al intentar iniciar sesión.' });
    }
});


// Ruta principal de la API
app.get('/api', (req, res) => {
    // Esta ruta ahora también requiere autenticación debido al middleware aplicado
    res.send('Backend de software-gestion V2 está funcionando modularmente (autenticado).');
});


// Inicia el servidor
app.listen(port, () => {
  console.log(`Backend de software-gestion V2 escuchando en http://localhost:${port}`);
});

// Manejo de cierre de DB si el proceso del servidor se detiene
process.on('SIGINT', async () => {
    console.log('Cerrando servidor y saliendo...');
    // Si usas un pool de conexiones, ciérralo aquí.
    process.exit(0);
});
