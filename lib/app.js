const EventEmitter = require('events');
const path = require('path');
const util = require('util');

const config = require('json_config');

const express = require('express');
const bodyParser = require("body-parser");

let extend = require('nodeutils').extend;
let logger = require('nodeutils').log;
let log = logger.create('expressd:app');

let ModuleLoader = require('./moduleloader');
let PromiseEmitter = require('onpromise');
let Store = require('./store');
const API = require('./api');
const Scope = require('./scope');

function getOptions(options){
    let opts = options;
    if(!opts || typeof opts=="string"){
        let cfg={};
        if(__dirname != process.cwd()){
            config.init( path.join(__dirname, '..') );
        }
        config.init( process.cwd(), opts );
        extend(cfg, config);
        opts = cfg;
    }
    return opts;
}

function APP(options){
    EventEmitter.call(this);
    PromiseEmitter.call(this);
    
    let opts = getOptions( options );
    let baseDir = process.cwd();
    let store = new Store();
    let mloader = new ModuleLoader();
    let api;

    this.logger = logger;

    function getdir(src){
        if(path.isAbsolute(src)){
            return src;
        } else {
            return path.resolve( baseDir, src );
        }
    }

    if(opts.log){
        if(opts.log instanceof Array){
            opts.log.forEach(
                lg=>{
                    if(typeof lg == "string"){
                        logger.addFilter(lg);
                    } else {
                        logger.addFilter(lg.filter, lg.level);
                    }
                }
            );
        } else {
            logger.setFilter(opts.log.filter||'*', opts.log.level || 'info');
            logger.setLevel(opts.log.level || 'info');
        }
    } else {
        logger.setFilter('*');
        logger.setLevel('info');
    }

    if(opts.baseDir){
        baseDir = getdir(opts.baseDir);
    }
    log.debug('baseDir', baseDir);

    let loadModules = ()=>{
        // Load user modules first so they have first shout at resolving promises thereby overriding the default modules
        let userDir;
        let appDir = path.join( __dirname, '../modules' );
        if(opts.moduleDir){
            opts.moduleDir.split(',').forEach(
                mdir => {
                    userDir = getdir( mdir.trim() );
                    if(userDir != appDir) {
                        mloader.modulesFromDir( userDir );
                    }
                }
            );
        } else {
            userDir = getdir( 'modules' );
            if(userDir != appDir) {
                mloader.modulesFromDir( getdir( 'modules' ) );
            }
        }
        mloader.modulesFromDir( appDir );
        let mods = [];
        mloader.callItterate('init').args(this, opts).each(
            m => {
                store.addModelsFromDir( path.join(m.path, 'model' ) );
                this.emit('module.loaded', m );
                mods.push(m);
            }
        ).sync().then(
            ()=>{
                this.emit('modules.loaded', mods);
            }
        );
    };

    this.start = ()=>{
        let self = this;
        let appName = opts.name || 'Expressd';
        let scope = Scope.create('_expressd');
        scope.context.promise = this.promise;
        scope.context.resolve = this.resolve;

        loadModules();

        let expressApp = express();
        expressApp.set('port', (process.env.PORT || opts.port || 3000 ));

        let staticRoot = getdir(opts.staticDir || 'html' );
        expressApp.use(express.static( staticRoot ));

        if(opts.express.bodyParser){
            for(let pn in opts.express.bodyParser){
                expressApp.use( bodyParser[pn](opts.express.bodyParser[pn]) );
            }
        }

        this.emit('express.loading', expressApp);

        api = new API(this, expressApp, opts.apiPath );
//        this.emit('api.ready', api );

        store.once('ready',
            (stores)=>{
                scope.context.store = stores;
                expressApp.use(
                    (req, res, next)=>{
                        req.orm = stores;
                        next();
                    }
                );

                store.buildApi(api);
                this.emit('store.ready', stores);
                mloader.callItterate('start').args(api, stores, this).each(
                    m => {
                        api.addApiDir( path.join(m.path, 'handlers') );
                        scope.addFromDir( path.join(m.path, 'controllers') );
                        this.emit('module.started', m.name);
                        log.info('Started module order:'+m.order, m.name, m.path );
                    }
                ).sync()
                .then(
                    ()=>{
                        expressApp.listen(expressApp.get('port'), function(){
                            this.emit('express.started', express );
                            log.info(appName + ' running on port', expressApp.get('port'));
                            this.emit('ready');
                        });
                        
                        expressApp.get('/*', function (req, res){
                            res.sendFile( path.join(staticRoot, opts.staticFile||'index.html' ) );
                        });
                    }
                );


            }
        );
        store.start( opts.db || opts.store );
    };
}

util.inherits(APP, EventEmitter, PromiseEmitter)

module.exports = APP;

