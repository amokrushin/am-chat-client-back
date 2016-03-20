'use strict';

const _ = require( 'lodash' ),
    redis = require( '../lib/redis' ),
    async = require( 'neo-async' ),
    messageModel = require( './message' ),
    model = {};

model.range = function( room, count, offset, callback ) {
    messageModel.range( room, count, offset, function( err, messages ) {
        if( err ) return callback( err );
        const userIds = _.uniq( _.map( messages, ( message )=>message.userId ) ),
            query = _.map( userIds, ( userId )=>['hgetall', 'u:' + userId] );

        redis.batch( query ).exec( function( err, res ) {
            if( err ) return callback( err );
            const users = _.zipObject( userIds, res ),
                list = _.map( messages, ( message )=> {
                    message.user = _.assign( {id: message.userId}, users[message.userId] );
                    return _.omit( message, ['userId'] );
                } );
            callback( null, list );
        } );
    } );
};

module.exports = model;