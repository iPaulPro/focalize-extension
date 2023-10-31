<script lang="ts">
    import {truncate} from '../utils/utils';
    import DOMPurify from 'isomorphic-dompurify';

    export let text: string = '';
    export let maxLength: number | undefined = undefined;
    export let classNames: string = 'leading-tight whitespace-pre-wrap break-keep ![overflow-wrap:anywhere]';
    export let anchorClass: string = '!no-underline !text-orange-600 dark:!text-orange-300 hover:!text-orange-400 dark:hover:!text-orange-500';

    let formattedText: string = '';

    const formatText = () => {
        let truncatedText = truncate(text, maxLength);
        if (!truncatedText?.length) return;

        // First, strip the domain part from the @mentions
        truncatedText = truncatedText.replace(/@[a-zA-Z0-9_]+\/([a-zA-Z0-9_]+)/g, (_, localName) => {
            return `@${localName}`;
        });

        // Then, replace the links with anchors
        let formatted = truncatedText.replace(/(?<!\w)(https?:\/\/)?(www\.)?((?:[^\s\W]+(\.[^\s\W]+)+)+[^\s]*)(?!\w)/gi, (_, __, ___, url) => {
            let cleanUrl = url.replace(/[\.,;!?]+$/, '');
            let punctuation = url.slice(cleanUrl.length);
            return `<a href="https://${cleanUrl}" class="${anchorClass}" target="_blank">${cleanUrl}</a>${punctuation}`;
        });

        // Replace @mentions with anchors
        formatted = formatted.replace(/@(\w+)/g, (_, handle) => {
            return `<a href="https://hey.xyz/u/${handle}" class="${anchorClass}" target="_blank">@${handle}</a>`;
        });

        // Replace hashtags with anchors
        formatted = formatted.replace(/(?<!\w)#(\w+)/g, (_, hashtag) => {
            return `<a href="https://hey.xyz/search?q=${hashtag}&type=pubs" class="${anchorClass}" target="_blank">#${hashtag}</a>`;
        });

        formattedText = DOMPurify.sanitize(formatted, {
            ADD_ATTR: ['target'], // Allow the 'target' attribute
        });
    };

    $: {
        if (text.length > 0) {
            formatText();
        }
    }
</script>

<div class={classNames}>
  {@html formattedText}
</div>
