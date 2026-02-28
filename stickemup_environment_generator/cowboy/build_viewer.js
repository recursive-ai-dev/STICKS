const fs = require('fs');
const path = require('path');

const apngDir = path.join(__dirname, 'cowboy_apng');
const staticDir = path.join(__dirname, 'cowboy_environment');
const templatePath = path.join(__dirname, 'viewer.template.html');
const outputPath = path.join(__dirname, 'viewer.html');

function getPngFiles(dir) {
    return fs.readdirSync(dir).filter(file => file.endsWith('.png'));
}

try {
    const animatedFiles = getPngFiles(apngDir);
    const staticFiles = getPngFiles(staticDir);

    const animatedFilesJs = `const animatedFiles = ${JSON.stringify(animatedFiles, null, 4)}`;
    const staticFilesJs = `const staticFiles = ${JSON.stringify(staticFiles, null, 4)}`;

    const fileListJs = `${animatedFilesJs}\n${staticFilesJs}`;

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const finalHtml = templateContent.replace('// FILE_LIST_PLACEHOLDER', fileListJs);

    fs.writeFileSync(outputPath, finalHtml);

    console.log('viewer.html has been generated successfully.');

} catch (error) {
    console.error('Error generating viewer.html:', error);
}
