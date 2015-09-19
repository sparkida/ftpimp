/**
 * FTPimp Response Handler
 * @author Nicholas Riley
 * @module lib/command
 */
"use strict";
var ftp,
    cmd,
    dbg = function () {
        return undefined;
    },
    CMD = function () {
        cmd = this;
    };


/**
 * Create and return a new CMD instance
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
 * List of command response codes and their
 * attributing event that will be fired;
 * you can add your own event listeners to 
 * listen to these codes
 * @member {object} CMD#codes
 * @property {number} 150 - dataPortReady
 * @property {number} 220 - login
 * @property {number} 226 - transferComplete
 * @property {number} 227 - startPassive
 * @property {number} 230 - ready
 * @property {number} 250 - fileActionComplete [default: disabled]
 * @property {number} 257 - data capture [default: disabled]
 * @property {number} 331 - sendPass [default: disabled]
 * @property {number} 500 - unkownCommand
 * @property {number} 550 - transferError
 * @property {number} 553 - transferError
 */
CMD.prototype.codes = {
    125: 'dataPortReady',
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
    550: 'transferError',
	553: 'transferError'
};

CMD.prototype.keys = CMD.prototype.codes;

CMD.prototype.transferError = function (data) {
    ftp.emit('transferError', data);
};

/** @fires FTP#fileTransferComplete */
CMD.prototype.fileActionComplete = function (data) {
    ftp.emit('fileActionComplete', data);
};


/**
 * Emit a fileTransferComplete or dataTransferComplete event on the {@link FTP#events} object
 * @fires FTP#dataTransferComplete
 * @function CMD#transferComplete
 */
CMD.prototype.transferComplete = function (data) {//{{{
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
CMD.prototype.dataPortReady = function (data) {//{{{
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
CMD.prototype.error = function (data) {//{{{
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
CMD.prototype.unknownCommand = CMD.prototype.error;


/**
 * Emit a <b>"ready"</b> event on the {@link FTP#socket} object
 * @fires FTP#socket#ready
 * @function CMD#ready
 */
CMD.prototype.ready = function () {//{{{
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
CMD.prototype.login = function () {//{{{
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
			ftp.raw('CWD', function (res) {
				var dir = res.indexOf('/');
				dir = res.slice(dir - 1).trim();
				ftp.cwd = ftp.baseDir = dir;
				dbg('current dir: ' + ftp.cwd);
				ftp.emit('ready');
				ftp.isReady = true;
			});
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
CMD.prototype.startPassive = function (data) {//{{{
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

