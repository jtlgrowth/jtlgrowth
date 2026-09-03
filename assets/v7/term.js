/* JTL Terminal engine: canned Q&A + site navigation. ES5, no deps. */
(function () {
  'use strict';
  var PAGES = {
    'services': '/services/', 'service': '/services/',
    'products': '/products/', 'product': '/products/', 'store': '/products/',
    'skills': '/skills/', 'skill': '/skills/',
    'workshop': '/workshop/',
    'work': '/work/', 'portfolio': '/work/', 'case studies': '/work/',
    'ai employee': '/ai-employee/', 'ai-employee': '/ai-employee/', 'employee': '/ai-employee/', 'seven stages': '/ai-employee/',
    'setup': '/setup/', 'claude code': '/setup/',
    'apps': '/apps/',
    'group': '/group/', 'the group': '/group/',
    'growth': '/growth/', 'growth software': '/growth/', 'demo': '/growth/',
    'inbox scout': '/inbox-scout/', 'inbox': '/inbox-scout/',
    'jamz': '/jamz-jamorol/'
  };
  var HOME_WORDS = { 'home': 1, 'start': 1, 'top': 1 };
  var CONTACT_WORDS = { 'book': 1, 'book a call': 1, 'call': 1, 'contact': 1, 'gwen': 1 };
  var INTENTS = [
    { name: 'greet', kws: ['hi', 'hello', 'hey', 'kumusta', 'kamusta', 'yo'],
      a: 'Hi. Venice here. Ask what we build, what it costs, or type go to services.' },
    { name: 'build', kws: ['what do you do', 'what do you build', 'what is jtl', 'about jtl', 'who are you'],
      a: 'We design and install AI systems that run the repetitive half of a business, so a two-person firm ships like a ten-person one. Four layers: funnels and websites, automation systems, AI employees, ops portals.' },
    { name: 'services', kws: ['services', 'what you offer', 'offer', 'tiers', 'ladder'],
      a: 'Four tiers, installed in the order that makes each one pay for the next: Funnels and Websites, Automation Systems, AI Employees, Ops Portals. Each tier only works because the one under it does. Type go to services for the page.' },
    { name: 'price', kws: ['price', 'pricing', 'cost', 'how much', 'rate', 'budget', 'fee'],
      a: 'Quote-based, it depends on what is already wired. Thirty minutes with Gwen, no pitch. If your bottleneck turns out not to need AI, we will tell you that on the call. Type book to slide to the booking panel.' },
    { name: 'aiemployee', kws: ['ai employee', 'ai employees', 'agent', 'agents', 'chatbot', 'bot', 'assistant', 'venice'],
      a: 'A chat window is not an employee. An employee has a job, a process and receipts. Ours runs the intake and the reporting, the humans handle the calls. The seven-stage build is free, type go to ai employee.' },
    { name: 'automation', kws: ['automation', 'automations', 'automate', 'n8n', 'ghl', 'gohighlevel', 'highlevel', 'crm', 'zapier', 'workflow'],
      a: 'Your tools, wired together. A lead triggers the sequence, the calendar and the CRM without a human copying data. Built on n8n, GoHighLevel, Supabase and FastAPI.' },
    { name: 'funnel', kws: ['funnel', 'funnels', 'website', 'websites', 'landing page', 'site', 'web'],
      a: 'Landing pages and full sites, hand-coded, no builder lock-in. Copy written against the offer, not around it. Analytics and conversion events wired at build time, behind consent.' },
    { name: 'portal', kws: ['portal', 'portals', 'dashboard', 'ops'],
      a: 'One dashboard for people, work in flight and revenue. Agent seats report into the same board your team reads. Client-facing portals where that is the product.' },
    { name: 'workshop', kws: ['workshop', 'training', 'batch', 'bgc'],
      a: 'Founder AI Workshop, Batch 1: From Operator to Orchestrator. Two build days in BGC, every founder shipped an AI employee for their own business. Type go to workshop for the recap.' },
    { name: 'products', kws: ['products', 'product', 'software', 'app', 'apps', 'download', 'install'],
      a: 'What you can get or install today lives at /products/: the Growth software demo, Inbox Scout, the Claude Code setup. Type go to products.' },
    { name: 'skills', kws: ['skills', 'skill', 'access code'],
      a: 'The JTL skills ship with an access code. Type go to skills.' },
    { name: 'speed', kws: ['how fast', 'how long', 'timeline', 'turnaround', 'when', 'days', 'weeks'],
      a: 'A working draft takes hours, not weeks. Integration and the watch after launch are where the time goes. That is where builds quietly die, so we do not skip it.' },
    { name: 'stack', kws: ['stack', 'tools', 'tech', 'built on', 'claude', 'gpt', 'supabase', 'fastapi', 'playwright'],
      a: 'Built by hand on Claude, GPT-5, n8n, GoHighLevel, Supabase, FastAPI and Playwright. No template, no page builder, no drag-and-drop.' },
    { name: 'where', kws: ['where', 'location', 'based', 'philippines', 'manila', 'caloocan', 'timezone'],
      a: 'Caloocan, Metro Manila. Serving PH, US and EU, so we work while your side of the world sleeps.' },
    { name: 'who', kws: ['who', 'founder', 'founders', 'jamz', 'gwen', 'team'],
      a: 'Jamz Jamorol, founder, builds the systems he sells. Gwen Ayala, co-founder, OBM and strategy, owns the conversation: the call you book is hers.' },
    { name: 'thanks', kws: ['thanks', 'thank you', 'salamat', 'cheers'],
      a: 'Anytime. Type book when you are ready.' },
    { name: 'help', kws: ['help', 'commands', 'what can i type'],
      a: 'Try: services, price, ai employee, automation, workshop, products, where, who. Or navigate: go to services, go to products, go to skills, go to workshop, book.' },
    { name: 'clear', kws: ['clear', 'cls', 'reset'], a: null }
  ];
  var GREETING = 'Venice here, the AI employee that runs this firm’s repetitive half. Ask what we build, what it costs, or type go to services.';
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function reduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function wordHit(input, kw) {
    return new RegExp('\\b' + escRe(kw) + '\\b', 'i').test(input);
  }
  function normalize(raw) {
    var s = raw.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
    s = s.replace(/[.!?,;:]+$/, '');
    return s;
  }
  function TermUI(root) {
    this.root = root;
    this.log = root.querySelector('[data-log]');
    this.form = root.querySelector('[data-form]');
    this.input = root.querySelector('[data-input]');
    this.chips = root.querySelectorAll('[data-chip], [data-click]');
    this.busy = false;
    this.q = [];
    this.lastText = '';
    this.greeted = false;
    this.bind();
    this.watchGreeting();
  }
  TermUI.prototype.trim14 = function () {
    while (this.log.children.length > 14) this.log.removeChild(this.log.firstChild);
  };
  TermUI.prototype.scrollBottom = function () {
    this.log.scrollTop = this.log.scrollHeight;
  };
  TermUI.prototype.appendYou = function (text) {
    var d = document.createElement('div');
    d.className = 'kb-line kb-line-you';
    d.innerHTML = '<span class="kb-who">you</span><span class="kb-txt">' + escHtml(text) + '</span>';
    this.log.appendChild(d);
    this.trim14();
    this.scrollBottom();
  };
  TermUI.prototype.appendSys = function (text) {
    var d = document.createElement('div');
    d.className = 'kb-line kb-line-sys';
    d.innerHTML = '<span class="kb-txt">' + text + '</span>';
    this.log.appendChild(d);
    this.trim14();
    this.scrollBottom();
  };
  TermUI.prototype.typeAnswer = function (text, done) {
    var d = document.createElement('div');
    d.className = 'kb-line kb-line-ai';
    d.innerHTML = '<span class="kb-who">venice</span><span class="kb-txt"></span>';
    this.log.appendChild(d);
    this.trim14();
    this.scrollBottom();
    var txt = d.querySelector('.kb-txt');
    window.JTLTerm.last = text;
    if (reduced()) {
      txt.textContent = text;
      if (done) done();
      return;
    }
    var caret = document.createElement('span');
    caret.className = 'kb-caret';
    txt.appendChild(caret);
    var i = 0, self = this;
    function step() {
      if (i >= text.length) {
        if (caret.parentNode) caret.parentNode.removeChild(caret);
        self.scrollBottom();
        if (done) done();
        return;
      }
      var ch = text.charAt(i);
      txt.insertBefore(document.createTextNode(ch), caret);
      i++;
      self.scrollBottom();
      var delay = 16 + Math.floor(Math.random() * 15);
      if (ch === '.' || ch === ',') delay = 110;
      setTimeout(step, delay);
    }
    step();
  };
  TermUI.prototype.bind = function () {
    var self = this;
    this.root.addEventListener('click', function () { self.input && self.input.focus(); });
    var laptop = this.root.closest ? this.root.closest('[data-laptop]') : null;
    if (laptop) laptop.addEventListener('click', function () { self.input && self.input.focus(); });
    if (this.input) {
      this.input.addEventListener('keydown', function (e) {
        window.dispatchEvent(new CustomEvent('jtl-keydown', { detail: { code: e.code, key: e.key, repeat: e.repeat } }));
        e.stopPropagation();
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          self.input.value = self.lastText;
        }
      });
      this.input.addEventListener('keyup', function (e) {
        window.dispatchEvent(new CustomEvent('jtl-keyup', { detail: { code: e.code, key: e.key, repeat: e.repeat } }));
        e.stopPropagation();
      });
    }
    if (this.form) {
      this.form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = normalize(self.input ? self.input.value : '');
        if (!text) return;
        self.lastText = text;
        window.dispatchEvent(new CustomEvent('jtl-submit', { detail: { text: text } }));
        if (self.input) self.input.value = '';
        self.enqueue(text);
      });
    }
    for (var i = 0; i < this.chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          var cmd = chip.getAttribute('data-cmd');
          if (cmd) self.enqueue(cmd);
        });
      })(this.chips[i]);
    }
  };
  TermUI.prototype.watchGreeting = function () {
    var self = this;
    var laptop = this.root.closest ? this.root.closest('[data-laptop]') : null;
    var target = laptop || this.root;
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && entries[i].intersectionRatio >= 0.4 && !self.greeted) {
          self.greeted = true;
          self.enqueue('__greet__');
          io.disconnect();
        }
      }
    }, { threshold: [0, 0.4, 1] });
    io.observe(target);
  };
  TermUI.prototype.enqueue = function (text) {
    this.q.push(text);
    this.pump();
  };
  TermUI.prototype.pump = function () {
    if (this.busy || !this.q.length) return;
    this.busy = true;
    var text = this.q.shift();
    var self = this;
    if (text === '__greet__') {
      this.typeAnswer(GREETING, function () { self.busy = false; self.pump(); });
      return;
    }
    this.appendYou(text);
    this.process(text, function () { self.busy = false; self.pump(); });
  };
  function resolveNav(target) {
    var t = normalize(target).toLowerCase();
    if (PAGES[t]) return { type: 'path', path: PAGES[t] };
    if (HOME_WORDS[t]) return { type: 'home' };
    if (CONTACT_WORDS[t]) return { type: 'contact' };
    return null;
  }
  TermUI.prototype.process = function (raw, cb) {
    var norm = normalize(raw);
    var lower = norm.toLowerCase();
    var self = this;
    var navMatch = lower.match(/^(go to|goto|open|show|visit|take me to)\s+(.+)$/);
    if (navMatch) {
      var target = resolveNav(navMatch[2]);
      if (target) { this.doNav(target, cb); return; }
    }
    var bare = resolveNav(lower);
    var best = null, bestLen = 0;
    for (var i = 0; i < INTENTS.length; i++) {
      var intent = INTENTS[i];
      for (var j = 0; j < intent.kws.length; j++) {
        var kw = intent.kws[j];
        if (wordHit(lower, kw) && kw.length > bestLen) {
          bestLen = kw.length;
          best = intent;
        }
      }
    }
    // a bare page name navigates only when no intent claims the word: "services" explains, "go to services" opens
    if (bare && !best) { this.doNav(bare, cb); return; }
    if (!best && lower.indexOf('?') !== -1) best = INTENTS[16];
    if (best) {
      if (best.name === 'clear') {
        this.log.innerHTML = '';
        cb();
        return;
      }
      this.typeAnswer(best.a, cb);
      return;
    }
    this.typeAnswer('I only know the firm. Try help, or type go to services.', cb);
  };
  TermUI.prototype.doNav = function (target, cb) {
    if (target.type === 'path') {
      this.appendSys('Opening ' + target.path + ' …');
      var go = function () { window.JTLTerm.navigate(target.path); };
      if (reduced()) { go(); cb(); } else setTimeout(function () { go(); cb(); }, 700);
      return;
    }
    if (target.type === 'contact') {
      this.appendSys('Sliding to the booking panel …');
      if (window.__goTo) window.__goTo(4); else location.hash = '#p5';
    } else if (window.__goTo) { window.__goTo(0); } else { location.href = '/'; }
    cb();
  };
  function init(root) {
    if (!root || root.__jtlTermInit) return;
    if (root.closest && root.closest('[data-static]')) return;
    root.__jtlTermInit = true;
    root.__jtlTermUI = new TermUI(root);
  }
  function initAll() {
    var nodes = document.querySelectorAll('[data-term]');
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }
  window.JTLTerm = {
    init: init,
    run: function (text) {
      var nodes = document.querySelectorAll('[data-term]');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].closest && nodes[i].closest('[data-static]')) continue;
        if (nodes[i].__jtlTermInit && nodes[i].__jtlTermUI) {
          nodes[i].__jtlTermUI.enqueue(text);
          return;
        }
      }
    },
    navigate: function (path) { location.href = path; },
    intents: INTENTS,
    answers: (function () {
      var t = {};
      for (var i = 0; i < INTENTS.length; i++) t[INTENTS[i].name] = INTENTS[i].a;
      return t;
    })(),
    last: ''
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
