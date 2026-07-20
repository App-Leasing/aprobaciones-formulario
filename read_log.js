const fs = require('fs');
const path = 'C:\\\\Users\\\\Sistemas Ruben\\\\.gemini\\\\antigravity\\\\brain\\\\f3e400d6-b235-4acc-b547-71cfae37ffaa\\\\.system_generated\\\\logs\\\\overview.txt';

const lines = fs.readFileSync(path, 'utf8').split('\n');
for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const data = JSON.parse(line);
        if (data.type === 'USER_INPUT') {
            console.log("--- USER ---");
            console.log(data.content.substring(0, 2000));
        } else if (data.type === 'PLANNER_RESPONSE' && data.content) {
            console.log("--- MODEL ---");
            console.log(data.content.substring(0, 500));
        }
    } catch (e) {
        // ignore
    }
}
