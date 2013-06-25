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

    .alias('m', 'messages')
    .default('m', 75)
    .describe('m', 'Message limit. 0 for no limit.')
    
    .alias('l', 'pages')
    .default('l', 2)
    .describe('l', 'Page limit. 0 for no limit.')
    
    .alias('s', 'server')
    .default('s', '127.0.0.1:9999')
    .describe('s', 'Server')

	.boolean('help')
	.describe('help', 'Show this page.')
	.usage('autoprint -u [Gmail username] -p [Gmail password] -s [ppserver address]')
    .demand(['username', 'password']),

	argv = opt.argv,
    
    Print = require('ppclient'),
    Imap = require('imap'),
    MailParser = require('mailparser').MailParser,
    PDFDocument = require('pdfkit'),
    S = require('string'),
    fs = require('fs');

var imap = new Imap({
    user: argv.u,
    password: argv.p,
    host: 'imap.gmail.com',
    port: 993,
    secure: true
}),
    mLimit = argv.m,
    numMessage = 0,
    pLimit = argv.l,
    print = Print.apply(null, argv.s.split(':'));

imap.connect(function(err) {
    if(err) {
        console.error(err);
    } else {
        imap.openBox('INBOX', false, function(err, mailbox) {
            if(err) {
                console.error(err);
            } else {
                imap.search(['UNSEEN', ['SINCE', 'May 20, 2010']], function(err, results) {
                    if(err) {
                        console.error(err);
                    } else if(results.length === 0) {
                        console.log('Inbox clean! :)');
                        imap.logout();
                    } else {
                        imap._state.indata.streaming = true;
                        imap.fetch(results, {
                            headers: { parse: false },
                            body: true,
                            cb: function(fetch) {
                                fetch.on('message', function(msg) {
                                    if(mLimit === 0 || numMessage < mLimit) {
                                        numMessage++;
                                        
                                        var mailparser = new MailParser();
                                        
                                        mailparser.on('end', function(mail_object) {
                                            var lines = (typeof mail_object.text == 'undefined') ? [] : S(mail_object.text).lines(),
                                                doc = new PDFDocument();
                                            
                                            doc.text('From: ' + mail_object.headers.from);
                                            doc.text('Date: ' + mail_object.headers.date);
                                            doc.text('Subject: ' + mail_object.subject);
                                            doc.moveDown();
                                            
                                            lines.forEach(function(v, i, a) {
                                            	var t = S(v).trim().s;
                                                if((v !== null) && (typeof v == 'string') && (t.length > 0)) {
                                                    doc.text('` ' + t);
                                                }
                                            });
                                            
                                            if((pLimit === 0) || (doc.pages.length <= pLimit)) {
                                                doc.output(function(bin) {
                                                    print.buffer(new Buffer(bin, 'binary'));
                                                });
                                            } else {
                                                console.error(doc.pages.length + ': Page limit of ' + pLimit + ' exceeded.');
                                            }
                                        });
                                        
                                        msg.stream.pipe(mailparser);
                                    } else {
                                        console.error(numMessage + ': Message limit of ' + mLimit + ' exceeded.');
                                    }
                                });
                            }
                        }, function(err) {
                            if(err) {
                                console.error(err);
                            } else {
                                imap.addFlags(results, 'Deleted', function(err) {
                                    if(err) {
                                        console.error(err);
                                    } else {
                                        console.log('Done fetching all messages!');
                                        imap.logout();
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
});
