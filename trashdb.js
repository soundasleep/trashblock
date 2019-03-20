// we share this script with background.js and also on all trashified pages
// (the alternative is to use message passing between content.js <--> background.js
// which feels like it might be super slow and async)

var debug = true;
var verbose = false;

function learnAsTrash(text, callback) {
  if (debug) {
    console.log("learnAsTrash", text);
  }

  return applyLearning(text, true, callback);
}

function learnAsNotTrash(text, callback) {
  if (debug) {
    console.log("learnAsNotTrash", text);
  }

  return applyLearning(text, false, callback);
}

function calculateTrashForSingleWord(database, word) {
  // based on wikipedia article
  // assume chance of spam is 50%, we can use the simpler formula

  // Pr(S|W) = Pr(W|S) / (Pr(W|S) + Pr(W|H))
  // ... i.e. we can just use the ratio of spam-to-total

  if (typeof database[word] === 'undefined') {
    return undefined; // we have no idea
  } else {
    return database[word]['s'] / database[word]['c'];
  }
}

// calculate the trash rating and callback with the probability (0..1)
// can return NaN if we have no idea
function calculateTrashScore(text, callback) {
  chrome.storage.sync.get(['words'], (result) => {
    var words = selectFilterableWords(text);
    var trashScore = 0;

    // // Using ln(1/p - 1) = sum(ln(1-pX) - ln(pX))
    var lnProbabilitySum = 0;

    // // Using p = (p1p2..pN) / (p1p2..pN) + (1-p1)(1-p2)..(1-pN)
    // var productP = 1;
    // var productInvP = 1;

    Array.prototype.forEach.call(words, (word) => {
      var probI = calculateTrashForSingleWord(result['words'], word);

      // if (typeof probI !== 'undefined') {
      //   productP *= probI;
      //   productInvP *= (1 - probI);
      // }

      if (typeof probI !== 'undefined') {
        lnProbabilitySum += Math.log(1 - probI) - Math.log(probI);
      }
    });

    var trashScore = 1 / (1 + Math.pow(Math.E, lnProbabilitySum));
    // var trashScore2 = productP / (productP + productInvP);

    if (debug) {
      console.log("ts1 = ", trashScore);
      // console.log("ts2 = ", trashScore2);
    }

    return callback(trashScore);
  });
}

function applyLearning(text, is_spam, callback) {
  chrome.storage.sync.get(['documents', 'words'], (result) => {
    var words = selectFilterableWords(text);

    if (typeof result['words'] === 'undefined') {
      result['words'] = {};
    }

    Array.prototype.forEach.call(words, (word) => {
      if (word.trim() == "") {
        return;
      }

      if (typeof result['words'][word] === 'undefined') {
        result['words'][word] = {
          'c': 0,  // count
          's': 0,  // spam count
        };
      };

      result['words'][word]['c'] += 1;
      if (is_spam) {
        result['words'][word]['s'] += 1;
      }
    });

    if (typeof result['documents'] === 'undefined') {
      result['documents'] = {
        'count': 0,
        'spam': 0,
      };
    }

    result['documents']['count'] += 1;
    if (is_spam) {
      result['documents']['spam'] += 1;
    }

    chrome.storage.sync.set(result, () => {
      if (debug) {
        console.log("Learning database updated");
        if (verbose) {
          console.log(result);
        }
      }

      callback();
    });
  });
}

function resetDatabase(callback = () => {}) {
  chrome.storage.sync.clear(() => {
    const defaultConfig = {
      'color': '#123456',
      'reset_at': `${new Date()}`,
    };

    chrome.storage.sync.set(defaultConfig, () => {
      console.log("Default config loaded.");
    });

    chrome.storage.sync.get(['color'], (result) => {
      console.log("Loaded as", result['color']);
    });

    chrome.storage.sync.get(['documents'], (result) => {
      console.log("Documents are", result['documents']);
    });

    chrome.storage.sync.get(['words'], (result) => {
      console.log("Words are", result['words']);
    });

    learnAsTrash("hello world this is a test content", () => {
      learnAsNotTrash("this definitely isnt trash though", () => {
        console.log("learning complete");

        callback();
      });
    });
  });
}

function selectFilterableWords(string) {
  return ` ${string} `.replace(/ [^ ]{1} /ig, " ")
      .replace(/ [^ ]{2} /ig, " ")
      .replace(/ [0-9]+ /ig, " ")
      .replace(/ (and|the) /ig, " ")
      .split(/\s+/i);
}
