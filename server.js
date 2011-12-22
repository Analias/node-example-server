var util = require('util');
var http = require('express').createServer();
var io = require('socket.io').listen(http);
var fs = require('fs');

util.log('Node version: ' + process.version);

http.listen(1337);

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

var status = {
    connectionCount : 0,
    sessions : {},
    serverStartTime : new Date().getTime()
};

var messages = [ 'Intitial message' ];

io.sockets.on('connection', function(socket) 
{ 
    util.debug('Connect established...');
    
    status.connectionCount++;
    status.sessions[socket.handshake.address.address+':'+socket.handshake.address.port] = socket.handshake;

    io.sockets.emit(100, { connected : socket.handshake });

    socket.emit(200, messages);
    
    socket.on('disconnect', function()
    {
        status.connectionCount--;
        delete status.sessions[socket.handshake.address.address+':'+socket.handshake.address.port];
        
        io.sockets.emit(100, { disconnected : socket.handshake } );
    });
    
    socket.on('GET STATUS', function()
    {
        util.debug('>>> GET STATUS');
        socket.emit(200, { status : status });
    });

    socket.on('GET MESSAGES', function()
    {
        util.debug('>>> GET MESSAGES');
        socket.emit(200, messages);
    });

    socket.on('PUT MESSAGE', function(data)
    {
        util.debug('>>> PUT MESSAGE');
        
        messages[messages.length] = data;
        
        socket.emit(200, 'OK');
        io.sockets.emit(100, data);
    });
    
    socket.on('TEST BCAST', function(data)
    {
        util.debug('>>> TEST BCAST');
        io.sockets.emit(100, { data : data });
    });
    
    socket.on('TEST ERROR', function(data)
    {
        util.debug('>>> TEST ERROR');
        socket.emit(data.error, 'Test Error');
    });
    
    function ping() 
    {
        socket.emit(101, { ping : { time : new Date().getTime() }} );
    }
    
    setInterval(ping, 5000);
});


io.sockets.on('disconnect', function(socket)
{
    status.connectionCount--;
    delete status.sessions[socket.handshake.address.address+':'+socket.handshake.address.port];
    
    io.sockets.emit(100, { disconnected : socket.handshake } );
});


util.log('Server started - http://127.0.0.1:1337/');