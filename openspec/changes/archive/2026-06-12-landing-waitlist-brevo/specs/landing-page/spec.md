# Delta for landing-page

## ADDED Requirements

### Requirement: FR-11 — Waitlist Modal

"Join waitlist" buttons SHALL appear on Pricing cards (Starter, Growth, Scale replacing "Coming soon") and CTA section. Clicking SHALL open a `<dialog>`-based modal with email (required) and company (optional) fields, backdrop blur, ESC-to-close, and focus trap. Three states: form, loading, success.

#### Scenario: Opens modal from any trigger

- GIVEN a user clicks any "Join waitlist" button
- WHEN the modal opens
- THEN the email field MUST be focused
- AND company field MUST be optional
- AND backdrop MUST show `backdrop-filter: blur(4px)`

#### Scenario: Loading and success flow

- GIVEN the user submits a valid email
- WHEN the API request is pending
- THEN the submit button SHALL show a loading state and fields SHALL be disabled
- WHEN the API returns success
- THEN the modal SHALL show "You're on the list. We'll reach out when AgentTrail Cloud launches."

#### Scenario: Close on Escape

- GIVEN the modal is open
- WHEN the user presses Escape
- THEN the modal MUST close
- AND focus MUST return to the trigger button

### Requirement: FR-12 — Waitlist API

POST /api/waitlist SHALL proxy to Brevo POST /v3/contacts with body `{ email, listIds: [BREVO_LIST_ID], attributes: { COMPANY }, updateEnabled: true }`. BREVO_API_KEY and BREVO_LIST_ID MUST be environment variables, never hardcoded.

#### Scenario: Successful signup

- GIVEN a valid POST to /api/waitlist
- WHEN Brevo responds 201
- THEN the function MUST return 201 with "You're on the list. We'll reach out when AgentTrail Cloud launches."

#### Scenario: Duplicate contact returns success

- GIVEN Brevo responds 400 with duplicate_parameter
- WHEN the function receives the error
- THEN it MUST return the same success message

#### Scenario: Server error

- GIVEN Brevo responds with a non-2xx, non-duplicate error
- WHEN the function receives the error
- THEN it MUST return 500 with "Something went wrong. Try again."

#### Scenario: Invalid email

- GIVEN the request body has an empty or malformed email
- WHEN the function validates the payload
- THEN it MUST return 400 with "Invalid email"

#### Scenario: CORS preflight

- GIVEN a browser sends OPTIONS to /api/waitlist
- WHEN the function handles the preflight
- THEN it MUST return 204 with CORS headers

### Requirement: FR-13 — pages.dev Redirect

The system SHALL include an inline redirect script in `<head>` before any other script. Visiting `agenttrail.pages.dev` SHALL redirect to `agenttrail.aivoralabs.org`.

#### Scenario: Redirect on pages.dev

- GIVEN a user visits https://agenttrail.pages.dev
- WHEN the page loads
- THEN the inline script MUST redirect to https://agenttrail.aivoralabs.org

#### Scenario: No redirect on production domain

- GIVEN a user visits https://agenttrail.aivoralabs.org
- WHEN the page loads
- THEN the redirect script MUST NOT trigger

## MODIFIED Requirements

### Requirement: SEO #51 — JSON-LD Schema

| # | Scenario | Expect |
|---|----------|--------|
| 51 | JSON-LD | Single `SoftwareApplication` schema: name, description, applicationCategory, author, url (`https://agenttrail.aivoralabs.org`), offers (`{ @type: "Offer", price: "0", priceCurrency: "USD", description: "Open-source SDK, MIT license" }`), operatingSystem (`Any`), license (`https://opensource.org/licenses/MIT`) |

(Previously: SoftwareApplication + OpenSourceProject with AggregateOffer lowPrice 0, highPrice 999)
