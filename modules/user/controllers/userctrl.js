const path = require('path');
const fs = require('fs');
const salt = require('../salt.js');

let dbstore;

let ctrl = {
    __init: function(store, options, next){
        dbstore=store;
        next();
    },
    genUserAuth: function(originalPassword, userObj){
        var slt = salt.new();
        var pwd = salt.salt(originalPassword, slt);
        if(userObj){
            userObj.salt = slt;
            userObj.password = pwd;
        }
        return {salt: slt, password:pwd};
    },
    checkPassword: function(user, pass){
        return new Promise(
            (resolve, reject)=>{
                if(!user){
                    reject('user.required');
                } else {
                    dbstore.user.findOne({id:user.id}, (err, u)=>{
                        if(err){
                            return reject(err);
                        }
                        if(salt.unsalt(u.password, u.salt)==pass){
                            resolve(u);
                        } else {
                            reject('bad.password');
                        }
                    });
                }
            }
        );
    },
    changePassword: function(user, opass, npass){
        return new Promise(
            (resolve, reject)=>{
                ctrl.checkPassword(user, opass).then(
                    u=>{
                        u.password = salt.salt(npass, u.salt);
                        u.save( (err, ok)=>{
                            if(err){
                                return reject(err);
                            }
                            resolve(u);
                        } );
                    },
                    e=>{
                        reject(e);
                    }
                );
            }
        );
    },
    createUser: function(uname, passwd, email){
        return new Promise(
            (resolve, reject)=>{
                dbstore.user.findOne({email:email}, (err, u)=>{
                    if(err){
                        return reject(err);
                    }
                    if(u){
                        return reject('user.exists');
                    }
                    let slt = salt.new(20);
                    let usr={
                        name: uname,
                        email: email,
                        salt: slt,
                        password: salt.salt(passwd, slt),
                        confirmcode: ''
                    };
                    dbstore.user.create(usr, (e, nu)=>{
                        if(e){
                            return reject(e);
                        }
                        resolve(nu);
                    })
                });
            }
        );
    }
};

module.exports = ctrl;
