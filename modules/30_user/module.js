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

    this.start = function(next, api, store){
        api.post('/user/register', function(req, res){
            var msg;
            var u = {
                email: req.body.email,
                name: req.body.name,
                password: req.body.password,
                salt: salt.new(),
            };
            msg = validateUser(u);
            if(msg){
                res.json({error: msg});
                return;
            }
            u.password = salt.salt(u.password, u.salt);
            
            store.user.findOne({where:{email:u.email}}, function(err, usr){
                if(err){
                    res.json({
                        error: ''+err
                    });
                } else if(usr){
                    res.json({
                        error: 'user.exists'
                    });
                } else {
                    u.confirmcode = salt.new(20, "1234567890abcdefghujklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" );
                    store.user.create(u, function(err, cusr){
                        if(err){
                            res.json({
                                error: ''+err
                            });
                        } else {
                            cusr.password = undefined;
                            cusr.salt = undefined;
                            app.promise('get.mailer').then(
                                mailer => {
                                    return mailer.sendTemplate('register', {
                                        u: cusr,
                                        url: `${req.protocol}://${req.hostname}:${req.app.settings.port}/user/confirm/`+u.confirmcode
                                    })    
                                }
                            ).then(()=>{
                                res.json({
                                    user: cusr
                                });
                            },
                            fail=>{
                                console.error(fail);
                                res.json({
                                    error: ''+fail
                                });
                            });
/*
res.json({
    user: cusr
});
*/
                        }
                    });
                }
            });
        });
        
        api.getSimple('/user/confirm/:code', function(req, res){
            var code = req.params.code;
            store.user.findOne({where:{confirmcode:code}}, function(err, usr){
                if(err){
                    return res.json({error: err});
                } else if(usr) {
                    usr.confirmcode='';
                    usr.save();
                    req.logIn(usr, function(err2) {
                        if (err) { return res.json({error: err2}); }
//                        return res.json({ok:true});
                        return res.redirect('/');
                    });
                } else {
                    return res.json({error: 'user.not.exist'});
                }
            });
        });
        
        api.postSecure('/user/login', function(req, res){
            res.json( req.user );
        });
        
        api.getSecure('/user/check', function(req, res){
            if(req.user){
                res.json( req.user );
            } else {
                res.json({error:'no.user'});
            }
        });

        next();
    };
}

module.exports = Users;
