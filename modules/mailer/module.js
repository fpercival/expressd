const nodemailer = require('nodemailer');
const dot = require('dot');
const log = require('nodeutils').log.create('expressd:mailer');

function renderTemplate(tpl, obj){
    return dot.template(tpl)(obj);
}

function Mailer(){
    let transport;
    let dbstore;
    let self = this;
    let app;
    this.name = 'mailer';

    this.order = 20;

    this.init = function(next, _app, opts){
console.log('opts.mailer.mail', opts.mailer.mail);
        transport = nodemailer.createTransport( opts.mailer.mail );
        app = _app;
        app.on('express.loading', (express)=>{
            express.use(
                (req, res, next)=>{
                    req.sendMail = (arg1, arg2)=>{
                        if(typeof arg1 == "string"){
                            return this.sendTemplate(arg1, arg2);
                        } else {
                            return this.sendmail(arg1);
                        }
                    };
                    next();
            }
            )
        });
        next();
    };

    this.start = function(next, api, store){
        dbstore = store.mailtemplates;
        app.resolve('get.mailer', function(promise){
            promise.resolve(self);
        });
        next();
    };

    this.sendmail = function(mailObj, object){
        let obj = object || {};
        log.debug('mailObj', mailObj);
        ['to', 'subject', 'text', 'html'].forEach(
            key => {
                mailObj[key] = renderTemplate(mailObj[key], object);
            }
        );
        return new Promise((resolve, reject) => {
            log.debug('mailing', mailObj );
            transport.sendMail(mailObj, function(err, info){
                if(err){
                    log.error(err);
                    reject(err);
                } else {
log.warn('mail sent', info);
                    resolve(info);
                }
            });
        });
    };

    this.sendTemplate = function(templateName, obj){
        return new Promise((resolve, reject) => {
            dbstore.findOne({where:{name:templateName}}, function(err, tpl){
                if(err){
                    reject(err);
                } else {
                    self.sendmail(tpl, obj).then( resolve, reject );
                }
            });
        });
    };

    this.registerTemplate = function(tplObj){
console.log('#### registering', tplObj.name );
        return new Promise((resolve, reject) => {
            dbstore.findOne({where:{name:tplObj.name}}, function(err, tpl){
                if(err){
                    reject(err);
                } else {
                    if(tpl){
                        for(let pn in tplObj){
                            tpl[pn] = tplObj[pn];
                        }
                        tpl.save().then(
                            ()=>{ resolve(tpl); }
                        )
                    } else {
                        dbstore.create(tplObj, function(err, newTemplate){
                            if(err){
                                reject(err);
                            } else {
                                resolve(newTemplate);
                            }
                        });
                    }
                }
            });
        });
    };
}



module.exports = Mailer;
