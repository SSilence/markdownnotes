import { Component, OnInit } from '@angular/core';
import { Page } from '../shared/models/page';
import { ActivatedRoute } from '@angular/router';
import { BackendService } from '../shared/services/backend.service';
import { switchMap, map, tap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-page-show',
  templateUrl: './page-show.component.html',
  styleUrls: ['./page-show.component.css']
})
export class PageShowComponent implements OnInit {
    page: Page | null = null;

    error: string | null = null;
    loading = false;

    constructor(private route: ActivatedRoute,
        private backendService: BackendService) { }

    ngOnInit() {
        this.route.params.pipe(
            map(params => params['id']),
            filter(id => id),
            tap(_ => {this.page = null; this.loading = true; }),
            switchMap(id => this.backendService.getPage(id)),
            tap(_ => this.loading = false)
        )
        .subscribe({
            next: page => this.page = page,
            error: error => { this.error = error; this.loading = false; }
        });
    }
}
