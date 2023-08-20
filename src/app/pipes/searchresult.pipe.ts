import {Pipe, PipeTransform} from '@angular/core';

const EXTRACT_SIZE = 2;

@Pipe({
    name: 'searchResult',
    standalone: true
})
export class SearchResultPipe implements PipeTransform {

    transform(value: string, q: string): string {
        if (typeof value !== 'string') {
            return value;
        }
        const lines = value.split(/(?:\r\n|\r|\n)/g);
        let persist = [];
        for (let i=0;i<lines.length;i++) {
            if (lines[i].toLowerCase().indexOf(q.toLowerCase())!==-1) {
                persist.push(i);
                for (let n = i-EXTRACT_SIZE;n<i+EXTRACT_SIZE;n++) {
                    if (n>0 && n<lines.length-1) {
                        persist.push(n)
                    }
                }   
            }
        }
        persist = persist.filter((v, i, a) => a.indexOf(v) === i) // unique
                         .sort((a, b) => a - b);

        const extracts: number[][] = [];
        let current: number[] = [];
        for (let i=0;i<persist.length;i++) {
            if (i!=0 && persist[i-1]!==persist[i]-1) {
                extracts.push(current);
                current = [];
            }
            current.push(persist[i]);
        }
        extracts.push(current);

        return (persist.length > 0 && persist[0] != 0 ? "...\n" : "") + extracts
                .filter(c => c.length>0)
                .map(c => c.map(i => lines[i]).join("\n"))
                .join("\n...\n")
                .trim() + (persist.length > 0 && persist[persist.length-1] < lines.length-1 ? "\n..." : "");
    }

}
