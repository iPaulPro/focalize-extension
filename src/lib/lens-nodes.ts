import nodes from '../lib/store/nodes.json';

export type LensNode = {
    name: string,
    baseUrl: string,
    path: string,
    hexIdentifier: boolean
};

export const LENS_NODES: LensNode[] = [
    ...nodes
];
