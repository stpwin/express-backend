var mongoose = require('mongoose')
var router = require('express')
var passport = require('passport')
var auth = require('../auth')
var SimpleData = mongoose.model('SimpleData')

router.post('/simpledata', auth.required, function(req,res,next){
    
})