const { readdirSync, statSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

walkNonAbsoluteLinks('./doc', link => {
  link = link.replace('.html', '.md');
  return `https://github.com/Vincit/objection.js/tree/v1/doc${link}`;
});

function walkNonAbsoluteLinks(dir, callback) {
  walkLinks(dir, link => {
    if (link.startsWith('/')) {
      return callback(link);
    } else {
      return link;
    }
  });
}

function walkLinks(dir, callback) {
  walkFiles(dir, filePath => {
    const fileData = readFileSync(filePath).toString();

    const replacedData = fileData.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (_, text, link) => {
      return `[${text}](${callback(link)})`;
    });

    writeFileSync(filePath, replacedData);
  });
}

function walkFiles(dir, callback) {
  for (const file of readdirSync(dir)) {
    const filePath = path.join(dir, file);

    if (statSync(filePath).isDirectory()) {
      walkFiles(filePath, callback);
    } else if (file.endsWith('.md')) {
      callback(filePath);
    }
  }
}
