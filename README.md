# Introduction to Fun PouchDB

Hi! This document introduces a project I've made, to build an **offline-first** web application, and also to have fun--hence the project name: [Fun PouchDB][fun-pouchdb]!

"Wait," you say. "An offline-first web server? What does that even mean?"

I'm glad you asked! Here is what makes Fun PouchDB tick:

1. Fun PouchDB is a Node.js package (`npm install fun-pouchdb`)
1. It is plain old PouchDB. Nothing new to learn. PouchDB runs on top of LevelDB, which means your app will have *very low latency*. This is the main objective: speed with convenience.
1. Fun PouchDB provides lots of conveniences we all need. It saves us lots of typing, lots of bugs.
  1. Automatically initialize multiple databases at the same time
  1. Automatically replicate to and from IBM Cloudant
  1. Automatically create and update design documents your app needs
  1. Automatically validate all data, using a function you provide. If the doc is invalid, just throw.
  1. Make it easy to unit test our code, especially validation functions and design documents

## Life Before Fun PouchDB

Let's make an example web application: a blog, for example. This will not be a real app, it will just provide an example. Later, we will add database support with Fun PouchDB.

So, here is [version 1][v1], a prototype blog with no data layer yet. The entire app is 67 lines (the idea is to show off Fun PouchDB, not to make a full-featured blog). So far we have these features:

* A Hapi web server: done
* If you GET `/blog/{slug}` then the server will render that blog post. (database and rendering obviously *not implemented yet*)
* If you GET `/user/{username}/preferences` then the server will send you a JSON object with the user's preferences. (database lookup *not implemented yet*)
* If you POST `/user/{username}/preferences` with a JSON object, then that data will be stored in that user's preferences. (*Not implemented*)

Note that blog posts and preferences are in separate databses. In real applications, people often use multiple databases, so let's do that here to see how it will look.

Finally, authentication, authorization, and tons of other features are not implemented, because we are here to show off Fun PouchDB.

## First Try: Pure PouchDB

See [version 2][v2], with the features implemented completely from the `pouchdb` package--no fun.

Here are some highlights from the code. We had to add all of this code, 35 lines. Most of this code is the inconvenient "get/modify/put" procedure, to update the design doc. The code works, but it is an eyesore, a distraction, and it is prone to bugs.

``` js
  //
  // Server done. Initialize the DBs
  //

  var blogs = new PouchDB('blogs', {db:leveldown, prefix:__dirname+'/'})
  var prefs = new PouchDB('prefs', {db:leveldown, prefix:__dirname+'/'})

  server.app.blogs = blogs
  server.app.prefs = prefs

  // Add the design document to look up blogs by slug.
  blogs.get('_design/blogs', function(er, doc) {
    if (er && er.status == 404)
      doc = {}            // This is fine
    else if (er)
      return callback(er) // This is not fine

    doc._id = '_design/blogs'
    doc.views = {
      blog_slug: {
        map: function(doc) {
          if (doc.slug)
            emit(doc.slug, doc)
        }.toString()
      }
    }

    blogs.put(doc, function(er) {
      if (er)
        return callback(er)

      console.log('Blog ddoc ready')
      callback(null, server)
    })
  })
```

But at least we now have a design document with a view that will let us look up blog posts by slug:

``` js
  map: function(doc) {
    if (doc.slug)
      emit(doc.slug, doc)
  }.toString()
```

Wow. Not only is this very important code lost in the middle of a JavaScript mess. (And let's face it, most JavaScript code tends to be a mess.) But we've also had to `toString()` the function. This will be no fun to unit test.

### Pros and Cons

With some of the basic functionality implemented, let's think about pros and cons of server-side PouchDB.

**The only Pro**: This server will be **super, super fast**. LevelDB has superb latency. PouchDB has superb latency. We get powerful indexing with Cloudant  and CouchDB compatibility, but at fantastic speed. Sites which need snappy performance (which is most sites) will love this architecture.

**Tons of Cons**: almost everything else about this setup is worse.

* It is hard to work with PouchDB directly. You can't even use `curl`. You have to program JavaScript.
* It is hard to poke around the data. We have no dashboard. We have nothing. We have to program JavaScript.
* It is very hard to validate data. We would need to implement data validation in our app code. This crucially important function--verifying and validating good data--will be spread all throughout our code. That is unacceptable.

## Bar None--Excuse the Pun--One Tonne of Long-Run Fun Has Begun (This Joke is Done)

Let's port things over to Fun PouchDB, in [version 3][v3].

Right from the start, let's provide Cloudant credentials.

``` js
var DB = require('fun-pouchdb').defaults({prefix: __dirname})
const CLOUDANT = {account:'jhs', password:'31dfd78dc02879a7f08b49a785f15a7b54c52caa'}
```

And then initialization is a bit simplified. (But we have not changed the manual ddoc initialization. That comes next.)

``` js
  DB({blogs:{cloudant:CLOUDANT}, prefs:{cloudant:CLOUDANT}}, function(er, dbs) {
    if (er)
      return callback(er)

    server.app.blogs = dbs.blogs
    server.app.prefs = dbs.prefs
```

You can guess what will happen. From now on, **both databases will always sync to and from a mirror on Cloudant**.

Using PouchDB for local data, but with a read/write replica in Cloudant: that was my inspiration to write Fun PouchDB in the first place. I want the dashboard, in other words.

With this simple upgrade, we have a cloud backup (technically a "replica" but it's better than nothing). We have a GUI data explorer and editor. We have powerful Lucene and Geo search features from Cloudant.

At this point, if we wanted to ship a mobile app, we could interface with Cloudant. *The core web app would be unchanged.* That is the win. That is how a project should grow: with minimal impact and minimal headache to existing code.

## Fun PouchDB and Convenient Design Doc Management

Note that our manual design document stuff, although it has its problems, at least it *still works* with Fun PouchDB. Fun PouchDB returns plain old PouchDB objects to the user. Anything that works on PouchDB works with Fun PouchDB. (But it's less fun.)

In [version 4][v4], we will convert our manual design doc code to Fun PouchDB. This is now the *entire initialization sequence*:

``` js
DB({blogs:{cloudant:CLOUDANT, ddoc:blog_ddoc()}, prefs:{cloudant:CLOUDANT}}, function(er, dbs) {
  if (er)
    return callback(er)

  server.app.blogs = dbs.blogs
  server.app.prefs = dbs.prefs
  callback(null, server)
})
```

And the design doc is in a new file:

``` js
  {
    _id: '_design/blogs',
    views: {
      blog_slug: {
        map: function(doc) {
          if (doc.slug)
            emit(doc.slug, doc)
        }
      }
    }
  }
}
```

There are two valuable changes:

1. The design document is implemented in its own dedicated file.
1. Map-reduce code may be a functions, not just a string.

Together, these changes make design documents much, much easier to unit test. Just `require()` the module, and call `blog_slug.map()`

## Final Step: Data Validation

Finally, [version 5][v5] shows data validation, the Fun way. There is a one-line change to initialization:

``` js
  DB({blogs:{cloudant:CLOUDANT, ddoc:blog_ddoc()},
      prefs:{cloudant:CLOUDANT, validate:validate_prefs} }, function(er, dbs) {
```

Validation functions are not as complicated as CouchDB `validate_doc_update()`. I think the CouchDB approach is a bit too broad, and a bit too complicated. Fun PouchDB says, "Just give me a function. I will call it with a doc that is ready for storage, and you throw if there is a problem."

I think this hits the "80/20" balance nicely. My work is simpler: Given a doc, throw if it looks bad. Got it.

For example, the validation function checks for correct colors and correct time zone settings.

``` js
var OK_COLORS = ['blue', 'red', 'green']

function validate_preferences(doc) {
  if (doc.color) {
    if (OK_COLORS.indexOf(doc.color) == -1)
      throw new Error(`Bad color: ${doc.color}`)
  }

  if (typeof doc.timezone == 'undefined')
    ; // Leaving it blank is fine.
  else if (typeof doc.timezone != 'number')
    throw new Error(`Bad timezone setting: ${doc.timezone}`)
}
```

By exporting this function, we can give this code to the test suite, where it can rigourously test the code. Compare this to storing a design doc in Cloudant, and then testing over HTTP, you can see that this way is much more fun.

## Implications

I think a Fun PouchDB app is is an "offline-first" web application. It has very impressive latency, but with all the benefits of Cloudant: the dashboard, searching, geo, and so on.

If one begins with Fun PouchDB, expanding to a mobile app is dead simple, just query Cloudant. Or, use CDTDatastore to replicate down, for an offline-first mobile app.

## Final Thoughts

I genuinely think Fun PouchDB is fun. (It was fun to write!) However, broadly speaking, I hope the word "Fun" can be replaced with "Productive" and this entire article should still work.

[fun-pouchdb]: https://github.com/jhs/fun-pouchdb
[v1]: 01-web-app.js
[v2]: 02-pouchdb.js
[v3]: 03-fun-pouchdb.js
[v4]: 04-ddoc.js
[v5]: 05-validation.js
