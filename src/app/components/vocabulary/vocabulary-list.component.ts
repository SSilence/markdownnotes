import { Component, HostListener, inject, OnInit, ViewChildren } from "@angular/core";
import { Page } from "src/app/models/page";
import { BackendService } from "src/app/services/backend.service";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { switchMap, map, tap, concatMap, catchError } from 'rxjs/operators';
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { from, of, timer } from "rxjs";
import { VocabularyCard } from "src/app/models/vocabulary-card";
import { VocabularyExerciseComponent } from "./vocabulary-exercise.component";
import { AlertComponent } from "../alert.component";
import { VocabularyExerciseResultComponent } from "./vocabulary-exercise-result.component";
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";

@Component({
    selector: 'app-vocabulary-list',
    imports: [
        AlertComponent,
        ClarityModule,
        CommonModule,
        FormsModule,
        RouterModule,
        VocabularyExerciseComponent,
        VocabularyExerciseResultComponent
    ],
    template: `
        @if (loading) {
            <span class="spinner spinner-inline">Loading...</span>
        }
        <app-alert [error]="error"></app-alert>

        @if (page) {
            <div class="page">
                @if (train.length > 0) {
                    <app-vocabulary-exercise [train]="true" [page]="page" [cards]="train" (finished)="exerciseResult = $event"></app-vocabulary-exercise>
                }
                @if (successSave) {
                    <app-alert message="successfully saved" [sticky]="true" [type]="'success'"></app-alert>
                }
                <div class="top">
                <h1>{{page.title}}</h1>
                <div>
                    @if (successSave) {
                        <span class="success">successfully saved</span>
                    }
                    <button class="btn btn-outline" (click)="add()">add</button>
                    <button class="btn btn-success-outline" (click)="exercise()">exercise</button>
                    <button class="btn" (click)="saveClick()" [ngClass]="{'btn-success': successSave, 'btn-primary': !successSave}">save</button>
                </div>
                </div>
                <div class="clr-row">
                <div class="clr-col-2">
                    <clr-input-container>
                    <input clrInput class="search" placeholder="search" [(ngModel)]="q" (ngModelChange)="filterSearch()" />
                    </clr-input-container>
                    <h4>Phase</h4>
                    @for (i of [0,1,2,3,4,5,6]; track i) {
                        <clr-checkbox-wrapper>
                            <label>{{i}}</label>
                            <input clrCheckbox type="checkbox" (change)="filterPhase(i)" [checked]="phase.includes(i)" />
                        </clr-checkbox-wrapper>
                    }
                    <h4>Section</h4>
                    @for (sec of sections; track sec) {
                        <clr-checkbox-wrapper>
                            <label>{{sec}}</label>
                            <input clrCheckbox type="checkbox" (change)="filterSection(sec)" [checked]="section.includes(sec)" />
                        </clr-checkbox-wrapper>
                    }
                </div>
                <div class="clr-col">
                    <table class="table">
                    <thead>
                        <tr>
                        <th class="left"><span>German</span></th>
                        <th class="left">English</th>
                        <th class="left">Section</th>
                        <th class="left">Phase</th>
                        <th class="centered">Score</th>
                        <th class="left"></th>
                        </tr>
                    </thead>
                    <tbody>
                        @if (toAdd) {
                            <tr class="add">
                                <td><input type="text" [(ngModel)]="toAdd.german" (keydown)="onAddKeypress($event)" #addGermanInput></td>
                                <td><input type="text" [(ngModel)]="toAdd.english" (keydown)="onAddKeypress($event)"></td>
                                <td><input type="text" [(ngModel)]="toAdd.section" (keydown)="onAddKeypress($event)"></td>
                                <td></td>
                                <td></td>
                                <td class="left">
                                <button class="btn" (click)="addSave()" class="btn btn-primary">add</button>
                                <button class="btn" (click)="toAdd=null" class="btn btn-outline">cancel</button>
                                </td>
                            </tr>
                        }
                        @for (entry of selected; track entry) {
                            <tr>
                                <td><input type="text" [(ngModel)]="entry.german"></td>
                                <td><input type="text" [(ngModel)]="entry.english"></td>
                                <td><input type="text" [(ngModel)]="entry.section"></td>
                                <td class="left phase">
                                {{entry.g2ePhase}} &rarr;<br />
                                {{entry.e2gPhase}} &larr;
                                </td>
                                <td title="{{entry.example}}"
                                [ngStyle]="{
                                'color': 'rgb(' + (230 - 10 * (entry.score||0)) + ',0,' + (230 - 10 * (entry.score||0)) + ')',
                                'font-weight': 300 + 40 * (entry.score||0)
                                }">{{entry.score}}</td>
                                <td class="left">
                                <audio #audio></audio>
                                <button type="button" class="btn btn-icon btn-sm btn-link btn-cell" (click)="audio.src=playUrl(entry.english);audio.play()">
                                    <cds-icon shape="play"></cds-icon>
                                </button>
                                <button type="button" class="btn btn-icon btn-sm btn-link btn-cell" (click)="reset(entry)">
                                    <cds-icon shape="refresh" direction="down"></cds-icon>
                                </button>
                                <button type="button" class="btn btn-icon btn-sm btn-link btn-cell" (click)="delete(entry)">
                                    <cds-icon shape="trash"></cds-icon>
                                </button>
                                </td>
                            </tr>
                        }
                    </tbody>
                    </table>
                    <div class="centered">
                    <table class="pagination">
                        <tr>
                        @for (page of pages; track page) {
                            <td (click)="selectPage(page)" [ngClass]="{'selected': currentPage==page}">{{page}}</td>
                        }
                        </tr>
                    </table>
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
            margin-bottom:0.5em;
            margin-left:0;
        }

        .top {
            display:flex;
        }

        .top h1 {
            flex: 1;
        }

        input {
            font-size: 1.1em;
            border-radius: 0.1em;
            margin-right:0.3em;
            padding: 0.3em;
            vertical-align: middle;
            border: 1px solid #ebebebff;
            width: 100%;
        }

        .table th {
            vertical-align: middle;
        } 

        .table th:first-child {
            padding-left:2px;
        }

        .search {
            font-weight: normal;
        }

        .add {
            margin-top:0;
            text-align: left;
        }

        .success {
            color:green;
            padding-right: 10px;
        }

        .add td {
            border-bottom:3px green solid !important;
        }

        input {
            border:0;
            margin:0;
            padding:0.7rem;
        }

        td {
            vertical-align: middle;
            padding:0;
        }

        th span {
            padding-left:0.5rem;
        }

        td.phase {
            padding-left:0.8rem;
        }

        h1 {
            margin-bottom:0;
        }

        h4 {
            margin-bottom: 0.5rem;
        }

        .search {
            border-bottom:1px solid black;
        }

        .centered {
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .pagination {
            margin-top:0.8rem;
        }

        .pagination td {
            background:white;
            border:1px solid #eee;
            padding:0.4rem 0.8rem 0.4rem 0.8rem;
            cursor: pointer;
        }

        .pagination td.selected {
            background:#eee;
        }
    `]
})
export class VocabularyListComponent implements OnInit {

    page: Page | null = null;
    error: any = null;
    loading: boolean = false;
    vocabulary: VocabularyEntry[] = [];
    selected: VocabularyEntry[] = [];
    selectedCount = 0;
    
    q: string = "";
    phase: number[] = [];
    section: string[] = [];
    currentPage: number = 1;
    itemsPerPage = 100;

    toAdd: VocabularyEntry | null = null;

    successSave: boolean = false;
    
    train: VocabularyCard[] = [];

    exerciseResult: VocabularyExerciseResult | null = null;

    get sections(): string[] {
        return structuredClone(this.vocabulary)
                                .map(v => v.section)
                                .filter((value, index, array) => array.indexOf(value) === index)
                                .reverse();
    }

    get pages(): number[] {
        const length = Math.ceil(this.selectedCount / this.itemsPerPage);
        return Array.from({length: length}, (_, i) => i + 1);
    }

    @ViewChildren('addGermanInput') addGermanInput: any;

    private backendService = inject(BackendService);
    private route = inject(ActivatedRoute);

    ngOnInit(): void {
        this.route.params.pipe(
            map(params => params['id']),
            tap(_ => {this.page = null; this.loading = true; }),
            switchMap(id => this.backendService.getPage(id)),
            tap(_ => this.loading = false)
        ).subscribe({
            next: page => {
                this.page = page;
                this.vocabulary = VocabularyEntry.parseVocabulary(this.page!!.content).reverse();
                this.refresh();
            },
            error: error => { this.error = error; this.loading = false; }
        });
    }

    @HostListener('document:keydown.control.s', ['$event'])
    onCtrlSKey(event: KeyboardEvent): void {
        this.save(() => this.enrich());
        event.preventDefault();
    }

    add() {
        this.clearFilters();
        this.toAdd = new VocabularyEntry();
        if (this.vocabulary.length>0) {
            this.toAdd.section = this.vocabulary[0].section;
        }
        setTimeout(() => this.addGermanInput.last.nativeElement.focus(), 400);
    }

    onAddKeypress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.addSave();
        }
    }

    addSave() {
        this.vocabulary.unshift(this.toAdd!);
        this.add();
        this.refresh();
        this.save(() => this.enrich());
    }

    private enrich() {
        const itemsToUpdate = this.vocabulary.filter(item => item.score < 0 || item.score > 10);
        from(itemsToUpdate).pipe(
            concatMap(item =>
                this.backendService.getVocabularyEnrich(item.german, item.english).pipe(
                    map(response => {
                        item.score = response.score;
                        item.example = response.example;
                    }),
                    catchError(() => of(null))
                )
            )
        ).subscribe({
            next: () => {
                this.save();
            }
        });
    }

    clearFilters() {
        this.q = "";    
        this.phase = [];
        this.section = [];
        this.currentPage = 1;
        this.refresh();
    }

    filterSearch() {
        this.toAdd = null;
        this.currentPage = 1;
        this.refresh();
    }

    filterPhase(phase: number) {
        this.toAdd = null;
        if(this.phase.includes(phase)) {
            this.phase = this.phase.filter(item => item != phase);
        } else {
            this.phase.push(phase);
        }
        this.currentPage = 1;
        this.refresh();
    }

    filterSection(section: string) {
        this.toAdd = null;
        if(this.section.includes(section)) {
            this.section = this.section.filter(item => item != section);
        } else {
            this.section.push(section);
        }
        this.currentPage = 1;
        this.refresh();
    }

    selectPage(page: number) {
        this.toAdd = null;
        this.currentPage = page;
        this.refresh();
    }

    refresh() {
        const startIndex = (this.currentPage-1)*this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const filtered = this.vocabulary.filter(item => {
            const qMatch = this.q.length > 3 ? item.german.toLowerCase().includes(this.q.toLowerCase()) || item.english.toLowerCase().includes(this.q.toLowerCase()) : true;
            const phaseMatch = this.phase.length > 0 ? this.phase.includes(item.e2gPhase) || this.phase.includes(item.g2ePhase) : true;
            const sectionMatch = this.section.length > 0 ? this.section.includes(item.section) : true;
            return qMatch && phaseMatch && sectionMatch;  
        });
        this.selectedCount = filtered.length;
        this.selected = filtered.slice(startIndex, endIndex);
    }

    exercise() {
        const train: VocabularyCard[] = [];
        this.selected.forEach(vocabulary => {
            train.push(new VocabularyCard(vocabulary, false));
            train.push(new VocabularyCard(vocabulary, true));
        });
        if (train.length == 0) {
            return;
        }
        this.train = train;
    }

    saveClick() {
        this.save(() => this.enrich());
    }
    
    save(finished?: () => any) {
        this.page!!.content = JSON.stringify(structuredClone(this.vocabulary).reverse(), null, 4);
        this.backendService.savePage(this.page!!).subscribe({
            next: () => {
                this.successSave = true;
                timer(3000).subscribe(() => this.successSave = false);
                finished?.();
            },
            error: error => { this.error = error; }
        });
    }

    delete(entry: VocabularyEntry) {
        const index = this.vocabulary.indexOf(entry);
        this.vocabulary.splice(index, 1);
        this.refresh();
    }

    reset(entry: VocabularyEntry) {
        entry.e2gNext = null;
        entry.e2gPhase = 0;
        entry.g2eNext = null;
        entry.g2ePhase = 0;
    }

    playUrl(word: String): string {
        const base = document.querySelector('base')!!.getAttribute('href');
        return `${base}api/api/text2speech?text=${word}&language=${this.page?.language}`;
    }
}