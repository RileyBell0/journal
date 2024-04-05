import { EditorState, NodeSelection, Selection, Transaction } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { undo, redo, history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import {
    bulletList,
    listItem,
    orderedList,
    liftListItem,
    sinkListItem,
    splitListItem,
    addListNodes
} from 'prosemirror-schema-list';
import { schema } from 'prosemirror-schema-basic';
import { inputRules, undoInputRule } from 'prosemirror-inputrules';
import { Schema } from 'prosemirror-model';
import { codeBlockShortcut, inlineCodeShortcut } from './ProseMirror/InputRules';
import { escapeCodeBlockToParagraph, toggleItalics, toggleBold, deleteCodeblockBackspacePlugin, handleArrowAtInlineCodeEdge } from './ProseMirror/Plugins';

schema.spec.nodes.addToEnd('code_inline', {
    inline: true,
    toDOM: () => ["code", { class: "custom-code" }, 0]
})

const mySchema = new Schema({
    nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
    marks: schema.spec.marks
});

const state = EditorState.create({
    schema,
    plugins: [
        history(),
        keymap({ 'Mod-z': undoInputRule }),
        keymap({ 'Mod-z': undo, 'Mod-y': redo }),
        keymap({ // bold and italics
            'Mod-i': toggleItalics,
            'Ctrl-i': toggleItalics,
            'Mod-b': toggleBold,
            'Ctrl-b': toggleBold
        }),
        deleteCodeblockBackspacePlugin,
        escapeCodeBlockToParagraph,
        ...handleArrowAtInlineCodeEdge,
        inputRules({
            rules: [
                codeBlockShortcut,
                inlineCodeShortcut
            ]
        }),
        keymap(baseKeymap),
    ]
});

const createView = (container: HTMLElement) => {
    let view = new EditorView(container, {
        state,
        dispatchTransaction(transaction) {
            let newState = view.state.apply(transaction);
            view.updateState(newState);
        }
    });

    return view;
}

export { createView }