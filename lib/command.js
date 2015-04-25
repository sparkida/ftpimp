/**
 * FTPimp Response Handler
 * @author Nicholas Riley
 * @module lib/command
 */
"use strict";
var ftp,
    net = require('net'),
    cmd,
    dbg = function () {
        return undefined;
    },
    CMD = function () {
        cmd = this;
    },
    cmdProto = CMD.prototype;


/**
 * Create and return a new CMD instance
 * @function CMD.create
 * @param {object} ftpObject - The FTP instance object
 * @returns New CMD object
 */
CMD.create = function (ftpObject) {
    ftp = ftpObject;
    if (ftp.config.debug) {
        dbg = function (msg) {
            console.log(msg);
        };
    }
    return new CMD();
};


/**
 * List of command tokens to be 
 * ran when the FTP server responds
 * @member CMD#keys
 */
cmdProto.keys = {//{{{
    150: 'dataPortReady',
    220: 'login',
    //we will call the cmd from the ftp function
    226: 'transferComplete',
    227: 'startPassive',
    230: 'ready',
    //250: 'fileActionComplete',
    //257: data capture
    //331: 'sendPass',
    500: 'unknownCommand',
    550: 'transferError'
};//}}}


cmdProto.transferError = function (data) {
    ftp.emit('transferError', data);
};


cmdProto.fileActionComplete = function (data) {
    ftp.emit('fileActionComplete', data);
};


/**
 * Emit a fileTransferComplete or dataTransferComplete event on the {@link FTP#events} object
 * @fires FTP#fileTransferComplete
 * @fires FTP#dataTransferComplete
 * @function CMD#transferComplete
 */
cmdProto.transferComplete = function (data) {//{{{
    /**
     * Fired when we receive a remote acknowledgement
     * of the files successful transfer
     * @event FTP#fileTransferComplete
     */
    //dbg('file transfer complete');
    //ftp.emit('fileTransferComplete', data);
    if (ftp.cueDataTransfer) {
        dbg('CMD> data transfer complete');
        ftp.cueDataTransfer = false;
        ftp.emit('dataTransferComplete');//, data);
        //ftp.emit('endproc');
    }
};//}}}


/**
 * Sets the cueDataTransfer so we know we are
 * specifically performing data fetching
 * @function CMD#dataPortReady
 */
cmdProto.dataPortReady = function (data) {//{{{
    dbg('---data port ready---');
    ftp.cueDataTransfer = true;
    ftp.openPipes += 1;
    ftp.totalPipes += 1;
    //ftp.emit('dataPortReady');
};//}}}


/**
 * Emit an error on the {@link FTP#socket} object
 * @fires FTP#socket#error
 * @function CMD#error
 */
cmdProto.error = function (data) {//{{{
    /**
     * Fired at the onset of a socket error
     * @event FTP#socket#error
     */
    ftp.socket.emit('error', data);
};//}}}


/**
 * Emit an error on the {@link FTP#socket} object
 * @fires FTP#socket#error
 * @function CMD#unknownCommand
 */
cmdProto.unknownCommand = cmdProto.error;


/**
 * Emit a <b>"ready"</b> event on the {@link FTP#socket} object
 * @fires FTP#socket#ready
 * @function CMD#ready
 */
cmdProto.ready = function () {//{{{
    /**
     * Fired at the onset of a socket error
     * @event FTP#socket#ready
     */
    //ftp.emit('ready');
};//}}}


/**
 * Log in to the FTP server with set configuration
 * @function CMD#login
 */
cmdProto.login = function () {//{{{
    dbg('>Authenticating...');
    ftp.user(ftp.config.user, function (err, data) {
        if (err) {
            dbg(err);
            dbg('an error occured sending the user');
            return;
        }
        dbg(data);
        dbg('user sent');
        ftp.pass(ftp.config.pass, function (err, data) {
            if (err) {
                dbg(err);
                return;
            }
            dbg('password sent');
            ftp.cwd = ftp.baseDir = data.split('directory is ').pop();
            dbg('current dir: ' + ftp.cwd);
            ftp.emit('ready');
            ftp.isReady = true;
        });
    });
};//}}}

/**
 * Opens a passive (PASV) connection to the FTP server
 * with the data received from the socket that made the
 * <b>"PASV"</b> request
 * @function CMD#startPassive
 * @param {string} data - The returned socket data
 */
cmdProto.startPassive = function (data) {//{{{
    var matches = data.match(/(([0-9]{1,3},){4})([0-9]{1,3}),([0-9]{1,3})?/),
        port;
    if (null === matches) {
        throw new Error('could not establish a passive connection');
    }
    port = ftp.config.pasvPort = Number(matches[3] * 256) + Number(matches[4]);
    ftp.config.pasvString = matches[0];
    ftp.pipeClosed = false;
    dbg('passive settings updated');
    ftp.emit('commandComplete');
};//}}}



module.exports = CMD;

