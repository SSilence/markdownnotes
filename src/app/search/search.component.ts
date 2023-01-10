import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CdsModule } from '@cds/angular';
import { Subscription } from 'rxjs';
import { Page } from '../shared/models/page';
import { HighlightPipe } from '../shared/pipes/highlight.pipe';
import { Nl2BrPipe } from '../shared/pipes/nl2br.pipe';
import { SearchResultPipe } from '../shared/pipes/searchresult.pipe';
import { BackendService } from '../shared/services/backend.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, CdsModule, RouterModule, Nl2BrPipe, HighlightPipe, SearchResultPipe],
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
