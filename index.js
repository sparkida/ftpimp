/**
 * FTPimp
 * @author Nicholas Riley
 */

"use strict";
require('colors');
var net = require('net'),//{{{
    fs = require('fs'),
    path = require('path'),
	/** 
	 * @mixin
	 * @see {@link https://nodejs.org/api/events.html|Node.js API: EventEmitter}
	 */
    EventEmitter = require('events').EventEmitter,
	dbg,
    StatObject,
    Queue,
    handle,
    ftp,
    cmd,
    /** @constructor */
    CMD = require('./lib/command'),
    /** 
     * The main FTP API object
     * @constructor
	 * @mixes EventEmitter
     * @param {null|object} config - The ftp connection settings (optional)
     * @param {boolean} connect - Whether or not to start the connection automatically; default is true;
     * @todo The major functions have been added and this current version
     * is more stable and geared for asynchronous NodeJS. The following commands need to be added:
     * @todo Add FTP.stou
     * @todo Add FTP.rein
     * @todo Add FTP.site
     * @todo Add FTP.mode
     * @todo Add FTP.acct
     * @todo Add FTP.appe
     * @todo Add FTP.help
     * @todo Add ability to opt into an active port connection for data transfers
	 *
	 * FTP extends the NodeJS EventEmitter - see 
     */
    FTP = function (cfg, connect) {
        ftp = this;
        connect = connect ? true : false;
        if (cfg) {
            Object.keys(cfg).forEach(function (key) {
                ftp.config[key] = cfg[key];
            });
            if (undefined !== cfg.ascii) {
                ftp.ascii = ftp.ascii.concat(cfg.ascii);
            }
            if (ftp.config.debug) {
                debug.enable();
            } else {
				debug.disable();
			}
        }

        //set new handler
        cmd = ftp.cmd = CMD.create(ftp);
        ftp.handle = ftp.Handle.create();
        if (connect) {
            ftp.connect();
        }
    },
	/**
	 * A debugger for developing and issue tracking 
	 * @namespace
	 * @memberof FTP
	 */
    debug = {
		/** Disable debugging */
		disable: function () {
			dbg = debug.disabled;
		},
		/** Holds the disabled debugger */
		disabled: function () {
			return undefined;
		},
		/** Enable debugging */
		enable: function () {
			dbg = debug.enabled;
		},
		/** Holds the enabled debugger */
		enabled: function () {
			console.log.apply(console, arguments);
		}
	};//}}}

/**
 * Initializes the main FTP sequence
 * ftp will emit a ready event once
 * the server connection has been established
 * @param {null|object} config - The ftp connection settings (optional)
 * @param {boolean} connect - Whether or not to start the connection automatically; default is true;
 * @returns {object} FTP - return new FTP instance object
 */
FTP.create = function (cfg, connect) {
    return new FTP(cfg, connect);
};


/**
 * The command module
 * @type {object}
 * @extends module:command
 */
FTP.CMD = CMD;

FTP.prototype = new EventEmitter();

//expose debugger everywhere
FTP.debug = debug;
FTP.prototype.debug = debug;


/** @constructor */
FTP.prototype.Handle = function () {
    return undefined;
};


//TODO - document totalPipes && openPipes
FTP.prototype.totalPipes = 0;
FTP.prototype.openPipes = 0;

/**
 * Holds the current file transfer type [ascii, binary, ecbdic, local]
 * @type {string}
 */
FTP.prototype.currentType = 'ascii';

/**
 * List of files to get and put in ASCII
 * @type {array}
 */
FTP.prototype.ascii = {
    am: 1,
    asp: 1,
    bat: 1,
    c: 1,
    cfm: 1,
    cgi: 1,
    conf: 1,
    cpp: 1,
    css: 1,
    dhtml: 1,
    diz: 1,
    h: 1,
    hpp: 1,
    htm: 1,
    html: 1,
    in: 1,
    inc: 1,
    java: 1,
    js: 1,
    jsp: 1,
    lua: 1,
    m4: 1,
    mak: 1,
    md5: 1,
    nfo: 1,
    nsi: 1,
    pas: 1,
    patch: 1,
    php: 1,
    phtml: 1,
    pl: 1,
    po: 1,
    py: 1,
    qmail: 1,
    sh: 1,
    shtml: 1,
    sql: 1,
    svg: 1,
    tcl: 1,
    tpl: 1,
    txt: 1,
    vbs: 1,
    xhtml: 1,
    xml: 1,
    xrc: 1
};

/**
 * Set once the ftp connection is established
 * @type {boolean}
 */
FTP.prototype.isReady = false;

/**
 * Refernce to the socket created for data transfers  
 * @alias FTP#pipe
 * @type {object}
 */
FTP.prototype.pipe = null;

/** 
 * Set by the ftp.abort method to tell the pipe to close any open data connection 
 * @type {object} 
 * @alias FTP#pipeAborted
 */
FTP.prototype.pipeAborted = false;

/** 
 * Set by the ftp.openDataPort method to tell the process that the pipe has been closed
 * @type {object} 
 * @alias FTP#pipeClosed
 */
FTP.prototype.pipeClosed = false;

/** 
 * Set by the ftp.put method while the pipe is connecting and while connected
 * @type {object}
 * @alias FTP#pipeActive
 */
FTP.prototype.pipeActive = false;

/** 
 * Refernce to the socket created for data transfers 
 * @type {object}
 * @alias FTP#socket
 */
FTP.prototype.socket = null;

/** 
 * The FTP log in information.
 * @type {string} 
 * @alias FTP#config
*/
FTP.prototype.config = {
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
FTP.prototype.cwd = '';

/** 
 * The user defined directory set by the FTP admin.
 * @type {string}
 * @alias FTP#baseDir
 */
FTP.prototype.baseDir = '';

/** 
 * Set when the next transfer is data and not file specific.
 * @type {boolean}
 * @alias FTP#baseDir
 */
FTP.prototype.queueDataTransfer = false;

/** 
 * A list of registered data transfer types; happens automatically.
 * @type {array}
 * @alias FTP#dataTransferTypes
 */
FTP.prototype.dataTransferTypes = [];

/** 
 * Stored procedures for data transfer types; automatically managed.
 * @type {object}
 * @alias FTP#dataTransferHook
 */
FTP.prototype.dataTransferHook = {};

/**
 * Creates and returns a new FTP connection handler
 * @returns {object} The new Handle instance
 */
FTP.prototype.Handle.create = function () {
    return new FTP.prototype.Handle();
};

handle = FTP.prototype.Handle.prototype;

/**
 * Ran at beginning to start a connection, can be overriden
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
FTP.prototype.init = function () {//{{{
    //create a new socket and login
    ftp.connect();
};//}}}


var ExeQueue = function (command, callback, runLevel, holdQueue) {
        var that = this,
            n,
			now,
            method = command.split(' ', 1)[0],
            bind = function (name) {
                that[name.slice(1)] = function () {
					if (name === '_responseHandler') {
						
					}
                    dbg('calling : ' + name + ' > ' + command, arguments);
                    that[name].apply(that, arguments);
                };
            };
        that.command = command;
        that.method = method;
        that.pipeData = null;
        that.holdQueue = holdQueue;
        that.callback = callback;
        that.runLevel = runLevel;
		that.ended = false;
		that.ping = null;
        handle.data.waiting = true;

        for (n in ExeQueue.prototype) {
            if (ExeQueue.prototype.hasOwnProperty(n) && n.charAt(0) === '_' && ExeQueue.prototype.hasOwnProperty(n)) {
                //remove underscore and provide hook
                bind(n);
            }
        }
        ftp.once('response', that.responseHandler);
		that.started = Date.now();
        ftp.socket.write(command + '\r\n', function () {
            dbg(('Run> command sent: ' + command).yellow);
        });
    };


ExeQueue.create = function (command, callback, runLevel, holdQueue) {
    return new ExeQueue(command, callback, runLevel, holdQueue);
};


//end the queue
ExeQueue.prototype._end = function () {
    var that = this;
    that.checkProc();
};

//end the queue
ExeQueue.prototype._endStopwatch = function () {
    var that = this;
	that.ended = Date.now();
	that.ping = that.ended - that.started;
};

ExeQueue.prototype.queueHolding = false;
ExeQueue.prototype._checkProc = function () {
    var that = this;
	dbg('check process for end: ', that);
    if (that.holdQueue) {
        dbg(('ExeQueue> Ending process, holding queue: ' + that.command).yellow);
    } else {
        dbg(('ExeQueue> Ending process: ' + that.command).yellow);
        ftp.emit('endproc');
    }
};


ExeQueue.prototype._closePipe = function () {
    dbg('ExeQueue> closing transfer pipe'.magenta);
    var exeQueue = this,
        data = exeQueue.pipeData;
	exeQueue.endStopwatch();
    try {
        ftp.pipe.removeListener('data', exeQueue.receiveData);
        ftp.pipe.removeListener('end', exeQueue.closePipe);
    } catch (dataNotBoundError) {
        dbg('data not bound: ', dataNotBoundError);
    }
	console.log(data);
	console.log(data);
	console.log(data);
	console.log(data);
	dbg('ExeQueue> Ending transfer size(' + (data ? data.length : 0) + ')');
	exeQueue.callback(null, data);
};


ExeQueue.prototype._responseHandler = function (code, data) {
    dbg(('Response handler: ' + code).cyan, data);
    var exeQueue = this;
	exeQueue.endStopwatch();
    //dbg('pipe is ' + (ftp.pipeClosed ? 'closed' : 'open'));
    if (code >= 500 && code < 600) {
        dbg('handling error response code...');
        dbg(exeQueue);
        //if we have an open pipe, wait for it to end
        //if (ftp.pipeClosed) {
        //end immediately
        try {
            dbg('killing pipe');
            ftp.pipe.removeListener('data', exeQueue.receiveData);
            ftp.pipe.removeListener('end', exeQueue.closePipe);
            ftp.pipe.destroy();
            dbg('---pipe down---'.red);
        } catch (dataNotBoundError) {
            dbg('data not bound: ', dataNotBoundError);
        }
        exeQueue.callback(new Error(data), null);
        exeQueue.checkProc();
    } else if (code === 150 || code === 125) {
        if (exeQueue.method !== 'STOR') {
            dbg('listening for pipe data'.red);
            if (ftp.pipeClosed) {
                dbg('pipe already closed'.yellow);
                ftp.pipeClosed = false;
                exeQueue.closePipe();
                return;
            }
            ftp.pipe.on('end', exeQueue.closePipe);
            ftp.pipe.on('data', exeQueue.receiveData);
        }
    } else {
        exeQueue.callback(null, data);
        if (code !== 227) {
            exeQueue.checkProc();
        }
    }
};


ExeQueue.prototype._receiveData = function (data) {
    dbg('receiving...'.green);
    this.pipeData += data;
};


/**
 * Run a raw ftp command and issue callback on success/error.
 * Same as {@link FTP#run} except this command will be
 * will be prioritized to be the next to run in the queue.
 * - calls made with this provide a sequential queue
 *
 * @param {string} command - The command that will be issued ie: <b>"CWD foo"</b>
 * @param {function} callback - The callback function to be issued on success/error
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.runNext = function (command, callback, holdQueue) {
	ftp.run(command, callback, Queue.RunNext, holdQueue);
};

/**
 * Run a raw ftp command and issue callback on success/error.
 * Same as {@link FTP#run} except this command will be ran immediately (in parallel)
 * and will overrun any current queue action in place.
 *
 * @param {string} command - The command that will be issued ie: <b>"CWD foo"</b>
 * @param {function} callback - The callback function to be issued on success/error
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */

FTP.prototype.runNow = function (command, callback, holdQueue) {
	ftp.run(command, callback, Queue.RunNow, holdQueue);
};

/**
 * Run a raw ftp command and issue callback on success/error.
 * <br>
 * Functions created with this provide a sequential queue
 * that is asynchronous, so items will be processed
 * in the order they are received, but this will happen
 * immediately. Meaning, if you make a dozen sequential calls
 * of <b>"ftp.run('MDTM', callback);"</b> they will all be read immediately,
 * queued in order, and then processed one after the other. Unless
 * you set the optional parameter <b>runLevel</b> to <b>true</b>
 *
 * @param {string} command - The command that will be issued ie: <b>"CWD foo"</b>
 * @param {function} callback - The callback function to be issued on success/error
 * @param {number} [runLevel=0] - TL;DR see {@link Queue.RunLevels}
 * FTP#run will invoke a queueing process, callbacks
 * will be stacked to maintain synchronicity. How they stack will depend on the value
 * you set for the runLevel
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.run = function (command, callback, runLevel, holdQueue) {//{{{
    runLevel = runLevel === undefined ? false : runLevel;
    holdQueue = holdQueue === undefined ? false : holdQueue;

    var callbackConstruct = function () {
            dbg('Run> running callbackConstruct'.yellow + ' ' + command);
            //if (command === 'QUIT') {
            //}
			console.log(command, runLevel, holdQueue);
			console.log(command, runLevel, holdQueue);
			console.log(command, runLevel, holdQueue);
			console.log(command, runLevel, holdQueue);
            //var queueInstance = 
            ExeQueue.create(command, callback, runLevel, holdQueue);
        };

    if (undefined === command) { //TODO || cmd.allowed.indexOf(command.toLowerCase) {
        throw new Error('ftp.run > parameter 1 expected command{string}');
    } else if (undefined === callback || typeof callback !== 'function') {
        throw new Error('ftp.run > parameter 2 expected a callback function');
    }
	dbg('ftp.Run: ' + [runLevel, holdQueue, command].join(' ').cyan);
	ftp.queue.register(callbackConstruct, runLevel);
};//}}}

/**
 * Establishes a queue to provide synchronicity to ftp 
 * processes that would otherwise fail from concurrency.
 * This function is done automatically when using
 * the {@link FTP#run} method to queue commands.
 * @fires FTP#queueEmpty
 * @member {object} FTP#queue
 * @property {array} queue._queue - Stores registered procedures
 * and holds them until called by the queue.run method
 * @property {boolean} queue.processing - Returns true if there
 * are items running in the queue
 * @property {function} queue.register - Registers a new callback
 * function to be triggered after the queued command completes
 * @property {function} queue.run - If there is something in the
 * queue and queue.processing is false, than the first item
 * stored in queue._queue will be removed from the queue
 * and processed.
 */
FTP.prototype.queue = {//{{{
    _queue: [],
    processing: false,
    reset: function () {
        //...resets the queue
        ftp.queue._queue = [];
    },
    register: function (callback, runLevel) {
        dbg('Queue> Registering callback...');
        dbg('Queue> processing: ' + ftp.queue.processing + '; size: ' + ftp.queue._queue.length);
		runLevel = runLevel === undefined ? false : runLevel;
		if (runLevel) {
			//run next
			if (runLevel === Queue.RunNext) {
				ftp.queue._queue.unshift(callback);
			} else {
				//run now
				callback();
				return;
			}
		} else {
			ftp.queue._queue.push(callback);
		}

        if (!ftp.queue.processing) {
            ftp.queue.run();
            //ftp.emit('endproc');
        }
    },
    run: function () {
        dbg('Queue> Loading queue'.yellow);
        if (ftp.queue._queue.length > 0) {
            ftp.queue.processing = true;
            dbg('Queue> Loaded...running');
            ftp.queue.currentProc = ftp.queue._queue.shift();
            if (!ftp.error) {
                ftp.queue.currentProc.call(ftp.queue.currentProc);
            }
        } else {
            /**
             * Fired when the primary queue is empty
             * @event FTP#queueEmpty
             */
            ftp.emit('queueEmpty');
            ftp.queue.processing = false;
            dbg('--queue empty--'.yellow);
        }
    }
};


FTP.prototype.on('endproc', function () {
    dbg('Event> endproc'.magenta);
});

/** @todo - this needs to be defined */
FTP.prototype.on('endproc', FTP.prototype.queue.run);//}}}


/**
 * Provides a factory to create a simple queue procedure. Look
 * at the example below to see how we override the callback
 * function to perform additional actions before exiting
 * the queue and loading the next one.<br>
 * Functions created with this provide a synchronized queue
 * that is asynchronous in itself, so items will be processed
 * in the order they are received, but this will happen
 * immediately. Meaning, if you make a dozen sequential calls
 * to {@link FTP#filemtime} they will all be read immediately,
 * queued in order, and then processed one after the other.
 * @constructor
 * @memberof FTP
 * @see {@link Queue}
 * @param {string} command - The command that will be issued ie: <b>"CWD foo"</b>
 * @returns {function} queueManager - The simple queue manager
 * @TODO - make OO - double check endproc and then callback ? or callback and endproc
 * @example
 * //the current implementation of FTP.rename is preferred,
 * //this is merely being used as an example
 * var myCustomRename = (function () {
 *     var myQueueManager = ftp.Queue.create('RNFR');
 *     return function (pathArray, callback) {
 *         var from = pathArray[0],
 *             to = pathArray[1];
 *         //override the callback, Queue's expect the
 *         //first parameter to be a string
 *         myQueueManager(from, function (err, data) {
 *             if (err) {
 *                 dbg(err);
 *             } else {
 *                 //provide custom function and trigger callback when done
 *                 ftp.raw('RNTO ' + to, callback);
 *             }
 *         });
 *     }
 * }());
 */
var Queue = function (command) {//{{{
    var running = false,
        init = true,
        that = this,
        queue = {},
        queueIndex = [],
        hook,
        cur,
        curId = '',
        id,
        queueManager,
        runQueue = function (overRunNow) {
            dbg('queueIndex length> ' + queueIndex.length);
            if (queueIndex.length === 0) {
                dbg('ftp.Queue> Empty ... stopping'.yellow);
				console.log(cur);
				if (!cur.holdQueue) {
					ftp.emit('endproc');
				}
                //stop this queue
                running = false;
                return;
            }
            dbg(('ftp.Queue::' + command + '> Running').cyan);
            running = true;
            curId = queueIndex.shift();
            cur = queue[curId];
            queue[curId] = null;
            delete queue[curId];
            dbg(('ftp.Queue:: loaded queue > ' + cur.id + ' == ' + curId).cyan);
            var portHandler = function () {
                    hook = undefined === that[command + 'Hook'] ? null : that[command + 'Hook'];
                    dbg('hook: ' + typeof hook);
                    //hook data into custom instance function
                    ftp.runNow(command + ' ' + cur.filepath, function (err, data) {
                        if (typeof hook === 'function') {
                            data = hook(data);
                        }
                        cur.callback.call(cur, err, data);
                    });
                };
            dbg(('ftp.Queue::' + command + '> Opening data port').cyan);
            ftp.setType(cur.filepath, function () {
                ftp.openDataPort(portHandler, overRunNow === undefined ? cur.runLevel : overRunNow, cur.holdQueue);
            }, Queue.RunNow, true);
        },
        runQueueNow = function () {
            dbg('running queue now');
            runQueue(true);
        },
        disable = function () {
            running = false;
            dbg(queue);
            runQueue();
        };

    /** 
     * The queue manager returned when creating a new {@link Queue} object
     * @memberof Queue
     * @inner
     * @param {string} filepath - The location of the remote file to process the set command.
     * @param {function} callback - The callback function to be issued.
     * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. Careful, concurrent connections
     * will likely end in a socket error. This is meant for fine grained control over certain
     * scenarios wherein the process is part of a running queue and you need to perform an ftp
     * action prior to the {@link FTP#endproc} event firing and execing the next queue.
     */
    queueManager = function (filepath, callback, runLevel, holdQueue) {
        if (init) {
            init = false;
            ftp.on('dataTransferComplete', runQueueNow);
            ftp.on('transferError', disable);
        }
        id = new Date().getTime() + '-' + Math.floor((Math.random() * 999) + 100);
        dbg('Creating Queue > ' + id + ' > ' + command + ' ' + filepath);
        queue[id] = {
            id: id,
            callback: callback,
            filepath: filepath,
            runLevel: runLevel,
            holdQueue: holdQueue
        };
        queueIndex.push(id);
        dbg('Queue is ' + (running ? 'running' : 'empty...loading'));
        if (!running) {
            runQueue();
        }
    };

	queueManager.raw = command;

    return queueManager;
};//}}}


/**
 * Static Queue value passed in the runLevel param of methods to control the priority of those methods.
 * <br>
 * - default RunLevel {@link FTP.Queue.RunLast}<br>
 * - Most methods use the {@link FTP#run} call.<br>
 * - Every {@link FTP#run} call issued is stacked in a series queue by default. To change to a waterfall
 *   or run in parallel. <br><br>
 *
 * <i>RunLevels are a design of FTPimp to control process flow only.</i><br>
 * <strong>When implementing parallel actions, parallel calls should only be issued inside the callback
 *   of a parent waterfall or series queue. Otherwise, the FTP service itself likely will break 
 *   from the concurrent connection attempts.</strong>
 * @class
 * @readonly
 * @enum {number}
 * @see {@link FTP#mkdir}, {@link FTP#rmdir}, {@link FTP#put} for examples
 * @see {@link FTP#run} for series, {@link FTP#runNext} for waterfall, {@link FTP#runNow} for parallel
 * @example
 * //series
 * ftp.ping(function () { //runs first
 *     ftp.ping(function () { //runs third
 *     });
 * });
 * ftp.ping(function () { //runs second
 * });
 *
 * //waterfall
 * var runNext = FTP.Queue.RunNext;
 * ftp.ping(function () { //runs first
 *     //add runNow to the call
 *     ftp.ping(function () { //runs second
 *     }, runNow);
 * });
 * ftp.ping(function () { //runs third
 * });
 *
 * //parallel
 * var runNow = FTP.Queue.RunNow;
 * ftp.put('foo', function () { //runs first
 * });
 * ftp.put('foo', function () { //runs second
 * }, runNow);
 */
Queue.RunLevels = {
	 /** {@link FTP.Queue.RunLast} will push the command to the end of the queue; */
	last: 0,
	 /** {@link FTP.Queue.RunNow} will run the command immediately; will overrun a current processing queue */
	now: 1,
	 /** {@link FTP.Queue.RunNext} will run after current queue completes */
	next: 2
};


/**
 * @readonly
 * @property {number} RunNext - value needed for runLevel parameter to run commands immediately after the current queue; 
 * @see {@link FTP.Queue.RunLevels.next}
 * @see {@link FTP#run}
 */
Queue.RunNext = Queue.RunLevels.next;

/**
 * @readonly
 * @property {number} RunNow - value needed for runLevel parameter to run commands immediately, overrunning any current queue process; 
 * @see {@link FTP.Queue.RunLevels.now}
 * @see {@link FTP#run}
 */
Queue.RunNow = Queue.RunLevels.now;

/**
 * @readonly
 * @property {number} RunLast - value needed for runLevel parameter, will add command to the end of the queue; default Queue.RunLevel; 
 * @see {@link FTP.Queue.RunLevels.last}
 * @see {@link FTP#run}
 */
Queue.RunLast = Queue.RunLevels.last;

/**
 * Create a new {@link Queue} instance for the command type.
 * @param {string} command - The command that will be issued, no parameters, ie: <b>"CWD"</b>
 */
Queue.create = function (command) {//{{{
    FTP.prototype.dataTransferTypes.push(command);
    return new Queue(command);
};//}}}

/**
 * Register a data hook function to intercept received data
 * on the command (parameter 1)
 * @param {string} command - The command that will be issued, no parameters, ie: <b>"CWD"</b>
 * @param {function} callback - The callback function to be issued.
 */
Queue.registerHook = function (command, callback) {//{{{
    if (undefined !== Queue.prototype[command + 'Hook']) {
        throw new Error('Handle.Queue already has hook registered: ' + command + 'Hook');
    }
    Queue.prototype[command + 'Hook'] = callback;
};//}}}


/**
 * Called once the socket has established
 * a connection to the host
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
 */
handle.uncaughtException = function (err) {//{{{
    dbg(('!' + err.toString()).red);
    ftp.exit();
};//}}}


/**
 * Simple way to parse incoming data, and determine
 * if we should run any commands from it. Commands
 * are found in the lib/command.js file 
 */
handle.data = function (data) {//{{{
    dbg('....................');
    var strData = data.toString().trim(),
        strParts,
        commandCodes = [],
        commandData = {},
        cmdName,
        code,
        i,
        end = function () {
            dbg('handle.data.waiting: ' + handle.data.waiting, code);
            if (handle.data.waiting) {
                dbg('handle.data.waiting:: ' + code + ' ' + strData);
                if (!handle.data.start) {
                    handle.data.waiting = false;
                    /*if (code === 150) {
                        dbg('holding for data transfer'.yellow);
                    } else {*/
                    ftp.emit('response', code, strData);
                    //}
                } else {
                    handle.data.waiting = true;
                    handle.data.start = false;
                }
            } else if (code === 553) {

			}
        },
        run = function () {
            if (undefined !== cmd.keys[code]) {
                if (code === 227) {
                    handle.data.waiting = true;
                    ftp.once('commandComplete', end);
                }
                cmdName = cmd.keys[code];
                dbg('>executing command: ' + cmdName);
                cmd[cmdName](strData);
                //only open once per ftp instance
            }
            //we will handle data transfer codes with the openDataPort
            if (code !== 227 && code !== 226) {
                end();
            }
        };

    dbg(('\n>>>\n' + strData + '\n>>>\n').grey);
    strData = strData.split(/[\r|\n]/).filter(Boolean);
    strParts = strData.length;

    for (i = 0; i < strParts; i++) {
        code = strData[i].substr(0, 3);
        //make sure its a number and not yet stored
        if (code.search(/^[0-9]{3}/) > -1) {
            if (commandCodes.indexOf(code) < 0) {
                commandCodes.push(code);
                commandData[code] = '';
            }
            commandData[code] += strData[i].substr(3);
        }
    }
    dbg(commandCodes.join(', ').grey);
    for (i = 0; i < commandCodes.length; i++) {
        code = Number(commandCodes[i]);
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
 * @param {number} sig - the signal code, if not 0, then socket will
 * be destroyed to force closing
 */
FTP.prototype.exit = function (sig) {//{{{
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
 * @param {function} callback - The callback function to be issued. (optional)
 */
FTP.prototype.connect = function (callback) {//{{{
    /**
     * Holds the connected socket object
     * @member FTP#socket
     */
    ftp.socket = net.createConnection(ftp.config.port, ftp.config.host);
    ftp.socket.on('connect', handle.connected);
    if (typeof callback === 'function') {
        ftp.once('ready', callback);
    }
	dbg('connected: ' + ftp.config.host + ':' + ftp.config.port);
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
 * @param {function} callback - The callback function to be issued
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}.
 * @TODO Add in useActive parameter to choose how to handle data transfers
 */
FTP.prototype.openDataPort = function (callback, runLevel, holdQueue) {//{{{
	holdQueue = !!holdQueue;
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
                ftp.socket.remoteAddress
            );
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
    ftp.pasv(dataHandler, runLevel, holdQueue);
};//}}}


/**
 * Asynchronously queues files for transfer, and transfers them in order to the server.
 * @function
 * @param {string|array} paths - The path to read and send the file,
 * if you are sending to the same (relative) location you are reading from then
 * you can supply a string as a shortcut. Otherwise, use an array [from, to]
 * @param {function} callback - The callback function to be issued once the file
 * has been successfully written to the remote
 */
FTP.prototype.put = (function () {//{{{
    var running = false,
        //TODO - test this further
        runQueue;
 	runQueue = function (curQueue) {
        dbg('FTP::put> running the pipe queue'.green, running);
        var callback,
            data,
            dataTransfer,
            checkAborted = function () {
                if (ftp.pipeAborted) {
                    dbg('ftp pipe aborted!---'.yellow);
                    ftp.pipeActive = false;
                    ftp.pipeAborted = false;
                    running = false;
                    ftp.emit('pipeAborted');
                    runQueue(true);
                    return true;
                }
                return false;
            },
			transferComplete = function () {
				dbg('data transfer complete');
				if (!curQueue.holdQueue) {
					ftp.emit('endproc');
				}
				running = false;
			};

        if (running) {
            dbg('Put> already running'.yellow);
            return;
        }
        ftp.pipeActive = running = true;

        //if the local path wasnt found
        if (!curQueue.path) {
            dbg('Put> error');
            running = false;
            callback = curQueue.callback;
            data = curQueue.data;
            callback.call(callback, data, null);
            /*if(!checkAborted()) {
                runQueue(true);
            }*/
            ftp.emit('endproc');
            return;
        }
        dataTransfer = function (runLevel) {
            var callback = curQueue.callback,
                remotePath = curQueue.path,
                filedata = curQueue.data,
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
                ftp.once('dataTransferComplete', transferComplete);

                //send command through command socket to stor file immediately
                ftp.runNow('STOR ' + remotePath, function () {
					console.log('STOR complete');
					console.log('STOR complete');
					console.log('STOR complete');
					console.log('STOR complete');
					console.log('STOR complete');
					console.log('STOR complete');
					console.log('STOR complete');
					console.log('STOR complete');
					console.log(curQueue);
					if (curQueue.err) {
						dbg('STOR: error occured');
						callback(curQueue.err, null);
					} else {
						dbg('STOR: file saved ' + remotePath);
						callback(null, remotePath);
					}
						console.log('done');
						console.log('done');
						console.log('done');
						console.log('done');
                });
                //ftp.emit('endproc');
                //runQueue();

            };
            //TODO --- set current type
            //write file data to remote data socket
			ftp.pipe.end(filedata, onEnd);
        };
        //make sure pipe wasn't aborted
        ftp.once('pipeAborted', checkAborted);
		ftp.once('transferError', function (err) {
			curQueue.err = err;
			ftp.removeListener('dataTransferComplete', transferComplete);
		});

        ftp.setType(curQueue.path, function () {
            ftp.openDataPort(dataTransfer, Queue.RunNow, true);
        }, Queue.RunNow, true);
    };

    return function (paths, callback, runLevel, holdQueue) {
        //todo add unique id to string
        var isString = typeof paths === 'string',
            localPath,
            remotePath,
            pipeFile,
            queue;

        if (!isString && !(paths instanceof Array)) {
            throw new Error('ftp.put > parameter 1 expected an array or string');
        } else if (paths.length === 0) {
            throw new Error('ftp.put > parameter 1 expected recvd empty array');
        }

        if (isString || paths.length === 1) {
            localPath = remotePath = isString ? paths : paths[0];
        } else {
            localPath = paths[0];
            remotePath = paths[1];
        }
        //create an index so we know the order...
        //the files may be read at different times
        //into the pipeFile callback
        dbg('>queueing file for put process: "' + localPath + '" to "' + remotePath + '"');
        pipeFile = function (err, filedata) {
            dbg(('>piping file: ' + localPath).green);
            if (err) {
                dbg('>file read error', err);
                queue = {
                    callback: callback,
                    data: err,
                    path: false,
                    runLevel: runLevel,
                    holdQueue: holdQueue
                };
            } else {
                dbg('>queueing file: "' + localPath + '" to "' + remotePath + '"');
                queue = {
                    callback: callback,
                    data: filedata,
                    path: remotePath,
                    runLevel: runLevel,
                    holdQueue: holdQueue
                };
            }
            runQueue(queue);
        };
		//enqueue a call; preprend call to the ftp queue of commands
		//so we don't break order of operations
        ftp.queue.register(function () {
            fs.readFile(localPath, pipeFile);
        }, runLevel);
    };
}());//}}}


/**
 * Issues a single raw request to the server and
 * calls the callback function once data is received
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
FTP.prototype.raw = function (command, callback) {//{{{
    var parser = function (data) {
            callback.call(callback, data.toString());
        };
    ftp.socket.once('data', parser);
    ftp.socket.write(command + '\r\n');
};//}}}


/**
 * Changes the current directory to the root / restricted directory
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.root = function (callback, runLevel, holdQueue) {//{{{
	var dir = ftp.baseDir;
	if (dir === '/') {
		dir = '';
	}
    ftp.chdir(ftp.baseDir, callback);
};//}}}


/**
 * Runs the FTP command MKD - Make a remote directory.
 * Creates a directory and returns the directory name.
 * Optionally creates directories recursively.
 * @param {string} dirpath - The directory name to be created.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} recursive - Recursively create directories. (default: false)
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.mkdir = function (dirpath, callback, recursive, runLevel, holdQueue) {//{{{
    //TODO add in error handling for parameters
    dbg('building mkdir request for: ' + dirpath);
    recursive = undefined === recursive ? false : recursive;
    var created = [],
        mkdirHandler = function (err, data) {
            if (!err) {
                data = data.match(/"(.*)"/)[1];
            }
            if (typeof callback === 'function') {
                callback.call(callback, err, data);
            }
        },
        isRoot,
        paths,
        pathsLength,
        cur,
        i,
        makeNext,
        continueMake,
        addPaths,
        endRecursion;

    //hijack mkdirHandler
    if (recursive) {
        //check if path provided starts with root /
        isRoot = (dirpath.charAt(0) === path.sep);
        paths = dirpath.split(path.sep).filter(Boolean);
        pathsLength = paths.length;
		console.log(pathsLength);
		console.log(pathsLength);
		console.log(pathsLength);
		console.log(pathsLength);
        cur = '';
        created = [];
        i = 0;
        makeNext = function () {
            var index = i;
            i += 1;
            cur += paths[index] + path.sep;
			dbg('making  directory: ' + cur);
            if (index === pathsLength - 1) {
                dbg('Queue> ending recursion'.red);
				//release the holdQueue
                ftp.run(FTP.prototype.mkdir.raw + ' ' + (isRoot ? path.sep : '') + cur, endRecursion, index !== 0, holdQueue);
			} else {
				//runLevel if not first item, first item must be used to start the queue
                ftp.run(FTP.prototype.mkdir.raw + ' ' + (isRoot ? path.sep : '') + cur, continueMake, index !== 0, true);
            }
        };
        continueMake = function (err, data) {
            addPaths(err, data);
            makeNext();
        };
        addPaths = function (err, data) {
            if (!err) {
                dbg(('adding path:' + data).blue);
                data = data.match(/"(.*)"/)[1];
                created.push(data);
            }
        };
        endRecursion = function (err, data) {
			dbg('Queue> running endRecursion', err, data);
            addPaths(err, data);
            if (typeof callback === 'function') {
                callback(err, created);
            }
        };
        makeNext();
    } else {
        ftp.run(FTP.prototype.mkdir.raw + ' ' + dirpath, mkdirHandler, runLevel, holdQueue);
    }
};//}}}
FTP.prototype.mkdir.raw = 'MKD';


/**
 * Runs the FTP command RMD - Remove a remote directory
 * @param {string} dirpath - The location of the directory to be deleted.
 * @param {function} callback - The callback function to be issued.
 * @param {string} recursive - Recursively delete files and subfolders.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.rmdir = function (dirpath, callback, recursive, runLevel, holdQueue) {//{{{
	recursive = !!recursive;
	var deleted = [],
		pending = 0,
		noDots = function (statObj) {
			return statObj.filename !== '.' && statObj.filename !== '..';
		},
		handleFileList = function (err, data) {
			var bindUnlinkHandler = function (item) {
					var cmd = item.isDirectory ? ftp.rmdir.raw : ftp.unlink.raw,
						handleDeleteResponse = function (err) {
							if (err) {
								console.log('scanning directory: '.cyan, item.filename);
								checkDir(err, item.filename);
							} else {
								pending -= 1;
								console.log('file unlinked: '.yellow, item.filename);
								deleted.push(item.filename);
							}
							console.log('pending2: ', pending);
							if (pending === 0) {
								ftp.runNext(ftp.rmdir.raw + ' ' + dirpath, function (err, res) {
									if (deleted.indexOf(dirpath) === -1) {
										deleted.push(dirpath);
									}
									console.log('last file removed @' + dirpath);
									console.log('last file removed');
									console.log('last file removed');
									callback(err, deleted);
								}, holdQueue);
							}
						};
					cmd += ' ' + path.join(dirpath, item.filename);
					ftp.runNext(cmd, handleDeleteResponse, holdQueue);
				};

			if (err) {
				console.log(12451251251);
				console.log(12451251251);
				console.log(12451251251);
				console.log(12451251251);
				console.log(12451251251);
				console.log(12451251251);
				console.log(12451251251);
				console.log(err);
				callback(err, data);
			} else {
				console.log(888888888888888888888);
				console.log(888888888888888888888);
				console.log(888888888888888888888);
				console.log(888888888888888888888);
				data = data.filter(noDots);
				console.log('file list', pending, err, data);
				pending += data.length;
				data.forEach(bindUnlinkHandler);
			}
			console.log('pending1: ', pending);
		},
		checkDir = function (err, data) {
			console.log();
			console.log();
			console.log();
			console.log('checking dir:');
			console.log(err, data);
			console.log();
			console.log();
			console.log();

			if (!recursive) {
				console.log('ending !recursive'.red);
				console.log('ending !recursive'.red);
				console.log('ending !recursive'.red);
				return callback(err, deleted);
			}
			if (!err) {
				pending -= 1;
				dbg('rmdir> directory deleted'.yellow, dirpath);
				deleted.push(dirpath);
				callback(err, deleted);
			} else if (null === data) {
				console.log('need to ls directory', dirpath);
				console.log('need to ls directory', dirpath);
				console.log('need to ls directory', dirpath, holdQueue);
				//open the queue immediately after this callback
				ftp.ls(dirpath, handleFileList, Queue.RunNext, holdQueue);
			} else {
				console.log('ls subdirectory', data);
				console.log('ls subdirectory', data);
				console.log('ls subdirectory', data);
				ftp.ls(data, handleFileList, Queue.RunNext, holdQueue);
			}
		};
    ftp.run(ftp.rmdir.raw + ' ' + dirpath, checkDir, runLevel, holdQueue);
};//}}}
FTP.prototype.rmdir.raw = 'RMD';

/**
 * Runs the FTP command PWD - Print Working Directory
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.getcwd = function (callback, runLevel, holdQueue) {//{{{
    ftp.run(FTP.prototype.getcwd.raw, function (err, data) {
        if (!err) {
            data = data.match(/"(.*?)"/)[1];
            ftp.cwd = data;
        }
        callback.call(callback, err, data);
    }, runLevel, holdQueu);
};//}}}
FTP.prototype.getcwd.raw = 'PWD';

/**
 * Runs the FTP command CWD - Change Working Directory
 * @param {string} dirpath - The directory name to change to.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.chdir = function (dirname, callback, runLevel, holdQueue) {//{{{
    ftp.run(FTP.prototype.chdir.raw + ' ' + dirname, function (err, data) {
        if (!err) {
            dirname = data.match(/"(.*)"/);
            if (null !== dirname) {
                ftp.cwd = dirname[1];
            } else {
                ftp.cwd = data;
            }
        }
        callback.call(callback, err, data);
    }, runLevel, holdQueue);
};//}}}
FTP.prototype.chdir.raw = 'CWD';

/**
 * Runs the FTP command DELE - Delete remote file
 * @param {string} filepath - The location of the file to be deleted.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.unlink = function (filepath, callback, runLevel, holdQueue) {//{{{
    ftp.run(FTP.prototype.unlink.raw + ' ' + filepath, function (err, data) {
        if (!err) {
            data = data.match(/eleted (.*)/)[1];
        }
        callback.call(callback, err, data);
    }, runLevel, holdQueue);
};//}}}
FTP.prototype.unlink.raw = 'DELE';

/**
 * Runs the FTP command ABOR - Abort a file transfer, this takes place in parallel
 * @param {function} callback - The callback function to be issued.
 */
FTP.prototype.abort = function (callback) {//{{{
    ftp.raw('ABOR', function (err, data) {
        dbg('--------abort-------');
        dbg(ftp.pipeActive, ftp.pipeAborted);
        dbg(err, data);
        if (ftp.pipeActive) {
            dbg('pipe was active'.blue);
            ftp.pipeAborted = true;
            ftp.pipe.end();
        }
        if (!err) {
            data = data.length > 0;
        }
        callback.call(callback, err, data);
    });
};//}}}
FTP.prototype.abort.raw = 'ABOR';


/**
 * Runs the FTP command RETR - Retrieve a remote file
 * @function
 * @param {string} filepath - The location of the remote file to fetch.
 * @param {function} callback - The callback function to be issued.
 */
FTP.prototype.get = Queue.create('RETR');


/**
 * Runs the FTP command RETR - Retrieve a remote file and 
 * then saves the file locally
 * @param {string|array} paths - An array of [from, to] paths,
 * as in read from <b><i>"remote/location/foo.txt"</i></b> and save
 * to <b><i>"local/path/bar.txt"</i></b><hr>
 * if you are saving to the same relative location you are reading
 * from then you can supply a string as a shortcut.
 * @param {function} callback - The callback function to be issued.
 */
FTP.prototype.save = function (paths, callback) {//{{{
    var isString = typeof paths === 'string',
        localPath,
        remotePath,
        dataHandler;
    if (!isString && !(paths instanceof Array)) {
        throw new Error('ftp.put > parameter 1 expected an array or string');
    } else if (paths.length === 0) {
        throw new Error('ftp.put > parameter 1 expected recvd empty array');
    }
    if (isString || paths.length === 1) {
        localPath = remotePath = isString ? paths : paths[0];
    } else {
        remotePath = paths[0];
        localPath = paths[1];
    }

    dbg('>saving file: ' + remotePath + ' to ' + localPath);
    dataHandler = function (err, data) {
        if (err) {
            callback.call(callback, err, null);
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
 * @constructor
 * @memberof FTP
 * @param {string} stat - The stat string of the file or directory
 * i.e.<br><b>"drwxr-xr-x    2 userfoo   groupbar         4096 Jun 12:43 filename"</b>
 */
StatObject = function (stat) {//{{{
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

FTP.prototype.StatObject = StatObject;

/** @lends StatObject */
StatObject.prototype = {//{{{
    /** 
     * The regular expression used to parse the stat string 
     * @type {object}
     */
    _reg: /([dl\-])([wrx\-]{9})\s+([0-9]+)\s(\w+)\s+(\w+)\s+([0-9]+)\s(\w+\s+[0-9]{1,2}\s+[0-9]{2}:?[0-9]{2})\s+([\w\.\~\+\-_>\s\\\/]+)/,
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
 * Create and return a new {@link StatObject} instance
 * @param {string} stat - The stat string of the file or directory.
 * @returns {object} StatObject - New StatObject
 */
StatObject.create = function (stat) {//{{{
    return new StatObject(stat);
};//}}}


/**
 * Parses a permission string into it's relative number value
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
    for (i; i < permissionString.length; i += 3) {
        str = permissionString.slice(i, i + 3);
        perm = 0;
        for (c = 0; c < str.length; c++) {
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
 * with {@link StatObject.parsePermissions}
 * @static StatObject.values
 * @type {object}
 */
StatObject.values = {//{{{
    'r': 4,
    'w': 2,
    'x': 1
};//}}}


Queue.registerHook('LIST', function (data) {//{{{
    var i = 0,
        cur,
        list = [];
	dbg('ls:hook> data: '.magenta, data);
	if (data) {
		data = data.split('\r\n').filter(Boolean);
		for (i; i < data.length; i++) {
			dbg('--------');
			dbg(data[i]);
			cur = StatObject.create(data[i]);
			list.push(cur);
			dbg(cur);
		}
	}
    return list;
});//}}}


/**
 * Runs the FTP command LIST - List remote files
 * @function
 * @param {string} filepath - The location of the remote file or directory to list.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}.
 *
 */
FTP.prototype.ls = Queue.create('LIST');


/**
 * Runs the FTP command MDTM - Return the modification time of a file
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
FTP.prototype.filemtime = function (filepath, callback, runLevel, holdQueue) {//{{{
    ftp.run('MDTM ' + filepath, function (err, data) {
        if (!err) {
            data = data.match(/([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/);
            if (null !== data) {
                data = Date.parse(data[1] + '-' + data[2] + '-' + data[3] + ' ' +
					data[4] + ':' + data[5] + ':' + data[6]);
            }
        }
        callback.call(callback, err, data);
    });
};//}}}

FTP.prototype.filemtime.raw = 'MDTM';


Queue.registerHook('NLST', function (data) {//{{{
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
 * @function
 * @param {string} dirpath - The location of the remote directory to list.
 * @param {function} callback - The callback function to be issued.
 */
FTP.prototype.lsnames = Queue.create('NLST');


/**
 * Runs the FTP command SIZE - Name list of remote directory.
 * @function
 * @param {string} filepath - The location of the file to retrieve size from.
 * @param {function} callback - The callback function to be issued.
 */
FTP.prototype.size = Queue.create('SIZE');


/**
 * Runs the FTP command USER - Send username.
 * @param {string} username - The name of the user to log in.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.user = function (user, callback, runLevel, holdQueue) {
    ftp.run(FTP.prototype.user.raw + ' ' + user, callback, runLevel, holdQueue);
};
FTP.prototype.user.raw = 'USER';


/**
 * Runs the FTP command PASS - Send password.
 * @param {string} pass - The password for the user.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.pass = function (pass, callback, runLevel, holdQueue) {
	ftp.run(FTP.prototype.pass.raw + ' ' + pass, callback, runLevel, holdQueue);
};
FTP.prototype.pass.raw = 'PASS';


/**
 * Runs the FTP command PASV - Open a data port in passive mode.
 * @param {string} pasv - The pasv parameter a1,a2,a3,a4,p1,p2 
 * where a1.a2.a3.a4 is the IP address and p1*256+p2 is the port number
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.pasv = function (callback, runLevel, holdQueue) {
	ftp.run(FTP.prototype.pasv.raw, callback, runLevel, holdQueue);
};
FTP.prototype.pasv.raw = 'PASV';


/**
 * Runs the FTP command PORT - Open a data port in active mode.
 * @param {string} port - The port parameter a1,a2,a3,a4,p1,p2.
 * This is interpreted as IP address a1.a2.a3.a4, port p1*256+p2.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.port = function (port, callback, runLevel, holdQueue) {
	ftp.run(FTP.prototype.port.raw + ' ' + port, callback, runLevel, holdQueue);
};
FTP.prototype.port.raw = 'PORT';


/**
 * Runs the FTP command QUIT - Terminate the connection.
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.quit = function (callback, runLevel, holdQueue) {
	ftp.run(FTP.prototype.quit.raw, callback, runLevel, holdQueue);
};
FTP.prototype.quit.raw = 'QUIT';


/**
 * Runs the FTP command NOOP - Do nothing; Keeps the connection from timing out;
 * determine latency(ms), the latency will be passed as the data(second)
 * parameter of the callback
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.ping = function (callback, runLevel, holdQueue) {
	ftp.run(FTP.prototype.ping.raw, function (err) {
		callback.call(this, err, this.ping);
	}, runLevel, holdQueue);
};
FTP.prototype.ping.raw = 'NOOP';


/**
 * Runs the FTP command STAT - Return server status
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.stat = function (callback, runLevel, holdQueue) {
	ftp.run(FTP.prototype.stat.raw, callback, runLevel, holdQueue);
};
FTP.prototype.stat.raw = 'STAT';


/**
 * Runs the FTP command SYST - return system type
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.info = function (callback, runLevel, holdQueue) {
	ftp.run(FTP.prototype.info.raw, callback, runLevel, holdQueue);
};
FTP.prototype.info.raw = 'SYST';


/**
 * Runs the FTP command RNFR and RNTO - Rename from and rename to; Rename a remote file
 * @param {array} paths - The path of the current file and the path you wish
 * to rename it to; eg: ['from', 'to']
 * @param {function} callback - The callback function to be issued.
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.rename = function (paths, callback, holdQueue) {//{{{
    if (!(paths instanceof Array)) {
        throw new Error('ftp.rename > parameter 1 expected array; [from, to]');
    }
    var from = paths[0],
        to = paths[1];

    //run this in a queue
    ftp.run('RNFR ' + from, function (err, data) {
        if (err) {
            callback.call(callback, err, data);
            ftp.emit('endproc');
        } else {
            //run rename to command immediately
            ftp.run(FTP.prototype.rename.raw + ' ' + to, callback, true, holdQueue);
        }
    }, false, true);
};//}}}
FTP.prototype.rename.raw = 'RNTO';


/**
 * Runs the FTP command TYPE - Set transfer type (default ASCII) - <b>will be added in next patch</b>
 * @param {string} type - set to this type: 'ascii', 'ebcdic', 'binary', 'local'
 * @param {string} secondType - 'nonprint', 'telnet', 'asa'
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.type = function (type, secondType, callback, runLevel, holdQueue) {
    var that = this,
        cmd = '';
    if (typeof secondType === 'function') {
        holdQueue = runLevel;
        runLevel = callback;
        callback = secondType;
    }
    if (undefined === type || undefined === that.typeMap[type]) {
        return callback(new Error('ftp.type > parameter 1 expected valid FTP TYPE; [ascii, binary, ebcdic, local]'), null);
    }
    cmd = that.typeMap[type];
    if (undefined !== secondType && undefined === that.secondTypeMap[secondType]) {
        cmd += ' ' + that.secondTypeMap[secondType];
    }
    //update currentType and run
    ftp.currentType = type;
    ftp.run(FTP.prototype.type.raw + ' ' + cmd, callback, runLevel, holdQueue);
};
FTP.prototype.type.raw = 'TYPE';


/**
 * Sets the type of file transfer that should be used
 * based on the path provided
 * @params {string} filepath - the path to the file being transferred
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.setType = function (filepath, callback, runLevel, holdQueue) {
    var ext;
    if (filepath.indexOf('.') > -1) {
		//dot files eg .htaccess 
        if (filepath.indexOf('.') === 0) {
            if (ftp.currentType !== 'ascii') {
                ftp.type('ascii', callback, runLevel, holdQueue);
            } else {
                callback();
            }
        } else {
            ext = filepath.split('.').pop();
            if (undefined === ftp.ascii[ext]) {
                if (ftp.currentType !== 'ascii') {
                    ftp.type('ascii', callback, runLevel, holdQueue);
                } else {
                    callback();
                }
            } else if (ftp.currentType === 'ascii') {
                ftp.type('binary', callback, runLevel, holdQueue);
            } else {
                callback();
            }
        }
    } else if (ftp.currentType !== 'ascii') {
        ftp.type('ascii', callback, runLevel, holdQueue);
    } else {
        callback();
    }
};


/**
 * Values that are used with {@link FTP#setType} and {@link FTP#type}
 * to set the transfer type of data
 * @readonly
 * @class
 * @enum {string}
 */
FTP.prototype.typeMap = {
    ascii: 'A',
    binary: 'I',
    ebcdic: 'E',
    local: 'L'
};

/**
 * @readonly
 * @class
 * @enum {string}
 */
FTP.prototype.secondTypeMap = {
    nonprint: 'N',
    telnet: 'T',
    asa: 'C'
};

/*
    ftp.raw('TYPE A N', function (err, data) {
        dbg(err, data);
    });
*/


/**
 * Runs the FTP command MODE - Set transfer mode (default Stream) - <b>will be added in next patch</b>
 * @param {string} type - set to this type: 'stream', 'block', 'compressed'
 * @todo - This still needs to be added - should create an object of methods
 */
FTP.prototype.mode = function () {
	dbg('not yet implemented');
};

/**
 * Runs the FTP command SITE - Run site specific command - <b>will be added in next patch</b>
 * @param {string} command - The command that will be issued
 * @param {string} parameters - The parameters to be passed with the command
 * @todo - This still needs to be added - should create an object of methods
 * @param {boolean} runLevel - execution priority; @see {@link FTP.Queue.RunLevels}. 
 * @param {boolean} [holdQueue=false] - Prevents the queue from firing an endproc event, user must end manually
 */
FTP.prototype.site = function () {
	dbg('not yet implemented');
};



/**
 * @class DEPRECATED! use {@link Queue}
 */
FTP.prototype.SimpleQueue = Queue;
FTP.prototype.Queue = Queue;
FTP.Queue = Queue;

module.exports = FTP;

