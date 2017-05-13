const log = require('nodeutils').log.create('expressd:usersapi');
const salt = require('../salt');


function validateUser(u){
    if(!u.name) return 'user.name.required';
    if(!u.email) return 'user.email.required';
    if(u.email.indexOf('@')<1) return 'user.email.invalid';
    if(!u.password) return 'user.password.required';
    if(u.password.length<8) return 'user.password.short';
    return false;
}

module.exports = [
    {
        path: '/user/login',
        secure: true,
        method: 'post',
        handler: function(req, res){
            res.json( req.user );
        }
    },
    {
        path: '/user/logout',
        secure: true,
        method: 'get',
        handler: function(req, res){
            req.logOut && req.logOut();
            res.json({ok:true});
        }
    },
    {
        path: '/user/check',
        secure: false,
        method: 'get',
        handler: function(req, res){
            if(req.user){
                res.json( req.user );
            } else {
                res.json({error:'no.user'});
            }
        }
    },
    {
        path: '/user/confirm/:code',
        secure: false,
        method: 'get',
        ignoreBasePath: true,
        handler: function(req, res){
            let code = req.params.code;
            let store = req.orm;
            store.user.findOne({where:{confirmcode:code}}, function(err, usr){
                if(err){
                    return res.json({error: err});
                } else if(usr) {
                    usr.confirmcode='';
                    usr.save();
                    req.logIn(usr, function(err2) {
                        if (err) { return res.json({error: err2}); }
                        return res.redirect('/');
                    });
                } else {
                    return res.json({error: 'user.not.exist'});
                }
            });
        }
    },
    {
        path: '/user/register',
        secure: false,
        method: 'post',
        handler: function(req, res, store){
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

//            let store = req.orm;
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
                            req.sendMail('register', {
                                    u: cusr,
                                    url: `${req.protocol}://${req.hostname}:${req.app.settings.port}/user/confirm/`+u.confirmcode
                            }).then(()=>{
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
                        }
                    });
                }
            });
        }
    }
];