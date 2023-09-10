import { Component, OnInit, ViewChild, ViewChildren } from "@angular/core";
import { Page } from "src/app/models/page";
import { BackendService } from "src/app/services/backend.service";
import { AlertErrorComponent } from "../alert-error/alert-error.component";
import { ClarityModule, ClrDatagridStringFilterInterface } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { switchMap, map, tap } from 'rxjs/operators';
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { timer } from "rxjs";
import { SectionFilterComponent } from "./section-filter-component";
import { PhaseFilterComponent } from "./phase-filter-component";
import { VocabularyCard } from "src/app/models/vocabulary-card";
import { VocabularyExerciseComponent } from "../vocabulary-exercise/vocabulary-exercise.component";
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";
import { VocabularyExerciseResultComponent } from "../vocabulary-exercise-result/vocabulary-exercise-result.component";

@Component({
    selector: 'app-vocabulary-list',
    standalone: true,
    imports: [
        AlertErrorComponent, 
        ClarityModule, 
        CommonModule, 
        FormsModule, 
        RouterModule, 
        SectionFilterComponent, 
        PhaseFilterComponent, 
        VocabularyExerciseComponent,
        VocabularyExerciseResultComponent
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
    
    germanFilter = new GermanFilter();
    englishFilter = new EnglishFilter();
    sectionFilterValue: string[] = [];
    g2ePhaseFilterValue: number[] = [];
    e2gPhaseFilterValue: number[] = [];

    train: VocabularyCard[] = [];

    exerciseResult: VocabularyExerciseResult | null = null;

    @ViewChildren('germanInput') germanInput: any;
    @ViewChild('pagination') pagination: any;

    selected: VocabularyEntry[] = [];

    constructor(private backendService: BackendService,
                private route: ActivatedRoute) {}

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
        this.selected.forEach(vocabulary => {
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
        this.pagination.currentPage = this.pagination.lastPage;
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

    resetChecked() {
        this.selected.forEach(vocabulary => {
            this.reset(vocabulary);
        });
    }

    reset(entry: VocabularyEntry) {
        entry.e2gNext = null;
        entry.e2gPhase = 0;
        entry.g2eNext = null;
        entry.g2ePhase = 0;
    }

    export() {
        const content = this.vocabulary.map(v => `${v.german};${v.english};${v.section}`).join("\n");
        const blob = new Blob([content], {type: 'text/csv'});
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = this.page!.id!;
        document.body.appendChild(elem);
        elem.click();        
        document.body.removeChild(elem);
    }

    import(event: any) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            let content = e.target.result;
            content.split("\n").forEach((entry: string) => {
                const parts = entry.split(";");
                const german = parts[0];
                const english = parts[1];
                const section = parts[2];
                if (german.trim().length == 0 || english.trim().length == 0) {
                    return;
                }
                
                const hasVocabulary = this.vocabulary.find(e => e.english == english && e.german == german);
                if (hasVocabulary) {
                    return;
                }

                const vocabulary = new VocabularyEntry();
                vocabulary.english = english;
                vocabulary.german = german;
                vocabulary.section = section;
                this.vocabulary.push(vocabulary);
            });
        };
        reader.readAsText(event.target.files[0]);
    };

    onSectionKeypress(event: KeyboardEvent): void {
        if (event.key === 'Tab') {
            this.add();
        }
    }
}

class GermanFilter implements ClrDatagridStringFilterInterface<VocabularyEntry> {
    public current: string = "";

    accepts(entry: VocabularyEntry, search: string): boolean {
        this.current = search;
        return entry.german == search || entry.german.toLowerCase().indexOf(search) >= 0;
    }
}

class EnglishFilter implements ClrDatagridStringFilterInterface<VocabularyEntry> {
    public current: string = "";

    accepts(entry: VocabularyEntry, search: string): boolean {
        this.current = search;
        return entry.english == search || entry.english.toLowerCase().indexOf(search) >= 0;
    }
}