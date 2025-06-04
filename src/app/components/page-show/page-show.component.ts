import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, map, tap, filter } from 'rxjs/operators';
import { AlertErrorComponent } from '../alert-error/alert-error.component';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { BookmakrsPipe } from 'src/app/pipes/bookmarks.pipe';
import { MarkdownPipe } from 'src/app/pipes/markdown.pipe';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-page-show',
    imports: [AlertErrorComponent, CommonModule, RouterModule, BookmakrsPipe, MarkdownPipe, CdsModule],
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
