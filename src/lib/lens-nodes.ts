import nodes from '../lib/store/nodes.json';

export type LensNode = {
    name: string,
    baseUrl: string,
    posts: string,
    profiles: string,
    hexIdentifier: boolean,
    notifications: string | null,
    focus: string[],
};

export const LENS_NODES: LensNode[] = [
    ...nodes
];
