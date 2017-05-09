const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

var Waterline = require('waterline');

const nextr = require('nodeutils').nextr;
const log = require('nodeutils').log.create('expressd:store');

class StoreClass extends EventEmitter {
    constructor(){
        super();
        this.stores={};
        this.models=[];
    }
}

StoreClass.prototype.buildApi = function(api){
    this.models.forEach( m=>{
        if(m.buildApi) m.buildApi(api, this.stores);
    });
};

StoreClass.prototype.addModel = function(model, filePath){
    model.name = model.collection.identity;
    for(let i=0; i<this.models; i++){
        let m = this.models[i];
        if(m.name == model.name){
            log.error(`Model "${m.name}" in ${filePath} already added. Ignorring.`);
            return;
        }
    }
    extendStore(model.collection);
    this.models.push(model);
};

StoreClass.prototype.addModelsFromDir = function(dirPath){
    if(fs.existsSync(dirPath)){
        let modelFiles = fs.readdirSync( dirPath );
        modelFiles.forEach(
            mf => {
                var modelFile = require(  path.join(dirPath, mf) );
                if(modelFile.collection){
                    this.addModel( modelFile, path.join(dirPath, mf) );
                }
            }
        );
    }
};


StoreClass.prototype.start = function(config){
    this.emit('starting');
    
    this.waterline = new Waterline();
    
    this.models.forEach(
        m=> {
            m.identity = m.collection.identity;
            var collection = Waterline.Collection.extend( m.collection );
            this.waterline.loadCollection(collection);
        });


    var wlconfig = config;
    for(var pn in wlconfig.adapters){
        if(typeof wlconfig.adapters[pn] == "string"){
            wlconfig.adapters[pn] = require( wlconfig.adapters[pn] );
        } else {
            console.warn('wlconfig.adapters[pn] not a string.', pn, wlconfig.adapters[pn] );
        }
    }

    this.waterline.initialize(wlconfig, (err, ontology) => {
        if (err) {
            return console.error(err);
        }
    
        // Tease out fully initialised models.
        this.models.forEach(
            m => {
                this.stores[m.name] = ontology.collections[m.identity];
                extendStore( this.stores[m.name] );
            }
        );
    
        // Initialise models
        var timeOut;
        function _clearTimeout(){
            if(timeOut){
                clearTimeout(timeOut);
                timeOut = undefined;
            }
        }
        nextr(this.models, (m, nxt)=>{
            _clearTimeout();
            log.debug('Store init', m.name );
            if(m.init) {
                timeOut = setTimeout(()=>{
                    log.warn('model '+m.name+" failed to call next() in init(); ");
                    nxt();
                }, 20000);
                m.init.apply(this.stores[m.name], [nxt]);
            }
            else nxt();
        },
        ()=>{
            _clearTimeout();
            this.emit('ready',  this.stores );
            log.info('Store ready');
        });
    });
};

function extendStore(s){
    s.creates = function(itemArray, callback){
        var ret=[];
        nextr(itemArray,
            function(item, next){
                s.create(item, function(err, obj){
                    if(err){
                        if(callback) callback(err);
                        next(true);
                    } else {
                        ret.push(obj);
                        next();
                    }
                })
            }
            ,function(){
                if(callback) callback(null, ret);
            }
        );
    };
    s.updates = function(itemArray, callback){
        var ret=[];
        nextr(itemArray,
            function(item, next){
                s.update({where:{id:item.id}}, item, function(err, obj){
                    if(err){
                        if(callback) callback(err);
                        next(true);
                    } else {
                        ret.push(obj);
                        next();
                    }
                })
            }
            ,function(){
                if(callback) callback(null, ret);
            }
        );
    };
}


module.exports = StoreClass;

