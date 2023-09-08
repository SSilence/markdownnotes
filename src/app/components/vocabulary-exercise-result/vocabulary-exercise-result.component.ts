import { Component, Input, Output, EventEmitter, ModuleWithProviders } from "@angular/core";
import { ClarityModule } from "@clr/angular";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { VocabularyExerciseResult } from "src/app/models/vocabulary-exercise-result";

import { NgCircleProgressModule } from "ng-circle-progress";

@Component({
    selector: 'app-vocabulary-exercise-result',
    standalone: true,
    imports: [ClarityModule, CommonModule, FormsModule, NgCircleProgressModule],
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
    templateUrl: './vocabulary-exercise-result.component.html',
    styleUrls: ['./vocabulary-exercise-result.component.css']
})
export class VocabularyExerciseResultComponent {

    @Input()
    result: VocabularyExerciseResult | null = null;

    @Output() finished = new EventEmitter();

    close() {
        this.finished.emit(true)
    }
}