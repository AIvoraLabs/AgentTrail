---
layout: home
title: AgentTrail — Compliance receipts for AI agents
---

<div class="landing-content">

<!-- ==================== Hero ==================== -->
<div class="hero">

<div class="badge">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  EU AI Act Article 12 compliant
</div>

<h1>Compliance receipts for AI agents</h1>

<p class="subtitle">
  Tamper-proof audit trails for every AI agent interaction.<br>
  SHA-256 hash chaining + Ed25519 signatures. EU AI Act Article 12 ready.
</p>

<div class="actions">
  <a href="#how-it-works" class="btn btn-primary">Get Started</a>
  <a href="https://github.com/AiVoraLabs/agenttrail" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
    Star on GitHub
  </a>
</div>

</div>
<!-- ================ End Hero ==================== -->

<!-- ================ How It Works ================ -->
<div class="how-it-works" id="how-it-works">

<div class="section-header">
  <h2>How it Works</h2>
  <p>Three steps to tamper-proof compliance for your AI agents.</p>
</div>

<div class="steps">

<div class="step">
  <div class="step-number">1</div>
  <div class="step-content">
    <h3>Install</h3>
    <p>Add the SDK to your project with a single command.</p>
    <div class="language-bash" data-ext="sh"><pre class="language-bash"><code><span class="line"><span style="color: var(--vp-c-brand);">$</span> npm install @aivoralabs/agenttrail</span></code></pre></div>
  </div>
</div>

<div class="step">
  <div class="step-number">2</div>
  <div class="step-content">
    <h3>Wrap</h3>
    <p>Wrap your language model with the audit receipt middleware.</p>
    <div class="language-typescript" data-ext="ts"><pre class="language-typescript"><code><span class="line"><span style="color: #4E8EE8;">import</span><span style="color: #7CA0CC;"> { auditReceiptMiddleware } from </span><span style="color: #C59840;">'@aivoralabs/agenttrail'</span></span>
<br>
<span class="line"><span style="color: #7CA0CC;">const model = wrapLanguageModel({</span></span>
<span class="line"><span style="color: #7CA0CC;">  model: yourModel,</span></span>
<span class="line"><span style="color: #7CA0CC;">  middleware: auditReceiptMiddleware({ agentId: </span><span style="color: #C59840;">'my-agent'</span><span style="color: #7CA0CC;"> })</span></span>
<span class="line"><span style="color: #7CA0CC;">})</span></span></code></pre></div>
  </div>
</div>

<div class="step">
  <div class="step-number">3</div>
  <div class="step-content">
    <h3>Deploy</h3>
    <p>Every interaction generates a tamper-proof receipt automatically.</p>
    <div class="language-bash" data-ext="sh"><pre class="language-bash"><code><span class="line"><span style="color: #576785;"># Each receipt includes:</span></span>
<span class="line"><span style="color: #7CA0CC;">✓ Timestamp &amp; agent ID</span></span>
<span class="line"><span style="color: #7CA0CC;">✓ Input / output hash</span></span>
<span class="line"><span style="color: #7CA0CC;">✓ Previous receipt hash</span></span>
<span class="line"><span style="color: #7CA0CC;">✓ Ed25519 signature</span></span></code></pre></div>
  </div>
</div>

</div>
</div>
<!-- ============ End How It Works ================ -->

<!-- ================== Pricing =================== -->
<div class="pricing" id="pricing">

<div class="section-header">
  <h2>Simple pricing. No hidden fees.</h2>
  <p>Choose the plan that fits your scale. All plans include hash chaining and digital signatures.</p>
</div>

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Starter</h3>
  <div class="price">$99<span class="price-sub"> /mo per agent</span></div>
  <ul>
    <li>SDK with full receipt generation</li>
    <li>SHA-256 hash chaining</li>
    <li>Ed25519 digital signatures</li>
    <li>JSON export</li>
    <li>Community support</li>
  </ul>
  <a href="https://github.com/AiVoraLabs/agenttrail" class="btn btn-primary" target="_blank" rel="noopener noreferrer">Get Started Free</a>
</div>

<div class="pricing-card recommended">
  <div class="recommended-badge">Recommended</div>
  <h3>Team</h3>
  <div class="price">$1k<span class="price-sub"> /mo · up to 3 agents</span></div>
  <ul>
    <li>Everything in Starter</li>
    <li>Priority support</li>
    <li>Multi-agent management</li>
    <li>Team dashboard</li>
  </ul>
  <a href="#" class="btn btn-primary" onclick="return false;">Contact Sales</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Custom</div>
  <ul>
    <li>Everything in Team</li>
    <li>On-premise deployment</li>
    <li>SSO / SAML</li>
    <li>Custom integrations</li>
    <li>Dedicated support</li>
  </ul>
  <a href="#" class="btn btn-primary" onclick="return false;">Contact Sales</a>
</div>

</div>
</div>
<!-- ============== End Pricing ================== -->

<!-- ============== Open Source CTA =============== -->
<div class="cta-section" id="open-source">

<a href="https://github.com/AiVoraLabs/agenttrail" class="github-badge" target="_blank" rel="noopener noreferrer">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
  AgentTrail
  <span class="star-count">★ Open Source</span>
</a>

<h2>Open Source</h2>
<p>AgentTrail is open-core. The SDK is free and open source under the MIT license. Contributions welcome.</p>

<div class="actions">
  <a href="https://github.com/AiVoraLabs/agenttrail" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z"/></svg>
    Star on GitHub
  </a>
</div>

</div>
<!-- ============== End Open Source CTA =========== -->

<!-- ================== Footer ==================== -->
<div class="footer">
  <p>MIT &copy; AivoraLabs</p>
</div>

</div>
