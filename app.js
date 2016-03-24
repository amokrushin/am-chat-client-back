const io = require( 'socket.io' )(),
    _ = require( 'lodash' ),
    socketioJwt = require( 'socketio-jwt' ),
//socketioRedis = require( 'socket.io-redis' ),
    logger = require( './lib/logger' ),
    userModel = require( './model/user' ),
    messageModel = require( './model/message' ),
    historyModel = require( './model/history' ),
    lockModel = require( './model/lock' ),
    config = require( './config.json' ),
    adminUsers = config.adminUsers;

io.serveClient( false );

io.use( socketioJwt.authorize( {
    secret: config.jwt.key,
    handshake: true
} ) );

function newUser( socket, profile, callback ) {
    if( !socket.user.id )
    {
        if( callback ) callback();
        return;
    }
    userModel.upsert( profile, function( err, profile ) {
        socket.broadcast.emit( 'new-user', profile );
        _.assign( socket.user, profile );
        if( callback ) callback();
    } );
}

function updateUser( user ) {
    userModel.upsert( _.assign( {id: user.id}, user ), function( err ) {
        if( err ) return logger.error( err );
    } );
}

function isBanned( user ) {
    if( !parseInt( user.banned ) ) return false;
    const bannedTill = parseInt( user.bannedTill );
    if( bannedTill === -1 ) return true;
    if( bannedTill > Date.now() ) return true;

    updateUser( {
        id: user.id,
        banned: 0,
        bannedTill: -1
    } );

    return false;
}

function sendMessage( socket, message, done ) {
    userModel.get( socket.user.id, function( err, user ) {
        if( err ) return logger.error( err );
        if( isBanned( user ) )
        {
            return _.isFunction( done ) ? done() : null;
        }
        messageModel.push( message, function( err, newMessage ) {
            if( message.room === 'public' )
            {
                socket.broadcast.emit( 'new-message', newMessage );
            }
            if( _.isFunction( done ) ) done( newMessage );
        } );
    } );
}

io.on( 'connection', function( socket ) {
    logger.info( 'new connection', socket.id );
    socket.user = _.omit( socket.decoded_token, ['iat'] );

    newUser( socket, socket.user );

    socket.on( 'get-self', function( done ) {
        if( !socket.user.id ) return done( null );
        const isAdmin = !!~adminUsers.indexOf( socket.user.id.toString() );
        done( _.assign( {isAdmin: isAdmin}, socket.user ) );
    } );

    socket.on( 'send-message', function( message, done ) {
        if( !socket.user.id ) return done();
        sendMessage( socket, message, done );
    } );

    socket.on( 'history-request', function() {
        lockModel.set( 'history-request', 2000, function( err, ok ) {
            if( err ) return logger.error( err );
            if( !ok ) return;

            historyModel.range( 'public', 100, 0, function( err, list ) {
                if( err ) return logger.error( err );
                socket.emit( 'history-response', list );
                socket.broadcast.emit( 'history-response', list );
            } );
        } );
    } );

    socket.on( 'history-prev-request', function( message ) {
        lockModel.set( 'history-prev-request-' + message.timestamp, 2000, function( err, ok ) {
            if( err ) return logger.error( err );
            if( !ok ) return;
            messageModel.offset( 'public', message, function( err, index ) {
                if( !index ) return;
                historyModel.range( 'public', 20, index + 1, function( err, messages ) {
                    if( err ) return logger.error( err );
                    socket.emit( 'history-response', messages );
                } );
            } )
        } );
    } );

    socket.on( 'remove-message', function( message ) {
        messageModel.remove( message.room || 'public', message, function( err, messageId ) {
            if( err ) return logger.error( err );
            socket.emit( 'history-replace', {
                messages: [messageId]
            } );
            socket.broadcast.emit( 'history-replace', {
                messages: [messageId]
            } );
        } );
    } );

    socket.on( 'remove-user-messages', function( room, user ) {
        messageModel.removeAllByUserId( room || 'public', user.id, function( err, messageIds ) {
            if( err ) return logger.error( err );
            socket.emit( 'history-replace', {
                messages: messageIds
            } );
            socket.broadcast.emit( 'history-replace', {
                messages: messageIds
            } );
        } );
    } );

    socket.on( 'ban-user', function( user, duration ) {
        updateUser( {
            id: user.id,
            banned: 1,
            bannedTill: parseInt( duration ) ? Date.now() + duration * 1000 : -1
        } );
    } );

    socket.on( 'unban-user', function( user ) {
        updateUser( {
            id: user.id,
            banned: 0,
            bannedTill: -1
        } );
    } );
} );

io.listen( 3050 );