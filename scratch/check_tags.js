import fs from 'fs';

const content = fs.readFileSync('c:/xampp/htdocs/PMS/app/projects/[id]/page.tsx', 'utf8');
const lines = content.split('\n');

let openDivs = 0;

lines.forEach((line, i) => {
    const row = i + 1;
    const divs = (line.match(/<div/g) || []).length;
    const closeDivs = (line.match(/<\/div/g) || []).length;

    const prev = openDivs;
    openDivs += divs - closeDivs;

    if (divs > 0 || closeDivs > 0) {
        // console.log(`Line ${row}: ${prev} -> ${openDivs}`);
    }
    
    if (row > 600 && row < 1200) {
        console.log(`Line ${row} (Divs: ${openDivs}): ${line.trim()}`);
    }
});
