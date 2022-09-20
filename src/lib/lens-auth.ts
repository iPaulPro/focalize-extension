import {Lens} from "lens-protocol";
import {decodeJwt} from "jose";
import {init} from "./ethers-service";

import type {Profile} from "../graph/lens-service";

export const getOrRefreshAccessToken = async (): Promise<string> => {
    let accessToken = await getAccessToken();
    const accessTokenExpiration = decodeJwt(accessToken).exp * 1000; // convert to ms

    const now = Date.now();
    if (accessTokenExpiration < now) {
        console.log('Access token is expired.');

        const savedRefreshToken = await getRefreshToken();
        const refreshToken = decodeJwt(savedRefreshToken);
        const refreshTokenExpiration = refreshToken.exp * 1000; // convert to ms

        if (refreshTokenExpiration > now) {
            await refreshAccessToken(savedRefreshToken);
        } else {
            console.log('Refresh token is expired')
        }
    }

    return Promise.resolve(accessToken);
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