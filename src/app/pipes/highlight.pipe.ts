import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'highlight',
    standalone: true
})
export class HighlightPipe implements PipeTransform {

  transform(value: any, args: any): string {
    const input = typeof value === 'string' ? value : '';
    const query = typeof args === 'string' && args.length > 0 ? args : null;

    if (!query) {
      return this.escapeHtml(input);
    }

    const regex = new RegExp(this.escapeRegExp(query), 'gi');
    let lastIndex = 0;
    let result = '';
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      result += this.escapeHtml(input.slice(lastIndex, match.index));
      result += `<mark>${this.escapeHtml(match[0])}</mark>`;
      lastIndex = match.index + match[0].length;
    }

    result += this.escapeHtml(input.slice(lastIndex));
    return result;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
