//This is just a server to use for testing. I was testing pm2 clustering with it.
var http = require('http');

http.createServer(function(req, res) {  
  res.writeHead(200);
  res.end("hello world\n");
}).listen(8000);