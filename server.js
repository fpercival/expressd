let config = require('json_config');

let APP = require('./index');

config.init('.');

let app = new APP(config);

app.start();

