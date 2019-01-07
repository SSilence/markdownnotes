import { Component, OnInit } from '@angular/core';
import { Page } from './shared/page';
import { BackendService } from './shared/backend.service';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { map, filter, tap, first, retry, retryWhen, delayWhen, delay } from 'rxjs/operators';
import { timer } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    pages: Page[] = [];
    active: string = null;
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
        this.backendService.getAllPages()
            .pipe(
                retryWhen(errors => errors.pipe(delay(5000)))
            )
            .subscribe(() => this.loading = false);
    }

    add() {
        this.router.navigate(['/page', 'add']);
    }
}
