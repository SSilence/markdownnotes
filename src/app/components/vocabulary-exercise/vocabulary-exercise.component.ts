import { Component, Input, ViewChildren, Output, EventEmitter, ViewChild } from "@angular/core";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { Page } from "src/app/models/page";
import * as moment from 'moment';
import { BackendService } from "src/app/services/backend.service";
import { VocabularyCard } from "src/app/models/vocabulary-card";
import { AlertErrorComponent } from "../alert-error/alert-error.component";

@Component({
    selector: 'app-vocabulary-exercise',
    standalone: true,
    imports: [ClarityModule, CommonModule, FormsModule, AlertErrorComponent],
    templateUrl: './vocabulary-exercise.component.html',
    styleUrls: ['./vocabulary-exercise.component.css']
})
export class VocabularyExerciseComponent {

    @Input()
    page: Page | null = null;

    @Input()
    introduce: boolean = false;
    private introduceCards: VocabularyCard[] = [];
    introduceMode: boolean = false;
    
    _cards: VocabularyCard[] = [];
    current: VocabularyCard | undefined | null = null;
    result: boolean = false;
    
    private history: VocabularyCard[] = [];
    private backup: VocabularyCard[] = [];

    progressAll: number = 0;
    progressFinished: number = 0;
    progressValue: number = 0;
    progressLabel: string = "";

    @Input()
    train: boolean = false;

    error: any = null;

    private _audio: any | null = null;

    @ViewChild('audio') set audio(element: any) {
        if (element) {
            this._audio = element.nativeElement;
            if (this.introduceMode && this.current) {
                this.play(this.current!.vocabulary.english);
            }
        }
      }

    constructor(private backendService: BackendService) {}

    @Output() finished = new EventEmitter();

    @Input()
    set cards(value: VocabularyCard[]) {
        if (this.introduce) {
            this.introduceCards = value.filter(v => v.g2e);
        }
        const g2e = this.shuffle(value.filter(v => v.g2e));
        const e2g = this.shuffle(value.filter(v => !(v.g2e)));
        this._cards = g2e.concat(e2g);
        this.progressAll = this._cards.length;
        this.next();
    }

    answer() {
        if (this.current!.g2e) {
            this.play(this.current!.vocabulary.english);
        }
        this.result = true
    }

    correct() {
        this.progressFinished++;
        this.save(true);
    }

    wrong() {
        this.save(false);
    }

    hasBack(): boolean {
        return this.history.length > 0;
    }

    back() {
        this._cards.unshift(this.current!);
        const current = this.history.pop();
        const backup = this.backup.pop();

        const wasCorrectg2e = current!.g2e && current!.vocabulary.g2ePhase > backup!.vocabulary.g2ePhase;
        const wasCorrecte2g = current!.g2e == false && current!.vocabulary.e2gPhase > backup!.vocabulary.e2gPhase;
        if (wasCorrectg2e || wasCorrecte2g) {
            this.progressFinished--;
            this.progressUpdate();
        }

        current!.vocabulary.e2gPhase = backup!.vocabulary.e2gPhase;
        current!.vocabulary.e2gNext = backup!.vocabulary.e2gNext;
        current!.vocabulary.g2ePhase = backup!.vocabulary.g2ePhase;
        current!.vocabulary.g2eNext = backup!.vocabulary.g2eNext;
        this.current = current;
    }

    private save(correct: boolean) {
        const isAlreadyInHistory = this.history.find(entry => entry.g2e == this.current!.g2e && VocabularyEntry.equals(entry.vocabulary, this.current!.vocabulary));
        
        const vocabularyCopy = new VocabularyEntry(this.current!.vocabulary ? this.current!.vocabulary : null);
        this.backup.push(new VocabularyCard(vocabularyCopy, this.current!.g2e));

        if (!this.train && !isAlreadyInHistory) {
            if (this.current!.g2e) {
                const newPhase = this.current!.vocabulary.g2ePhase + (correct ? 1 : -2);
                this.current!.vocabulary.g2ePhase = newPhase <= 0 ? 1 : newPhase;
                this.current!.vocabulary.g2eNext = correct ? this.phaseToNext(newPhase) : this.phaseToNext(2);
            } else {
                const newPhase = this.current!.vocabulary.e2gPhase + (correct ? 1 : -2);
                this.current!.vocabulary.e2gPhase = newPhase <= 0 ? 1 : newPhase;
                this.current!.vocabulary.e2gNext = correct ? this.phaseToNext(newPhase) : this.phaseToNext(2);
            }
        }

        this.history.push(this.current!);

        if (!correct) {
            this._cards.push(this.current!);
        }
        
        if (!this.train) {
            this.write();
        }
        
        this.next();
    }

    private write() {
        const vocabulary = this.current!!.vocabulary;
        const all = VocabularyEntry.parseVocabulary(this.page!!.content);
        const existing = all.find(v => VocabularyEntry.equals(v, vocabulary));
        existing!.g2ePhase = vocabulary.g2ePhase;
        existing!.g2eNext = vocabulary.g2eNext;
        existing!.e2gPhase = vocabulary.e2gPhase;
        existing!.e2gNext = vocabulary.e2gNext;
        this.page!.content = JSON.stringify(all, null, 4);
        this.backendService.savePage(this.page!!).subscribe({
            next: () => {},
            error: error => { this.error = error; }
        });
    }

    private progressUpdate() {
        this.progressValue = Math.round((this.progressFinished / (this.progressAll)) * 100);
        this.progressLabel = `${this.progressFinished}/${this.progressAll}`;
    }
    
    next() {
        if (this.introduceCards.length > 0) {
            this.current = this.introduceCards.shift();
            this.introduceMode = true;
            this.play(this.current!.vocabulary.english);
        } else {
            this.introduceMode = false;
            this.current = this._cards.shift();
            
            if (!this.current && this.history.length > 0) {
                this.finished.emit(true);
                return;
            }

            if (this.current?.g2e && this.current.vocabulary.g2ePhase == 0) {
                this.current.vocabulary.g2ePhase = 1;
            } else if (this.current!.vocabulary.e2gPhase == 0) {
                this.current!.vocabulary.e2gPhase = 1;
            }

            if (this.current!.g2e === false) {
                this.play(this.current!.vocabulary.english);
            }
            
            this.result = false;
        }
        
        this.progressUpdate();
    }

    play(word: string) {
        try {
            this._audio.src='/api/text2speech?text=' + word;
            this._audio.play();
        } catch(ex) {
            // ignore error on init
        }
    }

    private phaseToNext(phase: number): Date {
        if(phase == 1) {
            return moment().add(1, 'days').startOf('day').toDate();
        } else if(phase == 2) {
            return moment().add(3, 'days').startOf('day').toDate();
        } else if(phase == 3) {
            return moment().add(9, 'days').startOf('day').toDate();
        } else if(phase == 4) {
            return moment().add(29, 'days').startOf('day').toDate();
        } else if(phase == 5) {
            return moment().add(90, 'days').startOf('day').toDate();
        } else {
            return moment().add(100, 'years').startOf('day').toDate();
        }
    }

    private shuffle(a: any[]): any[] {
        var j, x, i;
        for (i = a.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = a[i];
            a[i] = a[j];
            a[j] = x;
        }
        return a;
    }
}