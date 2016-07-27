module.exports = make_blog_ddoc

// The blog design document
//

function make_blog_ddoc() {
  return {
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
