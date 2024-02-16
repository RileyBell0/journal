<script lang="ts">
    import { format } from 'date-fns';
    import Card from '../Card.svelte';
    import Popup from '../Popup.svelte';

    export let showPopup = false;

    // Default selected date
    export let selectedDate: Date | null = null;
</script>

<Popup bind:show={showPopup}>
    <div class="pos">
        <Card forcePointerEvents={true}>
            <div>
                <h2>Add a new Journal</h2>
                <label class="date-select-label">
                    Select a Date
                    {#if selectedDate !== null}
                        <input
                            class="date-selector"
                            type="date"
                            max={format(new Date(), 'yyyy-MM-dd')}
                            value={format(selectedDate, 'yyyy-MM-dd')}
                        />
                    {:else}
                        <input
                            class="date-selector"
                            type="date"
                            max={format(new Date(), 'yyyy-MM-dd')}
                        />
                    {/if}
                </label>
            </div>
        </Card>
    </div>
</Popup>

<style lang="less">
    .pos {
        position: absolute;
        top: 0;
        left: 0;

        display: flex;
        justify-content: center;

        padding: 20px;
        padding-top: 100px;

        pointer-events: none;
        width: 100%;

        .date-select-label {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;

            width: 100%;
            max-width: 160px;

            .date-selector {
                width: 100%;
            }
        }
    }
</style>
