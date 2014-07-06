/*
 * The FTPimp testing suite
 * (c) 2014 Nicholas Riley, Sparkida. All Rights Reserved.
 * @module test/index
 */

//TODO - change to main
var FTP = require('../ftpimp-app'),
    config = require('./config.json'),
    /**create new FTP instance connection
     * and login are automated */
    ftp = FTP.create(config, false),
    Test = function () {
        var args = [],
            i = 0,
            argLength = arguments.length,
            test = this;

        console.log(arguments);

        for (i; i < argLength; i++) {
            args.push(arguments[i]);
        }
        
        testName = args.splice(0, 1)[0];

        for (i = 0; i < 2; i++) {
            console.log(args);
            ftp[testName].apply(ftp, 
                    args[i].concat(i === 0 
                        ? test.testError : test.testSuccess));
        }
                
    },
    cue = {},
    cueIndex = [],
    register = function () {
        cue[testName] = Test.create(arguments);
    };

Test.create = function (testName) { 
    return new Test(testName, arguments);
};

Test.prototype.testError = function (err) {
    return null !== err;
};

Test.prototype.testSuccess = function (err, data) {
    return null === err && null !== data;
};


//change to fake directory for error, then change to root for success
register('chdir', 'fooError', '');



ftp.events.on('testModuleExec', launchTest);
ftp.connect(init);


