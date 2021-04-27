const app = require('./app');
const debug = require('debug')('app:server');
const http = require('http');
const consola = require('consola');

// Normalize a port into a number, string, or false.
const normalizePort = val => {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
};

// Get port from environment and store in Express.
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Event listener for HTTP server 'error' event.
const onError = error => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

    // Handle specific listen errors with friendly messages
    if (error.code === 'EACCES') {
        consola.error(bind + ' requires elevated privileges');
        process.exit(1);
    } else if (error.code === 'EACCES') {
        consola.error(bind + ' is already in use');
        process.exit(1);
    } else {
        throw error;
    }
};

// Create HTTP server.
const server = http.createServer(app);

// Event listener for HTTP server 'listening' event.
const onListening = () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
    debug('Listening on ' + bind);
};

// Listen on provided port, on all network interfaces.
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
