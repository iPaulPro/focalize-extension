<script lang="ts">
    import {truncate} from '../utils';
    import DOMPurify from 'isomorphic-dompurify';

    export let text: string = '';
    export let maxLength: number = 150;
    export let classNames: string = '';
    export let anchorClass: string = '!no-underline !text-orange-600 dark:!text-orange-300 hover:!text-orange-400 dark:hover:!text-orange-500';

    let formattedText: string = '';

    const formatText = () => {
        let truncatedText = truncate(text, maxLength);
        if (!truncatedText?.length) return;

        let formatted = truncatedText.replace(/(https?:\/\/)?(www\.)?([^\s]+(\.[^\s]+))(\/)?(?=[\s\.,;!?]|[^\s]*$)/gi, (_, __, ___, domain, ____, slash) => {
            let cleanDomain = domain.replace(/[\.,;!?]+$/, '');
            let punctuation = domain.slice(cleanDomain.length);
            return `<a href="https://${cleanDomain}${slash || ''}" class="${anchorClass}" target="_blank" rel="noreferrer">${cleanDomain}</a>${punctuation}`;
        });

        formatted = formatted.replace(/@(\w+)/g, (match, handle) => {
            return `<a href="https://lenster.xyz/u/${handle}" class="${anchorClass}" target="_blank" rel="noreferrer">@${handle}</a>`;
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
