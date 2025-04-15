export type LensNode = {
    name: string;
    baseUrl: string;
    posts: string;
    accounts: string;
    groups?: string;
    notifications?: string;
    focus: string[];
    fullUsername: boolean;
    icon: string;
    useSlug?: boolean;
};

/**
 * @deprecated use LensNode instead
 */
export type OldLensNode = {
    name: string;
    baseUrl: string;
    posts: string;
    profiles: string;
    hexIdentifier: boolean;
    notifications?: string;
    focus: string[];
    fullHandle: boolean;
    icon: string;
};
