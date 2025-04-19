declare module 'wordpos' {
  export interface Pointer {
    pointerSymbol: string;
    synsetOffset: string;
    pos: string;
    sourceTarget: string;
  }

  export interface Synset {
    synsetOffset: string;
    lexFilenum: number;
    lexName: string;
    pos: string;
    wCnt: number;
    lemma: string;
    synonyms: string[];
    lexId: string;
    ptrs: Pointer[];
    gloss: string;
    def: string;
    exp: string[];
  }

  export class WordPOS {
    lookup(word: string, callback: (result: Synset[]) => void): void;
    lookup(word: string): Promise<Synset[]>;
    get(word: string, callback: (result: any) => void): void;
    get(word: string): Promise<any>;
    getPOS(word: string, callback: (result: any) => void): void;
    getPOS(word: string): Promise<any>;
    isNoun(word: string, callback: (result: boolean) => void): void;
    isNoun(word: string): Promise<boolean>;
    isVerb(word: string, callback: (result: boolean) => void): void;
    isVerb(word: string): Promise<boolean>;
    isAdjective(word: string, callback: (result: boolean) => void): void;
    isAdjective(word: string): Promise<boolean>;
    isAdverb(word: string, callback: (result: boolean) => void): void;
    isAdverb(word: string): Promise<boolean>;
    seek(
      synsetOffset: string,
      pos: string,
      callback: (result: Synset) => void
    ): void;
    seek(synsetOffset: string, pos: string): Promise<Synset>;
  }

  export default WordPOS;
}
