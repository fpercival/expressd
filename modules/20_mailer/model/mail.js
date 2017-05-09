
var model = {
        name: 'mailtemplates',
        collection: {
            identity: 'mailtemplates',
            connection: 'default',
            attributes: {
                name: {
                    type: 'string'
                },
                from: 'string',
                to: 'string',
                text: 'string',
                html: 'string',
                subject: 'string'
            }
        }
};



module.exports = model;
