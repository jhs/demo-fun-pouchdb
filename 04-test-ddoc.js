var blog_ddoc = require('./04-blog-ddoc.js')
var util = require('util')

var ddoc = blog_ddoc()
console.log('This is the blog DDoc:')
console.log(util.inspect(ddoc, {colors:true, depth:10}))
