import {GraphQLClient} from 'graphql-request'
import {LENS_API} from '../config';
import {getOrRefreshAccessToken} from "../lib/lens-auth";

const middleware = async (request: RequestInit) => {
    // @ts-ignore
    const operationName = request.operationName;
    if (operationName === 'Challenge' ||
        operationName === 'Authenticate' ||
        operationName === 'Refresh') {
        return request;
    }

    const token = await getOrRefreshAccessToken();
    return {
        ...request,
        headers: {
            ...request.headers,
            'x-access-token': token ? `Bearer ${token}` : '',
        },
    }
};

export default new GraphQLClient(
    LENS_API,
    {
        fetch,
        cache: "no-cache",
        // @ts-ignore
        requestMiddleware: middleware
    }
)