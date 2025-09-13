# MarkdownNotes

MarkdownNotes is a self hosted tool for organizing notes, files, lists, ideas by using markdown syntax.

![MarkdownNote Screenshot](https://github.com/SSilence/markdownnotes/raw/master/screenshot_1.jpg "MarkdownNotes Screenshot")

## features

* writing formatted notes with Markdown
* organizing notes (small personal wiki, todos, notes, code snippets)
* file manager
* passwort manager
* vocabulary trainer

## requirements

* webserver with php support (just 4 a small backend script, runs everywhere with PHP5+) or Docker
* modern browser

## installation

1. Download latest stable release ZIP file from https://github.com/SSilence/markdownnotes/releases and unzip
2. Upload all files of this folder (IMPORTANT: also upload the invisible .htaccess files)
3. Make the directories data and all of its subdirectories writeable
4. If you are using MarkdownNotes on a subpath (e.g. http://example.com/markdownnotes) then add in .htaccess the line ``RewriteBase /markdownnotes/`` and add in index.html ``<base href="/markdownnotes/">``
5. MarkdownNotes saves all data in files in the data dir. No database is necessary.

## installation using docker

Start the [MarkdownNotes docker image](https://hub.docker.com/r/ssilence/markdownnotes) with:
```
docker run -v /yourpath:/var/www/html/data -p 80:80 ssilence/markdownnotes:latest
```
MarkdownNotes notes and files will be saved in your given path. Just replace ``/yourpath`` with target data dir on your system.

## screenshots

![MarkdownNotes Screenshot](https://github.com/SSilence/markdownnotes/raw/master/screenshot_2.jpg "MarkdownNotes Screenshot")

![MarkdownNotes Screenshot](https://github.com/SSilence/markdownnotes/raw/master/screenshot_3.jpg "MarkdownNotes Screenshot")

## credits

Copyright (c) 2025 Tobias Zeising, tobias.zeising@aditu.de  
https://www.aditu.de  
Licensed under the GPLv3 license

Icon Source (design by [Freepik.com](https://creativenerds.co.uk/freebies/80-free-wildlife-icons-the-best-ever-animal-icon-set/))