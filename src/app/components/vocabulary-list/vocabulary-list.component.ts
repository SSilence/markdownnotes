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
        const length = this.selectedCount / this.itemsPerPage;
        return Array.from({length: length}, (_, i) => i + 1);
    }

    @ViewChildren('addGermanInput') addGermanInput: any;
    
    constructor(private backendService: BackendService,
                private route: ActivatedRoute) {}

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
        this.save();
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
        this.save();
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
        this.selected = this.vocabulary.filter(item => {
            const qMatch = this.q.length > 3 ? item.german.toLowerCase().includes(this.q.toLowerCase()) || item.english.toLowerCase().includes(this.q.toLowerCase()) : true;
            const phaseMatch = this.phase.length > 0 ? this.phase.includes(item.e2gPhase) || this.phase.includes(item.g2ePhase) : true;
            const sectionMatch = this.section.length > 0 ? this.section.includes(item.section) : true;
            return qMatch && phaseMatch && sectionMatch;  
        })
        this.selectedCount = this.selected.length;
        this.selected = this.selected.slice(startIndex, endIndex);
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

    save() {
        this.page!!.content = JSON.stringify(structuredClone(this.vocabulary).reverse(), null, 4);
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