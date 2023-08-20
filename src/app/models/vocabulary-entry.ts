export class VocabularyEntry {
    german: string = "";
    english: string = "";
    section: string = "";
    e2gPhase: number = 0;
    e2gNext: Date | null = null;
    g2ePhase: number = 0;
    g2eNext: Date | null = null;

    constructor(other: VocabularyEntry | null = null) {
        if (other) {
            this.german = other.german;
            this.english = other.english;
            this.section = other.section;
            this.e2gPhase = other.e2gPhase;
            this.e2gNext = other.e2gNext;
            this.g2ePhase = other.g2ePhase;
            this.g2eNext = other.g2eNext;
        }
    }

    static equals(one: VocabularyEntry, other: VocabularyEntry): boolean {
        return other.german == one.german && other.english == one.english && other.section == one.section;
    }

    static parseVocabulary(json: string): VocabularyEntry[] {
        try {
            return JSON.parse(json);
        } catch(error) {
            console.error(error);
            return [];
        }
    }
}