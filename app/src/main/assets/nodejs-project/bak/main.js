var http = require('http');
var leftPad = require('left-pad');
var versions_server = http.createServer( (request, response) => {
    console.log("ZEZZ");
  response.end('Versions1: ' + JSON.stringify(process.versions) + ' left-pad: ' + leftPad(42, 5, '0'));
});
versions_server.listen(3000);