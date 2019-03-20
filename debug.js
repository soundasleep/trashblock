var debug = true;
var verbose = false;

window.addEventListener('DOMContentLoaded', (event) => {
  chrome.storage.local.get(['documents', 'words', 'color', 'reset_at'], (result) => {
    if (debug) {
      console.log("words are", result['words']);
    }

    document.querySelector('.documents').innerHTML = hashToTable(result['documents']);

    document.querySelector('.words').innerHTML = hashToTable(result['words'], ["Word", "Content", "Ratio"]);

    document.querySelector('.color').innerHTML = result['color'];
    document.querySelector('.reset_at').innerHTML = result['reset_at'];

    document.querySelector('button.reset').addEventListener('click', () => {
      alert("Database reset");
      resetDatabase(() => {
        location.reload();
      });
    });

    var samples = document.querySelectorAll(".sample-content");
    Array.prototype.forEach.call(samples, (element) => {
      calculateTrashScore(element.textContent, (score) => {
        element.innerHTML += ` (score: ${score.toFixed(8)})`;
      });
    });
  });
});

function hashToTable(hash, headings = []) {
  var result = [];

  var headingsAsString = [];
  Array.prototype.forEach.call(headings, (value) => {
    headingsAsString.push(`<th>${value}</th>`);
  });

  result.push(`<thead><tr>${headingsAsString.join("")}</tr></thead>`);

  Object.keys(hash).forEach((key) => {
    var value = hash[key];

    if (typeof value == 'object') {
      if (typeof value['c'] !== 'undefined' && typeof value['s'] !== 'undefined') {
        value = trashinessValue(value);
      } else {
        value = hashToLine(value);
      }
    }

    result.push(`<tr>
        <th>${key}</th>
        <td>${value}</td>
      </tr>`);
  });

  return `<table>${result.join("")}</table>`;
}

function hashToLine(hash) {
  var result = [];

  Object.keys(hash).forEach((key) => {
    var value = hash[key];

    if (typeof value == 'object') {
      value = "(" + hashToLine(value) + ")";
    }

    result.push(`<b>${key}:</b> ${value} `);
  });

  return `<table>${result.join("")}</table>`;
}

function trashinessValue(hash) {
  return `
    spam: ${hash['s']} / ${hash['c']}</td>
    <td>${(hash['s'] / hash['c']).toFixed(2)}
  `;
}
