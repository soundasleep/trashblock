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
      console.log("context menu element", contextMenuElement);
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
      }
    });
  });

  document.querySelector("#trashblock-status").innerHTML = `${statistics['blocked']} / ${statistics['checked']} blocked`;
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
