import nodes from '../lib/store/nodes.json';

export type LensNode = {
    name: string,
    baseUrl: string,
    path: string,
    hexIdentifier: boolean,
    notifications?: string,
    focus: string[],
};

export const LENS_NODES: LensNode[] = [
    ...nodes
];
