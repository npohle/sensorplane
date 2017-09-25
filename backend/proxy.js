
//Lightsail StartUp Script for Amazon Linux AMI

//sudo yum install nodejs npm -y --enablerepo=epel
//sudo npm install forever -y -g
//wget -P /home/ec2-user https://s3.amazonaws.com/sensorplane-deploy/proxy.js 
//sudo forever start /home/ec2-user/proxy.js

var http = require('http');
var https = require('https');

var server = http.createServer(function (request, response) {

    if (request.method == 'POST') {

        var req_body = '';

        request.on('data', function (data) {
            req_body += data;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (req_body.length > 1e6)
                request.connection.destroy();
        });

        request.on('end', function () {

			var post_options = {
				host: 'api.sensorplane.io',
				port: 443,
				path: request.url,
				method: 'POST',
				headers: {
				  'Content-Type': 'application/json; charset=utf-8',
				  'Content-Length': Buffer.byteLength(req_body)
				}
			};

			console.log("Request:", post_options);
			var post_req = https.request(post_options, function(res) {

				var body='';

				res.setEncoding('utf8');
				
				res.on('data', function (chunk) {
				  console.log('Response: ' + chunk);
				  body += chunk;
				});

				res.on('end', function () {
					console.log("start sending response to client");
					response.writeHead(200, {"Content-Type": "text/json"});
					response.end(body)
				});

			});

			// post the data
			console.log("Request: ", req_body);
			post_req.write(req_body);
			post_req.end();

			post_req.on('error', function(e) {
				console.log(e);
			});

        });
    }


    if (request.method == 'GET') {
		var options = {
			host: 'api.sensorplane.io',
			port: 443,
			path: request.url,
			method: 'GET'
		};

		var get_req = https.request(options, function(res) {
			console.log(res.statusCode);
			
			var body='';
			
			res.on('data', function(d) {
				body += d;
			});

			res.on('end', function() {
				response.writeHead(200, {"Content-Type": "text/json"});
				response.end(body)
			});
		});
		get_req.end();

		get_req.on('error', function(e) {
			console.log(e);
		});
	}

});

server.listen(80);
console.log("Node.js is listening on port 80");