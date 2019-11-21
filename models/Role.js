
var mongoose = require('mongoose');

var RoleSchema = new mongoose.Schema({
    name: String,
    level: Number
})

mongoose.model('Role', RoleSchema);