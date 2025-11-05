import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { ClarityModule } from '@clr/angular';

import { PageTreeComponent } from './components/page/page-tree.component';
import { ResizableSidebarComponent } from './components/shared/resizable-sidebar.component';
import { Page } from './models/page';
import { BackendService } from './services/backend.service';

@Component({
    selector: 'app-root',
    imports: [ClarityModule, RouterModule, PageTreeComponent, ResizableSidebarComponent],
    template: `
        <div class="main-container">
            <header class="header header-6">
                <div class="branding">
                <a class="nav-link cursor-pointer" [routerLink]="['/']">
                    <img class="w-8 h-8 mr-4" src="assets/logo.png">
                    <span class="title">MarkdownNotes</span>
                </a>
                </div>
                <div class="header-nav">
                <a class="nav-link nav-icon cursor-pointer" (click)="add()"><cds-icon shape="add-text"></cds-icon></a>
                @if(newsEnabled) {
                    <a class="nav-link nav-icon cursor-pointer" [routerLink]="['/page', 'news']"><cds-icon shape="help-info"></cds-icon></a>
                }
                @if(imapEnabled) {
                    <a class="nav-link nav-icon cursor-pointer" [routerLink]="['/email']"><cds-icon shape="envelope"></cds-icon></a>
                }
                <a class="nav-link nav-icon cursor-pointer" [routerLink]="['/passwords']"><cds-icon shape="key"></cds-icon></a>
                <a class="nav-link nav-icon cursor-pointer" [routerLink]="['/filelist']"><cds-icon shape="upload-cloud"></cds-icon></a>
                <a class="nav-link nav-icon cursor-pointer" [routerLink]="['/vocabulary']"><cds-icon shape="talk-bubbles"></cds-icon></a>
                </div>
                <div class="search">
                <label for="search-input-sidenav-ng">
                    <input id="search-input-sidenav-ng" type="text" placeholder="Search for keywords..." (change)="search($event.target)" />
                </label>
                </div>
            </header>

            <div class="content-container">
                @if (showNavigation) {
                    <app-resizable-sidebar
                        [minWidth]="200"
                        [maxWidth]="500"
                        [defaultWidth]="300"
                        storageKey="sidebar_width">
                        <section class="pt-4 overflow-auto h-full">
                        @if (loading) {
                            <span class="spinner spinner-inline">Loading Pages...</span>
                        } @else {
                            <app-page-tree [pages]="pages" [active]="active"></app-page-tree>
                        }
                        </section>
                    </app-resizable-sidebar>
                }
                <main class="content-area">
                <router-outlet></router-outlet>
                </main>
            </div>
        </div>
    `
})
export class AppComponent implements OnInit {
    pages: Page[] = [];
    active: string | null = null;
    loading = true;
    q = '';
    showNavigation: boolean = true;
    imapEnabled: boolean = false;
    newsEnabled: boolean = false;

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
            this.checkNewsEnabled(pages);
        });
        this.backendService.getAllPages().subscribe(() => this.loading = false);
        this.backendService.isImapEnabled().subscribe(enabled => this.imapEnabled = enabled);
    }

    checkNewsEnabled(pages: Page[]) {
        this.newsEnabled = pages.some(page => page.id === 'news');
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
