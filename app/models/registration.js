var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RegistrationSchema = new Schema({
    regId: {
        type: String,
        unique: true,
        sparse: true,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    college: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    events: {
        type: [String],
    },
    workshops: {
        type: [String],
    },
    accommodation: {
        type: Boolean,
        default: false
    },
    token: {
        type: String,
        required: true
    },
});

module.exports = mongoose.model('Registration', RegistrationSchema);
