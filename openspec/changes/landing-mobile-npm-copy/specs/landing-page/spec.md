# Delta for landing-page

## MODIFIED Requirements

### FR-09: Responsive

| # | Scenario | Expect |
|---|----------|--------|
| 38 | <768px | Single column, stack cards vertically, ≥16px body |
| 39 | 768-1024px | 2-col grids where applicable |
| 40 | >1024px | 4-col pricing, max-width constrained |
| 41 | No overflow — HowItWorks pre blocks | Three `<pre>` blocks MUST NOT overflow viewport; MUST use `w-full overflow-x-auto` |
| 42 | No overflow — HowItWorks grid | Audit report grid MUST use `grid-cols-1` below `sm:` and `sm:grid-cols-3` at `sm:` and above |
| 43 | No overflow — Hero heading | Heading MUST use `text-4xl` base, `sm:text-5xl` at 640px+, `md:text-7xl` at 768px+ |
| 44 | No overflow — CTA buttons | Buttons MUST use `px-6` below `sm:` and `sm:px-8` at `sm:` and above |
| 45 | No overflow — WaitlistModal dialog | `<dialog>` MUST NOT use `inset-0`; positioning MUST rely on `dialog[open]` CSS |
| 46 | No overflow — all breakpoints | MUST have zero horizontal scroll at 320px, 375px, 390px, and 414px; all 8 sections MUST fit within viewport width |

(Previously: FR-09 required zero horizontal scroll at 4 breakpoints and responsive column layouts but did not specify component-level CSS fixes. Scenario 41 was the original no-overflow requirement.)

#### Scenario: No overflow at 320px

- GIVEN the landing page is rendered at 320px viewport width
- WHEN the page loads
- THEN all 8 sections MUST be fully visible without horizontal scroll
- AND HowItWorks `<pre>` blocks MUST NOT exceed viewport width

#### Scenario: No overflow at 414px

- GIVEN the landing page is rendered at 414px viewport width
- WHEN the page loads
- THEN zero horizontal scroll MUST be present

#### Scenario: Hero heading responsive scale

- GIVEN Hero heading is rendered
- WHEN viewport < 640px
- THEN heading MUST be `text-4xl`
- WHEN viewport >= 640px
- THEN heading MUST be `sm:text-5xl`
- WHEN viewport >= 768px
- THEN heading MUST be `md:text-7xl`

#### Scenario: Audit grid stacks on mobile

- GIVEN the HowItWorks audit report grid
- WHEN viewport < 640px
- THEN grid MUST be `grid-cols-1`
- WHEN viewport >= 640px
- THEN grid MUST be `sm:grid-cols-3`

#### Scenario: CTA button padding

- GIVEN CTA section buttons
- WHEN viewport < 640px
- THEN buttons MUST have `px-6`
- WHEN viewport >= 640px
- THEN buttons MUST have `sm:px-8`

#### Scenario: WaitlistModal dialog positioning

- GIVEN the waitlist dialog
- WHEN the dialog is open
- THEN it MUST be centered via `dialog[open]` CSS (`top: 50%; left: 50%; transform: translate(-50%, -50%)`)
- AND the `fixed inset-0` class MUST NOT be present on `<dialog>`

### FR-04: How It Works

(No spec-level changes — the copy button UX is defined in the `code-copy-button` spec. The `<pre>` wrapping and `data-copy` attributes are implementation details that implement that spec.)

## ADDED Requirements

### FR-14: Code Block Copy Buttons (HowItWorks)

The HowItWorks component SHALL include copy-to-clipboard buttons on all 3 code blocks. This requirement delegates to the `code-copy-button` spec for the button behavior contract. The landing page implementation SHALL:

- Wrap each `<pre>` in `<div class="relative group">`
- Add `data-copy` attribute to each `<pre>` with the code text (without `$ ` prompt prefix)
- Include the copy button inside the wrapper using vanilla JS IIFE pattern

#### Scenario: All three blocks have copy wrappers

- GIVEN a user views the HowItWorks component
- WHEN inspecting the DOM
- THEN each of the 3 `<pre>` blocks MUST be wrapped in `<div class="relative group">`
- AND each MUST have a `data-copy` attribute

#### Scenario: Copy excludes shell prompt

- GIVEN Step 1's code block displays `$ npm install @aivoralabs/agenttrail`
- WHEN reading the `data-copy` attribute
- THEN its value MUST be `npm install @aivoralabs/agenttrail` (no `$ ` prefix)
- AND Step 3's `data-copy` MUST exclude the shell prompt lines too

(Full copy button behavior: see `code-copy-button` spec for hover reveal, clipboard API, checkmark feedback, fallback, and IIFE pattern.)
