const fs = require('fs');
const content = fs.readFileSync('c:/xampp/htdocs/PMS/app/page.tsx', 'utf8');
const lines = content.split('\n');
let stack = [];
lines.forEach((line, i) => {
    let match;
    const divRegex = /<div|<\/div/g;
    while ((match = divRegex.exec(line)) !== null) {
        if (match[0] === '<div') {
            stack.push(i + 1);
        } else {
            if (stack.length === 0) {
                console.log(`Extra </div> at line ${i + 1}`);
            } else {
                stack.pop();
            }
        }
    }
});
console.log('Unclosed divs (line numbers):', stack);
