/**
 * Should probably only define actual keymaps here where the actual key itself
 * is required and non-configurable
 * 
 * e.g. breaking out of a codeblock and deleting it when you press backspace
 * only makes sense for when you press backspace
 */

import { toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { EditorState, Selection, TextSelection, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { MarkType, ResolvedPos } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";

/**
 * Toggles whether or not the selected text is bold
 * 
 * @param state the editor state
 * @param dispatch didn't want to type the entire function, TODO future riley come back when you know what dispatch is
 * @param view the current editor view
 * @returns Not sure, but it works - TODO come back when you know more
 */
function toggleBold(state: EditorState, dispatch: any, view?: EditorView) {
    return toggleMark(state.schema.marks.strong)(state, dispatch);
}

/**
 * Toggles whether or not the selected text is italics
 * 
 * @param state the editor state
 * @param dispatch didn't want to type the entire function, TODO future riley come back when you know what dispatch is
 * @param view the current editor view
 * @returns Not sure, but it works - TODO come back when you know more
 */
function toggleItalics(state: EditorState, dispatch: any, view?: EditorView) {
    return toggleMark(state.schema.marks.italics)(state, dispatch);
}

/**
 * Creates a paragraph if our arrow direction input would get us out of our code block
 * 
 * @param view the current editor view
 * @param dispatch not really sure what this is TBH TODO - future riley come back and describe this when you know more
 * @param dir The arrow direction we're handling
 * @returns if we handled the event or not
 */
function escapeCodeBlockHandler(view: EditorView | undefined, dispatch: any, dir: 'down' | 'right') {
    if (!view) {
        return false;
    }

    const { tr, doc, selection } = view.state;

    // Ensure that we're within a code block
    if (selection.$to.parent.type.name !== "code_block") {
        return false;
    }

    // Ensure that our block is at the end of the editor
    if (selection.$to.pos !== doc.content.size - 1) {
        return false;
    }

    // Ensure that pressing down would take us out of the block
    if (!view?.endOfTextblock(dir)) {
        return false;
    }

    // Insert a new paragraph node at the end of the node
    const paragraph = view.state.schema.nodes.paragraph.create();
    tr.insert(tr.doc.content.size, paragraph);

    // Set the selection to the end of the newly inserted paragraph
    const newPos = tr.doc.content.size - 1; // Set selection to the end of the document
    tr.setSelection(TextSelection.create(tr.doc, newPos));

    if (dispatch) {
        dispatch(tr.scrollIntoView());
    }

    return true;
}

/**
 * When in a code block, we can escape it by being at the end of it and 
 * pressing the right arrow
 */
const escapeCodeBlockToParagraph = keymap({
    'ArrowRight': (state, dispatch, view?) => {
        return escapeCodeBlockHandler(view, dispatch, 'right');
    },
    'ArrowDown': (state, dispatch, view?) => {
        return escapeCodeBlockHandler(view, dispatch, 'down');
    }
});

/**
 * A plugin that'll delete your code block if your cursor is at the start of said code block.
 * If there's a text before this one it'll merge your content onto there, otherwise it'll
 * create a new text block with the text content of the code block
 */
const deleteCodeblockBackspacePlugin = keymap({
    'Backspace': (state, dispatch, view?) => {
        if (!view) {
            return false;
        }

        const { selection, tr, doc } = view.state;

        // Ensure if the selection is in a code block
        if (selection.$from.parent.type.name !== 'code_block') {
            return false;
        }

        // Must not have anything selected - just the cursor
        if (selection.to !== selection.from) {
            return false;
        }

        // Ensure we're at the start of the code block
        const $node = tr.doc.resolve(selection.from);
        const nodeStart = $node.start($node.depth);
        if (nodeStart !== selection.from) {
            return false;
        }

        // Grab the content of our block - we'll be deleting this block
        const nodeEnd = $node.end($node.depth);
        const content = tr.doc.textBetween(nodeStart, nodeEnd, '');

        // If the previous block is text, append this content to that
        const prevNode = doc.resolve(nodeStart - 1).nodeBefore;
        const hasPrevTextNode = prevNode && (prevNode.isText || prevNode.type.name === 'paragraph');

        // Move the content into either a previous paragraph, or if that can't be
        // done, make a new paragraph putting the content in there
        let pos: ResolvedPos;
        if (hasPrevTextNode) {
            // First, we delete the code block
            tr.deleteRange(nodeStart - 1, nodeEnd + 1);

            // Add the text at the end of the previous block
            const $prevParagraph = doc.resolve(nodeStart - 2);
            const prevEnd = $prevParagraph.end($prevParagraph.depth);
            tr.insertText(content, prevEnd);

            // Finally we move the cursor to the end of the last text + the length of our content
            pos = tr.doc.resolve(prevEnd)
        } else {
            // If there was no previous paragraph, just convert the codeblock with one
            if (content.length > 0) {
                tr.replaceWith(nodeStart - 1, nodeEnd + 1, view.state.schema.nodes.paragraph.create(null, view.state.schema.text(content)));
            } else {
                tr.replaceWith(nodeStart - 1, nodeEnd + 1, view.state.schema.nodes.paragraph.create());
            }

            const $currBlock = tr.doc.resolve(nodeStart);
            pos = tr.doc.resolve($currBlock.start($currBlock.depth));
        }

        // Move the cursor to the correct position in the new block
        tr.setSelection(TextSelection.create(tr.doc, pos.pos));

        // Commit changes
        if (dispatch) {
            dispatch(tr.scrollIntoView());
        }

        return true;
    },
});

/**
 * Checks if the given character has the relevant mark
 * 
 * @param state in the given state
 * @param pos at the given position (that we'll resolve)
 * @param mark does it have this mark?
 * @returns true if the character has that mark
 */
function charHasMark(state: EditorState, pos: number, markType: MarkType): boolean {
    return state.doc.resolve(pos).marks().some(mark => mark.type === markType);
}

/**
 * Checks if the given selection is a range
 * 
 * @param selection The selection to check
 * @returns true if the selection is a range, false otherwise
 */
function isRange(selection: Selection): boolean {
    return selection.from !== selection.to;
}

const escapeInlineCodeBlockToParagraph = keymap({
    'ArrowRight': (state, dispatch, view?) => {
        if (!view) {
            return false;
        }

        // Ensure the selection is not a range
        const { selection, tr } = view.state;
        if (isRange(selection)) {
            return false;
        }

        // Ensure there's actually a character before this one we can check
        const textStart = selection.$to.start(selection.$to.depth);
        if (textStart >= selection.from) {
            return false;
        }

        // Ensure the previous character is marked as code
        if (!charHasMark(state, selection.from - 1, schema.marks.code)) {
            return false;
        }

        // If there's no character to the RHS, we just need to insert a new one
        // and get outta here
        const textEnd = selection.$to.end(selection.$to.depth);
        if (textEnd === selection.from) {
            tr.insertText(' ', textEnd)
            tr.removeMark(textEnd, textEnd + 1, schema.marks.code);

            if (dispatch) {
                dispatch(tr);
            }

            return true;
        }

        return false;
    },
    'ArrowLeft': (state, dispatch, _) => {
        const { $from, $to } = state.selection;
        if ($from.pos !== $to.pos) {
            return false;
        }

        if ($from.parent.type.name === 'code') {
            const newPos = $from.pos - 1;
            if (dispatch) {
                dispatch(state.tr.setSelection(Selection.near(state.doc.resolve(newPos))));
                return true;
            }
            return false;
        }
        return false;
    },
})

const goRightOfCodeFormatPlugin = (state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, view?: EditorView) => {
    // check if we're at the last element of a code block
    debugger;


}

export { escapeCodeBlockToParagraph, toggleBold, toggleItalics, deleteCodeblockBackspacePlugin, goRightOfCodeFormatPlugin, escapeInlineCodeBlockToParagraph }