import {ApolloClient, ApolloLink, from, fromPromise, HttpLink, InMemoryCache,} from '@apollo/client/core';
import type {DefaultOptions} from '@apollo/client/core';
import {onError} from '@apollo/client/link/error';
import fetch from 'cross-fetch';
import {LENS_API} from "./config";
import {getAccessToken, getOrRefreshAccessToken} from "./lib/lens-auth";

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

            console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)

            switch (extensions.code) {
                case "UNAUTHENTICATED":
                    return fromPromise(
                        getOrRefreshAccessToken().catch((error) => {
                            // TODO Handle token refresh errors e.g clear stored tokens, redirect to login
                            return;
                        })
                    )
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

                            // retry the request, returning the new observable
                            return forward(operation);
                        });
            }
        });

    if (networkError) console.log(`[Network error]: ${networkError}`);
});

// example how you can pass in the x-access-token into requests using `ApolloLink`
const getAuthLink = async () => {
    const token = await getAccessToken();
    console.log('jwt token:', token);

    return new ApolloLink((operation, forward) => {
        // Use the setContext method to set the HTTP headers.
        operation.setContext({
            headers: {
                'x-access-token': token ? `Bearer ${token}` : '',
            },
        });

        // Call the next link in the middleware chain.
        return forward(operation);
    });
}

export default new ApolloClient({
    link: from([errorLink, await getAuthLink(), httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: defaultOptions,
});
