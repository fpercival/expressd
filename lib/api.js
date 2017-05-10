const fs = require("fs");
const path = require("path");

const RestBuilder = require('./restbuilder');

function noop(){};

var authFunc = function(req, res, next){ next(); };

function HandlerFunction(thisObject, f){
    var owner = thisObject || {};
    var handler = function(req, res, next){
        const args = arguments;
        const f=handler.func;
        if(handler.isSecure){
            authFunc(req, res, function(authErr, authInfo){
                if(authErr) return res.json({error: authErr});
                if(authInfo) return res.json({error: authInfo});
                f.apply(owner, args);
            });
        } else {
            f.apply(owner, args);
        }
    };
    handler.setFunction = function(newFunc){
        handler.func = newFunc;
    };
    handler.func = f;
    return handler;
}

var API = function(app, express, basePath){
    var handlers = [];
    var self=this;
    this.express = express;
    const base = basePath || '/api';


    app.promise('api.auth.function').then(
        function(authF){
            authFunc = authF;
        }
    );

    function _hndlr(type, pathPre, isSecure){
        return function(path, func){
            var h = HandlerFunction(express, func);
            h.isSecure = isSecure;
            handlers.push( {path:path, handler:h} );
            express[type]( pathPre+path, h );
            h.type = type;
            return h;
        };
    }
    
    ['all', 'get', 'post', 'put', 'delete'].forEach( fn=>{
        self[fn+'Simple'] = _hndlr(fn, '', false);
        self[fn] = _hndlr(fn, base, false);
        self[fn+'Secure'] = _hndlr(fn, base, true);
    });
    
    self.createRest = function(name, storeObj, filters){
        return RestBuilder(self, storeObj, name, filters);
    };

    self.addHandler = function(handlerDef){
        let meths = handlerDef.method || 'get';
        meths = meths.split(',');

        meths.forEach(
            m => {
                let method = m.trim();
                if(handlerDef.ignoreBasePath){
                    method += "Simple";
                }
                let handler = self[method]( handlerDef.path, handlerDef.handler );
                handler.isSecure = handlerDef.secure || false;
            }
        );
    };

    self.addApiDir = function(dirPath){
        let rx = /api\..+\.(js|json)/i;
        if(fs.existsSync(dirPath)){
            let filepaths = fs.readdirSync(dirPath);
            filepaths.forEach(
                fnme => {
                    let fpath = path.join(dirPath, fnme);
                    let stat = fs.statSync(fpath);
                    if(stat.isFile() && fnme.match(rx)){
                        let handlerDefs = require(fpath);
                        if(!handlerDefs instanceof Array){
                            handlerDefs = [handlerDefs];
                        }
                        handlerDefs.forEach(
                            def => {
                                self.addHandler( def );
                            }
                        );
                    }
                }
            );
        }
    };
    
    self.get('/apihandlers', function(req, res){
        const ret = [];
        handlers.forEach(
            (h, i)=>{
                ret.push({
                    pos: i,
                    path: h.path,
                    type: h.handler.type,
                    f: ''+h.handler.func,
                    secure: h.handler.isSecure
                });
            }
        );
        res.json(ret);
    });
};


module.exports = API;

