import { Component, inject, OnInit } from "@angular/core";
import { switchMap } from "rxjs";
import { Page } from "src/app/models/page";
import { BackendService } from "src/app/services/backend.service";
import { AlertErrorComponent } from "./alert-error.component";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { VocabularyEditComponent } from "./vocabulary-edit.component";
import { RouterModule } from "@angular/router";
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { VocabularyExerciseComponent } from "./vocabulary-exercise.component";
import { VocabularyCard } from "src/app/models/vocabulary-card";
import { DateTime } from "luxon";
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";
import { VocabularyExerciseResultComponent } from "./vocabulary-exercise-result.component";

@Component({
    selector: 'app-vocabulary',
    imports: [
        AlertErrorComponent,
        ClarityModule,
        CommonModule,
        FormsModule,
        VocabularyEditComponent,
        RouterModule,
        VocabularyExerciseComponent,
        VocabularyExerciseResultComponent
    ],
    template: `
        <h1>Vocabulary</h1>
        @if (!page && !error) {
        <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert-error [error]="error"></app-alert-error>

        <div class="vocabularies">
        @for (page of pages; track page) {
            <div class="vocabulary" [ngClass]="{'disabled': page.disabled}">
            @if (!page.edit) {
                <div class="content">
                    @if (page.icon) {
                        <img src="{{page.icon}}" />
                    }
                    <div>
                        <h2>{{page.title}}</h2>
                        <ul>
                        @if (page.vocabularyCount) {
                            <li><span>{{page.vocabularyCount}}</span> vocabularies</li>
                        }
                        @if (page.updated) {
                            <li><span>{{page.updated | date:'mediumDate'}}</span> last updated</li>
                        }
                        @if (page.phases) {
                            <li><span>{{finished(page)}}</span>% finished</li>

                            <li>
                            <table class="stats-table">
                                <thead>
                                <tr>
                                    @for (stats of page.phases; track stats) {
                                    <th class="stats-bg">
                                        <div [style.height]="stats.percent+'%'" class="stats-bar"></div>
                                        <div class="stats-label">{{stats.count}}</div>
                                    </th>
                                    }
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    @for (stats of page.phases; track stats) {
                                    <td>{{stats.phase}}</td>
                                    }
                                </tr>
                                </tbody>
                            </table>
                            </li>
                        }
                        </ul>
                    </div>
                </div>
            }
            @if (!page.edit && !page.phases) {
                <div class="btn-group btn-primary action">
                    <button class="btn btn-primary-outline" (click)="loadFullPage(page)">load</button>
                </div>
            }
            @if (!page.edit && page.phases) {
                <div class="btn-group btn-primary action">
                    @if (page.newVocabularyCount && page.newVocabularyCount > 0 && !page.disabled) {
                        <button class="btn btn-success" (click)="showNewDialog(page)">{{page.newVocabularyCount}} new</button>
                    }
                    @if (page.exerciseVocabularyCount && page.exerciseVocabularyCount > 0 && !page.disabled) {
                        <button class="btn btn-primary" (click)="startExercise(page)">{{page.exerciseVocabularyCount}} exercise</button>
                    }
                    <button class="btn btn-icon btn-primary-outline" [routerLink]="['/vocabulary', 'vocabular', page.id]"><cds-icon shape="view-list"></cds-icon></button>
                    <button class="btn btn-icon btn-primary-outline" (click)="page.edit = true"><cds-icon shape="pencil"></cds-icon></button>
                    <button class="btn btn-icon btn-primary-outline" (click)="entryToDelete=page"><cds-icon shape="trash"></cds-icon></button>
                </div>
            }
            @if (page.exercise) {
                <app-vocabulary-exercise [page]="page" [cards]="page.exerciseVocabulary" (finished)="loadFullPage(page);exerciseResult=$event"></app-vocabulary-exercise>
            }
            @if (page.start) {
                <app-vocabulary-exercise [introduce]="true" [page]="page" [cards]="page.startVocabulary" (finished)="loadFullPage(page);exerciseResult=$event"></app-vocabulary-exercise>
            }
            @if (page.edit) {
                <div>
                <app-vocabulary-edit [page]="page"></app-vocabulary-edit>
                <button class="btn btn-primary" (click)="save(page)">save</button>
                <button class="btn btn-link" (click)="page.edit = false">cancel</button>
                </div>
            }
            </div>
        }
        </div>

        <div class="add">
        <button type="button" class="btn btn-icon btn-sm btn-link" (click)="add()">
            <cds-icon shape="add-text"></cds-icon> add
        </button>
        </div>

        @if (entryToDelete!==null) {
            <div class="modal">
                <div class="modal-dialog" role="dialog" aria-hidden="true">
                    <div class="modal-content">
                        <div class="modal-body">
                            <p>Really delete {{entryToDelete.title}}?</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline" type="button" (click)="entryToDelete=null">cancel</button>
                            <button class="btn btn-danger" type="button" (click)="delete(entryToDelete); entryToDelete = null;">delete</button>
                        </div>
                    </div>
                </div>
            </div>
        }

        @if (start) {
        <div class="modal">
            <div class="modal-dialog" role="dialog" aria-hidden="true">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Select amount of words</h3>
                </div>
                <div class="modal-body">
                    <clr-range-container [clrRangeHasProgress]="true">
                        <input type="range" clrRange [min]="1" [max]="start.newVocabularyCount" [(ngModel)]="startAmount" />
                        <clr-control-helper>{{startAmount}}</clr-control-helper>
                    </clr-range-container>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" type="button" (click)="start = null">cancel</button>
                    <button class="btn btn-primary" type="button" (click)="startNew();">start</button>
                </div>
            </div>
            </div>
        </div>
        }

        <app-vocabulary-exercise-result [result]="exerciseResult" (finished)="exerciseResult = null"></app-vocabulary-exercise-result>
    `,
    styles: [`
        h1 {
            margin-top:0;
        }

        h2 {
            margin:0;
            margin-bottom: 0.4rem;
            font-size:1.35rem;
        }

        .vocabularies {
            display:flex;
            flex-wrap: wrap;
        }

        .vocabulary {
            border: 1px solid #cbcbcb;
            background: #ecececff;
            padding:1rem;
            margin-right: 1rem;
            margin-top: 1rem;
            width:24rem;
        }

        .vocabulary .content {
            display: flex;
        }

        .vocabulary img {
            max-height: 11rem;
            margin-right: 1rem;
            max-width: 8rem;
            object-fit: cover;

        }

        .vocabulary span {
            margin-top: 0.5rem;
            font-weight: bold;
        }

        .vocabulary ul,
        .vocabulary li {
            list-style: none;
        }

        .vocabulary table {
            margin-top: 0.2rem;
            border-collapse: collapse;
            border-style: hidden;
        }

        .vocabulary th,
        .vocabulary td {
            width:1.8rem;
            text-align: center;
            border: 1px solid #d0d0d0;
            font-size:0.6rem;
        }

        .vocabulary .action {
            margin-top: 1rem;
        }

        .danger {
            color:#ff0000;
        }

        .add {
            clear:both;
        }

        .add button {
            margin-top:1rem;
        }

        .stats-table th,
        .stats-table td {
            border:0;
            width:1.3rem;
            margin-right:0.2rem;
            display:inline-block;
        }

        .stats-bg {
            position: relative;
            height:4rem;
            vertical-align: bottom;
            width:1rem;
        }

        .stats-label {
            z-index: 90;
            position:absolute;
            bottom:0;
            width: 100%;
            text-align: center;
            color: #173700;
            font-size: 0.4rem;
        }

        .stats-bar {
            z-index: 80;
            background-color: #3c8500;
            position:absolute;
            bottom:0;
            width: 100%;
            border-radius: 0.2rem;
        }

        clr-range-container,
        clr-range-container input {
            width: 25rem;
        }

        .vocabulary.disabled h2,
        .vocabulary.disabled li,
        .vocabulary.disabled .stats-label{
            color: #bbbbbb;
        }

        .vocabulary.disabled .stats-bar {
            background-color: #cacaca;
        }

        .vocabulary.disabled img,
        .vocabulary.disabled button {
            opacity: 0.5;
        }
    `]
})
export class VocabularyComponent implements OnInit {

    page: Page | null = null;
    pages: PageEditable[] = [];
    error: any = null;
    entryToDelete: Page | null = null;
    start: PageEditable | null = null;
    startAmount: number = 10;
    
    exerciseResult: VocabularyExerciseResult | null = null;

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
                const sortedPages = pages.map(page => this.toPageEditable(page, false))
                                         .sort((a,b) => (b.updated ? b.updated.getTime() : 0) - (a.updated ? a.updated.getTime() : 0));

                this.pages = sortedPages.filter(p => !p.disabled).concat(sortedPages.filter(p => p.disabled))
                this.pages.forEach(page => this.loadFullPage(page));
            },
            error: error => this.error = error
        });
    }

    delete(page: Page) {
        if (page.id == null) {
            this.pages = this.pages.filter(page => page != page)
        } else {
            this.backendService.deletePage(page).subscribe({
                next: () => this.pages = this.pages.filter(p => p.id != page.id),
                error: error => this.error = error
            });
        }
    }

    add() {
        const page = new Page();
        page.parent = this.page;
        this.pages.push(this.toPageEditable(page, true));
    }

    save(page: PageEditable) {
        this.backendService.savePage(page).subscribe({
            next: saved => this.pages[this.pages.indexOf(page)] = this.toPageEditable(saved, false),
            error: error => this.error = error
        });
    }

    showNewDialog(page: PageEditable) {
        this.startAmount = page.newVocabularyCount && page.newVocabularyCount < 10 ? page.newVocabularyCount : 10;
        this.start = page;
    }

    startNew() {
        if (this.start) {
            const vocabulary = VocabularyEntry.parseVocabulary(this.start.content);
            this.start.startVocabulary = this.getNewVocabularyCards(vocabulary, this.startAmount);
            this.start.start = true;
            this.start = null;
        }
    }

    startExercise (page: PageEditable) {
        const vocabulary = VocabularyEntry.parseVocabulary(page.content);
        page.exerciseVocabulary = this.getExerciseVocabularyCards(vocabulary);
        page.exercise = true;
    }

    loadFullPage(page: PageEditable) {
        this.backendService.getPage(page.id!!).subscribe({
            next: loadedPage => {
                page.content = loadedPage.content;
                const vocabulary = VocabularyEntry.parseVocabulary(loadedPage.content);
                page.vocabularyCount = vocabulary.length;
                page.phases = [];
                for(let i=0; i <= 6; i++) {
                    const count = this.countPhases(vocabulary, i);
                    page.phases.push({
                        phase: i,
                        count: count,
                        percent: Math.round((count/((vocabulary.length)*2))*100)
                    });
                }
                page.newVocabularyCount = this.countNew(vocabulary);
                page.exerciseVocabularyCount = this.getExerciseVocabularyCards(vocabulary).length;
            },
            error: error => this.error = error
        })
    }

    finished(page: PageEditable): number {
        return page.phases && page.phases[6] && !isNaN(page.phases[6].percent) ? page.phases[6].percent : 0;
    }

    private countPhases(vocabulary: VocabularyEntry[], phase: number): number {
        return vocabulary.filter(v => v.e2gPhase == phase).length + vocabulary.filter(v => v.g2ePhase == phase).length;
    }

    private countNew(vocabulary: VocabularyEntry[]): number {
        return vocabulary.filter(v => v.e2gPhase == 0)
            .concat(vocabulary.filter(v => v.g2ePhase == 0))
            .filter((value, index, array) => array.indexOf(value) === index)
            .length;
    }    

    private getNewVocabularyCards(vocabulary: VocabularyEntry[], amount: number): VocabularyCard[] {
        const e2g = vocabulary
                  .filter(v => v.e2gPhase == 0)
                  .map(v => new VocabularyCard(v, false))
                  .slice(0, amount);
        const g2e = vocabulary
                  .filter(v => v.g2ePhase == 0)
                  .map(v => new VocabularyCard(v, true))
                  .slice(0, amount);
        return e2g.concat(g2e);
    }

    private getExerciseVocabularyCards(vocabulary: VocabularyEntry[]): VocabularyCard[] {
        const e2g = vocabulary
                  .filter(v => v.e2gPhase > 0 && v.e2gNext && DateTime.now() > DateTime.fromISO(v.e2gNext))
                  .map(v => new VocabularyCard(v, false));
        const g2e = vocabulary
                  .filter(v => v.g2ePhase > 0 && v.g2eNext && DateTime.now() > DateTime.fromISO(v.g2eNext))
                  .map(v => new VocabularyCard(v, true));
        return e2g.concat(g2e);
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
            edit: edit,
            vocabularyCount: null,
            phases: null,
            newVocabularyCount: null,
            exerciseVocabularyCount: null,
            exercise: false,
            exerciseVocabulary: [],
            start: false,
            startVocabulary: []
        }
    }

}

interface PageEditable extends Page {
    edit: boolean;
    vocabularyCount: number | null;
    phases: PhaseStats[] | null;
    newVocabularyCount: number | null;
    exerciseVocabularyCount: number | null;
    exercise: boolean;
    exerciseVocabulary: VocabularyCard[];
    start: boolean;
    startVocabulary: VocabularyCard[];
}

interface PhaseStats {
    phase: number;
    count: number;
    percent: number;
}