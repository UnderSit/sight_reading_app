'use strict';

const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'src');

const scripts = [
  'glyphs.js',
  'theory.js',
  'rng.js',
  'rhythm.js',
  'generator.js',
  'renderer.js',
  'audio.js',
  'keyboard.js',
  'storage.js',
  'tests.js',
  'app.js'
];

function read(name) {
  return fs.readFileSync(path.join(src, name), 'utf8');
}

function replaceOnce(template, marker, value) {
  const index = template.indexOf(marker);
  if (index === -1) throw new Error('Marker non trovato: ' + marker);
  if (template.indexOf(marker, index + marker.length) !== -1) {
    throw new Error('Marker duplicato: ' + marker);
  }
  return template.slice(0, index) + value + template.slice(index + marker.length);
}

const template = read('template.html');
const styles = read('styles.css');
const script = scripts.map((name) => {
  const content = read(name);
  if (content.includes('</script')) throw new Error('Script non incorporabile: ' + name);
  return '/* ' + name + ' */\n' + content.trim() + '\n';
}).join('\n');

let html = replaceOnce(template, '/*__STYLES__*/', styles.trim());
html = replaceOnce(html, '/*__SCRIPTS__*/', script.trim());
if (!html.endsWith('\n')) html += '\n';

const output = path.join(root, 'index.html');
fs.writeFileSync(output, html, 'utf8');
const size = fs.statSync(output).size;
console.log('Creato index.html (' + Math.round(size / 1024) + ' KB, ' + scripts.length + ' moduli).');
