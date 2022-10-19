import {ApolloClient, from, fromPromise, HttpLink, InMemoryCache,} from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context'
import {onError} from '@apollo/client/link/error';
import fetch from 'cross-fetch';
import {LENS_API} from "./config";
import {getOrRefreshAccessToken} from "./lib/lens-auth";

import type {DefaultOptions} from '@apollo/client/core';

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
    uri: LENS_API,
    fetchOptions: 'no-cors',
    fetch
});

const errorLink = onError(({graphQLErrors, networkError, operation, forward}) => {
    if (graphQLErrors)
        graphQLErrors.forEach(({message, locations, path, extensions}) => {

            console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}, Extensions: ${extensions}`)

            switch (extensions.code) {
                case "UNAUTHENTICATED":
                    return fromPromise(
                        getOrRefreshAccessToken().catch((error) => {
                            console.error('Error refreshing access token', error)
                            // TODO Handle token refresh errors e.g clear stored tokens, redirect to login
                            return;
                        }))
                        .filter((value) => Boolean(value))
                        .flatMap((accessToken) => {
                            const oldHeaders = operation.getContext().headers;
                            // modify the operation context with a new token
                            operation.setContext({
                                headers: {
                                    ...oldHeaders,
                                    authorization: `Bearer ${accessToken}`,
                                },
                            });

                            console.log('Retrying the request with a new access token', accessToken);
                            // retry the request, returning the new observable
                            return forward(operation);
                        });
            }
        });

    if (networkError) console.log(`[Network error]: ${networkError}`);
});

const authenticationLink = setContext(async (_, { headers }) => {
    const token = await getOrRefreshAccessToken();
    return {
        headers: {
            ...headers,
            'x-access-token': token ? `Bearer ${token}` : '',
        }
    }
});

export default new ApolloClient({
    link: from([errorLink, authenticationLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: defaultOptions,
});
