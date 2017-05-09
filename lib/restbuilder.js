const nextr = require('nodeutils').nextr;
const extend = require('nodeutils').extend;

function dbresp(res, handler, onError){
    return function(err, result){
        if(err){
            res.json({error: err});
            if(onError) onError(err);
        } else {
            handler(result);
        }
    };
}

function buildArray(req){
    var arr=[],
        itm = req.body.item;
    if(itm instanceof Array){
        arr = itm;
    } else if(itm) {
        arr.push(itm);
    }
    return arr;
}

function RestBuilder(api, storeObj, name, filters){
    var rt={};
    var f=filters||{};
    var base = '/'+name+'/';

    function getFilter(name, req, res){
        var ext = f[name] || f.all;
        if(typeof ext == "function"){
            ext = ext(req, res);
        }
        return ext;
    }

    function extendFilter(fltr, name, req, res){
        var ext = getFilter(name, req, res);
        if(ext){
            extend(fltr, ext);
        }
    }
    
    rt.get = api.get(base+':id', function(req, res){
        var id = req.params.id;
        var fltr = {where:{}};
        extendFilter(fltr, 'get', req, res);
        if(id) fltr.where.id = id;
        storeObj.findOne(fltr, dbresp(res, 
            item => {
                if(item instanceof Array && id && item.length){
                    res.json(item[0]);
                } else {
                    res.json(item);
                }
            }
        ));
    });
    
    rt.gets = api.get(base, function(req, res){
        var id = req.params.id;
        var fltr = {where:{}};
        extendFilter(fltr, 'gets', req, res);
        storeObj.find(fltr, dbresp(res, 
            item => {
                if(item instanceof Array && id && item.length){
                    res.json(item[0]);
                } else {
                    res.json(item);
                }
            }
        ));
    });
    
    rt.post = api.postSecure(base, function(req, res){
        var arr = buildArray(req);
        nextr(arr,
            (newObj, next, indx)=>{
                arr[indx] = undefined;
                extendFilter(newObj, 'post', req, res);
                storeObj.create(newObj, dbresp(res,
                    dbObj => {
                        arr[indx] = dbObj;
                        next();
                    },
                    err => {
                        next(true);
                    }
                ));
            },
            rslt=>{
                res.json(arr);
            }
        );
    });
    
    rt.put = api.putSecure(base, function(req, res){
        var arr = buildArray(req);
        nextr(arr,
            (item, next, indx)=>{
                var fltr = {where:{id:item.id}};
                extendFilter(fltr, 'put', req, res);
                arr[indx] = undefined;
                storeObj.update(fltr, item, dbresp(res,
                    dbObj => {
                        arr[indx] = dbObj;
                        next();
                    },
                    err => {
                        next(true);
                    }
                ));
            },
            rslt=>{
                res.json(arr);
            }
        );
    });
    
    rt.deleteId = api.deleteSecure(base+':id', function(req, res){
        var id = req.params.id;
        var fltr = {where:{id:id}};
        extendFilter(fltr, 'delete', req, res);
        storeObj.destroy(fltr, dbresp(res,
            dbObj => {
                res.json({ok:true});
            },
            err => {
                res.json({error:err});
            }
        ));
    });
    
    rt.delete = api.deleteSecure(base, function(req, res){
        var arr = buildArray(req);
        nextr(arr,
            (item, next, indx)=>{
                var fltr = {where:{id:item.id}};
                extendFilter(fltr, 'delete', req, res);
                arr[indx] = undefined;
                storeObj.destroy(fltr, dbresp(res,
                    dbObj => {
                        arr[indx] = dbObj;
                        next();
                    },
                    err => {
                        next(true);
                    }
                ));
            },
            rslt=>{
                res.json(arr);
            }
        );
    });
    
    
    return rt;
}



module.exports = RestBuilder;
