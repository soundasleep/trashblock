var debug = true;
var verbose = false;

if (debug && verbose) {
  console.log("content.js");
  console.log("document = ", document);
  console.log("window = ", window);
}

var statistics = {
  'checked': 0,
  'blocked': 0,
};

// capture scrolling, infinite pages etc
var identifyTrashQueued = false;

// for capturing incorrectly-labelled trash
var contextMenuElement = null;

function queueTrashCheck(timeout) {
  // we queue up scroll events so that scrolling performance isn't awful
  if (!identifyTrashQueued) {
    identifyTrashQueued = window.setTimeout(identifyTrash, 200 /* ms */);
  }
}

window.addEventListener('DOMContentLoaded', (event) => {
  var body = document.querySelector("body");

  if (debug) {
    if (verbose) {
      console.log("body = ", body);
    }

    if (typeof body !== 'undefined') {
      body.insertAdjacentHTML('beforeend', '<div id="trashblock-status">TrashBlock status</div>');
    }
  }

  document.addEventListener('scroll', queueTrashCheck);
  document.addEventListener('click', queueTrashCheck);

  document.addEventListener('contextmenu', (event) => {
    contextMenuElement = event.target;
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request == 'TrashBlock_ReportTrash') {
      var parentTrashNode = getClosest(contextMenuElement, "[data-trashblock-checked]");

      if (debug) {
        console.log("Enabling trash reporting on closest trashable element:", parentTrashNode);
      }

      if (!parentTrashNode) {
        alert("Sorry, I don't recognise that type of content to block yet. :(")
      } else {
        // show the parent node as trash temporarily
        parentTrashNode.dataset['trashblockTrash'] = true;
      }
    }
  });

  identifyTrash();
});

// TODO set up a timeout or event handler to capture infinite scroll,
// post-load content etc

// TODO these could be sorted in order
var selectors = [
  { 'type': 'twitter', 'parent': 'div[data-tweet-id]', 'text': extractTweetText }
];

function identifyTrash() {
  if (debug && verbose) {
    console.log("Identifying trash...", { 'location': document.location.host, 'pathname': document.location.pathname, 'hash': document.location.hash });
  }

  identifyTrashQueued = false;

  Array.prototype.forEach.call(selectors, (selector) => {
    var elements = document.querySelectorAll(selector['parent']);

    Array.prototype.forEach.call(elements, (element, index) => {
      if (typeof element.dataset['trashblockChecked'] === 'undefined') {
        statistics['checked'] += 1;

        element.dataset['trashblockChecked'] = selector['type'];
        var text = selector['text'](element);

        if (debug) {
          element.dataset['trashblockText'] = text;
          console.log("Trash checking", element, ' --> ', text);
        }

        var trashScore = calculateTrashScore(text);

        // store score on the element, and change style based on score
        // to allow toggle on/off without reloading the page
        element.dataset['trashblockScore'] = trashScore.toFixed(2);

        if (trashScore > 0.5) {
          element.dataset['trashblockTrash'] = true;
        }

        var height = element.clientHeight;
        var width = element.clientWidth;

        element.insertAdjacentHTML('afterbegin', `
          <div class="trashblock-panel-actions" style="width: ${width}px; height: ${height}px; top: 0; left: 0;">
            <ul class="actions">
              <li class="score">
                Score: ${trashScore.toFixed(2)}
              </li>
              <li class="mark-trash">
                <button>Trash</button>
              </li>
              <li class="mark-not-trash">
                <button>Not trash</button>
              </li>
            </ul>
          </div>`);

        element.querySelector(".trashblock-panel-actions li.mark-trash button").addEventListener('click', (event) => {
          markAsTrash(element, text);
        });

        element.querySelector(".trashblock-panel-actions li.mark-not-trash button").addEventListener('click', (event) => {
          markAsNotTrash(element, text);
        });
      }
    });
  });

  document.querySelector("#trashblock-status").innerHTML = `${statistics['blocked']} / ${statistics['checked']} blocked`;
}

function markAsTrash(element, text) {
  if (debug) {
    console.log("Marking element as trash");
    console.log(" --> ", text);
  }

  // TODO apply learning to bayes filter

  element.dataset['trashblockTrash'] = true;
}

function markAsNotTrash(element, text) {
  if (debug) {
    console.log("Marking element as not trash");
    console.log(" --> ", text);
  }

  // TODO apply learning to bayes filter

  // remove trash status temporarily, it may still be replaced on reload
  delete element.dataset['trashblockTrash'];
}

function getClosest(element, selector) {
  for (; element && element !== document; element = element.parentNode) {
    if (element.matches(selector)) {
      return element;
    }
  }

  return null;
}

// Converts something like '   @a  b:c  d' into 'a b-c d'
function strip(s) {
  if (typeof s === 'undefined') {
    return '';
  }

  return s.replace(/['\u2018\u2019\u201a\u201b\u201c\u201d\u201e\u201f"]/ig, '').replace(/\W+/ig, ' ').toLowerCase();
}

// Converts something like '@a b c' into 'a-b-c'
function oneword(s, ignore = /[@]/ig) {
  return strip(s.replace(ignore, '')).replace(/\s+/ig, '_');
}

function prefixContent(prefix, element_or_null) {
  if (typeof element_or_null === 'undefined' || !element_or_null || typeof element_or_null.textContent === 'undefined') {
    return '';
  } else {
    return prefix + oneword(element_or_null.textContent);
  }
}

function textContent(element_or_null) {
  if (typeof element_or_null === 'undefined' || !element_or_null) {
    return '';
  } else {
    return strip(element_or_null.textContent);
  }
}

function siteText() {
  return [
    'protocol:' + oneword(document.location.protocol, /[:]/),
    'host:' + oneword(document.location.host),
    'pathname:' + oneword(document.location.pathname),
    'hash:' + oneword(document.location.hash),
  ].join(" ");
}

function extractTweetText(element) {
  return [
    siteText(),
    'type:twitter',

    prefixContent('name:', element.querySelector(".content .fullname")),
    prefixContent('twitter:', element.querySelector(".content .username")),

    debug ? '[content]' : '',

    textContent(element.querySelector(".js-tweet-text-container")),

    debug ? '[quote]' : '',

    textContent(element.querySelector(".QuoteTweet")),
  ].join(" ");
}

function calculateTrashScore(text) {
  // for now, random
  return Math.random();
}
