import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { ClarityModule } from '@clr/angular';

import { PageTreeComponent } from './components/page/page-tree.component';
import { Page } from './models/page';
import { BackendService } from './services/backend.service';

@Component({
    selector: 'app-root',
    imports: [ClarityModule, RouterModule, PageTreeComponent],
    template: `
        <div class="main-container">
            <header class="header header-6">
                <div class="branding">
                <a class="nav-link" [routerLink]="['/']">
                    <img class="logo" src="assets/logo.png">
                    <span class="title">MarkdownNotes</span>
                </a>
                </div>
                <div class="header-nav">
                <a class="nav-link nav-icon" (click)="add()"><cds-icon shape="add-text"></cds-icon></a>
                @if(imapEnabled) {
                    <a class="nav-link nav-icon" [routerLink]="['/email']"><cds-icon shape="envelope"></cds-icon></a>
                }
                <a class="nav-link nav-icon" [routerLink]="['/passwords']"><cds-icon shape="key"></cds-icon></a>
                <a class="nav-link nav-icon" [routerLink]="['/filelist']"><cds-icon shape="upload-cloud"></cds-icon></a>
                <a class="nav-link nav-icon" [routerLink]="['/vocabulary']"><cds-icon shape="talk-bubbles"></cds-icon></a>
                </div>
                <div class="search">
                <label for="search-input-sidenav-ng">
                    <input id="search-input-sidenav-ng" type="text" placeholder="Search for keywords..." (change)="search($event.target)" />
                </label>
                </div>
            </header>

            <div class="content-container">
                @if (showNavigation) {
                <nav class="sidenav">
                    <section class="sidenav-content">
                    @if (loading) {
                        <span class="spinner spinner-inline">Loading Pages...</span>
                    } @else {
                        <app-page-tree [pages]="pages" [active]="active"></app-page-tree>
                    }
                    </section>
                </nav>
                }
                <main class="content-area">
                <router-outlet></router-outlet>
                </main>
            </div>
        </div>
    `,
    styles: [`
        .logo {
            width:2em;
            height:2em;
            margin-right:1em;
        }

        .sidenav {
            padding-top:1em;
            overflow:auto;
            min-width: 12rem;
            width: 18%;
        }

        .nav-link {
            cursor: pointer;
        }

        #search_input {
            padding-left:0.5em;
        }        
    `]
})
export class AppComponent implements OnInit {
    pages: Page[] = [];
    active: string | null = null;
    loading = true;
    q = '';
    showNavigation: boolean = true;
    imapEnabled: boolean = false;

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
        this.backendService.isImapEnabled().subscribe(enabled => this.imapEnabled = enabled);
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
