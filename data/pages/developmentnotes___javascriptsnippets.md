title: JavaScript Snippets
icon: scroll
expanded: 
------------------------------------
[toc]

# random string

```
var id = Math.random().toString(36).substring(7);
```

# autoreplace links in text

```
var textWithUrls = text.replace(/(https?:\/\/[^\s]+)/g, function(url) {
return '<a href="' + url + '" class="extern">' + url + '</a>';
});
```

# jQueryfy Bookmarklet

```
javascript:var s=document.createElement('script');
s.setAttribute('src','http://code.jquery.com/jquery.js');
document.getElementsByTagName('body')[0].appendChild(s);
```