import { toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { EditorState, Plugin, TextSelection, Transaction, type Command } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

/**
 * When in a code block, we can escape it by being at the end of it and 
 * pressing the right arrow
 * 
 * TODO this should also work when trying to escape with the down arrow
 */
const escapeCodeBlockToParagraph = new Plugin({
    props: {
        handleKeyDown(view, event) {
            // Check if the right arrow key is pressed
            if (event.key !== 'ArrowRight') {
                return false;
            }

            const { state, dispatch } = view;
            const { tr, doc, selection } = state;

            // Ensure we're at the end of the block
            if (!selection.empty || selection.$to.pos !== doc.content.size - 1) {
                return;
            }
            // Check if the right arrow key is pressed and the cursor is at the end of the document
            if (selection.$to.parent.type.name !== "code_block") {
                return;
            }

            // Insert a new paragraph node at the end of the document
            const paragraph = state.schema.nodes.paragraph.create();
            tr.insert(tr.doc.content.size, paragraph);

            // Set the selection to the end of the newly inserted paragraph
            const newPos = tr.doc.content.size - 1; // Set selection to the end of the document
            tr.setSelection(TextSelection.create(tr.doc, newPos));

            if (dispatch) dispatch(tr.scrollIntoView());

            return true; // Prevent the default behavior
        }
    }
});


function toggleBold(state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, view?: EditorView) {
    return toggleMark(state.schema.marks.strong)(state, dispatch);
}

const toggleBoldPlugin = keymap({
    'Mod-b': toggleBold, // Cmd + B on macOS
    'Ctrl-b': toggleBold // Ctrl + B on other platforms
})

export { escapeCodeBlockToParagraph, toggleBoldPlugin }