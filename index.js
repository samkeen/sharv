var Hapi = require('hapi');

var server = new Hapi.Server();
var uuid = require('node-uuid');
var r = require('rethinkdb');

var connection = null;
r.connect( {host: 'localhost', port: 28015, db: 'sharv'}, function(err, conn) {
    if (err) throw err;
    connection = conn;
});

server.connection({
    port: Number(process.argv[2] || 8111),
    host: "localhost"
});

server.views({
    engines: {
        html: require("handlebars")
    },
    relativeTo: __dirname,
    path: "views",
    layoutPath: "./views/layouts",
    layout: true,
    partialsPath: "./views/partials",
    helpersPath: "./views/helpers"
});

server.route({
    method: 'GET',
    path: '/hello',
    handler: function (request, reply) {
        reply.view('index', {title: 'sharv', body: 'Item Body'});
    }
});

server.route({
    method: 'POST',
    path: '/har',
    handler: function (request, reply) {

        var harId = uuid.v4();

        r.table('har').insert([
            {har_id: harId, content: request.payload, headers: request.headers}
        ]).run(connection, function(err, result) {
            if (err) throw err;
            console.log(JSON.stringify(result, null, 2));
        });

        reply.view('index', {title: 'sharv', body: uuid.v1(), "payload": JSON.stringify(request.payload)});
    }
});

server.start();