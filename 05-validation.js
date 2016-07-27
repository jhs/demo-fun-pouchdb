module.exports = make_server

// Demo web application
// A very rough approximation of a content management system
//

var Hapi = require('hapi')
var DB = require('fun-pouchdb').defaults({prefix: __dirname})

var blog_ddoc = require('./04-blog-ddoc.js')
var validate_prefs = require('./05-validate-prefs.js')

const CLOUDANT = {account:'jhs', password:'31dfd78dc02879a7f08b49a785f15a7b54c52caa'}

function main() {
  console.log('Start')
  make_server(function(er, server) {
    console.log('ok')
    if (er)
      throw er

    server.start(function() {
      console.log('Server ready', server.info.uri)
    })
  })
}

function make_server(callback) {
  var server = new Hapi.Server
  server.connection({host:'0.0.0.0', port:8080})

  // Render a blog post
  server.route({method:'GET', path:'/{slug}', handler:blog_post})

  // Handlers to let users work with their settings
  server.route({method:'GET' , path:'/user/{user}/preferences', handler:preferences})
  server.route({method:'POST', path:'/user/{user}/preferences', handler:preferences})

  //
  // Server done. Initialize the DBs
  //

  DB({blogs:{cloudant:CLOUDANT, ddoc:blog_ddoc()},
      prefs:{cloudant:CLOUDANT, validate:validate_prefs} }, function(er, dbs) {
    if (er)
      return callback(er)

    server.app.blogs = dbs.blogs
    server.app.prefs = dbs.prefs
    callback(null, server)
  })
}


function blog_post(req, reply) {
  var slug = req.params.slug

  console.log('Look up post: %s', slug)
  req.server.app.blogs.query('blogs/blog_slug', {key:slug}, function(er, result) {
    if (er)
      return reply(er.message).code(500)

    if (result.rows.length == 0)
      return reply(`<h1>404: ${slug}</h1>`)
        .code(404)

    // Great! Found the blog post.
    var doc = result.rows[0].value
    reply(`<h1>${doc.title}</h1>
          <p>At ${doc.timestamp}</p>
          <p>${doc.body}</p>`)
  })
}

function preferences(req, reply) {
  var user = req.params.user

  req.server.app.prefs.txn({id:user, create:true, timestamps:true}, handle_prefs, prefs_done)

  function handle_prefs(doc, to_txn) {
    if (req.method == 'post') {
      // Update the preferences from the body.
      for (var key in req.payload)
        doc[key] = req.payload[key]
    }

    return to_txn()
  }

  function prefs_done(er, doc) {
    if (er)
      return reply(er.message).code(500)  // Nope. Something really went wrong.

    var preferences = doc
    console.log('Got preferences for %s: %j', user, preferences)
    reply(preferences)
  }
}

if (require.main === module)
  main()
