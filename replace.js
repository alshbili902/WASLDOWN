const fs = require('fs');
const path = require('path');

function replaceInFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      replaceInFiles(p);
    } else if (p.endsWith('.js')) {
      let c = fs.readFileSync(p, 'utf8');
      let init = c;
      c = c.replace(/from\('users'\)/g, "from('profiles')");
      if (c !== init) {
        fs.writeFileSync(p, c);
        console.log('Updated ' + p);
      }
    }
  });
}

replaceInFiles('./src');
