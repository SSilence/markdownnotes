import { Component, OnInit } from '@angular/core';
import { Page } from './shared/models/page';
import { BackendService } from './shared/services/backend.service';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { filter, first } from 'rxjs/operators';
import { ClarityModule } from '@clr/angular';
import { CommonModule } from '@angular/common';
import { PageTreeComponent } from './page-tree/page-tree.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ClarityModule, RouterModule, CommonModule, PageTreeComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    pages: Page[] = [];
    active: string | null = null;
    loading = true;
    q = '';

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
        });
        this.backendService.pagesChanged.subscribe(pages => this.pages = pages.map(p => ({...p})))
        this.backendService.getAllPages().subscribe(() => this.loading = false);
    }

    add() {
        this.router.navigate(['/page', 'add']);
    }
}
