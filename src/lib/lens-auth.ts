import {Lens} from "lens-protocol";
import {decodeJwt} from "jose";
import {Duration} from "luxon";

export const authenticate = async () => {
    const {getSigner} = await import('./ethers-service');
    const signer = getSigner();
    const address = await signer.getAddress();

    if (!address) throw 'No address found';
    console.log('authenticate: Authenticating with address', address);

    // Getting the challenge from the server
    const challenge = await Lens.getChallenge(address);
    console.log('authenticate: Lens challenge response', challenge);

    // @ts-ignore
    const challengeError = challenge.error, challengeData = challenge.data;
    if (challengeError) throw challengeError;

    // Signing the challenge with the wallet
    let message = challengeData.challenge.text;
    const signature = await signer.signMessage(message);
    console.log('authenticate: Signed Lens challenge', signature);

    const auth = await Lens.Authenticate(address, signature);
    console.log('authenticate: Lens auth response', auth);

    // @ts-ignore
    const authError = auth.error, authData = auth.data;
    if (authError) throw authError;

    if (authData) {
        const accessToken = authData?.authenticate?.accessToken;
        const refreshToken = authData?.authenticate?.refreshToken;
        chrome.storage.local.set({accessToken, refreshToken}, function () {
            console.log('authenticate: Saved tokens to local storage');
        });
    }

    const profileRes = await Lens.defaultProfile(address);

    // @ts-ignore
    const profileError = profileRes.error, profileData = profileRes.data;
    if (profileError) throw profileError;
    console.log('authenticate: Default profile', profileData.defaultProfile);

    if (!profileData.defaultProfile) {
        // TODO Check if any profile, prompt to choose a default profile
        throw 'No default Lens profile found';
    }

    return profileData.defaultProfile;
};

/**
 * Returns a saved valid access token, or uses a saved valid refresh token to retrieve, save,
 * and return a new access token.
 *
 * @throws If there are no saved tokens
 * @throws If the saved refresh token is expired and an access token cannot be returned
 */
export const getOrRefreshAccessToken = async (): Promise<string> => {
    let accessToken = await getAccessToken();
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

    const savedRefreshToken = await getRefreshToken();
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

export const getAccessToken = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['accessToken'], async result => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result.accessToken);
        });
    });
};

export const getRefreshToken = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['refreshToken'], async result => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(result.refreshToken);
        });
    });
};

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
        throw error;
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
};

export const isValidSession = async () => {
    const token = await getOrRefreshAccessToken();
    const res = await Lens.verify(token);
    // @ts-ignore
    return (res.data) ? res.data.verify : false;
};

export const logOut = async () => {
    await chrome.storage.local.clear();
};