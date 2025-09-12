import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, map, tap, filter } from 'rxjs/operators';
import { AlertErrorComponent } from './alert-error.component';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { MarkdownPipe } from 'src/app/pipes/markdown.pipe';
import { TocPipe } from 'src/app/pipes/toc.pipe';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';

@Component({
    selector: 'app-page-show',
    imports: [AlertErrorComponent, CommonModule, RouterModule, MarkdownPipe, CdsModule, TocPipe],
    template: `
        @if (loading) {
            <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert-error [error]="error"></app-alert-error>
        @if (page) {
            <div class="page">
                <button class="btn btn-outline" [routerLink]="['/page', 'edit', page.id]">edit</button>
                <cds-icon [attr.shape]="page.icon" size="28"> </cds-icon>
                <h1 class="title">{{page.title}}</h1>
                @if (page.content) {
                    <div class="markdown-formatted" [innerHtml]="page.content | markdown | toc"></div>
                }
            </div>
        }    
    `,
    styles: [`
        .title {
            margin-left:1.2em;
            margin-top:0;
            margin-bottom:0.5em;
        }

        button {
            float:right;
        }

        .page {
            position: relative;
        }

        cds-icon {
            position: absolute;
            top:0.6em;
        }
    `]
})
export class PageShowComponent implements OnInit {
    page: Page | null = null;

    error: string | null = null;
    loading = false;

    private route = inject(ActivatedRoute);
    private backendService = inject(BackendService);

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
