(function(){
  var MARK = '<div class="kb-deck-mark" aria-hidden="true"><svg viewBox="288 703 1315 626"><g fill="none" stroke="currentColor" stroke-width="141.5" stroke-linecap="butt"><path d="M624 774H1267"/><path d="M846 706V1122A134.5 134.5 0 0 1 711.5 1256.5H494A134.5 134.5 0 0 1 359.5 1122"/><path d="M1195 706V1122A134.5 134.5 0 0 0 1329.5 1256.5H1602"/></g></svg></div>';

  var ROWS = [
    [['Escape',1,'esc'],['Digit1',1,'1'],['Digit2',1,'2'],['Digit3',1,'3'],['Digit4',1,'4'],['Digit5',1,'5'],['Digit6',1,'6'],['Digit7',1,'7'],['Digit8',1,'8'],['Digit9',1,'9'],['Digit0',1,'0'],['Minus',1,'-'],['Equal',1,'='],['Backspace',2,'⌫']],
    [['Tab',1.5,'⇥'],['KeyQ',1,'q'],['KeyW',1,'w'],['KeyE',1,'e'],['KeyR',1,'r'],['KeyT',1,'t'],['KeyY',1,'y'],['KeyU',1,'u'],['KeyI',1,'i'],['KeyO',1,'o'],['KeyP',1,'p'],['BracketLeft',1,'['],['BracketRight',1,']'],['Backslash',1.5,'\\']],
    [['CapsLock',1.75,'⇪'],['KeyA',1,'a'],['KeyS',1,'s'],['KeyD',1,'d'],['KeyF',1,'f'],['KeyG',1,'g'],['KeyH',1,'h'],['KeyJ',1,'j'],['KeyK',1,'k'],['KeyL',1,'l'],['Semicolon',1,';'],['Quote',1,"'"],['Enter',2.25,'⏎']],
    [['ShiftLeft',2.25,'⇧'],['KeyZ',1,'z'],['KeyX',1,'x'],['KeyC',1,'c'],['KeyV',1,'v'],['KeyB',1,'b'],['KeyN',1,'n'],['KeyM',1,'m'],['Comma',1,','],['Period',1,'.'],['Slash',1,'/'],['ShiftRight',2.75,'⇧']],
    [['ControlLeft',1.25,'⌃'],['AltLeft',1.25,'⌥'],['MetaLeft',1.25,'⌘'],['Space',7.5,''],['MetaRight',1.25,'⌘'],['AltRight',1.25,'⌥'],['ControlRight',1.25,'⌃']]
  ];

  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function rowHtml(row){
    var out = '<div class="kb-row">';
    for (var i = 0; i < row.length; i++){
      var k = row[i];
      out += '<span class="kb-key" data-code="' + k[0] + '" style="--w:' + k[1] + '">' + esc(k[2]) + '</span>';
    }
    out += '</div>';
    return out;
  }

  function render(deck){
    if (!deck) return;
    var html = MARK;
    for (var r = 0; r < ROWS.length; r++) html += rowHtml(ROWS[r]);
    deck.innerHTML = html;
  }

  function renderAll(){
    var decks = document.querySelectorAll('[data-deck]');
    for (var i = 0; i < decks.length; i++){
      if (!decks[i].firstChild) render(decks[i]);
    }
  }

  var timers = {};

  function eachTarget(code, fn){
    var nodes = document.querySelectorAll('[data-deck] [data-code="' + code + '"]');
    for (var i = 0; i < nodes.length; i++){
      var deck = nodes[i].closest ? nodes[i].closest('[data-deck]') : null;
      if (deck && deck.hasAttribute('data-static')) continue;
      fn(nodes[i]);
    }
  }

  /* float mode: a [data-deck][data-float] board (jtlboard-sized mini keyboard inside the screen)
     is hidden until the first key, stays while typing, and goes 1400 ms after the last key */
  var floatTimer = null;
  function showFloat(){
    var decks = document.querySelectorAll('[data-deck][data-float]');
    for (var i = 0; i < decks.length; i++){
      if (decks[i].hasAttribute('data-static') || (decks[i].closest && decks[i].closest('[data-static]'))) continue;
      decks[i].classList.add('show');
    }
    if (floatTimer) clearTimeout(floatTimer);
    floatTimer = setTimeout(function(){
      var d = document.querySelectorAll('[data-deck][data-float].show');
      for (var j = 0; j < d.length; j++) d[j].classList.remove('show');
      floatTimer = null;
    }, 1400);
  }

  function press(code){
    if (!code) return;
    showFloat();
    eachTarget(code, function(node){ node.classList.add('on'); });
    if (timers[code]) clearTimeout(timers[code]);
    timers[code] = setTimeout(function(){ release(code); }, 900);
  }

  function release(code){
    if (!code) return;
    eachTarget(code, function(node){ node.classList.remove('on'); });
    if (timers[code]){ clearTimeout(timers[code]); timers[code] = null; }
  }

  window.addEventListener('jtl-keydown', function(e){
    if (e && e.detail) press(e.detail.code);
  });
  window.addEventListener('jtl-keyup', function(e){
    if (e && e.detail) release(e.detail.code);
  });

  var lastDocCode = null;
  function inTerm(){
    var el = document.activeElement;
    while (el){
      if (el.hasAttribute && el.hasAttribute('data-term')) return true;
      el = el.parentNode;
    }
    return false;
  }
  document.addEventListener('keydown', function(e){
    if (!inTerm()) return;
    if (lastDocCode === e.code) return;
    lastDocCode = e.code;
    press(e.code);
  });
  document.addEventListener('keyup', function(e){
    if (!inTerm()) return;
    lastDocCode = null;
    release(e.code);
  });
  window.addEventListener('blur', function(){
    for (var code in timers){ if (timers[code]) release(code); }
  });

  window.JTLKeys = { render: render, press: press, release: release };

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
})();
