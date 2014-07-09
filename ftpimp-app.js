/**
 * FTPimp
 * @copyright 2014 Nicholas Riley, Sparkida. All Rights Reserved.
 * @module ftpimp
 */

"use strict";
var net = require('net'),//{{{
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    colors = require('colors'),
    events = require('events'),
    devMode = false,
    dbg = function () {},
    StatObject,
    SimpleCue,
    handle,
    ftp,
    cmd,
    /** @constructor CMD */
    CMD = require('./lib/command'),
    /** 
     * The main FTP API object
     * @constructor FTP
     * @param {null|object} config - The ftp connection settings (optional)
     * @param {boolean} connect - Whether or not to start the connection automatically; default is true;
     * @todo The major functions have been added and this current version
     * is more stable and geared for asynchronous NodeJS. We will be implementing
     * the following commands shortly
     * @todo Add 
     * @todo Add FTP.stou
     * @todo Add FTP.rein
     * @todo Add FTP.site
     * @todo Add FTP.mode
     * @todo Add FTP.type
     * @todo Add FTP.acct
     * @todo Add FTP.appe
     * @todo Add FTP.help
     * @todo Add ability to opt into an active port connection for data transfers
     */
    FTP = function (cfg, connect) {
        ftp = this;
        events.EventEmitter.call(this);
        connect = connect === undefined ? true : connect;
        if (undefined !== cfg && null !== cfg && cfg) {
            var n;
            for (n in cfg) {
                if (cfg.hasOwnProperty(n)) {
                    ftp.config[n] = cfg[n];

                }
            }

            if (ftp.config.debug) {
                dbg = function () {
                    for (n = 0; n < arguments.length; n++) {
                        console.log(arguments[n]);
                    }
                };
            }
        }

        //set new handler
        cmd = ftp.cmd = CMD.create(ftp);
        ftp.handle = ftp.Handle.create();
        if (connect) {
            ftp.connect();
        }
    },
    proto;//}}}


/**
 * Initializes the main FTP sequence
 * ftp will emit a ready event once
 * the server connection has been established
 * @function FTP.create
 * @param {null|object} config - The ftp connection settings (optional)
 * @param {boolean} connect - Whether or not to start the connection automatically; default is true;
 */
FTP.create = function (cfg, connect) {return new FTP(cfg, connect);};


/* @memberof FTP. */
FTP.CMD = CMD;


//prototype from EventEmitter
util.inherits(FTP, events.EventEmitter);
proto = FTP.prototype;


/** @constructor FTP#Handle */
proto.Handle = function () {};


//todo
proto.totalPipes = 0;
proto.openPipes = 0;

/**
 * Set once the ftp connection is established
 * @alias FTP#isReady
 * @type {object}
 */
proto.isReady = false;

/**
 * Refernce to the socket created for data transfers  
 * @alias FTP#pipe
 * @type {object}
 */
proto.pipe = null;

/** 
 * Set by the ftp.abort method to tell the pipe to close any open data connection 
 * @type {object} 
 * @alias FTP#pipeAborted
 */
proto.pipeAborted = false;

/** 
 * Set by the ftp.openDataPort method to tell the process that the pipe has been closed
 * @type {object} 
 * @alias FTP#pipeClosed
 */
proto.pipeClosed = false;

/** 
 * Set by the ftp.put method while the pipe is connecting and while connected
 * @type {object}
 * @alias FTP#pipeActive
 */
proto.pipeActive = false;

/** 
 * Refernce to the socket created for data transfers 
 * @type {object}
 * @alias FTP#socket
 */
proto.socket = null;

/** 
 * The FTP log in information.
 * @type {string} 
 * @alias FTP#config
*/
proto.config = {
    host: 'localhost',
    port: 21,
    user: 'root',
    pass: '',
    debug: false
};

/** 
 * Current working directory.
 * @type {string}
 * @alias FTP#cwd
 */
proto.cwd = '';

/** 
 * The user defined directory set by the FTP admin.
 * @type {string}
 * @alias FTP#baseDir
 */
proto.baseDir = '';

/** 
 * Set when the next transfer is data and not file specific.
 * @type {boolean}
 * @alias FTP#baseDir
 */
proto.cueDataTransfer = false;

/** 
 * A list of registered data transfer types; happens automatically.
 * @type {array}
 * @alias FTP#dataTransferTypes
 */
proto.dataTransferTypes = [];

/** 
 * Stored procedures for data transfer types; automatically managed.
 * @type {object}
 * @alias FTP#dataTransferHook
 */
proto.dataTransferHook = {};


/**
 * Creates and returns a new FTP connection handler
 * @function FTP#Handle#create
 * @returns {object} The new Handle instance
 */
proto.Handle.create = function () {return new proto.Handle();};
handle = proto.Handle.prototype;


/**
 * Ran at beginning to start a connection, can be overriden
 * @function FTP#init
 * @example 
 * //Overriding the ftpimp.init instance method
 * var FTP = require('ftpimp'),
 *     //get connection settings
 *     config = {
 *         host: 'localhost',
 *         port: 21,
 *         user: 'root',
 *         pass: ''
 *     },
 *     ftp,
 *     //override init
 *     MyFTP = function(){
 *         this.init();
 *     };
 * //override the prototype
 * MyFTP.prototype = FTP.prototype;
 * //override the init method
 * MyFTP.prototype.init = function () {
 *     dbg('Initializing!');
 *     ftp.handle = ftp.Handle.create();
 *     ftp.connect();
 * };
 * //start new MyFTP instance
 * ftp = new MyFTP(config);
 */
proto.init = function () {//{{{
    //create a new socket and login
    ftp.connect();
};//}}}


var ExeCue = function (command, callback, runNow, holdCue) {
        var that = this,
            n,
            method = command.split(' ', 1)[0],
            bind = function (name) {
                that[name.slice(1)] = function () {
                    dbg('calling : ' + name + ' > ' + command, arguments);
                    that[name].apply(that, arguments);
                };
            };
        that.command = command;
        that.method = method;
        that.pipeData = null;
        that.holdCue = holdCue;
        that.callback = callback;
        that.runNow = runNow;
        handle.data.waiting = true;

        for (n in exeProto) {
            if (n[0] === '_' && exeProto.hasOwnProperty(n)) {
                //remove underscore and provide hook
                bind(n);
            }
        }
        ftp.once('response', that.responseHandler);
        ftp.socket.write(command + '\n', function () {
            dbg(('Run> command sent: ' + command).yellow);
        });
    },
    exeProto = ExeCue.prototype;


ExeCue.create = function (command, callback, runNow, holdCue) {
    return new ExeCue(command, callback, runNow, holdCue);
};


//end the cue
exeProto._end = function () {
    var that = this;
    that.checkProc();
};

exeProto.cueHolding = false;
exeProto._checkProc = function () {
    var that = this;
    if (that.holdCue) {
        dbg(('ExeCue> Ending process, holding cue: ' + that.command).yellow);
    } else {
        dbg(('ExeCue> Ending process: ' + that.command).yellow);
        ftp.emit('endproc');
    }
};


exeProto._closePipe = function () {
    dbg('closing.....'.red);
    var that = this,
        data = that.pipeData;
    try {
        ftp.pipe.removeListener('data', that.receiveData);
    } catch (dataNotBoundError) {
        dbg('data not bound: ', dataNotBoundError);
    }
    dbg(that.pipeData);
    if (null !== data) {
        dbg('ending transfer --- data received'.red);
        that.callback.call(that.callback, null, data.toString());
    } else {
        dbg('ending transfer --- should be no data'.red);
        that.callback.call(that.callback, Error('No data transfered'), null);
    }
};


exeProto._responseHandler = function (code, data) {
    dbg(('Response handler: ' + code).cyan);
    var that = this;
    //dbg('pipe is ' + (ftp.pipeClosed ? 'closed' : 'open'));
    if (code[0] === '5') {
        dbg('handling error');
        dbg(that);
        //if we have an open pipe, wait for it to end
        //if (ftp.pipeClosed) {
        //end immediately
        try {
            ftp.pipe.removeListener('data', that.receiveData);
            ftp.pipe.removeListener('end', that.closePipe);
            ftp.pipe.destroy();
        } catch (dataNotBoundError) {
            dbg('data not bound: ', dataNotBoundError);
        }
        that.callback.call(that.callback, Error(data), null);
        that.checkProc();
    }
    else if (code === '150') {
        if (that.method !== 'STOR') {
            dbg('listening for pipe data'.red);
            if (ftp.pipeClosed) {
                dbg('pipe already closed'.yellow);
                ftp.pipeClosed = false;
                that.closePipe();
                return;
            }
            ftp.pipe.once('end', that.closePipe);
            ftp.pipe.once('data', that.receiveData);
        }
    } 
    else {
        that.callback.call(that.callback, null, data);
        if (code !== '227') {
            that.checkProc();
        }
    }
};


exeProto._receiveData = function (data) {
    dbg('receiving......'.green);
    
    var that = this;
    that.pipeData = data.toString();
    try {
        ftp.pipe.removeListener('end', that.closePipe);
    } catch (endNotBoundError) {
        dbg('end not bound: ', endNotBoundError);
    }
    that.closePipe();
};


//run command next in cue
proto.runNext = function (command, callback, runNow, holdCue) {//{{{
    runNow = runNow === undefined ? false : runNow;
    holdCue = holdCue === undefined ? false : holdCue;

    var dataHandler,
        that = this,
        callbackConstruct = function () {
            dbg('Run> running callbackConstruct'.yellow + ' ' + command);
            //var cueInstance = 
            ExeCue.create(command, callback, runNow, holdCue);
        };

    if (undefined === command) { //TODO || cmd.allowed.indexOf(command.toLowerCase) {
        throw new Error('ftp.run > parameter 1 expected command{string}');
    }
    else if (undefined === callback || typeof callback !== 'function') {
        throw new Error('ftp.run > parameter 2 expected a callback function');
    }
    runNow ? callbackConstruct() : ftp.cue.register(callbackConstruct, true);
}//}}}


/**
 * Run a raw ftp command and issue callback on success/error.
 * <br>
 * Functions created with this provide a synchronized cue
 * that is asynchronous in itself, so items will be processed
 * in the order they are received, but this will happen
 * immediately. Meaning, if you make a dozen sequential calls
 * of <b>"ftp.run('MDTM', callback);"</b> they will all be read immediately,
 * cued in order, and then processed one after the other. Unless
 * you set the optional parameter <b>runNow</b> to <b>true</b>
 *
 * @function FTP#run
 * @param {string} command - The command that will be issued ie: <b>"CWD foo"</b>
 * @param {function} callback - The callback function to be issued on success/error
 * @param {boolean} runNow - Typically run will invoke a cueing process, callbacks
 * will be stacked to maintain synchronicity. Sometimes, however, there will
 * be a need to have immediate control over the connection, like when sending
 * the command <b>"STOR"</b> to tell the server to close the data port's connection
 * and write the file
 * @param {boolean} holdCue - Prevents the cue from firing an endproc event, user must end manually
 */
proto.run = function (command, callback, runNow, holdCue) {//{{{
    runNow = runNow === undefined ? false : runNow;
    holdCue = holdCue === undefined ? false : holdCue;

    var dataHandler,
        that = this,
        callbackConstruct = function () {
            dbg('Run> running callbackConstruct'.yellow + ' ' + command);
            if (command === 'QUIT') {
                ftp.cue.reset();
            }
            //var cueInstance = 
            ExeCue.create(command, callback, runNow, holdCue);
        };

    if (undefined === command) { //TODO || cmd.allowed.indexOf(command.toLowerCase) {
        throw new Error('ftp.run > parameter 1 expected command{string}');
    }
    else if (undefined === callback || typeof callback !== 'function') {
        throw new Error('ftp.run > parameter 2 expected a callback function');
    }
    runNow ? callbackConstruct() : ftp.cue.register(callbackConstruct);
};//}}}


/**
 * Establishes a cue to provide synchronicity to ftp 
 * processes that would otherwise fail from concurrency.
 * This function is done automatically when using
 * the {@link FTP#run} method to cue commands.
 * @fires FTP#cueEmpty
 * @member {object} FTP#cue
 * @property {array} cue._cue - Stores registered procedures
 * and holds them until called by the cue.run method
 * @property {boolean} cue.processing - Returns true if there
 * are items running in the cue
 * @property {function} cue.register - Registers a new callback
 * function to be triggered after the cued command completes
 * @property {function} cue.run - If there is something in the
 * cue and cue.processing is false, than the first item
 * stored in cue._cue will be removed from the cue
 * and processed.
 */
proto.cue = {//{{{
    _cue: [],
    processing: false,
    reset: function () {
        //...resets the cue
        ftp.cue._cue = [];
    },
    register: function (callback, prependToCue) {
        dbg('Cue> Registering callback...');
        dbg(ftp.cue.processing);
        dbg(ftp.cue._cue.length);
        prependToCue = prependToCue === undefined ? false : prependToCue;
        prependToCue ? ftp.cue._cue.unshift(callback) : ftp.cue._cue.push(callback);
        if ( ! ftp.cue.processing) {
            ftp.cue.run();
            //ftp.emit('endproc');
        }
    },
    run: function () {
        dbg('Cue> Loading cue'.yellow);
        if (ftp.cue._cue.length > 0) {
            ftp.cue.processing = true;
            dbg('Cue> Loaded...running');
            ftp.cue.currentProc = ftp.cue._cue.shift();
            dbg(ftp.cue.currentProc.toString());
            if ( ! ftp.error) {
                ftp.cue.currentProc.call(ftp.cue.currentProc);
            }
        } else {
            /**
             * Fired when the primary cue is empty
             * @event FTP#cueEmpty
             */
            ftp.emit('cueEmpty');
            ftp.cue.processing = false;
            dbg('--cue empty--'.yellow);
        }
    }
};


proto.on('endproc', function () {
    dbg('Event> endproc'.magenta);
});


proto.on('endproc', proto.cue.run);//}}}


/**
 * Provides a factory to create a simple cue procedure. Look
 * at the example below to see how we override the callback
 * function to perform additional actions before exiting
 * the cue and loading the next one.<br>
 * Functions created with this provide a synchronized cue
 * that is asynchronous in itself, so items will be processed
 * in the order they are received, but this will happen
 * immediately. Meaning, if you make a dozen sequential calls
 * to {@link FTP#filemtime} they will all be read immediately,
 * cued in order, and then processed one after the other.
 * @example
 * //the current implementation of FTP.rename is preferred,
 * //this is merely being used as an example
 * var myCustomRename = (function () {
 *     var myCueManager = ftp.SimpleCue.create('RNFR');
 *     return function (pathArray, callback) {
 *         var from = pathArray[0],
 *             to = pathArray[1];
 *         //override the callback, SimpleCue's expect the
 *         //first parameter to be a string
 *         myCueManager(from, function (err, data) {
 *             if (err) {
 *                 dbg(err);
 *             } else {
 *                 //provide custom function and trigger callback when done
 *                 ftp.raw('RNTO ' + to, callback);
 *             }
 *         });
 *     }
 * }());
 * @constructor FTP#SimpleCue
 * @param {string} command - The command that will be issued ie: <b>"CWD foo"</b>
 * @returns {function} cueManager - The simple cue manager
 * @TODO - make OO - double check endproc and then callback ? or callback and endproc
 */
proto.SimpleCue = SimpleCue = (function (command) {//{{{
    var running = false,
        init = true,
        that = this,
        cue = {},
        cueIndex = [],
        hook,
        cur,
        curId = '',
        id,
        runCue = function (overRunNow) {
            dbg((command + ' runCue ------ runNow?').red);
            dbg(overRunNow);
            dbg(('SimpleCue::' + command + '> Running').cyan);
            if (cueIndex.length === 0) {
                dbg('SimpleCue> Empty ... stopping'.yellow);
                ftp.emit('endproc');
                //stop cue
                running = false;
                return;
            }
            running = true;
            curId = cueIndex.shift();
            cur = cue[curId];
            cue[curId] = null;
            delete cue[curId];
            var portHandler = function () {
                    hook = undefined === that[command + 'Hook'] ? null : that[command + 'Hook'];
                    dbg('hook: ' + hook);
                    //hook data into custom instance function
                    if (null === hook || typeof hook !== 'function') {
                        ftp.run(command + ' ' + cur.filepath, cur.callback, true);
                    } else {
                        ftp.run(command + ' ' + cur.filepath, function (err, data) {
                            dbg('callback 2 --'.blue);
                            cur.callback.call(cur.callback, err, hook(data));
                        }, true);
                    }
                };
            dbg(('SimpleCue::' + command + '> Opening data port').cyan);
            ftp.openDataPort(portHandler, overRunNow === undefined ? cur.runNow : overRunNow, cur.holdCue);
        },
        runCueNow = function (runNow) {
            dbg('running cue now');
            runCue(true);
        },
        disable = function () {
            running = false;
            dbg(cue);
            runCue();
        },
        init = true,
        cueManager;


        /** 
         * The cue manager returned when creating a new {@link FTP#SimpleCue} object
         * @memberof FTP#SimpleCue
         * @inner
         * @param {string} filepath - The location of the remote file to process the set command.
         * @param {function} callback - The callback function to be issued.
         * @param {boolean} runNow - Run the command immediately. Careful, concurrent connections
         * will likely end in a socket error. This is meant for fine grained control over certain
         * scenarios wherein the process is part of a running cue and you need to perform an ftp
         * action prior to the {@link FTP#endproc} event firing and execing the next cue.
         */
        cueManager = function (filepath, callback, runNow, holdCue) {
            if (init) {
                init = false;
                ftp.on('dataTransferComplete', runCueNow);
                ftp.on('transferError', disable);
            }
            dbg('SimpleCue> ' + command + ' > ' + filepath);
            id = new Date().getTime() + '-' + Math.floor((Math.random() * 1000) + 1);
            cue[id] = {
                callback: callback,
                filepath: filepath,
                runNow: runNow,
                holdCue: holdCue
            };
            cueIndex.push(id);
            if ( ! running) {
                runCue();   
            }
        };

    return cueManager;
});//}}}


/**
 * Create a new {@link FTP#SimpleCue} instance for the command type.
 * @function FTP#SimpleCue.create
 * @param {string} command - The command that will be issued, no parameters, ie: <b>"CWD"</b>
 */
SimpleCue.create = function (command) {//{{{
    proto.dataTransferTypes.push(command);
    return new SimpleCue(command);
};//}}}


/**
 * Register a data hook function to intercept received data
 * on the command (parameter 1)
 * @function FTP#SimpleCue.registerHook
 * @param {string} command - The command that will be issued, no parameters, ie: <b>"CWD"</b>
 * @param {function} callback - The callback function to be issued.
 */
SimpleCue.registerHook = function (command, callback) {//{{{
    if (undefined !== SimpleCue.prototype[command + 'Hook']) {
        throw new Error('Handle.SimpleCue already has hook registered: ' + command + 'Hook');
    }
    SimpleCue.prototype[command + 'Hook'] = callback;
};//}}}


/**
 * Called once the socket has established
 * a connection to the host
 * @function FTP#Handle#connected
 */
handle.connected = function () {//{{{
    dbg('socket connected!');
    process.once('exit', ftp.exit);
    process.once('SIGINT', ftp.exit);
    ftp.config.pasvAddress = ftp.socket.remoteAddress.split('.').join(',');
    ftp.socket.on('data', ftp.handle.data);
    //process.once('uncaughtException', handle.uncaughtException);
};//}}}


/**
 * Called anytime an uncaughtException error is thrown
 * @function FTP#Handle#uncaughtException
 */
handle.uncaughtException = function (err) {//{{{
    dbg(('!' + err.toString()).red);
    ftp.exit();
};//}}}


/**
 * Simple way to parse incoming data, and determine
 * if we should run any commands from it. Commands
 * are found in the lib/command.js file 
 * @function FTP#Handle#data
 */
handle.data = function (data) {//{{{
    dbg('....................');
    var strData = data.toString().trim(),
        strParts,
        commandCodes = [],
        commandData = {},
        curCommand,
        cmdName,
        code,
        i,
        end = function () {
            dbg('handle.data.waiting: ' + handle.data.waiting);
            if (handle.data.waiting) {
                dbg('handle.data.waiting:: ' + code + ' ' + strData);
                if ( ! handle.data.start) {
                    handle.data.waiting = false;
                    /*if (code === '150') {
                        dbg('holding for data transfer'.yellow);
                    } else {*/
                    ftp.emit('response', code, strData);
                    //}
                } else {
                    handle.data.waiting = true;
                    handle.data.start = false;
                }
            }
        },
        run = function () {
            if (undefined !== cmd.keys[code]) {
                if (code === '227') {
                    handle.data.waiting = true;
                    ftp.once('commandComplete', end);
                }
                cmdName = cmd.keys[code];        
                dbg('>executing command: ' + cmdName);
                cmd[cmdName](strData);
                //only open once per ftp instance
            }
            //we will handle data transfer codes with the openDataPort
            if (code !== '227' && code !== '226') {
                end();
            }
        };

    dbg(('\n>>>\n' + strData + '\n>>>\n').grey);
    strData = strData.split('\n');
    strParts = strData.length;

    for (i = 0; i < strParts; i++) {
        code = strData[i].substr(0, 3);
        //make sure its a number and not yet stored
        if (code.search(/^[0-9]{3}/) > -1) {
            if (commandCodes.indexOf(code) < 0) {
                commandCodes.push(code);
                commandData[code] = strData[i].substr(3);
            } else {
                commandData[code] += strData[i].substr(3);
            }
        }
    } 
    dbg(commandCodes.join(', ').grey);
    for (i = 0; i < commandCodes.length; i++) {
        code = commandCodes[i];
        strData = commandData[code].trim();
        dbg('------------------');
        dbg('CODE  -> ' + code);
        dbg('DATA -> ' + strData);
        dbg('------------------');
        run();
    }
};//}}}


/** 
 * Waiting for response from server
 * @property FTP#Handle#data.waiting 
 */
handle.data.waiting = true;
handle.data.start = true;


/**
 * Logout from the ftp server
 * @function FTP#exit
 */
proto.exit = function (sig) {//{{{
    if (undefined !== sig && sig === 0) {
        ftp.socket.end();
    } else { 
        //ftp.pipe.close();
        ftp.socket.destroy();
        if (ftp.pipeActive) {
            ftp.pipeAborted = false;
            ftp.pipeActive = false;
        }
    }
};//}}}


/**
 * Creates a new socket connection for sending commands
 * to the ftp server and runs an optional callback when logged in
 * @function FTP#connect
 * @param {function} callback - The callback function to be issued. (optional)
 */
proto.connect = function (callback) {//{{{
    /**
     * Holds the connected socket object
     * @namespace FTP#socket
     */
    ftp.socket = net.createConnection(21, 'ftp.sparkida.com');
    ftp.socket.on('connect', handle.connected);
    if (undefined !== callback && typeof callback === 'function') {
        dbg('connect: callback');
        ftp.once('ready', callback);
    } else {
        dbg('connect: no callback');
    }
    ftp.socket.on('close', function () {
        dbg('**********socket CLOSED**************');
        process.exit(0);
    });
    ftp.socket.on('end', function () {
        dbg('**********socket END**************');
    });
};//}}}


/**
 * Opens a new data port to the remote server - pasv connection
 * which allows for file transfers 
 * @function FTP#openDataPort
 * @param {function} callback - The callback function to be issued
 * @param {boolean} runNow - Run the command immediately.
 * @TODO Add in useActive parameter to choose how to handle data transfers
 */
proto.openDataPort = function (callback, runNow, holdCue) {//{{{
    var dataHandler = function (err, data) {
            if (err) {
                dbg('error opening data port with PASV');
                dbg(err);
                return;
            }
            dbg('opening data port...'.cyan);
            dbg(ftp.socket.remoteAddress);
            dbg(ftp.config.pasvPort);
            //ftp.on('dataPortReady', callback);
            ftp.pipe = net.createConnection(
                ftp.config.pasvPort,
                ftp.socket.remoteAddress);
            //trigger callback once the server has confirmed the port is open
            ftp.pipe.once('connect', function () {
                dbg('passive connection established ... running callback'.green);
                //dbg(callback.toString());
                callback.call(ftp);
            });
            ftp.pipe.once('end', function () {
                dbg('----> pipe end ----');
                ftp.pipeClosed = true;
                ftp.openPipes -= 1;
            });
            /*if (ftp.config.debug) {
                ftp.pipe.on('data', function (data) {
                    dbg(data.toString().green);
                });
            }*/
            /*
            ftp.pipe.once('error', function (err) {
                dbg(('pipe error: ' + err.errno).red);
                dbg(ftp.openPipes);
            });*/
        };
    ftp.pasv(ftp.config.pasvAddress, dataHandler, runNow, true);
};//}}}


/**
 * Asynchronously cues files for transfer, and transfers them in order to the server.
 * @function FTP#put
 * @param {string|array} paths - The path to read and send the file,
 * if you are sending to the same location you are reading from then
 * you can supply a string as a shortcut.
 * @param {function} callback - The callback function to be issued once the file
 * has been successfully written to the remote
 */
proto.put = (function () {//{{{
    
    var running = false,
        //TODO - test this further
        runCue = function (curCue) {
            dbg('FTP::put> running the pipe cue'.green, running);
            var checkAborted = function () {
                    if (ftp.pipeAborted) {
                        dbg('ftp pipe aborted!---'.yellow);
                        ftp.pipeActive = false;
                        ftp.pipeAborted = false;
                        running = false;
                        ftp.emit('pipeAborted');
                        runCue(true);
                        return true;
                    }
                    return false
                };
            if (running) {
                dbg('Put> already running'.yellow);
                return;
            }
            ftp.pipeActive = running = true;

            //if the local path wasnt found
            if ( ! curCue.path) {
                dbg('Put> error');
                running = false;
                var callback = curCue.callback,
                    data = curCue.data;
                callback.call(callback, data, null);
                /*if( ! checkAborted()) {
                    runCue(true);
                }*/
                ftp.emit('endproc');
                return;
            }

            var dataTransfer = function (runNow) {
                    var callback = curCue.callback,
                        remotePath = curCue.path,
                        filedata = curCue.data,
                        onEnd;

                    if (checkAborted()) {
                        dbg(1);
                        return;
                    }
                    onEnd = function () {
                        dbg('----saving remote file----'.cyan);
                        ftp.pipeActive = running = false;
                        if (checkAborted()) {
                            dbg(3);
                            return;
                        }
                        dbg('---data piped--- running STOR');
                        ftp.once('dataTransferComplete', function () {
                            dbg('data transfer complete');
                            if (!curCue.holdCue) {
                                ftp.emit('endproc');
                            }
                            running = false;
                        });
    
                        //send command through command socket to stor file immediately
                        ftp.raw('STOR ' + remotePath, function () {
                            dbg('-----exec callback'.green);
                            callback.call(callback, null, remotePath);
                        });
                        //ftp.emit('endproc');
                        //runCue();

                    };
                    //write file data to remote data socket
                    ftp.pipe.end(filedata, onEnd);
                };
                 
            //make sure pipe wasn't aborted
            ftp.once('pipeAborted', checkAborted);
            ftp.openDataPort(dataTransfer, true, true);
        };
        
    
    return function (paths, callback, runNow, holdCue) {
        //todo add unique id to string
        var isString = typeof paths === 'string',
            id = new Date().getTime() + '_' + Math.floor(Math.random() * 1000 + 1),
            localPath,
            remotePath,
            pipeFile,
            cue;

        if ( ! isString && ! paths instanceof Array) {
            throw new Error('ftp.put > parameter 1 expected an array or string');
        }
        else if (paths.length === 0) {
            throw new Error('ftp.put > parameter 1 expected recvd empty array');
        }

        if (isString || paths.length === 1) {
            localPath = remotePath = isString ? paths : paths[0];
        }
        else {
            localPath = paths[0];
            remotePath = paths[1];
        }
        //create an index so we know the order...
        //the files may be read at different times
        //into the pipeFile callback
        dbg('>cueing file for put process: "' + localPath + '" to "' + remotePath + '"');
        pipeFile = function (err, filedata) {
            dbg(('>piping file: ' + localPath).green);
            if (err) {
                dbg('>file read error', err);
                cue = {
                    callback: callback,
                    data: err,
                    path: false,
                    runNow: runNow,
                    holdCue: holdCue
                };
            } else {
                dbg('>cueing file: "' + localPath + '" to "' + remotePath + '"');
                cue = {
                    callback: callback,
                    data: filedata,
                    path: remotePath,
                    runNow: runNow,
                    holdCue: holdCue
                };
            }            
            runCue(cue);
        };
        //TODO commands need to occur synchronously for the most part, we should
        //make something to read an array of file put commands, or the option
        //to run a cue for all puts in that scope's level
        ftp.cue.register(function () {
            fs.readFile(localPath, pipeFile);
        });
    }
}());//}}}


/**
 * Issues a single raw request to the server and
 * calls the callback function once data is received
 * @function FTP#raw
 * @param {string} command - The command to send to the FTP server
 * @example
 * //say hi to the server
 * var FTP = require('ftpimp'),
 *     config = require('./myconfig'),
 *     ftp = FTP.connect(config);
 *
 * ftp.on('ready', function () {
 *     ftp.raw('NOOP', function (data) {
 *         dbg(data);
 *     });
 * });
 * @param {function} callback - The callback function 
 * to be fired once on a data event
 */
proto.raw = function (command, callback) {//{{{
    var parser = function (err, data) {
            err = err ? err.toString() : err; 
            data = data? data.toString() : data;
            callback.call(callback, err, data);
        };
    ftp.socket.once('data', parser);
    ftp.socket.write(command + '\n');
};//}}}


/**
 * Changes the current directory to the root / restricted directory
 * @function FTP#root
 * @param {function} callback - The callback function to be issued.
 */
proto.root = function (callback) {//{{{
    ftp.chdir(ftp.baseDir, callback);
};//}}}


/**
 * Creates a directory and returns the directory name.
 * Optionally create directories recursively. * 
 * @function FTP#mkdir
 * @param {string} dirpath - The directory name to be created.
 * @param {function} callback - The callback function to be issued.
 * @param {string} recursive - Recursively create directories. (default: false)
 */
proto.mkdir = function (dirpath, callback, recursive) {//{{{
    //TODO add in error handling for parameters
    dbg('making directory: ' + dirpath);
    recursive = undefined === recursive ? false : recursive;
    var created = [],
        mkdirHandler = function (err, data) {
            if ( ! err) {
                data = data.match(/"(.*)"/)[1];
            }
            if (typeof callback === 'function') {
                callback.call(callback, err, data);
            }
        };
    //hijack mkdirHandler
    if (recursive) {
        //check if path provided starts with root /
        var isRoot = (dirpath.charAt(0) === path.sep),
            paths = dirpath.split(path.sep).filter(Boolean),
            pathsLength = paths.length,
            cur = '',
            created = [],
            i = 0,
            makeNext = function () {
                var index = i;
                i += 1;
                cur += paths[index] + path.sep;

                if (index === pathsLength - 1) {
                    dbg('ending recursion'.red);
                    ftp.run('MKD ' + (isRoot ? path.sep : '') + cur, endRecursion, true);
                } else {
                    ftp.run('MKD ' + (isRoot ? path.sep : '') + cur, continueMake, index !== 0, true);
                }
            },
            continueMake = function (err, data) {
                addPaths(err, data);
                makeNext();
            },
            addPaths = function (err, data) {
                if ( ! err) {
                    dbg(('adding path:'+ data).blue);
                    data = data.match(/"(.*)"/)[1];
                    created.push(data);
                }
            },
            endRecursion = function (err, data) {
                addPaths(err, data);
                if (typeof callback === 'function') {
                    callback.call(callback, err, created);
                }
            };
        makeNext();
    } else {
        ftp.run('MKD ' + dirpath, mkdirHandler);
    }
};//}}}

/**
 * Runs the FTP command RMD - Remove a remote directory
 * @function FTP#rmdir
 * @param {string} dirpath - The location of the directory to be deleted.
 * @param {function} callback - The callback function to be issued.
 * @param {string} recursive - Recursively delete files and subfolders.
 */
proto.rmdir = function (dirpath, callback, recursive, runNow, holdCue) {//{{{
    recursive = recursive === undefined ? false : recursive;
    var checkDir = function (err, data) {
            if (undefined === recursive || ! recursive) {
                if ( ! err) {
                    data = data.length > 0;
                }
                callback.call(callback, err, data);
            } else {
                dbg('directory not empty'.red)
                //recurse
                //TODO - switch to ls
                ftp.ls(dirpath, function (err, data) {
                    if ( ! err) {
                        var i = 0,
                            method = '',
                            mainData = data,
                            unlinkHandler = function (index, end) {
                                return function (err) {
                                    if (err) {
                                        dbg('error unlink file: '.red + mainData[index].filename);
                                    } else {
                                        dbg('file unlinked: '.red + mainData[index].filename);
                                    }
                                    if (end) {
                                        dbg('attempting to delete final'.red);
                                        ftp.run('RMD ' + dirpath, callback, true);
                                    }
                                }
                            };
                        //must be a directory?
                        if (data.length === 0) {
                        }

                        for (i; i < data.length; i++) {
                            if (data[i].filename === '.' || data[i].filename === '..') {
                                continue;
                            }
                            if (data[i].isDirectory) {
                                //recursively remove the next directory while running immediately and holding the cue
                                ftp.runNext('RMD ' + path.join(dirpath, data[i].filename), checkDir, true, false, true);
                            } else {
                                ftp.runNext(ftp.unlink.raw + ' ' + path.join(dirpath, data[i].filename), unlinkHandler(i, i === data.length - 1), false, true);
                            }
                        }
                    }
                    //callback.call(callback, err, data);
                });
            }
        };
    ftp.run('RMD ' + dirpath, checkDir, runNow, holdCue);
};//}}}


proto.rmdir.raw = 'RMD';

/**
 * Runs the FTP command PWD - Print Working Directory
 * @function FTP#getcwd
 * @param {function} callback - The callback function to be issued.
 */
proto.getcwd = function (callback) {//{{{
    ftp.run('PWD', function (err, data) {
        if ( ! err) {
            data = data.match(/"(.*?)"/)[1];
            ftp.cwd = data;
        }
        callback.call(callback, err, data);
    });
};//}}}


proto.getcwd.raw = 'PWD';
/**
 * Runs the FTP command CWD - Change Working Directory
 * @function FTP#chdir
 * @param {string} dirpath - The directory name to change to.
 * @param {function} callback - The callback function to be issued.
 */
proto.chdir = function (dirname, callback) {//{{{
    ftp.run('CWD ' + dirname, function (err, data) {
        if ( ! err) {
            dbg(data);
            data = data.match(/directory is (.*)/)[1];
            ftp.cwd = data;
        }
        callback.call(callback, err, data);
    });
};//}}}


proto.chdir.raw = 'CWD';


/**
 * Runs the FTP command DELE - Delete remote file
 * @function FTP#unlink
 * @param {string} filepath - The location of the file to be deleted.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runNow - Run the command immediately.
 */
proto.unlink = function (filepath, callback, runNow) {//{{{
    ftp.run('DELE ' + filepath, function (err, data) {
        if ( ! err) {
            data = data.match(/eleted (.*)/)[1];
        }
        callback.call(callback, err, data);
    });
};//}}}


proto.unlink.raw = 'DELE';

/**
 * Runs the FTP command ABOR - Abort a file transfer
 * @function FTP#abort
 * @param {function} callback - The callback function to be issued.
 */
proto.abort = function (callback) {//{{{
    ftp.raw('ABOR', function (err, data) {
        dbg('--------abort-------');
        dbg(ftp.pipeActive, ftp.pipeAborted);
        dbg(err, data);
        if (ftp.pipeActive) {
            dbg('pipe was active'.blue);
            ftp.pipeAborted = true;
            ftp.pipe.end();
        }
        if ( ! err) {
            data = data.length > 0;
        }
        callback.call(callback, err, data);
    });
};//}}}


/**
 * Runs the FTP command RETR - Retrieve a remote file
 * @function FTP#get
 * @param {string} filepath - The location of the remote file to fetch.
 * @param {function} callback - The callback function to be issued.
 */
proto.get = SimpleCue.create('RETR');


/**
 * Runs the FTP command RETR - Retrieve a remote file and 
 * then saves the file locally
 * @function FTP#save
 * @param {string|array} paths - An array of [from, to] paths,
 * as in read from <b><i>"remote/location/foo.txt"</i></b> and save
 * to <b><i>"local/path/bar.txt"</i></b><hr>
 * if you are saving to the same relative location you are reading
 * from then you can supply a string as a shortcut.
 * @param {function} callback - The callback function to be issued.
 */
proto.save = function (paths, callback) {//{{{
    var isString = typeof paths === 'string',
        localPath,
        remotePath,
        pipeFile;
    
    if ( ! isString && ! paths instanceof Array) {
        throw new Error('ftp.put > parameter 1 expected an array or string');
    }
    else if (paths.length === 0) {
        throw new Error('ftp.put > parameter 1 expected recvd empty array');
    }
    
    if (isString || paths.length === 1) {
        localPath = remotePath = isString ? paths : paths[0];
    }
    else {
        remotePath = paths[0];
        localPath = paths[1];
    }

    dbg('>saving file: ' + remotePath + ' to ' + localPath);

    var dataHandler = function (err, data) {
            if (err) {
                callback.call(callback, err, localPath);
            } else {
                fs.writeFile(localPath, data, function (err) {
                    callback.call(callback, err, localPath);
                });
            }
        };
    
    ftp.get(remotePath, dataHandler);    
};//}}}


/**
 * Creates a new file stat object similar to Node's fs.stat method.
 * @constructor FTP#StatObject
 * @returns {object} StatObject - New StatObject
 * @param {string} stat - The stat string of the file or directory
 * i.e.<br><b>"drwxr-xr-x    2 userfoo   groupbar         4096 Jun 12:43 filename"</b>
 */
proto.StatObject = StatObject = function (stat) {//{{{
    var that = this,
        currentDate = new Date();
    stat = stat.match(that._reg);
    that.isDirectory = stat[1] === 'd';
    that.isSymbolicLink = stat[1] === 'l';
    that.isFile = stat[1] === '-';
    that.permissions = StatObject.parsePermissions(stat[2]);
    that.nlink = stat[3];
    that.owner = stat[4];
    that.group = stat[5];
    that.size = stat[6];
    that.mtime = Date.parse(currentDate.getFullYear() + ' ' + stat[7]);
    //symbolic links will capture their pointing location
    if (that.isSymbolicLink) {
       stat[8] = stat[8].split(' -> ');
       that.linkTarget = stat[8][1]; 
    }
    that.filename = that.isSymbolicLink ? stat[8][0] : stat[8];
};//}}}


/** @lends FTP#StatObject */
StatObject.prototype = {//{{{
    /** 
     * The regular expression used to parse the stat string 
     * @type {object}
     */
    _reg: /([dl\-])([wrx\-]{9})\s+([0-9]+)\s(\w+)\s+(\w+)\s+([0-9]+)\s(\w+\s+[0-9]{1,2}\s[0-9]{2}:[0-9]{2})\s([\w\.\~\+\-_>\s\\\/]+)/,
    //TODO -- raw 
    /** 
     * The actual response string
     * @instance
     * @type {string}
     */
    raw: '',
    /** 
     * Set to true if path is a directory 
     * @instance
     * @type {boolean}
     */
    isDirectory: false,
    /** 
     * Set to true if path is a symbolic link 
     * @instance
     * @type {boolean}
     */
    isSymbolicLink: false,
    /** 
     * Set to true if path is a file
     * @instance
     * @type {boolean}
     */
    isFile: false,
    /** 
     * A number representing the set file permissions; ie: 755 
     * @instance
     * @type {null|number}
     */
    permissions: null,
    /** 
     * The number of hardlinks pointing to the file or directory
     * @instance
     * @type {number}
     */
    nlink: 0,
    /**
	 * The owner of the current file or directory
     * @instance
     * @type {string}
      */
    owner: '',
    /**
	 * The group belonging to the file or directory
     * @instance
     * @type {string}
     */
    group: '',
    /**
	 * The size of the file in bytes
     * @instance
     * @type {number}
     */
    size: 0,
    /**
	 * The files <b>relative*</b> modification time. *Since stat strings only 
     * give us accuracy to the minute, it's more accurate to perform a 
     * {@link FTP#filemtime} on your file if you wish to compare
     * modified times <i>more accurately</i>.
     * @instance
     * @type {number}
     */
    mtime: 0,
    /**
	 * If the filepath points to a symbolic link then this
     * will hold a reference to the link's target
     * @instance
     * @type {null|string}
     */
    linkTarget: null,
    /**
	 * The name of the directory, file, or symbolic link 
     * @instance
     * @type {string}
     */
    filename: ''
};//}}}


/**
 * Create and return a new FTP#StatObject instance
 * @function FTP#StatObject.create
 * @param {string} stat - The stat string of the file or directory.
 * @returns {object} StatObject - New StatObject
 */
StatObject.create = function (stat) {//{{{
    return new StatObject(stat);
};//}}}


/**
 * Parses a permission string into it's relative number value
 * @function FTP#StatObject.parsePermissions
 * @param {string} permissionString - The string of permissions i.e. <b>"drwxrwxrwx"</b>
 * @returns {number} permissions - The number value of the given permissionString
 */
StatObject.parsePermissions = function (permissionString) {//{{{
    var i = 0,
        c,
        perm,
        val = [],
        lap = 0,
        str = '';
    for(i; i < permissionString.length; i+=3) {
        str = permissionString.slice(i, i+3);
        perm = 0;
        for(c = 0; c < str.length; c++) {
            if (str[c] === '-') {
                continue;
            }
            perm += StatObject.values[str[c]];
        }
        val.push(perm);
        lap += 1;
    }
    return Number(val.join(''));
};//}}}


/**
 * Holds the relative number values for parsing permissions
 * with {@link FTP#StatObject.parsePermissions}
 * @alias values
 * @static FTP#StatObject.values
 * @type {object}
 * @memberof FTP#StatObject
 */
StatObject.values = {//{{{
    'r': 4,
    'w': 2,
    'x': 1
};//}}}


SimpleCue.registerHook('LIST', function (data) {//{{{
    if (null === data) {
        return false;
    }
    dbg(data.grey);
    data = data.split('\r\n').filter(Boolean);
    var i = 0,
        cur,
        list = [];
        
    for(i; i < data.length; i++) {
        cur = StatObject.create(data[i]);
        list.push(cur);
        dbg(cur);
    }

    return list;
});//}}}


/**
 * Runs the FTP command LIST - List remote files
 * @function FTP#ls
 * @param {string} filepath - The location of the remote file or directory to list.
 * @param {function} callback - The callback function to be issued.
 */
proto.ls = SimpleCue.create('LIST');


/**
 * Runs the FTP command MDTM - Return the modification time of a file
 * @function FTP#filemtime
 * @param {string} filepath - The location of the remote file to stat.
 * @param {function} callback - The callback function to be issued.
 * @returns {number} filemtime - File modified time in milliseconds
 * @example
 * //getting a date object from the file modified time
 * ftp.filemtime('foo.js', function (err, filemtime) {
 *     if (err) {
 *         dbg(err);
 *     } else {
 *         dbg(filemtime);
 *         //1402849093000
 *         var dateObject = new Date(filemtime);
 *         //Sun Jun 15 2014 09:18:13 GMT-0700 (PDT)
 *     }
 * });
 */
proto.filemtime = function (filepath, callback) {//{{{
    ftp.run('MDTM ' + filepath, function (err, data) {
        if ( ! err) {
            data = data.match(/([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/);
            data = Date.parse(data[1] + '-' + data[2] + '-' + data[3] + ' ' 
                + data[4] + ':' + data[5] + ':' + data[6]);
        }
        callback.call(callback, err, data);
    });
};//}}}


SimpleCue.registerHook('NLST', function (data) {//{{{
    if (null === data) {
        return false;
    }
    var filter = function (elem) {
            return elem.length > 0 && elem !== '.' && elem !== '..';
        };
    data = data.split('\r\n').filter(filter);
    return data;
});//}}}

/**
 * Runs the FTP command NLST - Name list of remote directory.
 * @function FTP#lsnames
 * @param {string} dirpath - The location of the remote directory to list.
 * @param {function} callback - The callback function to be issued.
 */
proto.lsnames = SimpleCue.create('NLST');


/**
 * Runs the FTP command SIZE - Name list of remote directory.
 * @function FTP#size
 * @param {string} filepath - The location of the file to retrieve size from.
 * @param {function} callback - The callback function to be issued.
 */
proto.size = SimpleCue.create('SIZE');








/**
 * Runs the FTP command USER - Send username.
 * @function FTP#user
 * @param {string} username - The name of the user to log in.
 * @param {function} callback - The callback function to be issued.
 */
proto.user = function (user, callback) {ftp.run('USER ' + user, callback);};


/**
 * Runs the FTP command PASS - Send password.
 * @function FTP#pass
 * @param {string} pass - The password for the user.
 * @param {function} callback - The callback function to be issued.
 */
proto.pass = function (pass, callback) {ftp.run('PASS ' + pass, callback);};


/**
 * Runs the FTP command PASV - Open a data port in passive mode.
 * @function FTP#pasv
 * @param {string} pasv - The pasv parameter a1,a2,a3,a4,p1,p2 
 * where a1.a2.a3.a4 is the IP address and p1*256+p2 is the port number
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runNow - Run the command immediately. 
 */
proto.pasv = function (pasv, callback, runNow) {ftp.run('PASV ' + pasv, callback, runNow);};


/**
 * Runs the FTP command PORT - Open a data port in active mode.
 * @function FTP#port
 * @param {string} port - The port parameter a1,a2,a3,a4,p1,p2.
 * This is interpreted as IP address a1.a2.a3.a4, port p1*256+p2.
 * @param {function} callback - The callback function to be issued.
 */
proto.port = function (port, callback) {ftp.run('PORT ' + port, callback);};


/**
 * Runs the FTP command QUIT - Terminate the connection.
 * @function FTP#quit
 * @param {function} callback - The callback function to be issued.
 */
proto.quit = function (callback, runNow, holdCue) {ftp.run('QUIT', callback, runNow, holdCue);};


/**
 * Runs the FTP command NOOP - Do nothing; Keeps the connection from timing out
 * @function FTP#ping
 * @param {function} callback - The callback function to be issued.
 */
proto.ping = function (callback) {ftp.run('NOOP', callback);};


/**
 * Runs the FTP command STAT - Return server status
 * @function FTP#stat
 * @param {function} callback - The callback function to be issued.
 */
proto.stat = function (callback) {ftp.run('STAT', callback);};


/**
 * Runs the FTP command SYST - return system type
 * @function FTP#info
 * @param {function} callback - The callback function to be issued.
 */
proto.info = function (callback) {ftp.run('SYST', callback);};


/**
 * Runs the FTP command RNFR and RNTO - Rename from and rename to; Rename a remote file
 * @function FTP#rename
 * @param {array} paths - The path of the current file and the path you wish
 * to rename it to; eg: ['from', 'to']
 * @param {function} callback - The callback function to be issued.
 */
proto.rename = function (paths, callback) {//{{{
    if ( ! (paths instanceof Array)) {
        throw new Error('ftp.rename > parameter 1 expected array; [from, to]');
    }
    var from = paths[0],
        to = paths[1];

    //run this in a cue
    ftp.run('RNFR ' + from, function (err, data) {
        if (err) {
            callback.call(callback, err, data);
            ftp.emit('endproc');
        } else {
            //run rename to command immediately
            ftp.run('RNTO ' + to, callback, true);
        }
    }, false, true);
};//}}}


/**
 * Runs the FTP command SITE - Run site specific command - <b>will be added in next patch</b>
 * @function FTP#site
 * @param {string} command - The command that will be issued
 * @param {string} parameters - The parameters to be passed with the command
 * @todo - This still needs to be added - should create an object of methods
 */
proto.site = function () {dbg('not yet implemented');};


/**
 * Runs the FTP command TYPE - Set transfer type (default ASCII) - <b>will be added in next patch</b>
 * @function FTP#type
 * @param {string} type - set to this type: 'ascii', 'ebcdic', 'image', 'lbyte'
 * @param {string} telnetType - 'nonprint', 'tfe', 'asa'
 * @todo - This still needs to be added - should create an object of methods
 */
proto.type = function () {dbg('not yet implemented');};
/*
    ftp.raw('TYPE A N', function (err, data) {
        dbg(err, data);
    });
*/


/**
 * Runs the FTP command MODE - Set transfer mode (default Stream) - <b>will be added in next patch</b>
 * @function FTP#mode
 * @param {string} type - set to this type: 'stream', 'block', 'compressed'
 * @todo - This still needs to be added - should create an object of methods
 */
proto.mode = function () {dbg('not yet implemented');};


module.exports = FTP;

