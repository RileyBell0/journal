/**
 * Should probably only define actual keymaps here where the actual key itself
 * is required and non-configurable
 * 
 * e.g. breaking out of a codeblock and deleting it when you press backspace
 * only makes sense for when you press backspace
 */

import { toggleMark } from "prosemirror-commands";
import { keymap } from "prosemirror-keymap";
import { EditorState, Plugin, Selection, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { MarkType, Node, ResolvedPos } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";

let justMarked = false;
let codeMarkNextChar = false;
let writeWithCodeMark = false;

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

/**
 * Gets the collapsed content of the given resolved position
 *
 * @param $pos The resolved position to get the content of
 * @returns The content of the given resolved position
 */
function getCollapsedContent($pos: ResolvedPos): string {
    return $pos.node().textContent.replaceAll('\n', ' ');
}

/**
 * Makes a paragraph node with the given content
 * 
 * @param content The content of the paragraph
 * @returns The paragraph node
 */
function makeParagraph(content: string): Node {
    if (content.length) {
        return schema.nodes.paragraph.create(null, schema.text(content));
    } else {
        return schema.nodes.paragraph.create();
    }
}

///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////
// Plugins \/ \/
///////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////

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
        const { selection, tr, doc } = state;
        const { $from, from } = selection;

        // The selection is not a range
        if (isRange(selection)) {
            return false;
        }

        // At the start of the block
        if ($from.start() !== from) {
            return false;
        }

        // Within a code block
        const $codeBlock = $from;
        if ($from.parent.type.name !== 'code_block') {
            return false;
        }

        // END CASE: No previous node -> replace the code block with a paragraph
        const codeBlockContent = getCollapsedContent($codeBlock);
        const codeBlockIndex = $codeBlock.index($codeBlock.depth - 1);
        const noPreviousNode = codeBlockIndex === 0;
        if (noPreviousNode) {
            tr.replaceWith($codeBlock.before(), $codeBlock.end(), makeParagraph(codeBlockContent));
            if (dispatch) {
                dispatch(tr.scrollIntoView());
            }

            return true;
        }

        // END CASE: Previous node is not a paragraph -> replace the code block with a paragraph
        const prevNode: Node = $codeBlock.node($codeBlock.depth - 1).child(codeBlockIndex - 1);
        const prevNodeIsParagraph = prevNode.type.name === 'paragraph';
        if (!prevNodeIsParagraph) {
            tr.replaceWith($codeBlock.before(), $codeBlock.end(), makeParagraph(codeBlockContent));
            if (dispatch) {
                dispatch(tr.scrollIntoView());
            }

            return true;
        }

        // END CASE: Previous node is a paragraph
        const $prevNode = doc.resolve($codeBlock.before() - 1);
        if (prevNodeIsParagraph) {

            const prevNodeIsEmpty = prevNode.content.size === 0;
            if (prevNodeIsEmpty) {
                // CASE: Previous node is empty -> Delete the previous node
                tr.deleteRange($prevNode.before(), $prevNode.after());
            } else {
                // CASE: Previous node is non-empty -> Merge the content

                // Merge content
                const prevNodeContent = getCollapsedContent($prevNode);
                const mergedContent = prevNodeContent + codeBlockContent;
                tr.replaceWith($prevNode.before(), $codeBlock.after(), makeParagraph(mergedContent));

                // Move cursor to the merge point
                const mergePoint = $prevNode.start() + prevNodeContent.length;
                tr.setSelection(TextSelection.create(tr.doc, mergePoint));
            }

            if (dispatch) {
                dispatch(tr.scrollIntoView());
            }

            return true;
        }

        return false;
    },
});

/**
 * 
 */
const arrowAtEdgeOfInlineCode = keymap({
    'ArrowRight': (state, dispatch, view?) => {
        const { selection, tr } = state;
        const { from, $from } = selection;

        // Selection is not a range
        if (isRange(selection)) {
            return false;
        }

        // Next character is not marked as code
        const isEndOfBlock = $from.end($from.depth) === from;
        if (!isEndOfBlock && charHasMark(state, from + 1, schema.marks.code)) {
            return false;
        }

        // Previous character is marked as code
        const isStartOfBlock = $from.start($from.depth) === from;
        if (isStartOfBlock || !charHasMark(state, from, schema.marks.code)) {
            return false;
        }

        // If we haven't just ran this event
        if (codeMarkNextChar) {
            return false;
        }

        justMarked = true;
        codeMarkNextChar = true;

        // discard event
        tr.setSelection(TextSelection.create(tr.doc, from));
        if (dispatch) {
            dispatch(tr.scrollIntoView());
        }

        return true;
    },
    'ArrowLeft': (state, dispatch, view?) => {
        const { selection, tr } = state;
        const { from, $from } = selection;

        // Selection is not a range
        if (isRange(selection)) {
            return false;
        }

        // Previous character is not marked as code
        const isStartOfBlock = $from.start($from.depth) === from;
        if (!isStartOfBlock && charHasMark(state, from - 1, schema.marks.code)) {
            return false;
        }

        // Next character is marked as code
        const isEndOfBlock = $from.end($from.depth) === from;
        if (isEndOfBlock || charHasMark(state, from, schema.marks.code)) {
            return false;
        }

        // If we haven't just ran this event
        if (codeMarkNextChar) {
            return false;
        }

        justMarked = true;
        codeMarkNextChar = true;

        // discard event
        tr.setSelection(TextSelection.create(tr.doc, from));
        if (dispatch) {
            dispatch(tr.scrollIntoView());
        }

        return true;
    }
})

/**
 * 
 * @param state 
 * @param dispatch 
 * @param view 
 */
const anyChangeUnsetInlineCodeMark = new Plugin({
    view(editorView) {
        return {
            update(view) {
                if (!justMarked) {
                    codeMarkNextChar = false;
                }

                justMarked = false;
            }
        };
    }
});

const handleArrowAtInlineCodeEdge: Plugin<any>[] = [arrowAtEdgeOfInlineCode, anyChangeUnsetInlineCodeMark];

export {
    toggleBold,
    toggleItalics,
    escapeCodeBlockToParagraph,
    deleteCodeblockBackspacePlugin,
    handleArrowAtInlineCodeEdge
}