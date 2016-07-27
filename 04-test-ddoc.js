var app = require('./04-ddoc.js')
var util = require('util')

var ddoc = app.blog_ddoc()
console.log('This is the blog DDoc:')
console.log(util.inspect(ddoc, {colors:true, depth:10}))
