'use strict';

const _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    redis = require( '../lib/redis' ),
    model = {};

model.push = function( message, callback ) {
    const room = message.room || 'public',
        data = {
            userId: message.user.id,
            text: message.text,
            timestamp: Date.now()
        };

    redis.zadd( 'm:' + room, data.timestamp, JSON.stringify( data ), function( err ) {
        if( err ) return callback( err );
        callback( null, _.assign( {timestamp: data.timestamp}, message ) );
    } );
};

model.range = function( room, count, offset, callback ) {
    redis.zrange( 'm:' + room, -count - offset, -1 - offset, function( err, res ) {
        if( err ) return callback( err );
        callback( null, _.map( res, ( item )=>JSON.parse( item ) ) );
    } );
};

//model.rangeByScore = function( room, min, max, callback ) {
model.offset = function( room, message, callback ) {
    //redis.zrangebyscore( 'm:' + room, min, max, 'WITHSCORES', function( err, res ) {
    //    if( err ) return callback( err );
    //    callback( null, _.chain( res )
    //        .chunk( 2 )
    //        .map( ( chunk )=>_.assign( {timestamp: parseInt( chunk[1], 10 )}, JSON.parse( chunk[0] ) ) )
    //        .value()
    //    );
    //} );
    //redis.zrangebyscore( 'm:' + room, -count - offset, -1 - offset, function( err, res ) {
    //    if( err ) return callback( err );
    //    callback( null, _.map( res, ( item )=>JSON.parse( item ) ) );
    //} );
    const data = JSON.stringify( {
        userId: message.userId || message.user.id,
        text: message.text,
        timestamp: message.timestamp
    } );
    redis.zrevrank( 'm:' + room, data, function( err, res ) {
        if( err ) return callback( err );
        callback( null, res );
    } );
};

model.remove = function( room, message, callback ) {
    const data = JSON.stringify( {userId: message.user.id, text: message.text, timestamp: message.timestamp} ),
        stub = JSON.stringify( {userId: message.user.id, timestamp: message.timestamp} ),
        messageId = message.user.id.toString() + message.timestamp;

    redis.zrem( 'm:' + room, data, function( err ) {
        if( err ) return callback( err );
        redis.zadd( 'm:' + room, message.timestamp, stub, function( err ) {
            if( err ) return callback( err );
            callback( null, messageId );
        } );
    } );
};

model.removeAllByUserId = function( room, userId, callback ) {
    const chunkSize = 10,
        ids = [],
        queue = async.queue( async.seq(
            function( cursor, callback ) {
                redis.zrange( 'm:' + room, cursor, cursor + chunkSize - 1, function( err, res ) {
                    if( err ) return callback( err );
                    callback( null, _.chain( res )
                        .map( JSON.parse )
                        .forEach( ( message, index )=> {message.index = index + cursor } )
                        .filter( ['userId', userId] )
                        .filter( 'text' )
                        .forEach( ( message )=> {ids.push( message.userId.toString() + message.timestamp )} )
                        .transform( function( result, message ) {
                            const data = JSON.stringify( {
                                    userId: message.userId,
                                    text: message.text,
                                    timestamp: message.timestamp
                                } ),
                                stub = JSON.stringify( {
                                    userId: message.userId,
                                    timestamp: message.timestamp
                                } );
                            result.push( ['zrem', 'm:' + room, data] );
                            result.push( ['zadd', 'm:' + room, message.timestamp, stub] );
                        }, [] )
                        .value() );
                } );
            },
            function( query, callback ) {
                redis.batch( query ).exec( function( err ) {
                    if( err ) return callback( err );
                    callback();
                } );
            }
        ), 1 );

    redis.zcard( 'm:' + room, function( err, totalCount ) {
        for( let i = 0; i < totalCount; i += chunkSize )
        {
            queue.push( i );
        }

        queue.drain = function() {
            callback( null, ids );
        }
    } );
};

module.exports = model;