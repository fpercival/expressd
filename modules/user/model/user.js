const salt = require('../salt');

var model = {
    collection: {
        identity: 'user',
        connection: 'default',
        attributes: {
            name: {
                type: 'string'
            },
            email: 'string',
            password: 'string',
            confirmcode: 'string',
            salt: 'string',

            toJSON: function() {
                let obj = this.toObject();
                delete obj.password;
                delete obj.salt;
                return obj;
            },
            passwordok: function(pwd){
                return pwd == salt.unsalt(this.password, this.salt);
            }
        }
    }
};

module.exports = model;
