import { Pipe, PipeTransform } from '@angular/core';

import * as showdown from 'showdown/dist/showdown.min.js';
import highlightjs from 'highlight.js';

@Pipe({
    name: 'markdown'
})
export class MarkdownPipe implements PipeTransform {

    converter: any = null;

    transform(value: string, args?: any): any {
        if (!value) {
            return value;
        }

        if (!this.converter) {

            showdown.extension('highlightjs', function () {
                function htmlunencode(text: any) {
                    return (text
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>'));
                }
                // use new shodown's regexp engine to conditionally parse codeblocks
                const left = '<pre><code\\b[^>]*>';
                const right = '</code></pre>';
                const flags = 'g';
                function replacement(wholeMatch: any, match: any, left: any, right: any) {
                    // unescape match to prevent double escaping
                    match = htmlunencode(match);
                    return left + highlightjs.highlightAuto(match).value + right;
                }
                return [
                    {
                        type: 'output',
                        filter: function (text: any, converter: any, options: any) {
                            return showdown.helper.replaceRecursiveRegExp(text, replacement, left, right, flags);
                        }
                    }
                ];
            });

            // taken from https://github.com/JanLoebel/showdown-toc/blob/master/src/showdown-toc.js
            showdown.extension('toc', function () {
                function getHeaderEntries(sourceHtml: any) {
                    // Generate dummy element
                    var source = document.createElement('div');
                    source.innerHTML = sourceHtml;

                    // Find headers
                    var headers = source.querySelectorAll('h1, h2, h3, h4, h5, h6');
                    var headerList: any[] = [];
                    for (var i = 0; i < headers.length; i++) {
                        var el = headers[i];
                        headerList.push(new TocEntry(el.tagName, el.textContent, el.id));
                    }

                    return headerList;
                }

                class TocEntry {
                    public tagName: any;
                    public text: any;
                    public anchor: any;
                    public children: any[] = [];

                    constructor(tagName: any, text: any, anchor: any) {
                        this.tagName = tagName;
                        this.text = text;
                        this.anchor = anchor;
                        this.children = [];
                    }

                    childrenToString() {
                        if (this.children.length === 0) {
                            return "";
                        }
                        var result = "<ul>\n";
                        for (var i = 0; i < this.children.length; i++) {
                            result += this.children[i].toString();
                        }
                        result += "</ul>\n";
                        return result;
                    };
    
                    toString() {
                        var result = "<li>";
                        if (this.text) {
                            result += "<a href=\"" + window.location.href + "#" + this.anchor + "\">" + this.text + "</a>";
                        }
                        result += this.childrenToString();
                        result += "</li>\n";
                        return result;
                    };
                }

                

                function sortHeader(tocEntries: any, level: any) {
                    level = level || 1;
                    var tagName = "H" + level,
                        result: any = [],
                        currentTocEntry;

                    function push(tocEntry: any) {
                        if (tocEntry !== undefined) {
                            if (tocEntry.children.length > 0) {
                                tocEntry.children = sortHeader(tocEntry.children, level + 1);
                            }
                            result.push(tocEntry);
                        }
                    }

                    for (var i = 0; i < tocEntries.length; i++) {
                        var tocEntry = tocEntries[i];
                        if (tocEntry.tagName.toUpperCase() !== tagName) {
                            if (currentTocEntry === undefined) {
                                currentTocEntry = new TocEntry(undefined, undefined, undefined);
                            }
                            currentTocEntry.children.push(tocEntry);
                        } else {
                            push(currentTocEntry);
                            currentTocEntry = tocEntry;
                        }
                    }

                    push(currentTocEntry);
                    return result;
                }

                return {
                    type: 'output',
                    filter: (sourceHtml: any) => {
                        var headerList = getHeaderEntries(sourceHtml);

                        // No header found
                        if (headerList.length === 0) {
                            return sourceHtml;
                        }

                        // Sort header
                        headerList = sortHeader(headerList, undefined);

                        // Build result and replace all [toc]
                        var result = '<div class="toc"><h1>table of contents</h1>\n<ul>\n' + headerList.join("") + '</ul>\n</div>\n';
                        return sourceHtml.replace(/\[toc\]/gi, result);
                    }
                };
            });


            this.converter = new showdown.Converter({
                simpleLineBreaks: true,
                tables: true,
                strikethrough: true,
                simplifiedAutoLink: true,
                extensions: ['highlightjs', 'toc']
            });
        }

        return this.converter.makeHtml(value);
    }

}
