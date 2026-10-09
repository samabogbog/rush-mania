# Mobile dropdown touch behavior

Custom game dropdowns defer touch selection until pointer release. A swipe, browser pointer cancellation, multi-touch, or scrolling invalidates selection. Native vertical scrolling remains enabled; touch-generated clicks cannot select an item accidentally. Mouse hover never forces scrolling, while keyboard navigation still scrolls its highlighted option into view.

Regression coverage: `tests/dropdown-touch.spec.ts` opens the actual admin item laboratory in a 390 × 844 touch viewport, uses Chromium CDP touch events to scroll the item list, checks the menu remains open with no value/change event, then taps an option and checks exactly one change. A separate test covers mouse selection and keyboard End/Enter.

Run against an isolated local API database. The first registered account is the development testing admin. To reuse that account set `DROPDOWN_QA_USERNAME`; otherwise the test registers one in the fresh isolated database. The test password is for disposable local QA only. Never run the registration fixture against production.

Verification: both regression tests passed on the final source; production build passed. `artifacts/dropdown-touch/mobile-scrolled.png` shows the actual item list after native scrolling. A captured event trace also identified a browser compatibility click landing on the next control after the selected row was removed; a single module-level guard suppresses that click until the next genuine pointer gesture.
