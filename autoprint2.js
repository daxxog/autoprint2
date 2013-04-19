/* autoprint2
 * New (working) version of autoprint in JavaScript.
 * (c) 2013 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var opt = require('optimist')
    .alias('u', 'username')
    .describe('u', 'Gmail username.')
    
    .alias('p', 'password')
	.describe('p', 'Gmail password.')

	.boolean('help')
	.describe('help', 'Show this page.')
	.usage('autoprint -u [Gmail username] -p [Gmail password]')
    .demand(['username', 'password']),

	argv = opt.argv,
    
    Imap = require('imap'),
    ImapMessageStream = require('imap-message-stream'),
    MailParser = require("mailparser").MailParser,
    util = require('util'),
    fs = require('fs');

var imap = new Imap({
    user: argv.u,
    password: argv.p,
    host: 'imap.gmail.com',
    port: 993,
    secure: true
});

imap.connect(function(err) {
    if(err) {
        console.error(err);
    } else {
        imap.openBox('INBOX', true, function(err, mailbox) {
            if(err) {
                console.error(err);
            } else {
                imap.search(['UNSEEN', ['SINCE', 'May 20, 2010']], function(err, results) {
                    if(err) {
                        console.error(err);
                    } else if(results.length === 0) {
                        console.log('Inbox clean! :)');
                    } else {
                        imap._state.indata.streaming = true;
                        imap.fetch(results, {
                            headers: { parse: false },
                            body: true,
                            cb: function(fetch) {
                                fetch.on('message', function(msg) {
                                    var ws = fs.createWriteStream('raw.email'),
                                        mailparser = new MailParser({
                                            //debug: true
                                        });
                                    
                                    mailparser.on('end', function(mail_object) {
                                        console.log('hello');
                                        console.log(mail_object.text);
                                    });
                                    
                                    msg.stream.pipe(mailparser);
                                    msg.stream.pipe(ws);
                                });
                            }
                        }, function(err) {
                            if (err) throw err;
                            console.log('Done fetching all messages!');
                            //imap.logout();
                        });
                    }
                });
            }
        });
    }
});