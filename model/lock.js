'use strict';

const redis = require( '../lib/redis' ),
    model = {};

model.set = function( name, ttlS, callback ) {
    redis.setnx( 'l:' + name, true, function( err, res ) {
        if( err ) return callback( err );
        res
            ? redis.expire( 'l:' + name, ttlS, ()=>callback( null, true ) )
            : callback( null, false );
    } );
};

module.exports = model;