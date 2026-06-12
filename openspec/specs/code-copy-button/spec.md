# code-copy-button Specification

## Purpose

Provides copy-to-clipboard functionality on code blocks throughout AgentTrail documentation and UI surfaces. Initially scoped to the landing page HowItWorks component. Uses vanilla JS IIFE pattern (no framework runtime) for zero dependency overhead.

## Requirements

### CC-01: Hover-Reveal Copy Button

Each `<pre>` element wrapped in a `relative group` container SHALL display a copy button on hover at the top-right corner.

#### Scenario: Button appears on hover

- GIVEN a `<div class="relative group">` wrapping a `<pre>` element
- WHEN the user hovers over the group
- THEN a button SHALL appear at `top-3 right-3` with `opacity-0 group-hover:opacity-100` CSS transition

#### Scenario: Button hidden by default

- GIVEN the code block is not hovered
- WHEN inspecting the button
- THEN it MUST have `opacity-0`

### CC-02: Clipboard Copy

Clicking the copy button SHALL copy the value of the `data-copy` attribute on the `<pre>` element to the system clipboard.

#### Scenario: Copies data-copy value

- GIVEN a `<pre>` with `data-copy="npm install @aivoralabs/agenttrail"`
- WHEN the copy button is clicked
- THEN `navigator.clipboard.writeText("npm install @aivoralabs/agenttrail")` SHALL be called

#### Scenario: HTTP fallback

- GIVEN `navigator.clipboard` is unavailable
- WHEN the copy button is clicked
- THEN the implementation SHOULD fall back to `document.execCommand('copy')` using a temporary textarea

### CC-03: Visual Feedback

After copying, the button icon SHALL swap to a checkmark for 2 seconds, then revert to the clipboard icon.

#### Scenario: Checkmark on success

- GIVEN the copy succeeds
- WHEN the button is clicked
- THEN the clipboard SVG icon SHALL be replaced with a checkmark SVG icon
- AFTER 2 seconds, the checkmark SHALL revert to the clipboard icon

### CC-04: Vanilla JS IIFE Pattern

All JavaScript for copy functionality MUST use the project's vanilla JS IIFE pattern — no `client:load` or Astro directives.

#### Scenario: No client:load

- GIVEN the Astro component containing the script
- WHEN inspecting the `<script>` tag
- THEN it MUST NOT use `client:load` directive
- AND the script body MUST be wrapped in `(function () { ... })();`

#### Scenario: Event delegation

- GIVEN the copy buttons exist in the DOM
- WHEN a user clicks a copy button
- THEN the event listener SHALL use delegation from a parent or document-level listener
- AND MUST NOT attach per-instance listeners

### CC-05: Shell Prompt Stripping

The `data-copy` attribute MUST NOT include shell prompt prefixes or command-line decorations.

#### Scenario: No dollar sign

- GIVEN a code block displaying `$ npm install @aivoralabs/agenttrail`
- WHEN reading the `data-copy` attribute
- THEN the value MUST contain only `npm install @aivoralabs/agenttrail`

#### Scenario: Multi-line output excluded

- GIVEN a code block with command output lines (e.g., `✓ Chain intact` after a command)
- WHEN reading the `data-copy` attribute
- THEN only the command line(s) SHALL be included, or the entire block SHALL be excluded from copy
