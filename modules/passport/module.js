const passport = require("passport");
const Strategy = require('passport-local').Strategy;

function validPassword(user, password){
    return user.passwordok(password);
}

function preparePassport(store){
    const User = store.user;
    
    passport.use(new Strategy(
      function(username, password, done) {
        User.findOne({where:{ email: username }}, function (err, user) {
          if (err) { return done(err); }
          if (!user) {
            return done(null, false, 'login.incorrect' );
          }
          if (user.confirmcode!='') {
            return done(null, false, 'login.confirm.required' );
          }
          if (!validPassword(user, password)) {
            return done(null, false, 'login.incorrect' );
          }
          user.password=undefined;
          user.salt=undefined;
          user.confirmcode=undefined;
          return done(null, user);
        });
      }
    ));
    
    passport.serializeUser(function(user, done) {
      return done(null, user.id);
    });
    
    passport.deserializeUser(function(id, done) {
      User.findOne({where:{id:id}}, function(err, user) {
        user.password=undefined;
        user.salt=undefined;
        user.confirmcode=undefined;
        return done(err, user);
      });
    });
};

module.exports = {
    name: 'passport',

    order: 15,

    init: function(next, app, opts){
        app.on('express.loading', function(express){
            express.use(passport.initialize());
            express.use(passport.session());
        });

        // Use special function in passport to ensure error messages get forwarded to client
        let authFunc = function(req, res, next){
            if(req.user){
                next();
            } else {
                passport.authenticate('local', function(err, user, info) {
                        if (err) { return next(err); }
                        if (!user) { return next(null, info); }
                        req.logIn(user, function(err) {
                            if (err) { return next(err); }
                            return next();
                        });
                })(req, res, next);
            }
        };

        app.resolve('api.auth.function', function(prm){
            prm.resolve( authFunc );
        });

        next();
    },

    start: function(next, api, store, app){
        preparePassport(store);
        next();
    }
};

