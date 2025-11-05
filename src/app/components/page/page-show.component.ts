import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, map, tap, filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { MarkdownPipe } from 'src/app/pipes/markdown.pipe';
import { TocPipe } from 'src/app/pipes/toc.pipe';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';
import { AlertComponent } from '../shared/alert.component';
import { PageShowNewsComponent } from './page-show-news.component';

@Component({
    selector: 'app-page-show',
    imports: [
        AlertComponent, 
        CommonModule, 
        RouterModule, 
        MarkdownPipe, 
        CdsModule, 
        TocPipe,
        PageShowNewsComponent
    ],
    template: `
        @if (loading) {
            <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert [error]="error"></app-alert>
        @if (page) {
            <div class="relative">
                <div class="flex items-center gap-3 mb-4">
                    <cds-icon [attr.shape]="page.icon" size="28"></cds-icon>
                    <h1 class="!m-0 flex-1">{{page.title}}</h1>
                    @if (page.id === 'news') {
                        <button class="btn btn-outline" (click)="reloadNews()" [disabled]="reloading">
                            @if (reloading) {
                                <span class="spinner spinner-inline">Loading...</span>
                            } @else {
                                Reload
                            }
                        </button>
                    } @else {
                        <button class="btn btn-outline" [routerLink]="['/page', 'edit', page.id]">edit</button>
                    }
                </div>
                @if (page.id === 'news') {
                    <app-page-show-news [content]="page.content"></app-page-show-news>
                } @else if (page.content) {
                    <div class="markdown-formatted" [innerHtml]="page.content | markdown | toc"></div>
                }
            </div>
        }    
    `
})
export class PageShowComponent implements OnInit {
    page: Page | null = null;

    error: string | null = null;
    loading = false;
    reloading = false;

    private route = inject(ActivatedRoute);
    private backendService = inject(BackendService);
    private currentPageId: string | null = null;

    ngOnInit() {
        this.route.params.pipe(
            map(params => params['id']),
            filter(id => id),
            tap(id => {
                this.currentPageId = id;
                this.page = null;
                this.loading = true;
            }),
            switchMap(id => this.backendService.getPage(id)),
            tap(_ => this.loading = false)
        )
        .subscribe({
            next: page => this.page = page,
            error: error => { this.error = error; this.loading = false; }
        });
    }

    reloadPage() {
        if (this.currentPageId) {
            this.loading = true;
            this.backendService.getPage(this.currentPageId).subscribe({
                next: page => {
                    this.page = page;
                    this.loading = false;
                },
                error: error => {
                    this.error = error;
                    this.loading = false;
                }
            });
        }
    }

    reloadNews() {
        this.reloading = true;
        this.backendService.updateNews().subscribe({
            next: () => {
                this.reloadPage();
            },
            error: error => {
                this.error = error;
                this.reloading = false;
            }
        });
    }
}
