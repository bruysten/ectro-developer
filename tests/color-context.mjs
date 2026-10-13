import assert from 'node:assert/strict';
import {hasColorContext} from '../src/color-context.js';
const cases=[
 ['index.html','',true],['style.CSS','',true],['page.vue','',true],['component.tsx','',true],
 ['index.php','<?php echo "hello";',false],['index.php','<?php $x=1; ?><h1 style="color: #CC9040">Hallo</h1>',true],
 ['template.txt','<!DOCTYPE html>\n<main>Hallo</main>',true],['server.py','page = "<div>Hallo</div>"',true],
 ['script.js','const markup = `<my-card>Hi</my-card>`;',true],['script.js','const style = `.card { background-color: #B2026C; padding: 20px; }`;',true],
 ['script.js','const css = ".card { color: red; }";',true],['server.php',"<?php $style = 'color: #fff;'",true],
 ['notes.txt','font-size: 20px;',true],['script.js','// <div>comment only</div>\nconst x=1;',false],
 ['server.py','styles = """\n#card { color: red; }\n"""',true],['fragment.php','<time>12:00</time>',true],
 ['colors.txt',':root { --accent: #b2026c; }',true],['response.php','<?php echo "h1 { color: red; }";',true],
 ['notes.txt','color: #fff;',true],['plain.txt','A normal training note.',false],
 ['script.js','const colors = { primary: "#B2026C" };',false],['script.js','const object = { color: "red" };',false],
 ['script.js','if (a < b && c > d) { return 1; }',false],['code.cpp','std::vector<int> values;',false],
 ['script.js','/* <div>example only</div> */\nconst x=1;',false],['notes.txt','<!-- <p>commented markup</p> -->',false],
 ['script.js','const x = 1; // ordinary JavaScript',false],['template.txt','<section>\n<style>p { color: red; }</style>\n</section>',true]
];
for(const [path,content,expected] of cases)assert.equal(hasColorContext(path,content),expected,`${path}: ${content}`);
assert.equal(hasColorContext('index.php','<p>added live</p>'),true);assert.equal(hasColorContext('index.php','<?php echo "HTML removed";'),false);
assert.equal(hasColorContext('large.txt','ordinary text '.repeat(35000)),false);
assert.equal(hasColorContext('styles.txt','@media screen { .card { color: red; } }'),true);
console.log(`${cases.length+4} contextual color helper checks passed.`);
