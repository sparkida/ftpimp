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
    Test = function (testName, args) {
        var test = this;
        test.testName = testName;
        test.args = args;
        test.pass = {
            success: false

        };
        test.results = {
            success: null
        };
                
    },
    cue = {},
    cueIndex = [],
    tests = [],
    //pool of created test instances
    pool = {};


Test.exe = function () {
    var test = this,
        errFunc, 
        successFunc = function (err, data) {
            test.testSuccess.call(test, err, data);
            ftp.emit('testComplete');
        },
        args = test.args,
        testName = test.testName,
        argLength = args.length;

    //for commands that don't have directly correlated errors
    console.log('Executing Test: ' + testName);
    if (undefined === args || argLength === 0) {
        ftp[testName].call(ftp, successFunc);
    } else {
        if (argLength > 1) {
            test.results.error = null;
            test.pass.error = false;
            successThenErr = function (err, data) {
                test.testSuccess.call(test, err, data);
                ftp[testName].call(ftp, args[1], function (err) { 
                    test.testError.call(test, err);
                    ftp.emit('testComplete');
                });
            };
            //one for success, one for fail
            ftp[testName].call(ftp, args[0], successThenErr);
        }
    }
};


Test.run = function () {
    if (cueIndex.length === 0) {
        console.log('--- Testing Complete ---');
        var i = 0;
        for (i; i < tests.length; i++) {
            console.log(tests[i] + ': ', cue[tests[i]].pass);
            //console.log(tests[i] + ': ', cue[tests[i]].results);
        }
        return;
    }
    var testName = cueIndex.shift(),
        args = cue[testName];
    console.log('Running Test: ' + testName);
    pool[testName] = Test.exe.call(cue[testName]);
};


Test.create = function () { 
    var i = 0,
        args = [],
        argLength = arguments.length,
        testName;
    for(i; i < argLength; i++) {
        args.push(arguments[i]);
    }
    testName = args.shift();
    //cue registered tests until connected
    cue[testName] = Test.build(testName, args);
    cueIndex.push(testName);
    tests.push(testName);
    console.log('Test Created: ' + testName, args);
};


Test.build = function (testName, args) {
    return new Test(testName, args);
};


Test.prototype.testError = function (err) {
    this.results.error = /*[this.testName, 'error',*/ err/*]*/;
    this.pass.error = (null !== err);
};


Test.prototype.testSuccess = function (err, data) {
    this.results.success = /*[this.testName, 'success', err,*/ data/*]*/;
    this.pass.success = (null === err && null !== data);
};


var buildTests = function () {
    //test success, then error when applicable
    Test.create('chdir', '', 'fooError');
    Test.create('getcwd');
    //will fail at making root
    Test.create('mkdir', 'foo' + String(new Date().getTime()), '');
    Test.create('ls', '', 'fooError');
    Test.create('lsnames', '', 'fooError');
    Test.run();
};




ftp.connect(buildTests);
ftp.on('testComplete', Test.run);


