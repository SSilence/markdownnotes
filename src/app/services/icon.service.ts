import { Injectable } from '@angular/core';
import { ClarityIcons } from '@cds/core/icon';

@Injectable()
export class IconService {
    icons = Object.keys(ClarityIcons.registry)
}
