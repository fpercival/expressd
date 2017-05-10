let config = require('json_config');
let log = require('nodeutils').log;

let APP = require('./index');

config.init('.');

log.setFilter(config.log.filter||'*');
log.setLevel(config.log.level || 'info');

let app = new APP(config);

app.start();

