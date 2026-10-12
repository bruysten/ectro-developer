import {EditorView, keymap} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {html} from '@codemirror/lang-html';
import {css} from '@codemirror/lang-css';
import {javascript} from '@codemirror/lang-javascript';
import {php} from '@codemirror/lang-php';
import {python} from '@codemirror/lang-python';
export function createEditor(parent, content, path, onChange, onSave, onRun) {
  const ext = path.split('.').pop().toLowerCase();
  const language = ({html,htm:html,css,js:javascript,mjs:javascript,php,py:python})[ext];
  return new EditorView({parent,state:EditorState.create({doc:content,extensions:[basicSetup,language?language():[],
    EditorView.lineWrapping,EditorView.updateListener.of(v=>{if(v.docChanged)onChange(v.state.doc.toString());}),
    keymap.of([{key:'Mod-s',run:()=>{onSave();return true;}},{key:'Mod-Enter',run:()=>{onRun();return true;}}]),
    EditorView.theme({'&':{fontFamily:'var(--font-mono)'},'.cm-cursor':{borderLeftColor:'#b2026c'},'&.cm-focused .cm-selectionBackground':{background:'#f8e1ee'}})
  ]})});
}
