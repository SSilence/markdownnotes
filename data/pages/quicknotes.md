title: quick notes
icon: details
disabled: 
expanded: 1
------------------------------------
* buy milk
* write a simple note tool
* update wordpress
* make a nice example screenshot for markdownnotes

# Install MarkdownNotes

1. Download latest stable release ZIP file from https://github.com/SSilence/markdownnotes/releases and unzip
2. Upload all files of this folder (IMPORTANT: also upload the invisible .htaccess files)
3. Make the directories data/files and data/pages writeable
4. If you are using MarkdownNotes on a subpath (e.g. http://example.com/markdownnotes) then add in .htaccess the line ``RewriteBase /markdownnotes/`` and add in index.html ``<base href="/markdownnotes">``
5. MarkdownNotes saves all data in files in the data dir. No database is necessary.