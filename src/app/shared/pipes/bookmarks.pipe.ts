import { Pipe, PipeTransform } from '@angular/core';

import * as jquery from 'jquery';
import { Observable, of } from 'rxjs';
import { BackendService } from './../services/backend.service';
import { map, switchMap, catchError } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
    name: 'bookmarks'
})
export class BookmakrsPipe implements PipeTransform {

    constructor(private backendService: BackendService,
                private sanitizer: DomSanitizer) {

    }

    transform(value: string, args?: any): Observable<SafeHtml> {
        if (!value) {
            return of(value);
        }

        let regex = /(?:\[bookmarks=)([^\]]+)]/g;
        let result;
        
        let observable = null;

        do {
            result = regex.exec(value);
            
            if (!result) {
                break;
            }

            let file = result[1];
            
            let observableFile = this.backendService.getFileAsString(file).pipe(
                map(content => this.bookmarksToHtml(content)),
                catchError(() => of('<span class="error">bookmarks file not found</span>')),
                map(content => { value = value.replace(`[bookmarks=${file}]`, content); return value } )
            );

            if (observable == null) {
                observable = observableFile;
            } else {
                observable = observable.pipe(
                    switchMap(() => observableFile)
                );
            }
        } while (result);

        observable = observable ? observable : of(value);
        return observable.pipe(map((content: string) => this.sanitizer.bypassSecurityTrustHtml(content)));
    }

    private bookmarksToHtml(bookmarkshtml: string): string {
        bookmarkshtml = bookmarkshtml.replace(new RegExp("<p>", 'g'), "");
        let categories = { 
            category: '', 
            entries: [] 
        } as any;

        for (let a of jquery(bookmarkshtml).find('a')) {
            let e = jquery(a);
            let headings = [];
            let parent = e.parent().parent().prev();
            while(parent.length > 0 && jquery(parent).prop("tagName") == 'H3') {
                let h = jquery(parent).text();
                if (h.length > 0) {
                    headings.push(h);
                }
                parent = jquery(parent).parent().parent().prev();
            }
            
            let c = categories;
            for (let heading of headings.reverse()) {
                let folder: any = c.entries.find((item: any) => item.category == heading);
                if (!folder) {
                    folder = { category: heading, entries: [] };
                    c.entries.push(folder)
                }
                c = folder;
            }

            c.entries.push({ 
                title: e.text(), 
                icon: e.attr('icon'), 
                href: e.attr('href')
            });
        }
        
        return '<div class="bookmarks">' + this.categoryToHtml(categories) + '</div>';
    }

    private categoryToHtml(category: any, level = 1) {
        let caption = `<h${level}>${category.category}</h${level}>`;
        return (category.category ? caption : '') + '<ul>' +
            category.entries.map((e: any) => {
                if (e.href) {
                    return `<li><a href="${e.href}"><img src="${e.icon ? e.icon : 'assets/bookmark.png'}"> ${e.title}</a></li>`;
                } else if (e.category) {
                    return `<li>${this.categoryToHtml(e, level+1)}</li>`;
                } else {
                    return "";
                }
            }).join("\n") + '</ul>';
    }

}
