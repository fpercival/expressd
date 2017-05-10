
'use strict';
const session = require('express-session');

const log = require('nodeutils').log.create('session:store');

/**
 * Module dependencies.
 * @private
 */

var Store = require('express-session').Store;
var util = require('util');

let dbstore;

/**
 * Shim setImmediate for node.js < 0.10
 * @private
 */

/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
  ? setImmediate
  : function(fn){ process.nextTick(fn.bind.apply(fn, arguments)) }

/**
 * Module exports.
 */

module.exports = {
    order: 10,
    init: function(next, app, opts){
        this.config = opts.express.session || {secret:'expressd_secret', cookie:{}};
        let sess = this.config;
        sess.store = new SessionStore();
        app.on('express.loading', function(express){
            express.use( session( sess ) );
        });
        next();
    },
    start: function(next, api, store, app){
        dbstore = store;
        next();
    }
}

/**
 * A session store in memory.
 * @public
 */

function SessionStore() {
  Store.call(this)
}

/**
 * Inherit from Store.
 */

util.inherits(SessionStore, Store)

/**
 * Get all active sessions.
 *
 * @param {function} callback
 * @public
 */

SessionStore.prototype.all = function all(callback) {
  dbstore.session.find({}, function(err, sessions){
      var rt=[];
      sessions && session.forEach(
          s=>{ rt.push(JSON.parse(s.data)); }
      );
    callback && defer(callback, err, rt);
  });
}

/**
 * Clear all sessions.
 *
 * @param {function} callback
 * @public
 */

SessionStore.prototype.clear = function clear(callback) {
  dbstore.session.destroy({}, function(err){
    callback && defer(callback, err);
  });
}

/**
 * Destroy the session associated with the given session ID.
 *
 * @param {string} sessionId
 * @public
 */

SessionStore.prototype.destroy = function destroy(sessionId, callback) {
    log.debug('destroy', sessionId);
  dbstore.session.destroy({sid:sessionId}, function(err, sessions){
    callback && defer(callback, err);
  });
}

/**
 * Fetch session by the given session ID.
 *
 * @param {string} sessionId
 * @param {function} callback
 * @public
 */

SessionStore.prototype.get = function get(sessionId, callback) {
    log.debug('get', sessionId);
  dbstore.session.findOne({where:{sid:sessionId}}, function(err, session){
      var s = session?JSON.parse(session.data):null;
    callback && defer(callback, err, s );
  });
}

/**
 * Commit the given session associated with the given sessionId to the store.
 *
 * @param {string} sessionId
 * @param {object} session
 * @param {function} callback
 * @public
 */

SessionStore.prototype.set = function set(sessionId, session, callback) {
    var d = JSON.stringify(session);
    log.debug('set', sessionId, d);
  dbstore.session.findOrCreate({where:{sid:sessionId}}, {sid:sessionId, data:d}, function(err, sess){
      if(sess){
          sess.data = JSON.stringify(session);
          sess.save();
      }
    callback && defer(callback, err);
  });
}

/**
 * Get number of active sessions.
 *
 * @param {function} callback
 * @public
 */

SessionStore.prototype.length = function length(callback) {
  dbstore.session.find({}, function(err, sessions){
    callback && defer(callback, err, sessions?sessions.length:0);
  });
}

/**
 * Touch the given session object associated with the given session ID.
 *
 * @param {string} sessionId
 * @param {object} session
 * @param {function} callback
 * @public
 */

SessionStore.prototype.touch = function touch(sessionId, session, callback) {
    var d = JSON.stringify(session);
  dbstore.session.update({where:{sid:sessionId}}, function(err, {sid:sessionId, data:d}){
    callback && defer(callback, err)
  });
}

/**
 * Get session from the store.
 * @private
 */

function getSession(sessionId) {
  var sess = this.sessions[sessionId]

  if (!sess) {
    return
  }

  // parse
  sess = JSON.parse(sess)

  var expires = typeof sess.cookie.expires === 'string'
    ? new Date(sess.cookie.expires)
    : sess.cookie.expires

  // destroy expired session
  if (expires && expires <= Date.now()) {
    delete this.sessions[sessionId]
    return
  }

  return sess
}
