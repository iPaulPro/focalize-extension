import {Lens} from "lens-protocol";
import {decodeJwt} from "jose";
import {init} from "./ethers-service";
import {Duration} from "luxon";

import type {Profile} from "../graph/lens-service";

export const getOrRefreshAccessToken = async (): Promise<string> => {
    let accessToken = await getAccessToken();
    console.log('getOrRefreshAccessToken: saved access token', accessToken);
    if (!accessToken) {
        return Promise.reject('No saved access token found');
    }

    const now = Date.now();

    const accessTokenExpiration = decodeJwt(accessToken).exp * 1000; // convert to ms
    if (accessTokenExpiration > now) {
        const duration = Duration.fromMillis(accessTokenExpiration - now).shiftTo('minutes');
        console.log(`getOrRefreshAccessToken: saved access token expires in ${duration.toHuman()}`);
        return Promise.resolve(accessToken);
    }

    console.log('getOrRefreshAccessToken: Access token is expired.');

    const savedRefreshToken = await getRefreshToken();
    console.log('getOrRefreshAccessToken: saved refresh token', savedRefreshToken)

    const refreshTokenExpiration = decodeJwt(savedRefreshToken).exp * 1000; // convert to ms
    if (refreshTokenExpiration > now) {
        return refreshAccessToken(savedRefreshToken);
    } else {
        return Promise.reject('Refresh token is expired');
    }
}

export const getAccessToken = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['accessToken'], async result => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result.accessToken);
        });
    });
}

export const getRefreshToken = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['refreshToken'], async result => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result.refreshToken);
        });
    });
}

export const refreshAccessToken = async (refreshToken?: string): Promise<string> => {
    if (!refreshToken) {
        refreshToken = await getRefreshToken();
    }

    console.log('Refreshing access token with refresh token', refreshToken);

    const res = await Lens.RefreshToken(refreshToken);
    console.log('Refresh token response', res);

    // @ts-ignore
    const error = res.error, data = res.data;

    if (error) {
        // TODO
        console.error(error);
        return;
    }

    return new Promise((resolve, reject) => {
        chrome.storage.local.set(
            {
                accessToken: data?.refresh?.accessToken,
                refreshToken: data?.refresh?.refreshToken
            },
            async () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                const accessToken = await getAccessToken();
                console.log('Saved new auth token to local storage', accessToken);
                resolve(accessToken);
            }
        );
    })
}

/**
 * Gets the default profile of the address supplied by the Provider.
 *
 * This first triggers a request to get accounts if access is not already granted.
 */
export const getDefaultProfile = async (): Promise<Profile> => {
    const account = await init();
    console.log('Got account from provider', account);

    const profile = await Lens.defaultProfile(account);

    // @ts-ignore
    return profile.data.defaultProfile;
}