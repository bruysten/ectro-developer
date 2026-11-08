import assert from 'node:assert/strict';
import {parseJsonLines,parseYaml,yamlRows,parseMarkdown,markdownTable} from '../src/converter-extra.js';
const rows=[{name:'A | B',value:12,ok:true,note:'two\nlines',empty:null},{name:'"quoted" \\ path',value:-3.5,ok:false,note:'<script>',empty:null}];
assert.deepEqual(parseJsonLines(rows.map(JSON.stringify).join('\n')),rows);
assert.deepEqual(parseYaml(yamlRows(rows)),rows);
assert.deepEqual(parseYaml('- name: "A # B" # comment\n  value: 12\n  ok: true'),[{name:'A # B',value:12,ok:true}]);
assert.deepEqual(parseYaml("- name: 'it''s good' # comment"),[{name:"it's good"}]);
const markdown=parseMarkdown(markdownTable(rows));assert.equal(markdown[0].name,rows[0].name);assert.equal(markdown[0].note,rows[0].note);assert.equal(markdown[1].name,rows[1].name);assert.equal(markdown[1].note,'<script>');assert.equal(markdown[0].value,'12','Markdown table cells are text');
for(const value of ['- a: &evil 1','- a: !exec x','- a: *reference','- a: |\n    lines','- __proto__: value','- x: a\n  x: b','{"a":1}'])assert.throws(()=>parseYaml(value));
assert.throws(()=>parseJsonLines('{"a":1}\nnot-json'),/Zeile 2/);assert.throws(()=>parseJsonLines('[1,2]'));
assert.throws(()=>parseMarkdown('| a | b |\n| --- | --- |\n| one |'),/Spaltenanzahl/);
assert.deepEqual(parseMarkdown(markdownTable([{'new\nline':'a|b\\c'}])),[{'new\nline':'a|b\\c'}]);
console.log('Three extra conversion formats verified: JSON Lines, table-oriented YAML and Markdown, with typed round-trips, quotes, comments, escaped pipes, multiline cells and unsafe YAML rejection.');

assert.deepEqual(parseYaml("- name: O'Reilly # comment"),[{name:"O'Reilly"}]);assert.deepEqual(parseMarkdown(markdownTable([{markup:'literal <br> &amp; <script>'}])),[{markup:'literal <br> &amp; <script>'}]);
