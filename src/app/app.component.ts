import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { ClarityModule } from '@clr/angular';

import { PageTreeComponent } from './components/page-tree/page-tree.component';
import { Page } from './models/page';
import { BackendService } from './services/backend.service';

@Component({
    selector: 'app-root',
    imports: [ClarityModule, RouterModule, PageTreeComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    pages: Page[] = [];
    active: string | null = null;
    loading = true;
    q = '';
    showNavigation: boolean = true;

    constructor(private backendService: BackendService,
                private route: ActivatedRoute,
                private router: Router) {}

    ngOnInit() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            let r = this.route;
            while (r.firstChild) {
                r = r.firstChild;
            }
            r.params.pipe(
                first(),
                filter(params => params['id'])
            ).subscribe(params => {
                this.active = params['id'] ? params['id'] : null
            });

            this.showNavigation = this.router.url == "/" || this.router.url.startsWith("/page") || this.router.url.startsWith("/search");
        });
        this.backendService.pagesChanged.subscribe(pages => {
            this.pages = this.backendService.filterSystemPages(pages).map(p => ({...p}));
        });
        this.backendService.getAllPages().subscribe(() => this.loading = false);
    }

    add() {
        this.router.navigate(['/page', 'add']);
    }

    search(event: any) {
        if (event.value.length>=3) {
            this.router.navigate(['/search'], {
                queryParams: {q: event.value}
            });
        }
    }
}
