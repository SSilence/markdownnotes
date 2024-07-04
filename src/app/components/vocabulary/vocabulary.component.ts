import { Component, OnInit } from "@angular/core";
import { switchMap } from "rxjs";
import { Page } from "src/app/models/page";
import { BackendService } from "src/app/services/backend.service";
import { AlertErrorComponent } from "../alert-error/alert-error.component";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { VocabularyEditComponent } from "../vocabulary-edit/vocabulary-edit.component";
import { RouterModule } from "@angular/router";
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { VocabularyExerciseComponent } from "../vocabulary-exercise/vocabulary-exercise.component";
import { VocabularyCard } from "src/app/models/vocabulary-card";
import * as moment from 'moment';
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";
import { VocabularyExerciseResultComponent } from "../vocabulary-exercise-result/vocabulary-exercise-result.component";

@Component({
    selector: 'app-vocabulary',
    standalone: true,
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
    templateUrl: './vocabulary.component.html',
    styleUrls: ['./vocabulary.component.css']
})
export class VocabularyComponent implements OnInit {

    page: Page | null = null;
    pages: PageEditable[] = [];
    error: any = null;
    entryToDelete: Page | null = null;
    start: PageEditable | null = null;
    startAmount: number = 10;
    
    exerciseResult: VocabularyExerciseResult | null = null;

    constructor(private backendService: BackendService) {}

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
                this.pages = pages.map(page => this.toPageEditable(page, false))
                                  .sort((a,b) => ((b.updated ? b.updated.getTime() : 0) - (a.updated ? a.updated.getTime() : 0)));
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
                for(let i=0; i <= 7; i++) {
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
                  .filter(v => v.e2gPhase > 0 && v.e2gNext && moment().isAfter(v.e2gNext))
                  .map(v => new VocabularyCard(v, false));
        const g2e = vocabulary
                  .filter(v => v.g2ePhase > 0 && v.g2eNext && moment().isAfter(v.g2eNext))
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