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
        var test = this,
            argLength = args.length;
        test.testName = testName;
        test.args = args;
        test.results = {
            success: false
        };
        //for commands that don't have directly correlated errors
        console.log('"' + testName + '"');
        if (args.length === 0) {
            var successFunc = function (err, data) { test.testSuccess.call(test, err, data);};
            ftp[testName].call(ftp, successFunc);
        } else {
            var errFunc, successFunc;
            if (argLength > 1) {
                test.results.error = false;
                errFunc = function (err) { 
                    test.testError.call(test, err);
                    ftp.emit('testComplete');
                };
                successFunc = function (err, data) {
                    test.testSuccess.call(test, err, data);
                };
            } else {
                successFunc = function (err, data) {
                    test.testSuccess.call(test, err, data);
                    ftp.emit('testComplete');
                };
            }
            for (i = 0; i < args.length; i++) {
                ftp[testName].call(ftp, 
                    //one for success, one for fail
                    args[i],
                    (i === 0 ? successFunc : errFunc)
                );
            }
        }
                
    },
    cue = {},
    cueIndex = [],
    tests = [],
    register = function () {
        var i = 0,
            args = [],
            argLength = arguments.length,
            testName;

        for(i; i < argLength; i++) {
            args.push(arguments[i]);
        }
        testName = args.shift();
        //cue registered tests until connected
        cue[testName] = args;
        cueIndex.push(testName);
        tests.push(testName);
    };



Test.run = function () {
    if (cueIndex.length === 0) {
        console.log('--- Testing Complete ---');
        var i = 0;
        for (i; i < tests.length; i++) {
            console.log(tests[i] + ': ', cue[tests[i]].results);
        }
        return;
    }
    console.log('Test module loaded, ftp connected...running tests.');
    var testName = cueIndex.shift(),
        args = cue[testName];
    cue[testName] = Test.create(testName, args);
};


Test.create = function (testName, args) { 
    console.log('Running test: ' + testName, args);
    return new Test(testName, args);
};


Test.prototype.testError = function (err) {
    console.log(this.testName, 'error', err);
    this.results.error = (null !== err);
};


Test.prototype.testSuccess = function (err, data) {
    console.log(this.testName, 'success', err, data);
    this.results.success = (null === err && null !== data);
};


//test success, then error when applicable
register('chdir', '', 'fooError');
register('getcwd');
//will fail at making root
register('mkdir', 'foo' + String(new Date().getTime()), '');
register('ls', '', 'fooError');
register('lsnames', '', 'fooError');



ftp.connect(Test.run);
ftp.on('testComplete', Test.run);


