
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CdsModule } from '@cds/angular';
import { Subscription } from 'rxjs';
import { Page } from 'src/app/models/page';
import { HighlightPipe } from 'src/app/pipes/highlight.pipe';
import { Nl2BrPipe } from 'src/app/pipes/nl2br.pipe';
import { SearchResultPipe } from 'src/app/pipes/searchresult.pipe';
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-search',
    imports: [CdsModule, RouterModule, Nl2BrPipe, HighlightPipe, SearchResultPipe],
    template: `
        @if (pages.length>0) {
            <div>
                <span class="q">searchresults for <span>"{{q}}"</span></span>
                @for (page of pages; track page) {
                    <div class="result">
                        <a [routerLink]="['/page', page.id]"><cds-icon [attr.shape]="page.icon" size="md"></cds-icon> <span [innerHTML]="page.title | highlight:q"></span></a>
                        <pre [innerHTML]="page.content | searchResult:q | nl2br | highlight:q"></pre>
                    </div>
                }
            </div>
        }    
    `,
    styles: [`
        .q span {
            font-weight: bold;
        }

        .result {
            margin-top:1.5em;
        }

        .result a {
            font-size:1.4em;
            text-decoration: none;
        }

        .result span {
            padding-left:0.4em;
        }

        pre {
            padding:1em;
            background:#eeeeee;
        }
    `]
})
export class SearchComponent implements OnInit, OnDestroy {

    q: string = '';
    pages: Page[] = [];
    
    private search$ = new Subscription();

    private route = inject(ActivatedRoute);
    private backendService = inject(BackendService);

    ngOnInit() {
        this.search$ = this.route.queryParams.subscribe(params => {
            if (params['q']) {
                this.q = params['q'];
                this.search();
            }
        });
    }

    ngOnDestroy(): void {
        this.search$.unsubscribe();
    }

    search() {
        this.backendService.search(this.q).subscribe(pages => {
            this.pages = pages;
        });
    }

}
