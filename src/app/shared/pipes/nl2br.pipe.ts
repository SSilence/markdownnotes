import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'nl2br',
    standalone: true
})
export class Nl2BrPipe implements PipeTransform {

    transform(value: string): string {
        if (typeof value !== 'string') {
            return value;
        }
        return value.replace(/(?:\r\n|\r|\n)/g, '<br />');
    }

}
