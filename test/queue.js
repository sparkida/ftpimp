/*
 * The FTPimp testing suite
 * (c) 2014 Nicholas Riley, Sparkida. All Rights Reserved.
 * @module test/index
 */
var assert = require('assert'),
	fs = require('fs'),
	FTP = require('../'),
	Queue = FTP.Queue,
	config = require('../config'),
	path = require('path'),
	ftp;
config.debug = false;

describe('FTPimp', function () {

	before(function (done) {
		this.timeout(10000);
		/**create new FTP instance connection
		 * and login are automated */
		ftp = FTP.create(config, false);
		//ftp.debug.enable();
		ftp.connect(function () {
			done();
		});
	});

	describe('Queue sequence tests', function () {
		var level = 0,
			msg = 'should be at level ';
		it ('should run in waterfall', function (done) {
			ftp.ping(function (err, res) {
				level += 1;
				//console.log(level);
				assert(level, 1, msg + level);
				ftp.runNow(ftp.ping.raw, function (err, res) {
					level += 1;
					//console.log(level);
					assert(level, 2, msg + level);
				});
				ftp.ping(function (err, res) {
					level += 1;
					assert(level, 6, msg + level);
				});
				ftp.runNext(ftp.ping.raw, function (err, res) {
					level += 1;
					//console.log(level);
					assert(level, 3, msg + level);
				});
			});
			ftp.ping(function (err, res) {
				level += 1;
				//console.log(level);
				assert.equal(level, 4, msg + level);
				ftp.ping(function (err, res)  {
					level += 1;
					//console.log(level);
					assert.equal(level, 7, msg + level);
					done();
				});
			});
			ftp.ping(function (err, res) {
				level += 1;
				//console.log(level);
				assert.equal(level, 5, msg + level);
			});
		});
		it ('should never run the last command', function (done) {
			ftp.ping(function (err, res) {
				level = 1;
				assert(level, 1, msg + level);
				setTimeout(function () {
					done();
				}, 250);
			}, Queue.RunLast, true);
			ftp.ping(function (err, res) {
				done('This should not run!');
			});
		});
		it ('should override the holdQueue from last command and quit', function (done) {
			ftp.quit(done, Queue.RunNow);
		});
	});
});
