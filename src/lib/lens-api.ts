import {GraphQLClient} from 'graphql-request'
import type {RequestMiddleware} from 'graphql-request/dist/types';
import {LENS_API} from '../config';
import {getOrRefreshAccessToken} from "./user/lens-auth";
import {getSdk} from "./graph/lens-service";

const requestMiddleware: RequestMiddleware = async (request) => {
    const operationName = request.operationName;
    if (operationName === 'challenge' ||
        operationName === 'authenticate' ||
        operationName === 'refresh') {
        return request;
    }

    try {
        const token = await getOrRefreshAccessToken();
        return {
            ...request,
            headers: {
                ...request.headers,
                'x-access-token': token ? `Bearer ${token}` : '',
            },
        };
    } catch (e) {
        console.warn('requestMiddleware: Error getting access token', e);
        return request;
    }
};

const client = new GraphQLClient(
    LENS_API,
    {
        fetch,
        cache: "no-cache",
        requestMiddleware
    }
);

export default getSdk(client);