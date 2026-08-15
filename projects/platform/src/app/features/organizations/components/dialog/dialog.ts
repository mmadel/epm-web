import { afterNextRender, Component, ElementRef, input, output, viewChild } from '@angular/core';

/**
 * A modal dialog: a heading, a way out, and whatever is put inside it.
 *
 * WHY A DIALOG AND NOT AN INLINE FORM. Adding a branch or a staff member used to
 * open a form in the list, in place of the control that opened it: the list
 * rearranged itself around the thing being typed, the row being edited disappeared
 * while it was edited, and only one form could be open at a time for reasons nothing
 * on screen explained. A dialog says what that arrangement was trying to say and
 * says it properly - this is one thing to finish, the list is still there behind it,
 * and there is exactly one way out of it.
 *
 * IT IS THE NATIVE `<dialog>`, opened with `showModal()`. That is the whole reason
 * this component is small: the browser gives modality, a backdrop, focus held inside
 * the dialog, Escape to dismiss, and inert content behind it. Every one of those is
 * a thing a hand-built overlay gets subtly wrong, and three of them are invisible to
 * anybody testing with a mouse.
 *
 * IT IS RENDERED BY `@if` RATHER THAN KEPT IN THE DOM AND TOGGLED. `showModal()`
 * runs once, on the render that creates it, and closing means the caller stops
 * rendering it - so there is no "is it open" flag in two places to disagree with
 * each other. Focus is returned to whatever opened it by the caller, which is the
 * only thing that knows what that was.
 *
 * It holds no values and knows nothing about what is in it. The form projected into
 * it does that, and hands its values over on submit - so a dialog that is dismissed
 * leaves the draft exactly as it found it.
 */
@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
})
export class Dialog {
  /** What this dialog is for - "Add a branch", or the name of the row being changed. */
  readonly title = input.required<string>();

  /**
   * Dismissed without finishing: Escape, the close control, or anything else the
   * browser counts as dismissing a dialog.
   *
   * Submitting is NOT this. What is inside the dialog reports that, because this
   * component does not know what finishing means here.
   */
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const dialog = this.dialog().nativeElement;

      // WHAT WAS ALREADY FOCUSED, IF THE CALLER AIMED AT SOMETHING. A server fault
      // names a control, and the page focuses that control on the same render that
      // opens this dialog - the page's callback runs first, then `showModal()` throws
      // the focus away again and lands it on whatever comes first in the markup. So
      // the intent is recorded before opening and restored after.
      const intended = dialog.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : null;

      // `showModal()` rather than `show()` or an `open` attribute: only the modal
      // form makes the rest of the page inert and puts the dialog in the top layer,
      // and those are the two things that make this a dialog rather than a box drawn
      // over the form.
      dialog.showModal();

      // Failing that, the cursor goes in the first field. Left alone, `showModal()`
      // focuses the first focusable thing in here, which is the close control in the
      // corner - the one thing in a dialog nobody opened it to press. `autofocus`
      // would say this in one word and is rightly banned by the linter, because on a
      // page rather than in a dialog it drags a reader somewhere they did not ask to
      // go; inside a modal that has just taken over the screen, it is the point.
      (intended ?? dialog.querySelector<HTMLElement>('input, select, textarea'))?.focus();
    });
  }
}
