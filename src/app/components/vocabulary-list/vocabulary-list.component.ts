import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, ViewChild, ViewChildren } from "@angular/core";
import { Page } from "src/app/models/page";
import { BackendService } from "src/app/services/backend.service";
import { AlertErrorComponent } from "../alert-error/alert-error.component";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { switchMap, map, tap } from 'rxjs/operators';
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { timer } from "rxjs";
import { VocabularyCard } from "src/app/models/vocabulary-card";
import { VocabularyExerciseComponent } from "../vocabulary-exercise/vocabulary-exercise.component";
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";
import { VocabularyExerciseResultComponent } from "../vocabulary-exercise-result/vocabulary-exercise-result.component";
import { AlertStickyComponent } from "../alert-sticky/alert-sticky.component";

@Component({
    selector: 'app-vocabulary-list',
    standalone: true,
    imports: [
        AlertErrorComponent, 
        ClarityModule, 
        CommonModule, 
        FormsModule, 
        RouterModule, 
        VocabularyExerciseComponent,
        VocabularyExerciseResultComponent,
        AlertStickyComponent
    ],
    templateUrl: './vocabulary-list.component.html',
    styleUrls: ['./vocabulary-list.component.css']
})
export class VocabularyListComponent implements OnInit {

    page: Page | null = null;
    error: any = null;
    loading: boolean = false;
    vocabulary: VocabularyEntry[] = [];
    q: string = "";

    successSave: boolean = false;
    
    train: VocabularyCard[] = [];

    exerciseResult: VocabularyExerciseResult | null = null;

    @ViewChildren('germanInput') germanInput: any;

    constructor(private backendService: BackendService,
                private route: ActivatedRoute) {}

    @HostListener('document:keydown.control.s', ['$event'])
    onCtrlSKey(event: KeyboardEvent): void {
        this.save();
        event.preventDefault();
    }

    get sections(): string[] {
        return this.vocabulary.map(v => v.section)
                              .filter((value, index, array) => array.indexOf(value) === index);
    }

    ngOnInit(): void {
        this.route.params.pipe(
            map(params => params['id']),
            tap(_ => {this.page = null; this.loading = true; }),
            switchMap(id => this.backendService.getPage(id)),
            tap(_ => this.loading = false)
        ).subscribe({
            next: page => {
                this.page = page;
                this.vocabulary = VocabularyEntry.parseVocabulary(this.page!!.content);
            },
            error: error => { this.error = error; this.loading = false; }
        });
    }

    exercise() {
        const train: VocabularyCard[] = [];
        this.vocabulary.forEach(vocabulary => {
            train.push(new VocabularyCard(vocabulary, false));
            train.push(new VocabularyCard(vocabulary, true));
        });
        if (train.length == 0) {
            return;
        }
        this.train = train;
    }

    add() {
        const vocabulary = new VocabularyEntry();
        if (this.vocabulary.length>0) {
            vocabulary.section = this.vocabulary[this.vocabulary.length-1].section;
        }
        this.vocabulary.push(vocabulary);
        setTimeout(() => {
            this.germanInput.last.nativeElement.focus();
        }, 400);
    }

    save() {
        this.page!!.content = JSON.stringify(this.vocabulary, null, 4);
        this.backendService.savePage(this.page!!).subscribe({
            next: () => {
                this.successSave = true;
                timer(3000).subscribe(() => this.successSave = false);
            },
            error: error => { this.error = error; }
        });
    }

    delete(entry: VocabularyEntry) {
        const index = this.vocabulary.indexOf(entry);
        this.vocabulary.splice(index, 1);
    }

    reset(entry: VocabularyEntry) {
        entry.e2gNext = null;
        entry.e2gPhase = 0;
        entry.g2eNext = null;
        entry.g2ePhase = 0;
    }

    onSectionKeypress(event: KeyboardEvent): void {
        if (event.key === 'Tab') {
            this.add();
        }
    }

    playUrl(word: String): string {
        const base = document.querySelector('base')!!.getAttribute('href');
        return `${base}api/api/text2speech?text=${word}&language=${this.page?.language}`;
    }
}