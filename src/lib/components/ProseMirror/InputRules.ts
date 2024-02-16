

import { InputRule } from "prosemirror-inputrules";
import { type EditorState, TextSelection } from "prosemirror-state";
import { schema } from 'prosemirror-schema-basic';

/**
 * Replaces ``` with a new codeblock
 * in the case of it being used in an empty paragraph (ignoring `` and applying trim) 
 * then the entire block will be replaced with code
 */
const codeBlockShortcut = new InputRule(
    /```$/,
    (
        state: EditorState,
        match: RegExpMatchArray,
        start: number,
        end: number
    ) => {
        const { tr } = state;

        // Find the position of the end of the paragraph block
        const $start = tr.doc.resolve(start);
        const endOfParagraph = $start.end($start.depth);
        const startOfParagraph = $start.start($start.depth);

        // Extract the content from the end of the match to the end of the paragraph
        const content = tr.doc.textBetween(end, endOfParagraph, '');

        // Determine where we should start replacing from
        const replaceCurrentBlock = start === startOfParagraph;
        const replaceFrom = replaceCurrentBlock ? start - 1 : start;

        // Create the code block with our content
        const codeBlockNode = state.schema.nodes.code_block.create({}, content.length ? schema.text(content) : null);
        tr.replaceWith(replaceFrom, endOfParagraph, codeBlockNode);

        // Move our cursor into the block relative to where we were typing
        const pos = tr.doc.resolve(replaceCurrentBlock ? start : start + 2);
        tr.setSelection(TextSelection.create(tr.doc, pos.pos));

        return tr;
    },
    { undoable: true }
)
/**
 * Replaces ``` with a new codeblock
 * in the case of it being used in an empty paragraph (ignoring `` and applying trim) 
 * then the entire block will be replaced with code
 */
const inlineCodeShortcut = new InputRule(
    /(^| )`([^` ].*[^ `])`$/,
    (
        state: EditorState,
        match: RegExpMatchArray,
        start: number,
        end: number
    ) => {
        const { tr, } = state;
        const [fullMatch, _, content] = match;

        // Replace the match with the content in a code block
        const inlineNode = state.schema.nodes.code_block.create({}, schema.text(content));
        tr.replaceWith(start, end, inlineNode);

        return tr;
    },
    { undoable: true }
)


export { codeBlockShortcut, inlineCodeShortcut };