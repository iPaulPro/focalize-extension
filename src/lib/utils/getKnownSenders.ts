import { type User } from '../user/user';
import { Client } from '@xmtp/xmtp-js';

export const getKnownSenders = async (
    currentUser: User,
    xmtp: Client
): Promise<string[]> => {
    const knownPeers: Set<string> = new Set();
    try {
        const conversations = await xmtp.conversations.list();
        for (const conversation of conversations) {
            const messages = await conversation.messages({ limit: 20 });
            const fromUser = messages.find(
                (message) => message.senderAddress === currentUser.address
            );
            if (fromUser) {
                knownPeers.add(conversation.peerAddress);
            }
        }
    } catch (e) {
        console.error(
            'getKnownSenders: error getting peers from xmtp conversations',
            e
        );
    }

    return Array.from(knownPeers);
};
