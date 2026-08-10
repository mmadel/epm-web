import { DOCUMENT, effect, inject, Injectable, Signal, signal } from '@angular/core';

import { applyDocumentLanguage } from './document-language';
import { DEFAULT_LANGUAGE, Language } from './language';

/**
 * The single owner of the active language.
 *
 * Nothing else in the workspace reads or writes the language: there is one signal,
 * in one service, and everything that cares (document `dir`/`lang`, translation
 * lookup, the language switch in the shell) derives from it. A second copy of "what
 * language are we in" is how a product ends up with a right-to-left layout showing
 * English text.
 *
 * The language is a signal rather than an observable because every consumer wants
 * the current value synchronously and wants to re-render when it changes; that is
 * what a signal is. It is exposed read-only so that {@link setLanguage} stays the
 * only way in.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  // Injected rather than reaching for the global `document`, so the effect below is
  // testable against a throwaway document instead of the one the test runner shares.
  private readonly documentRef = inject(DOCUMENT);

  private readonly current = signal<Language>(DEFAULT_LANGUAGE);

  /** The active language. Read-only: change it through {@link setLanguage}. */
  readonly language: Signal<Language> = this.current.asReadonly();

  constructor() {
    // One effect, one call, both attributes. `applyDocumentLanguage` sets `lang` and
    // `dir` together from a single language value, and this is its only caller, so
    // the document cannot end up with one attribute updated and the other stale -
    // there is no code path that sets a direction without also setting a language.
    // This also covers the initial state: the effect runs once on creation, so the
    // document is labelled correctly before anything is rendered.
    effect(() => applyDocumentLanguage(this.documentRef, this.current()));
  }

  /** Switches the active language. Setting the language already in use is a no-op. */
  setLanguage(language: Language): void {
    this.current.set(language);
  }
}
