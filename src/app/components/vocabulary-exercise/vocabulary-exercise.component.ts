import { Component, Input, ViewChildren, Output, EventEmitter, ViewChild } from "@angular/core";
import { ClarityModule } from "@clr/angular";

import { FormsModule } from "@angular/forms";
import { VocabularyEntry } from "src/app/models/vocabulary-entry";
import { Page } from "src/app/models/page";
import { DateTime } from "luxon";
import { BackendService } from "src/app/services/backend.service";
import { VocabularyCard } from "src/app/models/vocabulary-card";
import { AlertErrorComponent } from "../alert-error/alert-error.component";
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";

@Component({
    selector: 'app-vocabulary-exercise',
    imports: [ClarityModule, FormsModule, AlertErrorComponent],
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
    progressCorrect: number = 0
    progressWrong: number = 0

    @Input()
    train: boolean = false;

    @Output() finished = new EventEmitter<VocabularyExerciseResult>();
    
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

    @Input()
    set cards(value: VocabularyCard[]) {
        this.progressAll = 0
        this.progressFinished = 0
        this.progressCorrect = 0
        this.progressWrong = 0
        this.history = [];
        this.backup = [];
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
            this.progressCorrect--;
        } else {
            this.progressWrong--;
        }
        this.progressUpdate();

        current!.vocabulary.e2gPhase = backup!.vocabulary.e2gPhase;
        current!.vocabulary.e2gNext = backup!.vocabulary.e2gNext;
        current!.vocabulary.g2ePhase = backup!.vocabulary.g2ePhase;
        current!.vocabulary.g2eNext = backup!.vocabulary.g2eNext;
        this.current = current;
    }

    private save(correct: boolean) {
        const isAlreadyInHistory = this.history.find(entry => entry.g2e == this.current!.g2e && VocabularyEntry.equals(entry.vocabulary, this.current!.vocabulary));
        if (!isAlreadyInHistory && correct) {
            this.progressCorrect++;
        }
        if (!isAlreadyInHistory && !correct) {
            this.progressWrong++
        }

        const vocabularyCopy = new VocabularyEntry(this.current!.vocabulary ? this.current!.vocabulary : null);
        this.backup.push(new VocabularyCard(vocabularyCopy, this.current!.g2e));

        if (!this.introduce && !this.train && !isAlreadyInHistory) {
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
        
        if (!this.introduce && !this.train) {
            this.write(this.current!!);
        }
        
        this.next();
    }

    private write(vocabularyCard: VocabularyCard) {
        const vocabulary = vocabularyCard.vocabulary;
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
            this.introduced(this.current!);
        } else {
            this.introduceMode = false;
            this.current = this._cards.shift();
            
            if (!this.current && this.history.length > 0) {
                const percent = Math.round((this.progressCorrect / (this.progressAll)) * 100);
                this.finished.emit(new VocabularyExerciseResult(percent, this.progressCorrect, this.progressWrong));
                return;
            }

            if (this.current!.g2e === false) {
                this.play(this.current!.vocabulary.english);
            }
            
            this.result = false;
        }
        
        this.progressUpdate();
    }

    private introduced(current: VocabularyCard) {
        const g2eCard = this._cards.find(c => c.g2e === true  && VocabularyEntry.equals(c.vocabulary, current.vocabulary));
        g2eCard!.vocabulary.g2eNext = this.phaseToNext(1);
        g2eCard!.vocabulary.g2ePhase = 1;
        this.write(g2eCard!);

        const e2gCard = this._cards.find(c => c.g2e === false  && VocabularyEntry.equals(c.vocabulary, current.vocabulary));
        e2gCard!.vocabulary.e2gNext = this.phaseToNext(1);
        e2gCard!.vocabulary.e2gPhase = 1;
        this.write(e2gCard!);
    }

    play(word: string) {
        try {
            const base = document.querySelector('base')!!.getAttribute('href');
            this._audio.src= `${base}api/api/text2speech?text=${word}&language=${this.page?.language}`;
            this._audio.play();
        } catch(ex) {
            // ignore error on init
        }
    }

    private phaseToNext(phase: number): Date {
        if(phase == 1) {
            return DateTime.now().plus({days: 1}).startOf('day').toJSDate();
        } else if(phase == 2) {
            return DateTime.now().plus({days: 3}).startOf('day').toJSDate();
        } else if(phase == 3) {
            return DateTime.now().plus({days: 9}).startOf('day').toJSDate();
        } else if(phase == 4) {
            return DateTime.now().plus({days: 29}).startOf('day').toJSDate();
        } else if(phase == 5) {
            return DateTime.now().plus({days: 90}).startOf('day').toJSDate();
        } else {
            return DateTime().plus({years: 100}).startOf('day').toJSDate();
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