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
                                    var mailparser = new MailParser();
                                    
                                    mailparser.on('end', function(mail_object) {
                                        var lines = S(mail_object.text).lines(),
                                            doc = new PDFDocument();
                                        
                                        lines.forEach(function(v, i, a) {
                                            console.log(v);
                                            doc.text(v);
                                        });
                                        
                                        /*doc.output(function(bin) {
                                            fs.writeFile('out.pdf', bin, 'binary', function(err) {
                                                console.log(err);
                                            });
                                        });*/
                                        
                                        doc.write('out.pdf');
                                    });
                                    
                                    msg.stream.pipe(mailparser);
                                });
                            }
                        }, function(err) {
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