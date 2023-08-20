import { VocabularyEntry } from "./vocabulary-entry";

export class VocabularyCard {
    constructor(
        public vocabulary: VocabularyEntry,
        public g2e: boolean
        ) {}
}