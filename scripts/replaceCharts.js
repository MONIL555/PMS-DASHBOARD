const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf-8');

const s1 = '<ResponsiveContainer width="100%" height="100%">';
const e1 = '</ResponsiveContainer>';

let i = code.indexOf(s1);
while(i !== -1) {
    let j = code.indexOf(e1, i);
    if(j !== -1) {
        let block = code.substring(i, j + e1.length);
        if(block.includes('<AreaChart')) {
            code = code.substring(0, i) + '<TrendsAreaChart data={data.trends} hasLeads={hasLeads} hasQuotations={hasQuotations} hasProjects={hasProjects} hasFinance={hasFinance} />' + code.substring(j + e1.length);
        }
        else if(block.includes('<ComposedChart')) {
            code = code.substring(0, i) + '<RevenueForecastChart rfData={rfData} />' + code.substring(j + e1.length);
        }
        else if(block.includes('<PieChart')) {
            code = code.substring(0, i) + '<LeadFunnelChart data={data.leadStatusDist} STATUS_COLORS={STATUS_COLORS} />' + code.substring(j + e1.length);
        }
        else if(block.includes('<BarChart data={data.projectPriorityDist}')) {
            code = code.substring(0, i) + '<ProjectPriorityChart data={data.projectPriorityDist} CHART_COLORS={CHART_COLORS} />' + code.substring(j + e1.length);
        }
        else if(block.includes('<BarChart data={data.ticketPriorityDist}')) {
            code = code.substring(0, i) + '<TicketLoadChart data={data.ticketPriorityDist} />' + code.substring(j + e1.length);
        }
        // Need to reposition 'i' correctly after replacement
        j = i; // just go back somewhat to continue
    }
    i = code.indexOf(s1, i + Math.max(1, s1.length));
}

fs.writeFileSync('app/page.tsx', code);
console.log('Replaced charts successfully.');
