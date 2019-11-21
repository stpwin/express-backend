var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator')


var SimpleDataSchema = new mongoose.Schema({
    peaID: Number,
    name: String,
    lastName: String,

}, {timestamps: true})

SimpleDataSchema.methods.addData = function(){

}

SimpleDataSchema.methods.toJSONFor = function(){
    return {
        peaID: this.peaID,
        name: this.name,
        lastName: this.lastName
    }
}

mongoose.model('SimpleData', SimpleDataSchema);