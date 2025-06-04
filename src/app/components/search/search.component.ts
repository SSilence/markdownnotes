
import { Component, OnDestroy, OnInit } from '@angular/core';
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
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit, OnDestroy {

    q: string = '';
    pages: Page[] = [];
    
    private search$ = new Subscription();

    constructor(private route: ActivatedRoute,
                private backendService: BackendService) {}

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
