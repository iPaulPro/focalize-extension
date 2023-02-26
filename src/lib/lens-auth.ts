import {decodeJwt} from "jose";
import {Duration} from "luxon";

import gqlClient from "../graph/graphql-client";

import type {AuthenticationResult} from "../graph/lens-service";

const getChallenge = async (address: string): Promise<string> => {
    const {challenge} = await gqlClient.Challenge({request: {address}});
    return challenge?.text;
};

const _authenticate = async (address: string, signature: string): Promise<AuthenticationResult> => {
    const {authenticate} = await gqlClient.Authenticate({request: {address, signature}});
    return authenticate;
};

const refresh = async (refreshToken: string): Promise<AuthenticationResult> => {
    const {refresh} = await gqlClient.Refresh({request: {refreshToken}});
    return refresh;
}

const verify = async (accessToken: string) => {
    const {verify} = await gqlClient.Verify({request: {accessToken}});
    return verify;
}

export const authenticate = async () => {
    const {getSigner, getAccounts, clearProvider} = await import('./ethers-service');
    const {getDefaultProfile} = await import('./lens-profile');

    const signer = getSigner();

    let address: string | undefined;
    try {
        address = await signer.getAddress();
    } catch (e) {
        console.warn(e);
    }

    if (!address) {
        try {
            const accounts = await getAccounts();
            address = accounts[0];
        } catch (e) {
            clearProvider();
            console.error(e);
        }
    }

    if (!address) throw 'No address found';
    console.log('authenticate: Authenticating with address', address);

    // Getting the challenge from the server
    const challenge = await getChallenge(address);
    console.log('authenticate: Lens challenge response', challenge);

    const signature = await signer.signMessage(challenge);
    console.log('authenticate: Signed Lens challenge', signature);

    const auth = await _authenticate(address, signature);
    console.log('authenticate: Lens auth response', auth);

    chrome.storage.local.set(
        {
            accessToken: auth.accessToken,
            refreshToken: auth.refreshToken,
        },
        function () {
            console.log('authenticate: Saved tokens to local storage');
        }
    );

    const profile = await getDefaultProfile(address);
    console.log('authenticate: Default profile', profile);

    if (!profile) {
        // TODO Check if any profile, prompt to choose a default profile
        throw 'No default Lens profile found';
    }

    return profile;
};

/**
 * Returns a saved valid access token, or uses a saved valid refresh token to retrieve, save,
 * and return a new access token.
 *
 * @throws If there are no saved tokens
 * @throws If the saved refresh token is expired and an access token cannot be returned
 */
export const getOrRefreshAccessToken = async (): Promise<string> => {
    let accessToken = await getSavedAccessToken();
    if (!accessToken) {
        return Promise.reject('No saved tokens found');
    }
    console.log('getOrRefreshAccessToken: found saved access token', accessToken);

    const now = Date.now();

    const accessTokenExpiration = (decodeJwt(accessToken).exp ?? 0) * 1000; // convert to ms
    if (accessTokenExpiration > now) {
        const duration = Duration.fromMillis(accessTokenExpiration - now).shiftTo('minutes');
        console.log(`getOrRefreshAccessToken: saved access token expires in ${duration.toHuman()}`);
        return Promise.resolve(accessToken);
    }

    console.log('getOrRefreshAccessToken: Access token is expired.');

    const savedRefreshToken = await getSavedRefreshToken();
    if (!savedRefreshToken) {
        return Promise.reject('No saved refresh token found');
    }
    console.log('getOrRefreshAccessToken: found saved refresh token')

    const refreshTokenExpiration = (decodeJwt(savedRefreshToken).exp ?? 0) * 1000; // convert to ms
    if (refreshTokenExpiration > now) {
        return refreshAccessToken(savedRefreshToken);
    } else {
        await logOut();
        return Promise.reject('Refresh token is expired');
    }
};

export const getSavedAccessToken = async (): Promise<string> => {
    const storage = await chrome.storage.local.get(['accessToken']);
    return storage.accessToken;
};

export const getSavedRefreshToken = async (): Promise<string> => {
    const storage = await chrome.storage.local.get(['refreshToken']);
    return storage.refreshToken;
};

export const refreshAccessToken = async (refreshToken?: string): Promise<string> => {
    if (!refreshToken) {
        refreshToken = await getSavedRefreshToken();
    }

    console.log('refreshAccessToken: Refreshing access token with refresh token', refreshToken);

    const res = await refresh(refreshToken);
    console.log('refreshAccessToken: Refresh token response', res);

    return new Promise((resolve, reject) => {
        chrome.storage.local.set(
            {
                accessToken: res.accessToken,
                refreshToken: res.refreshToken
            },
            async () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                const accessToken = await getSavedAccessToken();
                console.log('Saved new auth token to local storage', accessToken);
                resolve(accessToken);
            }
        );
    })
};

export const isValidSession = async () => {
    const token = await getOrRefreshAccessToken();
    return await verify(token);
};

export const logOut = async () => {
    await chrome.storage.local.clear();
};