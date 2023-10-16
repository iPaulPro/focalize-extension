import { GraphQLClient } from 'graphql-request';
import { LENS_API } from '../config';
import { getSdk } from './graph/lens-service';

const client = new GraphQLClient(LENS_API, {
    fetch,
    cache: 'no-cache',
});

export default getSdk(client);
