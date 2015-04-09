var Hapi = require('hapi');

var server = new Hapi.Server();

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
        reply.view('index', { title: 'sharv', body: 'Item Body' });
    }
});

server.start();