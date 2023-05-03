import {getXmtpClient} from '../xmtp-service';
import type {Readable, Subscriber, Unsubscriber, Updater} from 'svelte/store';
import {Client, type Conversation} from '@xmtp/xmtp-js';

// export const conversationsStream =