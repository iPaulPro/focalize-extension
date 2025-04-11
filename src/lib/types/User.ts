export type User = {
    /**
     * The wallet address of the user
     */
    address: string;

    /**
     * The Lens account address
     */
    account?: string | undefined;

    /**
     * The full Lens username with namespace
     */
    username?: string | undefined;

    /**
     * The display name from Account metadata
     */
    name?: string | undefined | null;

    /**
     * Url to the account avatar image
     */
    avatarUrl?: string | undefined;

    /**
     * Whether signless is enabled for the user
     */
    signless?: boolean;
};
