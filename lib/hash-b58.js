var crypto = require( 'crypto' ),
    bs58 = require( 'bs58' );

// md2 22 bytes
// sha1 27 bytes
function hashB58( type, value, callback ) {
    var hashStream = crypto.createHash( type ).setEncoding( 'hex' );
    hashStream.end( value, function() {
        var md5 = bs58.encode( new Buffer( hashStream.read(), 'hex' ) );
        callback( null, md5 );
    } );
}

module.exports = hashB58;