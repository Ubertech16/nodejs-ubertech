require('newrelic');

var bodyParser = require('body-parser');
var express = require('express');
var rateLimit = require('express-rate-limit');
var mongoose = require('mongoose');
var morgan = require('morgan');
var nodemailer = require('nodemailer');
var mailgun = require('nodemailer-mailgun-transport');
var markdown = require('nodemailer-markdown').markdown;
var reCAPTCHA=require('recaptcha2');
var shortid = require('shortid');

var config = require('./config');
var log = require('./log')(module);
var Registration = require('./app/models/registration.js');

var app = express();
var port = process.env.PORT || 8080;
var router = express.Router();

var mailgunAuth = {
    auth: {
        api_key: config.mailgunApiKey,
        domain: config.domain
    }
};
var rateLimiter = new rateLimit({
    windowMs: 60*60*1000,
    max: 5,
    delayMs: 0,
    message: 'Too many requests made from this IP. You can only make 5 requests every hour. This is to prevent spamming and overloading our servers.'
});
var recaptcha = new reCAPTCHA({
    siteKey: config.siteKey,
    secretKey: config.secretKey
});
var transporter = nodemailer.createTransport(mailgun(mailgunAuth));

mongoose.Promise = global.Promise;
mongoose.connect(config.database);

transporter.use('compile', markdown());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('dev'));

app.enable('trust proxy');

router.use(function(req, res, next) {
    log.info('Incoming Request');
    next();
});

router.get('/', function(req, res) {
    res.json({message: config.description });
});

router.post('/register', function(req, res) {
    log.info('Request Params: %s \nRequest Body : %s', req.params, req.body);

    recaptcha.validateRequest(req)
    .then(function(){
        var registration = new Registration({
            regId: req.body.regId,
            email: req.body.email,
            contact: req.body.contact,
            name: req.body.name,
            college: req.body.college,
            department: req.body.department,
            year: req.body.year,
            events: req.body.events,
            workshops: req.body.workshops,
            accommodation: req.body.accommodation
        });

        var token = 'U16' + shortid.generate();
        registration.token = token;

        registration.save(function(err) {
            if (err) {
                if (err.name === 'ValidationError') {
                    res.statusCode = 400;
                    return res.redirect('https://www.ubertech.io/#error');

                } else {
                    res.statusCode = 500;
                    return res.redirect('https://www.ubertech.io/#error');
                }
                log.error(err);
            } else {
                log.info('New registration added with token: %s', registration.token);

                var emailContent = '### Hello ' + registration.name
                + ',  \n\n\nThank you for participating in **Ubertech ’16**.  \n\n'
                if(registration.events.length > 0) {
                    emailContent += 'You have participated in the following events:  \n\n';
                    for (var i = 0; i < registration.events.length; i++) {
                        emailContent += '* ' + registration.events[i] + '  \n';
                    }
                }
                if (registration.accommodation) {
                    emailContent += '  \n\nJust to confirm, you have applied for accommodation.  ';
                }
                emailContent += '  \n\nYour token is **' + registration.token
                + '**.  \nKeep your token safe.  \n\n\nBest regards,  \nThe Ubertech Team';

                var mailOptions = {
                    from: config.mailgunMailFrom,
                    to: registration.email,
                    subject: 'Confirming your participation in Ubertech ’16',
                    markdown: emailContent
                };

                transporter.sendMail(mailOptions, function(err, info){
                    if(err){
                        log.error(err);
                    } else {
                        log.info('Message sent: %s', info.response);
                    }
                });

                res.statusCode = 200;
                return res.redirect('https://www.ubertech.io/#success');
            }
        });
    })
    .catch(function(errorCodes){
        res.statusCode = 401;
        return res.redirect('https://www.ubertech.io/#RegForm')
    });
});

app.use('/' + config.apiVersion, rateLimiter, router);

app.listen(port, function() {
    log.info('Server running on http://localhost:' + port);
});
