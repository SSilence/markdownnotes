import { Component, HostListener, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { switchMap, map, tap } from 'rxjs/operators';
import { of, timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CdsModule } from '@cds/angular';
import { FormsModule } from '@angular/forms';
import { MarkdownEditorComponent } from './markdown-editor.component';
import { Page } from 'src/app/models/page';
import { BackendService } from 'src/app/services/backend.service';
import { IconService } from 'src/app/services/icon.service';
import { IconDialogComponent } from './icon-dialog.component';
import { AlertComponent } from '../shared/alert.component';

@Component({
    selector: 'app-page-edit',
    imports: [
        AlertComponent,
        CommonModule,
        CdsModule,
        RouterModule,
        FormsModule,
        MarkdownEditorComponent,
        IconDialogComponent
    ],
    template: `
        @if (loading) {
            <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert [error]="error"></app-alert>
        @if (success) {
            <app-alert message="successfully saved" [sticky]="true" [type]="'success'"></app-alert>
        }
        @if (page) {
            <div class="relative">
                <div>
                <div class="flex items-center gap-2">
                    <button type="button" class="selectedIcon btn btn-icon" (click)="openIconDialog()"><cds-icon [attr.shape]="page!.icon" size="24"></cds-icon></button>
                    <input type="text" id="basic" placeholder="title for the page" class="clr-input !text-xl flex-grow" name="title" [(ngModel)]="page!.title">
                    <div class="btn-group btn-primary">
                        <button class="btn btn-success" (click)="save(false)">save</button>
                        <button class="btn btn-primary" (click)="save(true)">save & show</button>
                    </div>
                </div>
                <markdown-editor [(content)]="page.content"></markdown-editor>
                <div class="mt-4 mb-4 rounded-sm border border-border-gray bg-white p-3 inline-block">
                    <span class="block float-left mr-2.5">Parent Page:</span>
                    <select name="options" [(ngModel)]="page.parent">
                    <option [ngValue]="null">no parent</option>
                    @for (page of flattenPages(); track page) {
                        <option [ngValue]="page" [textContent]="flattenPageTitle(page)"></option>
                    }
                    </select>
                </div>
                </div>
                <button class="btn btn-success" (click)="save(false)">save</button>
                <button class="btn btn-primary" (click)="save(true)">save & show</button>
                @if (page.id) {
                    <button class="btn btn-link" [routerLink]="['/page', page!.id]">cancel</button>
                }
                @if (!page.id) {
                    <button class="btn btn-link" [routerLink]="['/']">cancel</button>
                }
                @if (page.id) {
                    <button class="btn btn-danger-outline float-right" (click)="showDeleteConfirmation=true">delete</button>
                }
                @if (success) {
                    <div class="text-success">page successfully saved</div>
                }
            </div>
        }

        @if (showDeleteConfirmation) {
            <div class="modal">
                <div class="modal-dialog" role="dialog" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-body">
                    <p>Really delete this page?</p>
                    </div>
                    <div class="modal-footer">
                    <button class="btn btn-outline" type="button" (click)="showDeleteConfirmation=false">Cancel</button>
                    <button class="btn btn-danger" type="button" (click)="delete()">Ok</button>
                    </div>
                </div>
                </div>
            </div>
        }

        @if (page && page.icon) {
            <app-icon-dialog 
                [isOpen]="selectIconDialog" 
                [currentIcon]="page!.icon" 
                (iconSelected)="onIconSelected($event)" 
                (dialogClosed)="selectIconDialog=false">
            </app-icon-dialog>
        }

        @if (showDeleteConfirmation) {
            <div class="modal-backdrop" aria-hidden="true"></div>
        }    
    `
})
export class PageEditComponent implements OnInit {

    page: Page | null = null;
    error: any = null;
    loading = false;
    showDeleteConfirmation = false;
    selectIconDialog = false;
    success = false;
    showMenue = false;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private backendService = inject(BackendService);
    public iconService = inject(IconService);

    ngOnInit() {
        this.route.params.pipe(
            map(params => params['id']),
            tap(_ => { this.page = this.error = null; this.loading = true; } ),
            switchMap(id => id ? this.backendService.getPage(id) : of(this.createNewPage())),
            tap(_ => this.loading = false)
        )
        .subscribe({
            next: page => this.page = page,
            error: error => { this.error = error; this.loading = false; }
        });
    }

    
    @HostListener('document:keydown.control.s', ['$event'])
    onCtrlSKey(event: KeyboardEvent): void {
        this.save();
        event.preventDefault();
    }

    createNewPage() {
        const page = new Page();
        page.icon = 'file';
        page.children = [];
        page.parent = null;
        page.content = '';
        return page;
    }

    save(show = false) {
        this.error = null;
        this.backendService.savePage(this.page!).subscribe({
            next: page => {
                if (show) {
                    this.router.navigate(['/page', page.id]);
                } else {
                    this.router.navigate(['/page', 'edit', page.id]);
                    this.success = true;
                    timer(3000).subscribe(() => this.success = false);
                }
            },
            error: error => { this.error = error }
        });
    }

    delete() {
        this.error = null;
        this.backendService.deletePage(this.page!).subscribe({
            next: () => this.router.navigate(['/']),
            error: error => { this.error = error; this.showDeleteConfirmation = false; this.loading = false; }
        });
    }

    flattenPages(): Page[] {
        return this.backendService.getAllPagesFlatten().filter(p => p.id != this.page!.id);
    }

    flattenPageTitle(page: Page): string {
        const depth = Math.max(0, page.id!.split(BackendService.ID_SEPARATOR).length - 1);
        const indent = depth > 0 ? `${'  '.repeat(depth)}-> ` : '';
        return `${indent}${page.title ?? ''}`;
    }

    openIconDialog() {
        this.selectIconDialog = true;
    }

    onIconSelected(icon: string) {
        this.page!.icon = icon;
    }

}
