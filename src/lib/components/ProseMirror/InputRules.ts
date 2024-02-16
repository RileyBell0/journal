

import { InputRule, undoInputRule } from "prosemirror-inputrules";
import { type EditorState, TextSelection } from "prosemirror-state";
import { schema } from 'prosemirror-schema-basic';
import { ReplaceAroundStep, ReplaceStep } from "prosemirror-transform";
import { Fragment, Mark, MarkType, Slice } from "prosemirror-model";

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

        // Find the start and end of the current paragraph
        const $start = tr.doc.resolve(start);
        const startOfParagraph = $start.start($start.depth);
        const endOfParagraph = $start.end($start.depth);

        // Determine the bounds of our replace (if we're replacing the current paragraph we've gotta add 1 to each of the ends)
        const replaceCurrentBlock = start === startOfParagraph;
        const replaceFrom = replaceCurrentBlock ? start - 1 : start;
        const replaceTo = replaceCurrentBlock ? endOfParagraph + 1 : endOfParagraph;

        // Create the code block with our content
        const content = tr.doc.textBetween(end, endOfParagraph, '');
        const codeBlockNode = state.schema.nodes.code_block.create(null, content.length > 0 ? state.schema.text(content) : null);

        // Create our transaction, removing the ``` and moving all text after into a code block
        tr.replaceWith(replaceFrom, replaceTo, codeBlockNode);
        const pos = tr.doc.resolve(replaceCurrentBlock ? start : start + 2);
        tr.setSelection(TextSelection.create(tr.doc, pos.pos));

        return tr;
    },
    { undoable: true }
)

/**
 * Marks the code within the `` as `code`
 */
const inlineCodeShortcut = new InputRule(
    /(^| )`([^` ].*[^ `])`$/,
    (
        state: EditorState,
        match: RegExpMatchArray,
        start: number,
        end: number
    ) => {
        const { tr } = state;

        // If the current `end` is already marked, do nothing
        if (tr.doc.rangeHasMark(start, end, schema.marks.code)) {
            debugger;
            return null;
        }

        const from = start + (match[1].length === 0 ? 0 : 1);

        // Remove the surrounding `` marks
        tr.replaceWith(from, end, schema.text(match[2]));

        // Mark the text as code
        const mark = schema.marks.code.create();
        tr.addMark(from, end - 1, mark);

        return tr;
    },
    { undoable: true }
)

const dashedListShortcut = new InputRule(
    /^/,
    (
        state: EditorState,
        match: RegExpMatchArray,
        start: number,
        end: number
    ) => {
        const { tr, } = state;
        const content = match[2];

        // Replace the match with the content in a code block
        const inlineNode = state.schema.nodes.code_block.create({}, schema.text(content));
        tr.replaceWith(start, end, inlineNode);

        return tr;
    },
    { undoable: true }
)

export { codeBlockShortcut, inlineCodeShortcut };