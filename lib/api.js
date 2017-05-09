//const passport = require('./passport');

const RestBuilder = require('./restbuilder');

function noop(){};

var authFunc = function(req, res, next){ next(); };

function HandlerFunction(express, f){
    var handler = function(req, res, next){
        const args = arguments;
        const f=handler.func;
        if(handler.isSecure){
            authFunc(req, res, function(authErr, authInfo){
                if(authErr) return res.json({error: authErr});
                if(authInfo) return res.json({error: authInfo});
                f.apply(express, args);
            });
        } else {
            f.apply(express, args);
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

    app.emit('api.load');

/*
    express.use(passport.initialize());
    express.use(passport.session());
    // Use special function in passport to ensure error messages get forwarded to client
    authFunc = function(req, res, next){
        if(req.user){
            next();
        } else {
            passport.authenticate('local', function(err, user, info) {
                    if (err) { return next(err); }
                    if (!user) { return next(null, info); }
                    req.logIn(user, function(err) {
                        if (err) { return next(err); }
                        return next();
                    });
            })(req, res, next);
        }
    };
*/

    function _hndlr(type, pathPre, isSecure){
        return function(path, func){
            var h = HandlerFunction(express, func);
            h.isSecure = isSecure;
            handlers.push( {path:path, handler:h} );
            express[type]( pathPre+path, h );
            h.type = type;
            return h;
        };
    };
    
    ['all', 'get', 'post', 'put', 'delete'].forEach( fn=>{
        self[fn+'Simple'] = _hndlr(fn, '', false);
        self[fn] = _hndlr(fn, base, false);
        self[fn+'Secure'] = _hndlr(fn, base, true);
    });
    
    self.createRest = function(name, storeObj, filters){
        return RestBuilder(self, storeObj, name, filters);
    };
    
    self.get('/apihandlers', function(req, res){
        const ret = [];
        handlers.forEach(
            (h, i)=>{
                ret.push({
                    pos: i,
                    path: h.path,
                    type: h.handler.type,
                    secure: h.handler.isSecure
//                    code: ''+h.handler.func
                });
            }
        );
        res.json(ret);
    });
};


module.exports = API;

