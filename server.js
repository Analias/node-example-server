/* server.js - A simple node.js server.
 *
 * This file is licensed under the Created Commons Attribution 2.0 license.
 *
 * http://creativecommons.org/licenses/by/2.0/
 */

/**
 * @file
 * A simpile chat style server implementation that sets up a HTTP request
 * server that processes requests for client UI files, and a simple
 * socket server that handles client reqeusts and announcing (broadcasting)
 * client connections/disconnections and messages to all connected clients.
 */

var util = require('util');
var http = require('express').createServer();
var io = require('socket.io').listen(http);
var fs = require('fs');

util.log('Node version: ' + process.version);

http.listen(13157);

/**
 * Handle client HTTP requests for HTML and Javascript files.
 */
http.get(/\/(.*?\.(html|js))?/, function handler(req, res)
{
    util.debug('Request parameters ' + util.inspect(req.params, true, 2));
    
    var file = req.params[0] || 'index.html';
    var contentType = 'text/html';
    var path = __dirname + '/' + file;
    
    if (req.params[0]) 
        contentType = { 'html' : 'text/html', 
                        'js'   : 'text/javascript' }[req.params[1]] || 'text/plain';

    util.debug('Attempting to open path: [' + path + ']');

    fs.readFile(path, function(err, data)
    {
        if (err)
        {
            util.log('!!! Failed to load index.html!');
            util.log('!!! Err: ' + util.inspect(err));
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
    
        util.debug('Response content type: ' + contentType);

        res.writeHead(200, { 'Content-Type' : contentType });
        res.end(data);
    });
});

// Simple server state
var status = {
    connectionCount : 0,
    sessions : {},
    serverStartTime : new Date().getTime()
};

// Simple message queue.
var messages = [ 'Intitial message' ];

io.sockets.on('connection', function(socket) 
{ 
    util.debug('Connect established...');
    
    status.connectionCount++;
    status.sessions[socket.handshake.address.address+':'+socket.handshake.address.port] = socket.handshake;

    // Broadcast connection of client
    io.sockets.emit(100, { connected : socket.handshake });

    // Initialize client by sending all known messages
    socket.emit(200, messages);
    
    socket.on('disconnect', function()
    {
        status.connectionCount--;
        delete status.sessions[socket.handshake.address.address+':'+socket.handshake.address.port];
        
        // Broadcast client disconnect
        io.sockets.emit(100, { disconnected : socket.handshake } );
    });
    
    /**
     * Handle "GET STATUS" client event.
     */
    socket.on('GET STATUS', function()
    {
        util.debug('>>> GET STATUS');
        
        // Send current server status to client.
        socket.emit(200, { status : status });
    });

    /**
     * Handle 'GET MESSAGES' client event.
     */
    socket.on('GET MESSAGES', function()
    {
        util.debug('>>> GET MESSAGES');
        
        // Send all known messages to client.
        socket.emit(200, messages);
    });

    /**
     * Handle 'PUT MESSAGE', send message, client event.
     */
    socket.on('PUT MESSAGE', function(data)
    {
        util.debug('>>> PUT MESSAGE');
        
        // Add message back to known messages
        messages[messages.length] = data;
        
        // Acknowledge receipt of message to client.
        socket.emit(200, 'OK');
        
        // Send message to all connected clients.
        io.sockets.emit(100, data);
    });
    
    /**
     * Handle 'TEST BCAST', test broadcast, client event.
     */
    socket.on('TEST BCAST', function(data)
    {
        util.debug('>>> TEST BCAST');
        
        // Echo payload back to all clients.
        io.sockets.emit(100, { data : data });
    });
    
    /**
     * Handle 'TEST ERROR' client event.
     */
    socket.on('TEST ERROR', function(data)
    {
        util.debug('>>> TEST ERROR');
        
        // Echo requested error back to client
        socket.emit(data.error, 'Test Error');
    });
   
    /**
     * Send Ping (101) response to client.
     */
    function ping() 
    {
        socket.emit(101, { ping : { time : new Date().getTime() }} );
    }
    
    setInterval(ping, 5000);
});

/**
 * Handle client disconnect events.
 */
io.sockets.on('disconnect', function(socket)
{
    status.connectionCount--;
    delete status.sessions[socket.handshake.address.address+':'+socket.handshake.address.port];
    
    io.sockets.emit(100, { disconnected : socket.handshake } );
});


util.log('Server started - http://127.0.0.1:1337/');