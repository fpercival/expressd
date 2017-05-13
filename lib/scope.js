const path = require('path');

let log = require('nodeutils').log.create('expressd:scope');

const fs = require("fs");

function funcinfos(f){
    let fs = (''+f).trim();
    let pre = fs.match(/(.*?)\{/i)[1];
    let sp = pre.length+1; //fs.indexOf('{');
    let ep = fs.lastIndexOf('}');
    let args = pre.match(/.*?\((.*?)\)/i)[1].replace(/\s/ig,'').split(/\,\s*?/g);
    let b = fs.substr(sp, ep-sp);
    return {
        args: args,
        name: pre.match( /(.*?)\(/i )[1].trim().split(/\s/i).pop(),
        body: b,
        buildFunction: function(){
            let fargs = args.slice();
            fargs.push(b);
            return Function.apply( null, fargs );
        }
    }
}


function Scope(){

    this.context={};

    this.prepare = function(fnc){
        return new ScopeFunction(this, fnc)
    };

    this.exec = function(fnc, ext){
        let f = this.prepare(fnc);
        return f.exec(ext);
    };

    this.addFromDir = function(dirPath){
        if(fs.existsSync(dirPath)){
            let rx = /(.+)\.(js)/i;
            let filepaths = fs.readdirSync(dirPath);
            filepaths.forEach(
                fnme => {
                    let fpath = path.join(dirPath, fnme);
                    let stat = fs.statSync(fpath);
                    if(stat.isFile()){
                        let m = fnme.match(rx);
                        if(m){
//                            let fnc = ''+fs.readFileSync(fpath);
////                            fnc = fnc.replace(/\n/gi, '');
//                            let sf = funcinfos(fnc);
                            let mod = require(fpath);
                            let name = m[1].trim().replace(/\s+/i, '_');
                            this.context[name] = mod; //sf.buildFunction();
                        }
                    }
                }
            );
        }
    };
}

function ScopeFunction(scope, func){
    let info = funcinfos(func);
    let f = func;

    if(typeof func == "string"){
        f = info.buildFunction();
    }
//    let fstr = "return (function("+info.args.join(', ')+"){"+info.body+"}).apply(this, arguments)";
//    let fstr = "return function("+info.args.join(', ')+"){"+info.body+"}; ";
//    f = new Function(fstr)();
//      eval("f = function("+info.args.join(', ')+"){"+info.body+"}; ");
//    f.name = info.name;

    this.exec = function(extend){
        let args=[];
        let ext = extend || {};
        info.args.forEach(
            (argName) => {
                args.push( ext[argName] || scope.context[argName]);
            }
        );
        return f.apply(scope, args);
    };
    this.args = info.args;
    this.name = info.name;
    this.body = info.body;
    this.function = f;
}

let scopes={};

let GlobalScope = new Scope();

module.exports = {
    globaal: GlobalScope,
    create: function(scopename){
        if(!scopename){
            return new Scope();
        }
        let sc = scopes[scopename];
        if(!sc){
            sc = new Scope();
            scopes[scopename] = sc;
        }
        return sc;
    },
    remove: function(scopename){ return scopes[scopename]=undefined },
    get: function(scopename){ return scopes[scopename] }
};

