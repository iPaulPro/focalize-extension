import { writable } from 'svelte/store';

const getQueryParams = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const params: { [key: string]: string } = {};
    for (const [key, value] of searchParams) {
        params[key] = value;
    }
    return params;
};

const syncURLQueryParams = (newParams: { [key: string]: string }) => {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams(newParams).toString();
    window.history.pushState({}, '', url.toString());
};

const queryParams = writable(getQueryParams(), (set) => {
    const update = () => {
        set(getQueryParams());
    };

    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);

    return () => {
        window.removeEventListener('popstate', update);
        window.removeEventListener('hashchange', update);
    };
});

const { set } = queryParams;
queryParams.set = (value: { [key: string]: string }) => {
    syncURLQueryParams(value);
    set(value);
};

const { update } = queryParams;
queryParams.update = (
    updater: (value: { [key: string]: string }) => { [key: string]: string }
) => {
    update((value) => {
        const newValue = updater(value);
        syncURLQueryParams(newValue);
        return newValue;
    });
};

export { queryParams };
