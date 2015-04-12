var Hapi = require('hapi');
var Good = require('good');

var uuid = require('node-uuid');
var r = require('rethinkdb');


var app_config = {
    app_name: 'sharv',
    host_name: 'localhost',
    default_port: 8111,
    logs_dir: './logs',
    db_host: 'localhost',
    db_port: 28015,
    db_name: 'sharv'
};

var mkdirp = require('mkdirp');
mkdirp(app_config.logs_dir, function (err) {
    if (err) {
        console.error("Error creating Logs directory at [" + app_config.logs_dir + "] : " + err);
    }
});

var server = new Hapi.Server();
server.connection({
    port: Number(process.argv[2] || app_config.default_port),
    host: app_config.host_name
});

var connection = null;
r.connect({host: app_config.db_host, port: app_config.db_port, db: app_config.db_name}, function (err, conn) {
    if (err) throw err;
    connection = conn;
});

var app_url = server.info.uri;

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
    path: '/',
    handler: function (request, reply) {
        reply.view('index', {title: app_config.app_name, body: 'README FOR APP'});
    }
});

server.route({
    method: 'GET',
    path: '/har/{har_id}',
    handler: function (request, reply) {

        r.table('har').filter(r.row('har_id').eq(request.params.har_id)).
            run(connection, function (err, cursor) {
                if (err) {
                    console.error(err);
                    reply.view('error', {
                        app_name: app_config.app_name,
                        body: 'There was an Error',
                        error: err.name + ": " + err.msg
                    });
                } else {
                    cursor.toArray(function (err, result) {
                        if (err) throw err;
                        reply.view('har_show', {
                            app_name: app_config.app_name,
                            body: 'Your HAR:',
                            har_payload: JSON.stringify(result[0].content, null, 2)
                        });
                    });
                }
            });
    }
});

server.route({
    method: 'POST',
    path: '/har',
    handler: function (request, reply) {

        var harId = uuid.v4();

        r.table('har').insert([
            {har_id: harId, content: request.payload, headers: request.headers}
        ]).run(connection, function (err, result) {
            if (err) {
                console.error(err);
                reply.view('error', {
                    title: app_config.app_name,
                    body: 'There was an Error',
                    error: err.name + ": " + err.msg
                });
            } else {
                reply.view('har_accepted', {
                    app_url: app_url,
                    app_name: app_config.app_name,
                    har_id: harId,
                    har_payload: JSON.stringify(result, null, 2)
                });
            }
        });
    }
});

/**
 * @see https://github.com/hapijs/good
 */
var options = {
    opsInterval: 30000, // every 30sec
    reporters: [{
        reporter: require('good-console'),
        events: {log: '*', response: '*'}
    }, {
        reporter: require('good-file'),
        events: {ops: '*'},
        config: './logs/ops.log'
    }, {
        reporter: require('good-file'),
        events: {log: '*', response: '*'},
        config: './logs/app.log'
    }
        //, {
        //    reporter: 'good-http',
        //    events: { error: '*' },
        //    config: {
        //        endpoint: 'http://prod.logs:3000',
        //        wreck: {
        //            headers: { 'x-api-key' : 12345 }
        //        }
        //    }
        //}
    ]
};

server.register({
    register: require('good'),
    options: options
}, function (err) {

    if (err) {
        console.error(err);
    }
    else {
        server.start(function () {

            console.info('Server started at ' + server.info.uri);
        });
    }
});
