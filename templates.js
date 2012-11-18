var templates = {
  email: [
    "A bucko wishes to show ye 'this excellent photo",
    "<h1><%= name %></h1>",
    "<p><img src='<%= url %>'></p>"].join('\n')
}

module.exports = templates;
