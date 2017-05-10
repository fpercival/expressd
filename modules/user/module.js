const log = require('nodeutils').log.create('expressd:users');
const salt = require('./salt');


function validateUser(u){
    if(!u.name) return 'user.name.required';
    if(!u.email) return 'user.email.required';
    if(u.email.indexOf('@')<1) return 'user.email.invalid';
    if(!u.password) return 'user.password.required';
    if(u.password.length<8) return 'user.password.short';
    return false;
}

function Users(){
    let app;
    this.name = 'users';

    this.order = 30;

    this.init = function(next, _app, opts){
        app = _app;
        let appName = opts.mailer.appname || opts.name || 'Expressd';
        let noReply = opts.mailer.noreply || 'noreply@test.com';
        app.promise('get.mailer').then(
            mailer=>{
                // Register templates
                mailer.registerTemplate(
                    {
                        name: "register",
                        from: appName + ' <'+ noReply +'>',
                        to: '{{=it.u.email}}',
                        subject: appName+' Registration',
                        text: 'Hi {{=it.u.name}}, \n\n welcome to '+ appName + '. \n\n to confirm your registration, go to {{=it.url}} \n\n '+ appName + ' Team.',
                        html: 'Hi <b>{{=it.u.name}}</b>, \n\n welcome to '+ appName + '. \n\n to confirm your registration, click <a href=\"{{=it.url}}\">here</a>({{=it.url}}) \n\n '+ appName + ' Team.'
                    }
                ).then(
                    mailer.registerTemplate(
                        {
                            name: "resetPassword",
                            from: appName + ' <'+ noReply +'>',
                            to: '{{=it.u.email}}',
                            subject: appName + ' Password reset',
                            text: 'Hi {{=it.u.name}}, \n\n your password has been reset. \n\n The new password is \"{{=it.password}}\" \n\n '+ appName + ' Team.',
                            html: 'Hi <b>{{=it.u.name}}</b>, \n\n your password has been reset. \n\n The new password is <b>{{=it.password}}</b> \n\n '+ appName + ' Team.'
                        }
                    )
                );
            }
        );
        next();
    };
}

module.exports = Users;
