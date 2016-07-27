module.exports = make_server

// Demo web application
// A very rough approximation of a content management system
//

var Hapi = require('hapi')


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

  callback(null, server)
}


function blog_post(req, reply) {
  var slug = req.params.slug

  console.log('OMG I should find this post: %s', slug)
  reply(`<h1>404: ${slug}</h1>`)
    .code(404)
}

function preferences(req, reply) {
  console.log('prefs', req.method)
  var user = req.params.user

  if (req.method == 'get') {
    // TODO: Actually do this.
    var preferences = {}

    console.log('Got preferences for %s: %j', user, preferences)
    reply(preferences)
  }
  
  else if (req.method == 'post') {
    // TODO: Actually do this.
    
    reply({error:'Not implemented'})
      .code(500)
  }
}

if (require.main === module)
  main()
