
var model = {
    collection: {
        identity: 'session',
        connection: 'default',
        attributes: {
            sid: 'string',
            data: 'string'
        }
    },
    init: function(next){
//        this.destroy({}, function(){});
        next();
    },
    buildApi: function(api, store){
    }
};



module.exports = model;
