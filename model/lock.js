'use strict';

const redis = require( '../lib/redis' ),
    model = {};

model.set = function( name, ttlMs, callback ) {
    redis.setnx( 'l:' + name, true, function( err, res ) {
        if( err ) return callback( err );
        res
            ? redis.pexpire( 'l:' + name, ttlMs, ()=>callback( null, true ) )
            : callback( null, false );
    } );
};

module.exports = model;