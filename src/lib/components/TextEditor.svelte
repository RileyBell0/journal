<script lang="ts">
    import { onMount } from 'svelte';
    import { createView } from './Editor';
    import type { EditorView } from 'prosemirror-view';

    let container: HTMLDivElement;
    let view: EditorView;

    onMount(() => {
        view = createView(container);
    });
</script>

<div class="riley-editor" bind:this={container} />

<style global lang="less">
    @import 'prosemirror-view/style/prosemirror.css';
    @import 'prosemirror-menu/style/menu.css';

    div.riley-editor {
        padding: 10px;
        background-color: white;
        border-radius: 10px;

        .ProseMirror {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 5px;

            &:focus {
                outline: none;
            }

            &:first-child {
                margin-top: 0px !important;
            }

            pre:has(code) {
                background-color: #e6e6e6;
                font-size: 0.9rem;

                padding: 5px;
                padding-left: 10px;

                border-radius: 5px;
            }
            p > code {
                background-color: #e6e6e6;
                font-size: 0.9rem;

                padding: 5px;

                border-radius: 5px;
            }
        }
    }
</style>
