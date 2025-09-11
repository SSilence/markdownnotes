import { Component, Input, Output, EventEmitter, ModuleWithProviders } from "@angular/core";
import { ClarityModule } from "@clr/angular";

import { FormsModule } from "@angular/forms";
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";

import { NgCircleProgressModule } from "ng-circle-progress";

@Component({
    selector: 'app-vocabulary-exercise-result',
    imports: [ClarityModule, FormsModule, NgCircleProgressModule],
    providers: [
        (NgCircleProgressModule.forRoot({
            radius: 100,
            outerStrokeWidth: 16,
            innerStrokeWidth: 8,
            outerStrokeColor: '#78C000',
            innerStrokeColor: '#C7E596',
            animationDuration: 300,
        }) as ModuleWithProviders<NgCircleProgressModule>).providers!,
    ],
    template: `
        @if (result!==null) {
            <div class="modal">
                <div class="modal-dialog" role="dialog" aria-hidden="true">
                <div class="modal-content">
                    <div class="modal-body">
                    <circle-progress
                        [percent]="result.percent"
                        [radius]="100"
                        [outerStrokeWidth]="16"
                        [innerStrokeWidth]="8"
                        [outerStrokeColor]="'#78C000'"
                        [innerStrokeColor]="'#C7E596'"
                        [animation]="true"
                        [animationDuration]="300"
                    ></circle-progress>
                    <p class="correct">{{result.correct}} correct words</p>
                    <p class="wrong">{{result.wrong}} wrong words</p>
                    </div>
                    <div class="modal-footer">
                    <button class="btn btn-danger" type="button" (click)="close()">close</button>
                    </div>
                </div>
                </div>
            </div>
        }
        @if (result!==null) {
            <div class="modal-backdrop" aria-hidden="true"></div>
        }
    `,
    styles: [`
        .modal-body {
            text-align: center;
        }

        .correct {
            color:green;
            font-size:1.3rem;
            font-weight: bold;
        }

        .wrong {
            color:red;
            font-size:1.3rem;
            font-weight: bold;
        }    
    `]
})
export class VocabularyExerciseResultComponent {

    @Input()
    result: VocabularyExerciseResult | null = null;

    @Output() finished = new EventEmitter();

    close() {
        this.finished.emit(true)
    }
}