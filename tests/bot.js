const io = require( 'socket.io-client' ),
    _ = require( 'lodash' ),
    async = require( 'neo-async' ),
    logger = require( '../lib/logger' ),
    bs58Hash = require( '../lib/hash-b58' );

const jwt = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6NzY1NjExOTgxMTQ5NjE3ODAsIm5hbWUiOiJNZWlsdmluIOODhCIsImF2YXRhclVybE0iOiJodHRwczovL3N0ZWFtY2RuLWEuYWthbWFpaGQubmV0L3N0ZWFtY29tbXVuaXR5L3B1YmxpYy9pbWFnZXMvYXZhdGFycy85MC85MGZhNzA1YzNjMzc4MjBlZWM1ODIzMjQwZDQ5Zjc3YWZmNGJlYmYyX21lZGl1bS5qcGciLCJpYXQiOjE0NTgyOTQ2ODN9.C_v_uU3Aa7OMNMNOktS1DuvtD0IYx_Gcl63heVBFykw';

const socket = io.connect( 'http://chat-io-alfa.mokr.org', {
    'query': 'token=' + jwt
} );

const messages = [
    "voluptate reprehenderit consectetur eu irure",
    "officia qui amet aute consectetur",
    "eiusmod in pariatur laborum reprehenderit",
    "pariatur ullamco duis amet enim",
    "exercitation ipsum et velit amet",
    "mollit ex incididunt aute commodo",
    "ea irure sunt fugiat eu",
    "ea ipsum exercitation elit ea sit enim duis et aliqua",
    "exercitation laboris aute excepteur dolor nulla cillum nulla non voluptate",
    "duis eiusmod excepteur consectetur Lorem in ipsum sunt amet aliqua",
    "nostrud excepteur culpa sit ipsum officia nulla officia aliquip consequat",
    "ullamco nostrud sint do voluptate exercitation do nulla incididunt sint",
    "irure officia ut aliquip esse deserunt reprehenderit eu et enim",
    "duis labore nisi do occaecat occaecat dolor magna deserunt Lorem occaecat ad non eiusmod enim",
    "labore tempor deserunt mollit eiusmod irure tempor velit ex commodo ex non velit do sunt",
    "consectetur id cupidatat ipsum excepteur adipisicing officia commodo anim nisi eu anim enim pariatur aute",
    "ad qui officia qui est commodo id ut excepteur magna aliqua ad est consequat ad",
    "commodo in ut cillum cupidatat laborum adipisicing commodo non nisi sit elit non quis non",
    "sit velit labore irure sit nostrud velit minim velit commodo aute qui sit sit incididunt"
];

socket.on( 'connect', function() {
    console.log( 'connected' );
} );

socket.emit( 'get-self', function( profile ) {
    console.log( profile );

    async.forever(
        function( next ) {
            async.waterfall( [
                _.partial( bs58Hash, 'md5', profile.id.toString() + Date.now() ),
                function( id, callback ) {
                    const message = {
                        user: profile,
                        text: _.sample( messages ),
                        room: 'public'
                    };
                    socket.emit( 'send-message', message, function( message ) {
                        console.log( message );
                    } );
                    callback();
                },
                _.partial( setTimeout, _, 2000 )
            ], next );
        },
        function( err ) {
            logger.error( err );
        }
    );
} );