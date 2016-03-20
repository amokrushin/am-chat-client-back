'use strict';

const _ = require( 'lodash' ),
    redis = require( '../lib/redis' ),
    model = {};

model.upsert = function( profile, callback ) {
    model.get( profile.id, function( err, res ) {
        if( err ) return callback( err );
        const extProfile = _.assign( {}, res, profile ),
            data = _.chain( extProfile ).omit( ['id'] ).toPairs().flatten().value();
        redis.hmset( 'u:' + profile.id, data, function( err ) {
            if( err ) return callback( err );
            callback( null, extProfile );
        } );
    } );
};

model.get = function( id, callback ) {
    redis.hgetall( 'u:' + id, callback );
};

module.exports = model;