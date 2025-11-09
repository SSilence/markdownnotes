import { Component, inject, OnInit } from "@angular/core";
import { switchMap } from "rxjs";
import { Page } from "src/app/models/page";
import { BackendService } from "src/app/services/backend.service";
import { AlertComponent } from "../shared/alert.component";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { VocabularyEditComponent } from "./vocabulary-edit.component";
import { RouterModule } from "@angular/router";
import { VocabularyEntry } from "src/app/models/vocabulary-entry";

@Component({
    selector: 'app-vocabulary',
    imports: [
        AlertComponent,
        ClarityModule,
        CommonModule,
        FormsModule,
        VocabularyEditComponent,
        RouterModule
    ],
    template: `
        <h1 class="text-4xl font-bold !mt-0">Vocabulary</h1>
        @if (!page && !error) {
            <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert [error]="error"></app-alert>

        <div class="flex flex-wrap gap-4 mt-4">
        @for (page of pages; track page) {
            <div class="border border-gray-400 bg-gray-200 p-4 w-80" [ngClass]="{'opacity-50': page.disabled}">
            @if (!page.edit) {
                <div class="flex">
                    @if (page.icon) {
                        <img src="{{page.icon}}" class="max-h-44 max-w-32 object-cover mr-4" />
                    }
                    <div class="flex-1 min-w-0">
                        <h3 class="!m-0 !mb-1.5 max-w-full min-w-0 truncate">{{page.title}}</h3>
                        <ul class="list-none p-0">
                        @if (page.vocabularyCount) {
                            <li><span class="font-bold">{{page.vocabularyCount}}</span> vocabularies</li>
                        }
                        @if (page.updated) {
                            <li><span class="font-bold">{{page.updated | date:'mediumDate'}}</span> last updated</li>
                        }
                        @if (page.phases) {
                            <li><span class="font-bold">{{finished(page)}}</span>% finished</li>

                            <li class="mt-2">
                            <table class="border-collapse border-0">
                                <tr>
                                    @for (stats of page.phases; track stats) {
                                    <td class="relative h-16 w-5 align-bottom border-0 inline-block mr-1">
                                        <div [style.height]="stats.percent+'%'" class="absolute bottom-0 w-full bg-green-700 rounded-sm" [ngClass]="{'bg-gray-400': page.disabled}"></div>
                                        <div class="absolute bottom-0 w-full text-center text-[0.7em] z-90"
                                            [class.text-gray-600]="stats.percent===0 || page.disabled"
                                            [class.text-white]="stats.percent>=10 && !page.disabled"
                                            >{{stats.count}}</div>
                                    </td>
                                    }
                                </tr>
                                <tr>
                                    @for (stats of page.phases; track stats) {
                                        <td class="border-0 w-5 text-center text-xs inline-block mr-1">{{stats.phase}}</td>
                                    }
                                </tr>
                            </table>
                            </li>
                        }
                        </ul>
                    </div>
                </div>
            }
            @if (!page.edit && !page.phases) {
                <div class="mt-4">
                    <button class="btn btn-primary-outline" (click)="loadFullPage(page)">load</button>
                </div>
            }
            @if (!page.edit && page.phases) {
                <div class="mt-3 inline-flex -space-x-px border border-border-blue rounded overflow-hidden">
                    <button class="!m-0 !p-3 btn btn-outline !border-0 !rounded-none" [routerLink]="['/vocabulary', 'vocabular', page.id]"><cds-icon shape="view-list"></cds-icon> view</button>
                    <button class="!m-0 !p-3 btn btn-outline !border-0 !rounded-none !border-l !border-border-blue" (click)="page.edit = true"><cds-icon shape="pencil"></cds-icon> edit</button>
                    <button class="!m-0 !p-3 btn btn-outline !border-0 !rounded-none !border-l !border-border-blue" (click)="entryToDelete=page"><cds-icon shape="trash"></cds-icon> delete</button>
                </div>
            }
            @if (page.edit) {
                <div>
                <app-vocabulary-edit [page]="page"></app-vocabulary-edit>
                <div class="mt-4 inline-flex -space-x-px">
                    <button class="btn btn-primary" (click)="save(page)">save</button>
                    <button class="btn btn-link" (click)="page.edit = false">cancel</button>
                </div>
                </div>
            }
            </div>
        }
        </div>

        <div class="clear-both">
        <button type="button" class="btn btn-icon !mt-4" (click)="add()">
            <cds-icon shape="add-text"></cds-icon> add
        </button>
        </div>

        @if (entryToDelete!==null) {
            <div class="fixed inset-0 bg-black/20 z-[9999]" aria-hidden="true"></div>
            <div class="fixed inset-0 z-[10000] flex items-center justify-center" role="dialog" aria-hidden="true">
                <div class="bg-white rounded-lg shadow-lg w-full max-w-md">
                    <div class="p-4">
                        <p>Really delete {{entryToDelete.title}}?</p>
                    </div>
                    <div class="flex justify-end gap-2 p-4 border-t border-gray-300">
                        <button class="btn btn-outline" type="button" (click)="entryToDelete=null">cancel</button>
                        <button class="btn btn-danger" type="button" (click)="delete(entryToDelete); entryToDelete = null;">delete</button>
                    </div>
                </div>
            </div>
        }
    `
})
export class VocabularyComponent implements OnInit {

    page: Page | null = null;
    pages: PageEditable[] = [];
    error: any = null;
    entryToDelete: Page | null = null;
    
    private backendService = inject(BackendService);

    ngOnInit(): void {
        this.backendService.getVocabularyPage().subscribe({
            next: page => this.page = page,
            error: error => {
                if (error && error.status === 404) {
                    this.createVocabularyParentPage()
                } else {
                    this.error = error;
                }
            }
        });
        
        this.backendService.getAllVocabularyPages().subscribe({
            next: pages => {
                const sortedPages = pages
                    .map(page => this.toPageEditable(page, false))
                    .sort((a, b) => (b.updated ? b.updated.getTime() : 0) - (a.updated ? a.updated.getTime() : 0));

                const activePages = sortedPages.filter(p => !p.disabled);
                const disabledPages = sortedPages.filter(p => p.disabled);

                this.pages = [...activePages, ...disabledPages];
                this.pages.forEach(editablePage => this.loadFullPage(editablePage));
            },
            error: error => this.error = error
        });
    }

    delete(page: Page) {
        if (!page.id) {
            this.pages = this.pages.filter(p => p !== page);
            return;
        }
        this.backendService.deletePage(page).subscribe({
            next: () => this.pages = this.pages.filter(p => p.id !== page.id),
            error: error => this.error = error
        });
    }

    add() {
        const page = new Page();
        page.parent = this.page;
        this.pages.push(this.toPageEditable(page, true));
    }

    save(page: PageEditable) {
        const index = this.pages.indexOf(page);
        if (index === -1) {
            return;
        }
        this.backendService.savePage(page).subscribe({
            next: saved => this.pages[index] = this.toPageEditable(saved, false),
            error: error => this.error = error
        });
    }

    loadFullPage(page: PageEditable) {
        const pageId = page.id;
        if (!pageId) {
            return;
        }
        this.backendService.getPage(pageId).subscribe({
            next: loadedPage => {
                page.content = loadedPage.content;
                const vocabulary = VocabularyEntry.parseVocabulary(loadedPage.content);
                page.vocabularyCount = vocabulary.length;
                page.phases = this.buildPhaseStats(vocabulary);
            },
            error: error => this.error = error
        });
    }

    finished(page: PageEditable): number {
        const lastPhase = page.phases?.[6];
        return lastPhase && !isNaN(lastPhase.percent) ? lastPhase.percent : 0;
    }

    private countPhases(vocabulary: VocabularyEntry[], phase: number): number {
        return vocabulary.reduce((total, entry) => {
            if (entry.e2gPhase === phase) {
                total++;
            }
            if (entry.g2ePhase === phase) {
                total++;
            }
            return total;
        }, 0);
    }

    private buildPhaseStats(vocabulary: VocabularyEntry[]): PhaseStats[] {
        const totalItems = vocabulary.length * 2;
        return Array.from({ length: 7 }, (_, phase) => {
            const count = this.countPhases(vocabulary, phase);
            const percent = totalItems === 0 ? NaN : Math.round((count / totalItems) * 100);
            return { phase, count, percent };
        });
    }

    private createVocabularyParentPage() {
        this.backendService.createVocabularyParentPage()
            .pipe(
                switchMap(() => this.backendService.getVocabularyPage())
            ).subscribe({
                next: page => this.page = page,
                error: error => this.error = error
            });
    }

    private toPageEditable(page: Page, edit: boolean): PageEditable {
        return {
            ...page,
            edit,
            vocabularyCount: null,
            phases: null
        };
    }

}

interface PageEditable extends Page {
    edit: boolean;
    vocabularyCount: number | null;
    phases: PhaseStats[] | null;
}

interface PhaseStats {
    phase: number;
    count: number;
    percent: number;
}
