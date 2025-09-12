title: JavaScript Snippets
icon: scroll
language: 
disabled: 
expanded: 1
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

## HTTP Inhalt laden

```
import java.net.*;
import java.util.ArrayList;
import java.io.*;

/**
 * Laedt den Inhalt einer gegebenen URL
 * @param url Ziel URL
 * @return String mit dem gesamten Seiten-Content
 * @throws IOException
 */
private String getHttp(String url) throws IOException {
	URL source = new URL(url);
	URLConnection yc = source.openConnection();
	BufferedReader in = new BufferedReader(new InputStreamReader(yc.getInputStream()));
	
	String content = "";
	String inputLine;
	while ((inputLine = in.readLine()) != null)
		content = content + inputLine + "\n";
	in.close();
	
	return content;
}
```