const fs = require("fs");
const path = require("path");

const log = require('nodeutils').log.create('expressd:modules');

function ObjectFunctionItterator(objs, functionName){
    let fname = functionName;
    let args = [];
    let eachFunc;
    let errorFunc;
    let completeFunc;

    for(let i=2; i<arguments.length; i++){
        args.push( arguments[i] );
    }

    this.call = function(funcName){
        fname = funcName || fname;
        return this;
    };

    this.error = function(func){
        errorFunc = func || errorFunc;
        return this;
    };

    this.each = function(func){
        eachFunc = func || eachFunc;
        return this;
    };

    this.done = function(func){
        completeFunc = func || completeFunc;
        return this;
    };

    this.arguments = function(){
        if(arguments.length==1 && arguments[0] instanceof Array){
            args = arguments[0];
        } else {
            args = [].slice.apply(arguments);
        }
        return this;
    };

    this.args = this.arguments;

    this.exec = function(){
        let proceed = true;
        function canProceed(vl){
            if(vl!=undefined){
                proceed = vl;
            }
        }
        for(let i=0; i<objs.length && proceed; i++){
            let obj = objs[i];
            if(typeof obj[fname] == "function"){
                try {
                    if(fname){
                        canProceed( obj[fname].apply(obj, args) );
                    }
                } catch(ex) {
                    if(errorFunc){
                        canProceed( errorFunc( ex, obj, i ) );
                    } else {
                        console.error( ex );
                    }
                }
            }
            if(proceed && eachFunc){
                canProceed( eachFunc( obj, i ) );
            }
        }
        if(proceed && completeFunc){
            completeFunc();
        }
        return this;
    };

    this.sync = function(){
        let proceed = true;
        function canProceed(vl){
            if(vl!=undefined){
                proceed = vl;
            }
        }
        let prm = new Promise(function(resolve, reject){
            let i=-1;
            function nxt(vl){
                i++;
                if(vl!=undefined){
                    proceed = vl;
                }
                // Because nothing happens in loop after nxt() is called, we need to do this retrospectively.
                if(proceed && eachFunc && i>0){
                    canProceed( eachFunc( objs[i-1], nxt, i-1 ) );
                }
                if(i<objs.length && proceed){
                    let obj = objs[i];
                    if(typeof obj[fname] == "function"){
                        try {
                            obj[fname].apply(obj, args);
                        } catch(ex) {
                            if(errorFunc){
                                canProceed( errorFunc( ex, obj, i ) );
                            } else {
                                reject(ex);
                            }
                        }
                    } else {
                        nxt();
                    }
                } else {
                    resolve();
                }
            }
            args.unshift(nxt);
            nxt();
        });
        return prm;
    };
}

function ModuleLoader(){
    let modules = [];

    function sort(){
        if(modules.length>1){
            modules.sort(
                (a,b)=>{
                    let ret = a.order-b.order;
                    if(ret==0){
                        ret = a.name.localeCompare(b.name);
                    }
                    return ret;
                }
            );
        }
    }

    function nameExists(name){
        for(let i=0; i<modules.length; i++){
            if(modules[i].name==name){
                return true;
            }
        }
        return false;
    }

    function fromDir(dirPath, name){
        let indexFile = path.join(dirPath, 'module.js');
        let module;
        log.debug('loading from', dirPath, name);
        if(fs.existsSync(indexFile)){
            module = require(indexFile);
            if(module){
                if(typeof module == "function"){
                    module = new module();
                }
                module.name = module.name || name;
                if( nameExists(module.name) ){
                    log.error(`Module ${module.name} already loaded. Not loading ${dirPath}`);
                } else {
                    module.order = Number(module.order) || 999;
                    module.path = dirPath;
                    log.debug('loaded', module.name);
                    modules.push(module);
                }
            }
        }
    }

    this.modulesFromDir = function(dirPath){
        log.debug('scanning', dirPath );
        if(fs.existsSync(dirPath)){
            let filepaths = fs.readdirSync(dirPath);
            filepaths.forEach(
                fnme => {
                    let fpath = path.join(dirPath, fnme);
                    let stat = fs.statSync(fpath);
                    if(stat.isDirectory()){
                        fromDir(fpath, fnme);
                    }
                }
            );
            sort();
        }
    };

    this.init = function(){
        modules.forEach(
            m => {
                if(typeof m.init == "function"){
                    m.init.apply(m, arguments);
                }
            }
        );
    };

    this.callOnEach = function(){
        let itt = this.callItterate.apply(this, arguments);
        itt.exec();
    };

    this.callItterate = function(functionName){
        let itterator = new ObjectFunctionItterator(modules, functionName);
        if(arguments.length>1){
            let args = [].slice.apply(arguments, [1]);
            itterator.args(args);
        }
        return itterator;
    };

    this.each = this.callItterate;
}



module.exports = ModuleLoader;

