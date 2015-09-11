/*
 * The FTPimp testing suite
 * (c) 2014 Nicholas Riley, Sparkida. All Rights Reserved.
 * @module test/index
 */
var assert = require('assert'),
	fs = require('fs'),
	FTP = require('../'),
	config = require('../config'),
	ftp;
//config.debug = false;
describe('FTPimp', function () {
	//TODO - change to main
	before(function (done) {
		this.timeout(10000);
		/**create new FTP instance connection
		 * and login are automated */
		ftp = FTP.create(config, false);
		ftp.connect(done);
	});

	var testDir = 'foo' + String(new Date().getTime());
	describe('ls#LIST: list remote files', function () {
		it ('succeeds', function (done) {
			ftp.ls('', function (err, res) {
				assert(Array.isArray(res));
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.ls('somebadlookup', function (err, res) {
				assert(err instanceof Error);
				assert.equal(res, false);
				done();
			});
		});
	});
	
	describe('lsnames#NLST: name list of remote directory', function () {
		it ('succeeds', function (done) {
			ftp.lsnames('', function (err, res) {
				assert(Array.isArray(res));
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.lsnames('somebadlookup', function (err, res) {
				assert(err instanceof Error);
				assert.equal(res, false);
				done();
			});
		});
	});
	
	describe('lsnames#NLST: name list of remote directory', function () {
		it ('succeeds', function (done) {
			ftp.lsnames('', function (err, res) {
				assert(Array.isArray(res));
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.lsnames('somebadlookup', function (err, res) {
				assert(err instanceof Error);
				assert.equal(res, false);
				done();
			});
		});
	});
	
	describe('chdir#CWD: change working directory', function () {
		it ('succeeds', function (done) {
			ftp.chdir('', function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.chdir('somebadlookup', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});

	describe('mkdir#MKD: make a remote directory', function () {
		it ('succeeds', function (done) {
			ftp.mkdir(testDir, function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.mkdir('', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});
	
	describe('rmdir#RMD: remove remote directory', function () {
		it ('succeeds', function (done) {
			ftp.rmdir(testDir, function (err, res) {
				assert(res);
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.rmdir('badDirectoryError', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});
	
	describe('type#TYPE: set transfer types', function () {
		it ('fails', function (done) {
			ftp.type('badTypeError', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
		it ('changed type to image (binary data)', function (done) {
			ftp.type('binary', function (err, res) {
				assert(res);
				done(err);
			});
		});
		it.skip ('changed type to EBCDIC text(not available)', function (done) {
			ftp.type('ebcdic', function (err, res) {
				assert(res);
				done(err);
			});
		});
		it ('changed type to local format', function (done) {
			ftp.type('local', function (err, res) {
				assert(res);
				done(err);
			});
		});
		it ('changed type to ASCII text', function (done) {
			ftp.type('ascii', function (err, res) {
				assert(res);
				done(err);
			});
		});
	});

	describe('setType: set transfer type based on file', function () {
		it ('uses ASCII as default', function (done) {
			ftp.setType('badTypeError', function (err, res) {
				assert(ftp.currentType, 'ascii');
				done();
			});
		});
		it ('changes to binary for images', function (done) {
			ftp.setType('test.png', function (err, res) {
				assert(ftp.currentType, 'binary');
				done();
			});
		});
		it ('changes to ASCII for text', function (done) {
			ftp.setType('index.js', function (err, res) {
				assert(ftp.currentType, 'ascii');
				done();
			});
		});
	});
	
	
	describe('put: transfer files to remote', function () {
		it ('succeeds', function (done) {
			ftp.put('index.js', function (err, res) {
				assert.equal(res, 'index.js');
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.put('badFileError', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});
	
	describe('rename#RNTO: rename to', function () {
		it ('succeeds', function (done) {
			ftp.rename(['index.js', 'ind.js'], function (err, res) {
				assert(!!res);
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.rename(['missingFile', 'foo'], function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});
	
	describe('get#RETR: retrieve remote file', function () {
		it ('succeeds at getting ASCII text file', function (done) {
			ftp.get('ind.js', function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});
		it ('succeeds at getting binary image file', function (done) {
			ftp.type('binary', function (err, res) {
				if(err) {
					done(err);
				} else {
					ftp.get('test.png', function (err, res) {
						if (err) {
							done(err);
						} else {
							assert(typeof res === 'string');
							done();
						}
					});
				}
			});

		});
		it ('fails', function (done) {
			ftp.get('fileNotFoundError', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});

	describe('save: retrieve remote file and save to local', function () {
		it ('succeeds', function (done) {
			ftp.save(['ind.js', 'ind-ftpimp-remote-saved.js'], function (err, res) {
				assert(!!res);
				fs.unlink('ind-ftpimp-remote-saved.js', function (delError, res) {
					done(delError);
				});
			});
		});
		it ('fails', function (done) {
			ftp.save(['missingFile', 'foo'], function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});

	describe('filemtime#MDTM: return the modification time of a remote file', function () {
		it ('succeeds', function (done) {
			ftp.filemtime('ind.js', function (err, res) {
				assert(!isNaN(Number(res)));
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.filemtime('fileNotFoundError', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});

	describe('unlink#DELE: delete remote file', function () {
		it ('succeeds', function (done) {
			ftp.unlink('ind.js', function (err, res) {
				assert.equal(res, 'ind.js');
				done(err);
			});
		});
		it ('fails', function (done) {
			ftp.unlink('fileNotFoundError', function (err, res) {
				assert(err instanceof Error);
				assert(!res);
				done();
			});
		});
	});

	
	describe('General FTP commands', function () {
		it ('ping#NOOP: do nothing, ping the remote server', function (done) {
			ftp.ping(done);
		});

		it ('stat#STAT: get server status', function (done) {
			ftp.stat(function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});

		it ('root: changes to root directory', function (done) {
			ftp.root(function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});

		it ('getcwd: gets current working directory', function (done) {
			ftp.getcwd(function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});

		it ('info#SYST: return system type', function (done) {
			ftp.info(function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});
	});

	describe('it closes connection to remote', function () {
		it ('quit#QUIT: terminates connection to remote', function (done) {
			ftp.quit(function (err, res) {
				assert(typeof res === 'string');
				done(err);
			});
		});
	});
});
