import { applyDocumentLanguage, directionOf } from './document-language';

describe('directionOf', () => {
  it('maps English to left-to-right', () => {
    expect(directionOf('en')).toBe('ltr');
  });

  it('maps Arabic to right-to-left', () => {
    expect(directionOf('ar')).toBe('rtl');
  });
});

describe('applyDocumentLanguage', () => {
  let documentRef: Document;

  beforeEach(() => {
    documentRef = document.implementation.createHTMLDocument('test');
  });

  it('sets lang and dir for English', () => {
    applyDocumentLanguage(documentRef, 'en');

    expect(documentRef.documentElement.getAttribute('lang')).toBe('en');
    expect(documentRef.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('sets lang and dir for Arabic', () => {
    applyDocumentLanguage(documentRef, 'ar');

    expect(documentRef.documentElement.getAttribute('lang')).toBe('ar');
    expect(documentRef.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('never leaves the two attributes disagreeing', () => {
    // Applying every language in turn, asserting the pair each time: a change that
    // set one attribute without the other would leave a mismatched pair here.
    for (const language of ['en', 'ar', 'en', 'ar'] as const) {
      applyDocumentLanguage(documentRef, language);

      const lang = documentRef.documentElement.getAttribute('lang');
      const dir = documentRef.documentElement.getAttribute('dir');

      expect(lang).toBe(language);
      expect(dir).toBe(language === 'ar' ? 'rtl' : 'ltr');
    }
  });

  it('writes exactly the two attributes on the document element', () => {
    applyDocumentLanguage(documentRef, 'ar');

    expect([...documentRef.documentElement.attributes].map((a) => a.name).sort()).toEqual([
      'dir',
      'lang',
    ]);
  });
});
