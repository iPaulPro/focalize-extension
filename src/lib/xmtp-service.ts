import {Client, type Conversation, DecodedMessage, SortDirection, Stream} from '@xmtp/xmtp-js';
import {Observable} from 'rxjs';
import type {Profile, ProfilesQuery} from './graph/lens-service';
import gqlClient from './graph/graphql-client';
import {
    getCached, saveToCache,
    KEY_LATEST_MESSAGE_MAP, KEY_MESSAGE_TIMESTAMPS, KEY_PROFILES,
    type LatestMessageMap, type MessageTimestampMap,
} from './stores/cache-store';
import {buildXmtpStorageKey, getEnsFromAddress, getXmtpKeys, truncateAddress} from './utils';
import type {InvitationContext} from '@xmtp/xmtp-js/dist/types/src/Invitation';
import {getUser} from './stores/user-store';
import type {User} from './user';
import {getProfiles} from './lens-profile';

const LENS_PREFIX = 'lens.dev/dm';

let client: Client;

export interface Peer {
    profile?: Profile;
    wallet?: {
        address: string;
        ens?: string | null;
    };
}

export interface CompactMessage {
    timestamp: number,
    contentTopic: string,
    content: string,
    senderAddress: string,
}

export interface Thread {
    conversation: Conversation;
    unread?: boolean;
    peer?: Peer;
    latestMessage?: CompactMessage;
}

export const isXmtpEnabled = async (): Promise<boolean> => {
    const user: User | undefined = await getUser();
    const address = user?.address;
    if (!address) return false;
    return await getXmtpKeys(address) !== null;
};

const storeKeys = async (address: string, keys: Uint8Array) => {
    const storageKey = buildXmtpStorageKey(address);
    await chrome.storage.local.set({[storageKey]: Buffer.from(keys).toString('binary')});
};

export const getXmtpClient = async (): Promise<Client> => {
    if (client) return client;

    let keys: Uint8Array | null = null;

    const user: User | undefined = await getUser();
    if (user?.address) {
        keys = await getXmtpKeys(user.address);
        if (keys) {
            client = await Client.create(null, {
                env: import.meta.env.MODE === 'development' ? 'dev' : 'production',
                privateKeyOverride: keys,
            });
            return client;
        }
    }

    const {getSigner} = await import('./ethers-service');
    const signer = getSigner();
    if (!signer) throw new Error('Unable to find wallet for signing.');

    const address = await signer?.getAddress();
    keys = await Client.getKeys(signer, {
        env: import.meta.env.MODE === 'development' ? 'dev' : 'production',
    });

    await storeKeys(address, keys);

    client = await Client.create(null, {
        env: import.meta.env.MODE === 'development' ? 'dev' : 'production',
        privateKeyOverride: keys,
    });
    return client;
};

export const canMessage = async (address: string): Promise<boolean> => Client.canMessage(address, {
    env: import.meta.env.MODE === 'development' ? 'dev' : 'production',
});

const getUserProfileId = async (): Promise<string | undefined> => {
    const user = await getUser();
    return user?.profileId;
};

const fetchAllProfiles = async (profileIds: string[], userProfileId?: string): Promise<Array<Profile>> => {
    const chunkSize = 50;
    let profiles: Profile[] = [];
    let cursor: any = null;
    let hasMore = true;

    while (hasMore) {
        const currentIds = profileIds.slice(0, chunkSize);
        profileIds = profileIds.slice(chunkSize);

        const {profiles: currentProfilesResult}: ProfilesQuery = await gqlClient.Profiles({
            request: {profileIds: currentIds, limit: chunkSize, cursor},
            userProfileId,
        });

        profiles = profiles.concat(currentProfilesResult.items);
        cursor = currentProfilesResult.pageInfo.next;
        hasMore = currentProfilesResult.pageInfo.next !== null && profileIds.length > 0;
    }

    return profiles;
};

const getProfilesBatch = async (
    profileIds: string[],
): Promise<Profile[]> => {
    const userProfileId = await getUserProfileId();

    const profiles: Profile[] = [];
    let remainingIds = new Set(profileIds);

    // First check if we have any profiles cached
    const storage = await chrome.storage.local.get(KEY_PROFILES);
    let savedProfiles = storage[KEY_PROFILES];
    if (savedProfiles) {
        for (const profileId of profileIds) {
            const savedProfile = savedProfiles[profileId];
            if (savedProfile) {
                profiles.push(savedProfile);
                const notFound = Array.from(remainingIds).filter((id) => id !== profileId);
                remainingIds = new Set(notFound);
            }
        }
    }

    if (remainingIds.size === 0) return profiles;

    const newProfiles = await fetchAllProfiles(Array.from(remainingIds), userProfileId);
    console.log('getProfiles: new profiles to cache', newProfiles.length);

    if (!savedProfiles) {
        savedProfiles = {};
    }

    newProfiles.forEach((profile: Profile) => {
        savedProfiles[profile.id] = profile;
    });

    await chrome.storage.local.set({[KEY_PROFILES]: savedProfiles});
    console.log('getProfiles: saved profiles to cache', savedProfiles);

    return [...profiles, ...newProfiles];
};

export const isUnread = async (message: CompactMessage, readTimestamps?: MessageTimestampMap): Promise<boolean> => {
    if (!message) return false;

    const user = await getUser();
    if (!user || message.senderAddress === user.address) return false;

    if (!readTimestamps) {
        readTimestamps = await getReadTimestamps() ?? {};
    }

    const timestamp = readTimestamps[message.contentTopic];

    if (!timestamp) {
        readTimestamps[message.contentTopic] = message.timestamp;
        await chrome.storage.local.set({[KEY_MESSAGE_TIMESTAMPS]: readTimestamps});
        return false;
    }

    return message.timestamp > timestamp;
};

export const markAllAsRead = async (threads: Thread[]): Promise<Thread[]> => {
    const localStorage = await chrome.storage.local.get(KEY_MESSAGE_TIMESTAMPS);
    let readTimestamps = localStorage[KEY_MESSAGE_TIMESTAMPS];

    if (!readTimestamps) {
        readTimestamps = {};
    }

    threads.forEach((thread) => {
        if (thread.latestMessage && thread.latestMessage.timestamp) {
            readTimestamps[thread.latestMessage.contentTopic] = thread.latestMessage.timestamp;
        }
        thread.unread = false;
    });

    await chrome.storage.local.set({[KEY_MESSAGE_TIMESTAMPS]: readTimestamps});

    return threads;
};

export const getReadTimestamps = async (): Promise<MessageTimestampMap> => {
    const localStorage = await chrome.storage.local.get(KEY_MESSAGE_TIMESTAMPS);
    return localStorage[KEY_MESSAGE_TIMESTAMPS] as MessageTimestampMap;
};

const getProfilesFromConversationTopic = (topic: string): { profileIdB: string; profileIdA: string } => {
    const idsWithoutPrefix = topic.substring(LENS_PREFIX.length + 1);
    const [profileIdA, profileIdB] = idsWithoutPrefix.split('-');
    return {profileIdA, profileIdB};
};

const extractProfileId = (conversationId: string, userProfileIds?: string[]): string => {
    if (!userProfileIds || userProfileIds.length === 0) throw new Error('User profile id is required');
    const {profileIdA, profileIdB} = getProfilesFromConversationTopic(conversationId);
    const userProfileId = userProfileIds.find((id) => id === profileIdA || id === profileIdB);
    return profileIdA === userProfileId ? profileIdB : profileIdA;
};

let lastMessagesRequestTime: number | undefined;
const messagesRequestThrottleMs = 100;

const getMessages = async (
    conversation: Conversation,
    limit: number = 1,
    startTime?: Date,
): Promise<DecodedMessage[]> => {
    const now = Date.now();
    const timeSinceLastRequest = now - (lastMessagesRequestTime ?? now - messagesRequestThrottleMs);

    if (timeSinceLastRequest < messagesRequestThrottleMs) {
        await new Promise(resolve => setTimeout(resolve, messagesRequestThrottleMs - timeSinceLastRequest));
    }

    lastMessagesRequestTime = Date.now();

    return conversation.messages({
        direction: SortDirection.SORT_DIRECTION_DESCENDING,
        limit,
        startTime
    });
};

const cacheLatestMessages = async (conversationMessages: Map<Conversation, DecodedMessage[]>): Promise<LatestMessageMap> => {
    const latestMessages: LatestMessageMap = await getCached(KEY_LATEST_MESSAGE_MAP) ?? {};
    for (const [conversation, messages] of conversationMessages) {
        if (messages.length > 0) {
            latestMessages[conversation.topic] = toCompactMessage(messages[0]);
        }
    }

    await saveToCache(KEY_LATEST_MESSAGE_MAP, latestMessages);
    console.log('updateLatestMessageCache: saved latest messages to cache');

    return latestMessages;
}

export const updateLatestMessageCache = async (): Promise<LatestMessageMap> => {
    const user = await getUser();
    if (!user) throw new Error('User is not logged in');

    const xmtpClient = await getXmtpClient();

    const conversationMessages: Map<Conversation, DecodedMessage[]> =
        await getMessagesBatch(xmtpClient, user.address, 1, false, false);
    return cacheLatestMessages(conversationMessages);
};

export const isLensThread = (thread: Thread): boolean =>
    thread.conversation.context?.conversationId.startsWith(LENS_PREFIX) ?? false;

export const isProfileThread = (thread: Thread, userProfileId: string): boolean => {
    const conversationId = thread.conversation.context?.conversationId;
    return conversationId?.includes(userProfileId) ?? false;
};

const getMessagesBatch = async (
    xmtpClient: Client,
    address: string,
    pageSize: number,
    unreadOnly: boolean = false,
    peerOnly: boolean = false,
    conversations?: Conversation[],
): Promise<Map<Conversation, DecodedMessage[]>> => {
    const readTimestamps = await getReadTimestamps() ?? {};

    if (!conversations) {
        conversations = await xmtpClient.conversations.list();
    }

    const getReadTimestamp = async (conversation: Conversation): Promise<Date | undefined> => {
        if (!readTimestamps[conversation.topic]) {
            readTimestamps[conversation.topic] = new Date().getTime();
            await chrome.storage.local.set({[KEY_MESSAGE_TIMESTAMPS]: readTimestamps});
        }

        return new Date(readTimestamps[conversation.topic]);
    };

    const queryPromises = conversations.map(async (conversation) => ({
        contentTopic: conversation.topic,
        startTime: unreadOnly ? await getReadTimestamp(conversation) : undefined,
        direction: SortDirection.SORT_DIRECTION_DESCENDING,
        pageSize,
    }));
    const queries = await Promise.all(queryPromises);
    const queryResults = await xmtpClient.apiClient.batchQuery(queries);

    const conversationMap: Map<Conversation, DecodedMessage[]> = new Map();

    for (let i = 0; i < queryResults.length; i++) {
        const queryResult = queryResults[i];
        if (queryResult.length === 0) continue;
        const conversation = conversations[i];

        const messagesPromises: Promise<DecodedMessage>[] = queryResult
            .filter((envelope) => envelope.message)
            .map((envelope) => conversation.decodeMessage(envelope));
        const messages: DecodedMessage[] = await Promise.all(messagesPromises);

        if (peerOnly) {
            const peerMessages = messages.filter(
                (message) => message.senderAddress !== address
            );
            if (peerMessages.length > 0) {
                conversationMap.set(conversation, peerMessages);
            }
            continue;
        }

        conversationMap.set(conversation, messages);
    }

    return conversationMap;
};

export const getUnreadThreads = async (xmtpClient: Client): Promise<Map<Thread, DecodedMessage[]>> => {
    const user = await getUser();
    if (!user) throw new Error('User is not logged in');

    const conversationMessages: Map<Conversation, DecodedMessage[]> =
        await getMessagesBatch(xmtpClient, user.address, 10, true, true);

    await cacheLatestMessages(conversationMessages);

    const unreadConversations = [...conversationMessages.keys()];
    const lensConversations = unreadConversations.filter((conversation) =>
        conversation.context?.conversationId?.startsWith(LENS_PREFIX)
    );

    const profilesOwnedByAddress = await getProfiles([user.address]);
    const userProfileIds = profilesOwnedByAddress.map((profile) => profile.id);
    const profileIds = lensConversations.map((conversation) =>
        extractProfileId(conversation.context!!.conversationId, userProfileIds)
    );

    const profiles: Profile[] = await getProfilesBatch(profileIds);
    const profilesMap: Map<string, Profile> = new Map(
        profiles.map((profile: Profile) => [profile.ownedBy, profile])
    );

    const result: Map<Thread, DecodedMessage[]> = new Map();
    for (const conversation of unreadConversations) {
        const messages = conversationMessages.get(conversation)
            ?.filter(c => c.senderAddress !== '') ?? [];
        const profile = profilesMap.get(conversation.peerAddress);
        const peer: Peer = {
            profile,
            wallet: !profile ? {
                address: conversation.peerAddress,
                ens: await getEnsFromAddress(conversation.peerAddress),
            } : undefined,
        };
        const thread: Thread = {
            conversation,
            peer,
        };
        result.set(thread, messages);
    }

    return result;
};

export const getAllThreads = async (): Promise<Thread[]> => {
    const user = await getUser();
    if (!user) throw new Error('User is not logged in');

    const xmtpClient = await getXmtpClient();

    const conversations: Conversation[] = await xmtpClient.conversations.list();

    const lensConversations = conversations.filter((conversation) =>
        conversation.context?.conversationId?.startsWith(LENS_PREFIX)
    );

    const profilesOwnedByAddress = await getProfiles([user.address]);
    const userProfileIds = profilesOwnedByAddress.map((profile) => profile.id);
    const profileIds = lensConversations.map((conversation) =>
        extractProfileId(conversation.context!!.conversationId, userProfileIds)
    );

    const profiles: Profile[] = await getProfilesBatch(profileIds);
    const profilesMap: Map<string, Profile> = new Map(
        profiles.map((profile: Profile) => [profile.ownedBy, profile])
    );

    let latestMessageMap: LatestMessageMap | undefined = await getCached(KEY_LATEST_MESSAGE_MAP);
    console.log('getAllThreads: found cached latest messages', latestMessageMap);

    if (!latestMessageMap || Object.keys(latestMessageMap).length === 0) {
        const conversationMessages: Map<Conversation, DecodedMessage[]> =
            await getMessagesBatch(xmtpClient, user.address, 1, false, false, conversations);
        latestMessageMap = await cacheLatestMessages(conversationMessages);
    }

    const readTimestamps = await getReadTimestamps() ?? {};

    const threads: Thread[] = [];
    for (const conversation of conversations) {
        const latestMessage: CompactMessage | undefined = latestMessageMap?.[conversation.topic];
        const unread = latestMessage ? await isUnread(latestMessage, readTimestamps) : false;
        const peerProfile = profilesMap.get(conversation.peerAddress);
        const peer: Peer = {
            profile: peerProfile,
            wallet: !peerProfile ? {
                address: conversation.peerAddress,
                // ENS will be fetched on mount
            } : undefined,
        };
        const thread: Thread = {conversation, peer, latestMessage, unread};
        threads.push(thread);
    }

    const sortByLatestMessage = (a: Thread, b: Thread): number => {
        if (!a.latestMessage) return 1;
        if (!b.latestMessage) return -1;
        return b.latestMessage.timestamp - a.latestMessage.timestamp;
    };

    return threads.filter(thread => thread.latestMessage).sort(sortByLatestMessage);
};

const getPeerProfile = async (conversation: Conversation): Promise<Profile | undefined> => {
    const userProfileId = await getUserProfileId();
    const {profiles}: ProfilesQuery = await gqlClient.Profiles({
        request: {ownedBy: [conversation.peerAddress]}, userProfileId
    });
    return profiles.items?.[0];
};

export const getPeerName = (peer: Peer, ens?: string): string | undefined => {
    if (!peer) return undefined;

    const peerProfile = peer.profile;
    if (!peerProfile) {
        return ens ?? peer.wallet?.ens ?? (peer.wallet?.address && truncateAddress(peer.wallet?.address));
    }

    return peerProfile.name ?? peerProfile.handle ?? truncateAddress(peerProfile.ownedBy);
};

const buildPeer = async (conversation: Conversation) => {
    const profile: Profile | undefined = await getPeerProfile(conversation);
    const wallet = {
        address: conversation.peerAddress,
        ens: await getEnsFromAddress(conversation.peerAddress),
    };
    const peer: Peer = {profile, wallet};
    return peer;
};

export const getThreadStream = (): Observable<Thread> => new Observable((observer) => {
    let isObserverClosed = false;

    getXmtpClient().then((xmtp) => {
        xmtp.conversations.stream().then((stream) => {
            const onConversation = async () => {
                for await (const conversation of stream) {
                    if (isObserverClosed) {
                        await stream.return();
                        return;
                    }

                    const peerProfile = await getPeerProfile(conversation);
                    const messages = await getMessages(conversation, 1);
                    const unread = messages[0] ? await isUnread(toCompactMessage(messages[0])) : false;
                    const peer: Peer = {
                        profile: peerProfile,
                        wallet: !peerProfile ? {
                            address: conversation.peerAddress,
                            ens: await getEnsFromAddress(conversation.peerAddress),
                        } : undefined,
                    };
                    observer.next({conversation, peer, unread} satisfies Thread);
                }
            };

            return onConversation();
        });

    });

    return () => {
        isObserverClosed = true;
    };
});

export const getConversation = async (conversationId: string, xmtpClient?: Client): Promise<Conversation | undefined> => {
    if (!xmtpClient) {
        xmtpClient = await getXmtpClient();
    }

    const conversations: Conversation[] = await xmtpClient.conversations.list();
    return conversations.find((conversation) => conversation.topic === conversationId);
};

export const getThread = async (conversationId: string, xmtpClient?: Client): Promise<Thread | undefined> => {
    const conversation: Conversation | undefined = await getConversation(conversationId, xmtpClient);
    if (!conversation) return undefined;

    const peer: Peer = await buildPeer(conversation);
    return {conversation, peer} satisfies Thread;
};

export const findThread = async (peerAddress: string): Promise<Thread | undefined> => {
    if (!peerAddress) return undefined;

    const xmtpClient = await getXmtpClient();

    const conversations: Conversation[] = await xmtpClient.conversations.list();
    const conversation: Conversation | undefined = conversations.find(
        (c) => c.peerAddress === peerAddress
    );
    if (!conversation) return undefined;

    const peer = await buildPeer(conversation);
    return {conversation, peer} satisfies Thread;
};

const buildConversationId = (profileIdA: string, profileIdB: string) => {
    const profileIdAParsed = parseInt(profileIdA, 16);
    const profileIdBParsed = parseInt(profileIdB, 16);
    return profileIdAParsed < profileIdBParsed
        ? `${LENS_PREFIX}/${profileIdA}-${profileIdB}`
        : `${LENS_PREFIX}/${profileIdB}-${profileIdA}`;
};

export const newThread = async (peer: Peer): Promise<Thread> => {
    const address = peer.wallet?.address || peer.profile?.ownedBy;
    if (!address) throw new Error('Cannot create thread without peer address');

    const userProfileId = await getUserProfileId();
    if (!userProfileId) throw new Error('Cannot create thread without user profile id');

    let context: InvitationContext | undefined;
    if (peer.profile) {
        context = {
            conversationId: buildConversationId(userProfileId, peer.profile.id),
            metadata: {},
        };
    }

    const xmtpClient = await getXmtpClient();
    const conversation = await xmtpClient.conversations.newConversation(address, context);

    return {conversation, peer, unread: false} satisfies Thread;
};

export const getMessagesStream = (conversation: Conversation): Observable<DecodedMessage> => new Observable((observer) => {
    let isObserverClosed = false;

    getXmtpClient().then((xmtp) => {
        conversation.streamMessages().then((stream: Stream<DecodedMessage>) => {
            const onMessage = async () => {
                for await (const message of stream) {
                    if (isObserverClosed) {
                        await stream.return();
                        return;
                    }

                    observer.next(message);
                }
            };

            return onMessage();
        });
    });

    // Cleanup when the Observable is unsubscribed
    return () => {
        isObserverClosed = true;
    };
});

export const getAllMessagesStream = (): Observable<DecodedMessage> => new Observable((observer) => {
    let isObserverClosed = false;

    getXmtpClient().then((xmtp) => {
        xmtp.conversations.streamAllMessages().then((stream: AsyncGenerator<DecodedMessage>) => {
            const onMessage = async () => {
                const user = await getUser();

                for await (const message of stream) {
                    if (isObserverClosed) {
                        break;
                    }

                    if (message.senderAddress === xmtp.address) continue;

                    const topic = message.conversation.topic;
                    if (topic?.includes(LENS_PREFIX)) {
                        const {profileIdA, profileIdB} = getProfilesFromConversationTopic(topic);
                        if (profileIdA !== user?.profileId && profileIdB !== user?.profileId) continue;
                    }

                    observer.next(message);
                }
            };

            return onMessage();
        });
    });

    // Cleanup when the Observable is unsubscribed
    return () => {
        isObserverClosed = true;
    };
});

export const toCompactMessage = (decodedMessage: DecodedMessage): CompactMessage => {
    const {sent, contentTopic, content, senderAddress} = decodedMessage;
    return {timestamp: sent.getTime(), contentTopic, content, senderAddress};
};
