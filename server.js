require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const rooms = {}; // Objeto para almacenar las salas y sus jugadores


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: 'http://localhost:4200', // Permitir conexiones desde tu frontend
        methods: ['GET', 'POST'],
    }
});

const hostname = '127.0.0.1';
const port = 3000;

// Conexión a MongoDB Atlas
mongoose.connect(process.env.BASEDEDATOS)
    .then(() => {
        console.log('✅ Conexión exitosa a MongoDB Atlas');
    })
    .catch((error) => {
        console.error('❌ Error al conectar con MongoDB Atlas:', error);
    });

// Middlewares
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rutas
const entradasRoutes = require('./routes/entradas');
app.use('/entradas', entradasRoutes);

// Ruta base
app.get('/', (req, res) => {
    res.send('Servidor backend funcionando correctamente');
});


// ------------------ CONFIGURACIÓN DE WEBSOCKETS ------------------



io.on('connection', (socket) => {
    console.log(`⚡ Usuario conectado: ${socket.id}`);

    // Crear sala
    socket.on('createRoom', (roomCode, playerName) => {
        if (!rooms[roomCode]) {
            rooms[roomCode] = { players: [playerName] };
            socket.join(roomCode);
            console.log(`✅ Sala creada: ${roomCode}`);
            io.to(roomCode).emit('roomCreated', roomCode);
        } else {
            console.log(`❌ Sala ya existente: ${roomCode}`);
        }
    });

    // Unirse a la sala
    socket.on('joinRoom', (gameCode, playerName) => {
        if (!rooms[gameCode]) {
            rooms[gameCode] = { players: [] }; // Crear la sala si no existe
        }
        rooms[gameCode].players.push({ id: socket.id, name: playerName });
        socket.join(gameCode); // Unir al usuario a la sala en el backend
        console.log(`Jugador ${playerName} se unió a la sala ${gameCode}`);
        // Emitir evento a todos los clientes en la sala para actualizar la lista de jugadores
        io.to(gameCode).emit('updatePlayers', rooms[gameCode].players)
    });

    // Iniciar el juego
    socket.on('startGame', (gameCode) => {
        if (rooms[gameCode]) {
            // Si la sala existe, iniciar el juego
            io.to(gameCode).emit('gameStarted'); // Emitir evento de inicio a todos en la sala
            console.log(`Juego iniciado en la sala ${gameCode}`);
        } else {
            console.log(`❌ Sala no encontrada: ${gameCode}`);
            socket.emit('error', 'Sala no encontrada');
        }
    });

    io.on('connection', (socket) => {
        console.log(`⚡ Usuario conectado: ${socket.id}`);
    
        // Crear sala
        socket.on('createRoom', (roomCode, playerName) => {
            if (!rooms[roomCode]) {
                rooms[roomCode] = { players: [playerName] };
                socket.join(roomCode);
                console.log(`✅ Sala creada: ${roomCode}`);
                io.to(roomCode).emit('roomCreated', roomCode);
            } else {
                console.log(`❌ Sala ya existente: ${roomCode}`);
            }
        });
    
        // Unirse a la sala
        socket.on('joinRoom', (gameCode, playerName) => {
            if (!rooms[gameCode]) {
                rooms[gameCode] = { players: [] }; // Crear la sala si no existe
            }
            rooms[gameCode].players.push({ id: socket.id, name: playerName });
            socket.join(gameCode); // Unir al usuario a la sala en el backend
            console.log(`Jugador ${playerName} se unió a la sala ${gameCode}`);
            // Emitir evento a todos los clientes en la sala para actualizar la lista de jugadores
            io.to(gameCode).emit('updatePlayers', rooms[gameCode].players);
        });
    
        // Iniciar el juego
        socket.on('startGame', (gameCode) => {
            if (rooms[gameCode]) {
                // Si la sala existe, iniciar el juego
                io.to(gameCode).emit('gameStarted'); // Emitir evento de inicio a todos en la sala
                console.log(`Juego iniciado en la sala ${gameCode}`);
            } else {
                console.log(`❌ Sala no encontrada: ${gameCode}`);
                socket.emit('error', 'Sala no encontrada');
            }
        });
    
        // Escuchar actualizaciones de la tabla
        socket.on('updateTable', (gameCode, updatedData) => {
            if (rooms[gameCode]) {
                // Emitir la actualización a todos los jugadores en la sala
                io.to(gameCode).emit('tableUpdated', updatedData);
                console.log(`Tabla actualizada en la sala ${gameCode}`);
            } else {
                console.log(`❌ Sala no encontrada: ${gameCode}`);
                socket.emit('error', 'Sala no encontrada');
            }
        });
    });
});

// ------------------ INICIAR EL SERVIDOR ------------------
server.listen(port, hostname, () => {
    console.log(`✅ Servidor corriendo en http://${hostname}:${port}/`);
});


