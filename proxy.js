const http = require('http');

function onRequest(req, res) {
  console.log('serve: ' + req.url);
  if (req.url.indexOf('connector')==-1) return false;
  const options = {
    hostname: '127.0.0.1',
    port: 23119,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      //'authorization': 'Basic foobar',
	  'host': '127.0.0.1:23119'
    }
  };

  const proxy = http.request(options, function (r) {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res, {
      end: true
    });
  });

  req.pipe(proxy, {
    end: true
  });
}

http.createServer(onRequest).listen(80);
console.log('Listening on port 80')