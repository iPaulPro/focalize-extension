/**
 * MIT License
 *
 * Copyright (c) 2022 Shaun Wild
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import type {Subscriber, Unsubscriber, Updater, Writable} from "svelte/store";

type AdapterDictionary = { [key: string]: Array<Subscriber<any>> }

type StorageName = 'sync' | 'local' | 'managed'

const adapters: { [key in StorageName]: AdapterDictionary } = {
    sync: {},
    local: {},
    managed: {},
}

if (!chrome.storage) {
    throw new Error("You are missing the `storage` permission in your manifest.")
}

chrome.storage.onChanged.addListener((changes, area) => {
    // I'm not sure if or when this is the case, but rather be safe than sorry.
    if (area === 'session') return

    const areaAdapters = adapters[area as StorageName]
    Object.entries(changes).forEach(([key, value]) => {
        areaAdapters[key]?.forEach(run => run(value.newValue))
    })
})

/**
 * Creates a new {@link ChromeStorageStore} for a given key.
 * Data will be published to/read from chrome.storage.local.
 * This is a {@link Writable} instance, and can be used in place of
 * svelte stores.
 * @param key The key to store in the `local` chrome storage area.
 * @param defaultValue The default value to set upon creation.
 * @throws If the `storage` permission is not present in your manifest.
 */
export function chromeStorageLocal<T>(key: string, defaultValue?: T): ChromeStorageStore<T> {
    return new ChromeStorageStore('local', key)
}

/**
 * Creates a new {@link ChromeStorageStore} for a given key.
 * Data will be published to/read from chrome.storage.sync.
 * This is a {@link Writable} instance, and can be used in place of
 * svelte stores.
 * @param key The key to store in the `sync` chrome storage area.
 * @param defaultValue The default value to set upon creation.
 * @throws If the `storage` permission is not present in your manifest.
 */
export function chromeStorageSync<T>(key: string, defaultValue?: T): ChromeStorageStore<T> {
    return new ChromeStorageStore('sync', key, defaultValue)
}

/**
 * Creates a new {@link ChromeStorageStore} for a given key.
 * Data will be read from chrome.storage.managed.
 * This is a {@link Writable} instance, and can be used in place of
 * svelte stores.
 *
 * NOTE: You cannot write to a managed storage area; it is read-only.
 * @param key The key to read from the `managed` chrome storage area.
 * @param defaultValue The default value to set upon creation.
 * @throws If the `storage` permission is not present in your manifest.
 * @throws If you try to write to this storage area.
 */
export function chromeStorageManaged<T>(key: string, defaultValue?: T): ChromeStorageStore<T> {
    return new ChromeStorageStore('managed', key)
}

export function get<T>(writable: Writable<T>): Promise<T> {
    return (writable as ChromeStorageStore<T>).get();
}

/**
 * {@link Writable} implementation that delegates to a chrome storage area.
 */
class ChromeStorageStore<T> implements Writable<T> {
    constructor(
        private area: StorageName,
        private key: string,
        private defaultValue?: T
    ) {
        this.storageArea = chrome.storage[this.area]
        if (defaultValue) {
            this.storageArea.get(this.key, item => {
                const value = item[this.key];
                if (value === undefined) {
                    this.set(defaultValue);
                }
            })
        }
    }

    private storageArea: chrome.storage.StorageArea

    set(value: T): void {
        if (this.area === 'managed') {
            throw Error("Cannot set managed area")
        }

        this.storageArea.set({[this.key]: value})
    }

    get(): Promise<T> {
        return new Promise((resolve, reject) => {
            this.storageArea.get(this.key, item => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                resolve(item[this.key]);
            })
        })
    }

    subscribe(run: Subscriber<T>): Unsubscriber {
        const subscriberArray = adapters[this.area][this.key] ?? (adapters[this.area][this.key] = [])
        subscriberArray.push(run)
        this.storageArea.get(this.key, item => {
            run(item[this.key])
        })
        return () => subscriberArray.splice(subscriberArray.indexOf(run), 1)
    }

    update(updater: Updater<T>): void {
        this.storageArea.get(this.key, item => {
            const newItem = updater(item[this.key])
            this.set(newItem)
        })
    }
}