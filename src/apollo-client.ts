import {ApolloClient, ApolloLink, from, HttpLink, InMemoryCache,} from '@apollo/client/core';
import type {DefaultOptions} from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import fetch from 'cross-fetch';

const defaultOptions: DefaultOptions = {
    watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'ignore',
    },
    query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
    },
};

const httpLink = new HttpLink({
    uri: 'https://api.lens.dev',
    fetch,
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors)
        graphQLErrors.forEach(({ message, locations, path }) =>
            console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
        );

    if (networkError) console.log(`[Network error]: ${networkError}`);
});

// example how you can pass in the x-access-token into requests using `ApolloLink`
const authLink = new ApolloLink((operation, forward) => {
    const token = null;
    console.log('jwt token:', token);

    // Use the setContext method to set the HTTP headers.
    operation.setContext({
        headers: {
            'x-access-token': token ? `Bearer ${token}` : '',
        },
    });

    // Call the next link in the middleware chain.
    return forward(operation);
});

export default new ApolloClient({
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: defaultOptions,
});
