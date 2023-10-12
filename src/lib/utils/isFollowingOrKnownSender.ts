import type { Thread } from '../xmtp-service';

export const isFollowingOrKnownSender = (
    thread: Thread,
    knownSenders: string[]
): boolean => {
    if (!thread.conversation.topic || !thread.peer) return false;

    const peerProfile = thread.peer.profile;
    let isFollowing = peerProfile?.isFollowedByMe ?? false;

    const peerAddress = thread.conversation.peerAddress;
    const isKnown = knownSenders?.find((s) => s === peerAddress) !== undefined;

    return isFollowing || isKnown;
};
